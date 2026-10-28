import { describe, expect, it } from "vitest";
import { playBotRound, reduce } from "./reducer";
import { RELICS } from "../data/relics";
import { TASK_DEFS } from "../data/tasks";
import { pushLog } from "./log";
import { createGame } from "./setup";
import { advanceTasks, createTask, expireTasks, refillOpen } from "./tasks";
import { addDebt } from "./debt";
import { BASE_RULES } from "./rules";
import { discardCard, endPlayerTurn, playCard, pullTask, startPlayerTurn, useToken } from "./core";
import { taskSum } from "./metrics";
import { computeOutcome } from "./scoring";
import type { CardInstance, GameState, TaskCard } from "./types";
import { ACTIONS_PER_TURN, GAME_LENGTH_OPTIONS, HAND_SIZE, teamRulesFor } from "./rules/balance";
import { useBotTokens } from "./ai/decisions";

function testState(): GameState {
  const state = createGame(1);
  state.tasks = [];
  state.taskDeck = [];
  state.taskDiscard = [];
  state.riskDeck = [];
  state.riskDiscard = [];
  state.players.forEach((player) => {
    player.hand = [];
    player.deck = [];
    player.discard = [];
    player.actionsLeft = 3;
  });
  state.teamScore = 0;
  state.teamDebt = 0;
  state.day = 1;
  state.phase = "human";
  state.activePlayerIndex = 0;
  state.metrics = [];
  state.log = [];
  state.nextTaskId = 1;
  state.nextCardId = 100;
  return state;
}

function addTask(
  state: GameState,
  lane: TaskCard["lane"],
  ownerId: string | null,
  overrides: Partial<TaskCard> = {},
): TaskCard {
  const task = createTask(state, "search");
  task.lane = lane;
  task.ownerId = ownerId;
  Object.assign(task, overrides);
  state.tasks.push(task);
  return task;
}

function card(
  state: GameState,
  type: "design" | "dev" | "test" | "debt",
  level: number,
  effect?: CardInstance["effect"],
) {
  return { id: state.nextCardId++, type, level, effect };
}

function attach(
  state: GameState,
  task: TaskCard,
  ownerId: string,
  type: "design" | "dev" | "test",
  level: number,
) {
  const played = card(state, type, level);
  task.attached.push({ card: played, ownerId, playType: type, playLevel: level });
  return played;
}

describe("setup", () => {
  it("5人・12枚デッキ・手札5枚・Backlog 4枚で始まる", () => {
    const state = createGame(1);
    expect(state.players).toHaveLength(5);
    expect(state.players[0]?.hand).toHaveLength(HAND_SIZE);
    expect(state.players[0]?.deck.length).toBe(12 - HAND_SIZE);
    expect(state.tasks.filter((task) => task.lane === "open")).toHaveLength(state.rules.openTasks);
    expect(state.taskDeck).toHaveLength(state.taskDefs.length - state.rules.openTasks);
    expect(state.riskDeck).toHaveLength(16);
    expect(state.phase).toBe("human");
    expect(state.rules).toMatchObject({ openTasks: 4, debtLimit: 5, starThree: 52 });
    expect(state.players.filter((player) => !player.isHuman)).toHaveLength(4);
    expect(state.players.every((player) => player.hand.length === HAND_SIZE)).toBe(true);
  });

  it("RuleSetを差し替えると開始アクションと手札枚数が変わる", () => {
    const altered = {
      ...BASE_RULES,
      balance: { ...BASE_RULES.balance, actionsPerTurn: 5, handSize: 4 },
    };
    const state = createGame(1, 10, 4, altered);

    expect(state.players[0]?.actionsLeft).toBe(5);
    expect(state.players[0]?.hand).toHaveLength(4);
  });

  it("4人にすると4人用のルールになる", () => {
    const state = createGame(1, 10, 3);
    expect(state.players).toHaveLength(4);
    expect(state.rules).toMatchObject({
      openTasks: 3,
      debtLimit: 5,
      starThree: 41,
    });
  });

  it("20日/30日/100日で目標と負債上限が伸びる", () => {
    const twenty = createGame(1, 20, 4);
    expect(twenty.totalDays).toBe(20);
    expect(twenty.rules).toMatchObject({
      debtLimit: 5,
      starOne: 94,
      starTwo: 110,
      starThree: 118,
    });
    const thirty = createGame(1, 30, 4);
    expect(thirty.totalDays).toBe(30);
    expect(thirty.rules).toMatchObject({
      debtLimit: 6,
      starOne: 152,
      starTwo: 180,
      starThree: 195,
    });
    const hundred = createGame(1, 100, 4);
    expect(hundred.totalDays).toBe(100);
    expect(hundred.rules).toMatchObject({
      debtLimit: 6,
      starOne: 777,
      starTwo: 934,
      starThree: 969,
    });
  });

  it("全ゲーム長×人数の目標値が揃っている", () => {
    for (const players of [4, 5, 6]) {
      for (const days of GAME_LENGTH_OPTIONS) {
        const rules = teamRulesFor(players, days);
        expect(rules.openTasks).toBeGreaterThan(0);
        expect(rules.debtLimit).toBeGreaterThan(0);
        expect(rules.starOne).toBeLessThan(rules.starTwo);
        expect(rules.starTwo).toBeLessThan(rules.starThree);
      }
    }
  });

  it("標準プロファイルでは慎重・低WIP寄りの範囲で性格がランダムになる", () => {
    const state = createGame(1, 10, 4);
    expect(state.aiProfile).toBe("standard");
    const ais = state.players.filter((player) => !player.isHuman);
    expect(ais).toHaveLength(4);
    for (const ai of ais) {
      expect(ai.weights.focus).toBeGreaterThanOrEqual(0.25);
      expect(ai.weights.focus).toBeLessThanOrEqual(1);
      expect(ai.weights.greed).toBeGreaterThanOrEqual(-1);
      expect(ai.weights.greed).toBeLessThanOrEqual(-0.25);
      expect(ai.weights.urgency).toBeGreaterThanOrEqual(0.5);
      expect(ai.weights.urgency).toBeLessThanOrEqual(1);
      expect(ai.weights.prudence).toBeGreaterThanOrEqual(0.2);
      expect(ai.weights.prudence).toBeLessThanOrEqual(0.8);
      expect(ai.weights.solidarity).toBeGreaterThanOrEqual(-0.2);
      expect(ai.weights.solidarity).toBeLessThanOrEqual(0.4);
      expect(ai.weights.appetite).toBeGreaterThanOrEqual(-0.8);
      expect(ai.weights.appetite).toBeLessThanOrEqual(0.1);
    }
    expect(new Set(ais.map((ai) => JSON.stringify(ai.weights))).size).toBeGreaterThan(1);
  });

  it("標準プロファイルではAIの名前・性格がランダムで決まる", () => {
    const state = createGame(1, 10, 4);
    const ais = state.players.filter((player) => !player.isHuman);
    expect(ais).toHaveLength(4);
    expect(new Set(ais.map((player) => player.name)).size).toBe(4);
    expect(
      ais.every((player) =>
        Object.values(player.weights).every((value) => value >= -1 && value <= 1),
      ),
    ).toBe(true);
    expect(
      ais.some((player) => Object.values(player.weights).some((value) => Math.abs(value) >= 0.2)),
    ).toBe(true);
  });

  it("人間の1アクションで次の人へ手番が移る", () => {
    const state = createGame(1, 10, 4);
    const open = state.tasks.find((task) => task.lane === "open");
    expect(open).toBeDefined();
    const next = reduce(state, { type: "PULL_TASK", taskId: open?.id ?? "" });
    expect(next.players[0]?.actionsLeft).toBe(ACTIONS_PER_TURN - 1);
    expect(next.activePlayerIndex).toBe(1);
    expect(next.phase).toBe("ai");
  });

  it("パスすると残りアクションを放棄して次の人へ移る", () => {
    const state = createGame(1, 10, 4);
    const next = reduce(state, { type: "END_TURN" });
    expect(next.players[0]?.actionsLeft).toBe(0);
    expect(next.activePlayerIndex).toBe(1);
    expect(next.phase).toBe("ai");
    expect(next.log.some((entry) => entry.message.includes("パス"))).toBe(true);
  });

  it("同じシードなら同じ初期状態", () => {
    expect(createGame(42)).toEqual(createGame(42));
  });

  it("タスクはseedから生成され、名前は重複しない", () => {
    const state = createGame(42);
    expect(state.taskDefs).toHaveLength(30);
    expect(new Set(state.taskDefs.map((task) => task.title)).size).toBe(state.taskDefs.length);
    expect(state.taskDefs.some((task) => task.title.includes("の"))).toBe(true);
    expect(state.taskDefs.some((task) => task.kind === "incident")).toBe(true);
  });

  it("効果カードの一部にLLMトークン効果が付く", () => {
    const state = createGame(42);
    const tokenTasks = state.taskDefs.filter((task) => task.reward?.effect?.kind === "token");
    expect(tokenTasks.length).toBeGreaterThan(0);
    expect(tokenTasks.every((task) => task.kind !== "incident")).toBe(true);
  });

  it("ログは500件を超えると古いものから消える", () => {
    const state = createGame(1);
    state.log = [];
    for (let index = 0; index < 510; index += 1) {
      pushLog(state, `log-${index}`);
    }
    expect(state.log).toHaveLength(500);
    expect(state.log[0]?.message).toBe("log-10");
    expect(state.log.at(-1)?.message).toBe("log-509");
  });

  it("generationSwingを注入するとタスクの要求量が変わる", () => {
    const stable = createGame(1, 10, 4, BASE_RULES, 0);
    const volatile = createGame(1, 10, 4, BASE_RULES, 0.2);
    expect(stable.generationSwing).toBe(0);
    expect(volatile.generationSwing).toBe(0.2);
    expect(volatile.taskDefs).not.toEqual(stable.taskDefs);
  });
});

describe("レリック", () => {
  it("レリックタスク完了で人間に3択を提示し、選択でチームレリックを得る", () => {
    const state = testState();
    const task = addTask(state, "test", state.humanId, {
      kind: "relic",
      reward: undefined,
      requirements: { design: 0, dev: 0, test: 1 },
      score: 8,
      penalty: { kind: "debt", target: "all", amount: 3 },
    });
    attach(state, task, state.humanId, "test", 1);

    advanceTasks(state);

    expect(task.lane).toBe("done");
    expect(state.pendingRelic?.options).toHaveLength(3);
    expect(state.teamRelics).toEqual([]);

    const selected = state.pendingRelic?.options[0];
    expect(selected).toBeTruthy();
    const next = reduce(state, { type: "CHOOSE_RELIC", relicId: selected! });
    expect(next.teamRelics).toEqual([selected]);
    expect(next.pendingRelic).toBeNull();
  });

  it("AIが受取者なら自動でレリックを選ぶ", () => {
    const state = testState();
    const ai = state.players[1]!;
    const task = addTask(state, "test", ai.id, {
      kind: "relic",
      reward: undefined,
      requirements: { design: 0, dev: 0, test: 1 },
      score: 8,
    });
    attach(state, task, ai.id, "test", 1);

    advanceTasks(state);

    expect(state.pendingRelic).toBeNull();
    expect(state.teamRelics).toHaveLength(1);
  });

  it("上限時は交換するレリックを選ぶ", () => {
    const state = testState();
    state.teamRelics = RELICS.slice(0, 2).map((relic) => relic.id);
    const task = addTask(state, "test", state.humanId, {
      kind: "relic",
      reward: undefined,
      requirements: { design: 0, dev: 0, test: 1 },
      score: 8,
    });
    attach(state, task, state.humanId, "test", 1);

    advanceTasks(state);

    expect(state.pendingRelic?.replace).toBe(true);
    const selected = state.pendingRelic?.options[0];
    const discard = state.teamRelics[0];
    if (!selected || !discard) throw new Error("relic options missing");
    const next = reduce(state, {
      type: "CHOOSE_RELIC",
      relicId: selected,
      discardRelicId: discard,
    });
    expect(next.teamRelics).toHaveLength(2);
    expect(next.teamRelics).toContain(selected);
    expect(next.teamRelics).not.toContain(discard);
  });

  it("フローと洞察がターン開始時に効く", () => {
    const state = testState();
    state.teamRelics = ["flow", "insight"];
    state.players[0]!.deck = Array.from({ length: 12 }, (_, index) => ({
      id: 200 + index,
      type: "design" as const,
      level: 2,
    }));
    state.players[0]!.hand = [];
    state.players[0]!.discard = [];

    startPlayerTurn(state, state.humanId, BASE_RULES);

    expect(state.players[0]?.actionsLeft).toBe(ACTIONS_PER_TURN + 1);
    expect(state.players[0]?.hand).toHaveLength(HAND_SIZE + 1);
  });
});

describe("タスクの流れ", () => {
  it("Backlog から Ready へ引ける", () => {
    const state = testState();
    const task = addTask(state, "open", null);
    expect(pullTask(state, state.humanId, task.id)).toBe(true);
    expect(task.lane).toBe("inbox");
    expect(task.ownerId).toBe(state.humanId);
    expect(state.players[0]?.actionsLeft).toBe(ACTIONS_PER_TURN - 1);
  });

  it("WIP上限なしで新規タスクを引ける", () => {
    const state = testState();
    for (let i = 0; i < 10; i += 1) {
      addTask(state, "inbox", state.humanId);
    }
    const open = addTask(state, "open", null);
    expect(pullTask(state, state.humanId, open.id)).toBe(true);
  });

  it("設計カードで Ready から In Progress へ進む", () => {
    const state = testState();
    const task = addTask(state, "inbox", state.humanId, {
      requirements: { design: 5, dev: 4, test: 2 },
    });
    const a = card(state, "design", 3);
    const b = card(state, "design", 2);
    state.players[0]!.hand = [a, b];

    expect(playCard(state, state.humanId, a.id, task.id)).toBe(true);
    expect(task.lane).toBe("inbox");
    expect(playCard(state, state.humanId, b.id, task.id)).toBe(true);
    expect(task.lane).toBe("wip");
    expect(state.players[0]?.actionsLeft).toBe(ACTIONS_PER_TURN - 2);
    expect(state.players[0]?.contributed.design).toEqual({ cards: 2, points: 5 });
  });

  it("アクション効果は追加アクションを記録する", () => {
    const state = testState();
    const task = addTask(state, "inbox", state.humanId, {
      requirements: { design: 10, dev: 0, test: 0 },
    });
    const boost = card(state, "design", 2, { kind: "action", amount: 2 });
    state.players[0]!.hand = [boost];

    expect(playCard(state, state.humanId, boost.id, task.id)).toBe(true);
    expect(state.players[0]?.actionsLeft).toBe(ACTIONS_PER_TURN - 1 + 2);
    expect(state.analytics.actionsGained).toBe(2);
  });

  it("ドロー効果は引いた枚数を記録する", () => {
    const state = testState();
    const task = addTask(state, "inbox", state.humanId, {
      requirements: { design: 10, dev: 0, test: 0 },
    });
    const draw = card(state, "design", 2, { kind: "draw", amount: 2 });
    state.players[0]!.hand = [draw];
    state.players[0]!.deck = [card(state, "dev", 2), card(state, "test", 2)];

    expect(playCard(state, state.humanId, draw.id, task.id)).toBe(true);
    expect(state.analytics.cardsDrawn).toBe(2);
  });

  it("循環はドローと捨てを記録する", () => {
    const state = testState();
    const task = addTask(state, "inbox", state.humanId, {
      requirements: { design: 10, dev: 0, test: 0 },
    });
    const cycle = card(state, "design", 2, { kind: "cycle", draw: 1, discard: 1 });
    state.players[0]!.hand = [cycle, card(state, "design", 2)];
    state.players[0]!.deck = [card(state, "dev", 2)];

    expect(playCard(state, state.humanId, cycle.id, task.id)).toBe(true);
    expect(state.analytics.cardsDrawn).toBe(1);
    expect(state.analytics.cardsDiscarded).toBe(1);
  });

  it("回収は捨て札から手札に戻す", () => {
    const state = testState();
    const task = addTask(state, "inbox", state.humanId, {
      requirements: { design: 10, dev: 0, test: 0 },
    });
    const recover = card(state, "design", 2, { kind: "recover", amount: 1 });
    const reward = { ...card(state, "dev", 3), score: 2, title: "回収対象" };
    state.players[0]!.hand = [recover];
    state.players[0]!.discard = [reward];

    expect(playCard(state, state.humanId, recover.id, task.id)).toBe(true);
    expect(state.players[0]?.hand.some((c) => c.id === reward.id)).toBe(true);
    expect(state.analytics.cardsRecovered).toBe(1);
  });

  it("開発カードで In Progress から Review へ進む", () => {
    const state = testState();
    const task = addTask(state, "wip", state.humanId, {
      requirements: { design: 1, dev: 4, test: 2 },
    });
    const dev = card(state, "dev", 4);
    state.players[0]!.hand = [dev];

    expect(playCard(state, state.humanId, dev.id, task.id)).toBe(true);
    expect(task.lane).toBe("test");
  });

  it("テストを満たすと獲得し、価値と報酬が入る", () => {
    const state = testState();
    const task = addTask(state, "test", state.humanId, {
      requirements: { design: 1, dev: 1, test: 2 },
      score: 4,
      reward: { type: "dev", level: 5 },
    });
    const testCard = card(state, "test", 2);
    task.attached.push({
      card: testCard,
      ownerId: state.humanId,
      playType: "test",
      playLevel: testCard.level,
    });

    advanceTasks(state);

    expect(task.lane).toBe("done");
    expect(state.teamScore).toBe(4);
    expect(state.players[0]?.completed).toBe(1);
    expect(state.players[0]?.discard.some((c) => c.type === "dev" && c.level === 5)).toBe(true);
    expect(state.players[0]?.discard.some((c) => c.id === testCard.id)).toBe(true);
  });

  it("獲得時にリスクカードと報酬のレポートを残す", () => {
    const state = testState();
    state.riskDeck = ["r-design2"];
    const task = addTask(state, "test", state.humanId, {
      requirements: { design: 1, dev: 1, test: 1 },
      score: 4,
      reward: { type: "dev", level: 5 },
    });
    task.attached.push({
      card: card(state, "test", 1),
      ownerId: state.humanId,
      playType: "test",
      playLevel: 1,
    });

    advanceTasks(state);

    const report = state.lastAcquisition;
    expect(report).not.toBeNull();
    expect(report?.taskTitle).toBe(task.title);
    expect(report?.pullerId).toBe(state.humanId);
    expect(report?.recipientId).toBe(state.humanId);
    expect(report?.contributions).toEqual([
      { playerId: state.humanId, playerName: "あなた", points: 1, cards: 1, lastOrder: 0 },
    ]);
    expect(report?.score).toBe(4);
    expect(report?.reward).toEqual({ type: "dev", level: 5 });
    expect(report?.risks).toEqual([
      { title: "仕様追加 +2", description: "設計の余剰作業 2 で吸収。足りなければ技術的負債+1" },
    ]);
    expect(report?.added.design).toBe(2);
    expect(report?.unmet).toBe(true);
    expect(report?.debt).toBe(1);
    expect(report?.teamDebt).toBe(1);
  });

  it("賄えないリスクカードの数だけ負債が増える", () => {
    const state = testState();
    state.riskDeck = ["r-design2", "r-design2", "r-design2"];
    const task = addTask(state, "test", state.humanId, {
      requirements: { design: 0, dev: 0, test: 5 },
      score: 4,
      reward: { type: "dev", level: 5 },
    });
    // ピース5枚 → リスク3枚。
    for (let i = 0; i < 5; i += 1) {
      task.attached.push({
        card: card(state, "test", 1),
        ownerId: state.humanId,
        playType: "test",
        playLevel: 1,
      });
    }

    advanceTasks(state);

    // 設計+2が3枚。設計の余剰は0なので3枚とも賄えず、負債3。
    expect(state.lastAcquisition?.unmet).toBe(true);
    expect(state.lastAcquisition?.debt).toBe(3);
    expect(state.teamDebt).toBe(3);
    expect(state.riskStats["r-design2"]).toEqual({ drawn: 3, absorbed: 0, unmet: 3, debt: 3 });
  });

  it("余剰作業があればリスクカードを吸収できる", () => {
    const state = testState();
    state.riskDeck = ["r-design2"];
    const task = addTask(state, "wip", state.humanId, {
      requirements: { design: 3, dev: 0, test: 0 },
      score: 4,
      reward: { type: "dev", level: 5 },
    });
    // 設計lv5 1枚（要求合計3、ピース1 → リスク1枚）。設計の余剰は2。
    task.attached.push({
      card: card(state, "design", 5),
      ownerId: state.humanId,
      playType: "design",
      playLevel: 5,
    });

    advanceTasks(state);

    // 設計の余剰2が「設計+2」を吸収するので負債なし。
    expect(state.lastAcquisition?.unmet).toBe(false);
    expect(state.lastAcquisition?.debt).toBe(0);
  });

  it("報酬カードの効果が捨て札に入る", () => {
    const state = testState();
    const task = addTask(state, "test", state.humanId, {
      theme: "platform",
      requirements: { design: 0, dev: 0, test: 1 },
      score: 1,
      reward: { type: "design", level: 5, effect: { kind: "draw", amount: 1 } },
    });
    attach(state, task, state.humanId, "test", 1);

    advanceTasks(state);

    const reward = state.players[0]?.discard.find((c) => c.title === task.title);
    expect(reward?.effect).toEqual({ kind: "draw", amount: 1 });
    expect(reward?.theme).toBe("platform");
    expect(state.lastAcquisition?.theme).toBe("platform");
  });

  it("テストカードは他プレイヤーの Review タスクを支援できる", () => {
    const state = testState();
    const task = addTask(state, "test", state.players[1]!.id, {
      requirements: { design: 1, dev: 1, test: 4 },
      score: 3,
    });
    const testCard = card(state, "test", 3);
    state.players[0]!.hand = [testCard];

    expect(playCard(state, state.humanId, testCard.id, task.id)).toBe(true);
    expect(task.attached[0]?.ownerId).toBe(state.humanId);
    expect(task.lane).toBe("test");

    const second = card(state, "test", 1);
    state.players[0]!.hand.push(second);
    expect(playCard(state, state.humanId, second.id, task.id)).toBe(true);
    expect(task.lane).toBe("done");
    expect(state.players[0]?.completed).toBe(1);
    expect(state.players[1]?.completed).toBe(0);
    expect(state.players[0]?.discard.some((c) => c.id === testCard.id)).toBe(true);
    expect(state.players[0]?.contributed.test).toEqual({ cards: 2, points: 4 });
  });

  it("受取者は引いた人ではなく、貢献ポイントが最大の人", () => {
    const state = testState();
    const task = addTask(state, "test", state.players[1]!.id, {
      requirements: { design: 1, dev: 1, test: 1 },
      score: 4,
      reward: { type: "dev", level: 5 },
    });
    attach(state, task, state.humanId, "design", 4);
    attach(state, task, state.players[1]!.id, "test", 2);
    attach(state, task, state.players[2]!.id, "dev", 1);

    advanceTasks(state);

    expect(task.lane).toBe("done");
    expect(state.players[0]?.completed).toBe(1);
    expect(state.players[1]?.completed).toBe(0);
    expect(state.players[0]?.score).toBe(4);
    expect(state.players[0]?.discard.some((c) => c.title === task.title && c.level === 5)).toBe(
      true,
    );
    expect(state.players[1]?.discard.some((c) => c.title === task.title)).toBe(false);
  });

  it("ポイント同点ならカード枚数が多い人", () => {
    const state = testState();
    const task = addTask(state, "test", state.players[1]!.id, {
      requirements: { design: 0, dev: 0, test: 1 },
      score: 2,
      reward: { type: "design", level: 3 },
    });
    attach(state, task, state.humanId, "test", 1);
    attach(state, task, state.humanId, "design", 1);
    attach(state, task, state.players[2]!.id, "test", 2);

    advanceTasks(state);

    expect(state.players[0]?.completed).toBe(1);
    expect(state.players[2]?.completed).toBe(0);
  });

  it("ポイントも枚数も同点なら最後にカードを置いた人", () => {
    const state = testState();
    const task = addTask(state, "test", state.players[1]!.id, {
      requirements: { design: 0, dev: 0, test: 1 },
      score: 2,
      reward: { type: "design", level: 3 },
    });
    attach(state, task, state.humanId, "test", 1);
    attach(state, task, state.players[2]!.id, "test", 1);

    advanceTasks(state);

    expect(state.players[0]?.completed).toBe(0);
    expect(state.players[2]?.completed).toBe(1);
  });

  it("ドロー効果でカードを引く", () => {
    const state = testState();
    const task = addTask(state, "inbox", state.humanId, {
      requirements: { design: 1, dev: 1, test: 1 },
    });
    const effectCard = card(state, "design", 2, { kind: "draw", amount: 1 });
    const drawn = card(state, "dev", 2);
    state.players[0]!.hand = [effectCard];
    state.players[0]!.deck = [drawn];

    expect(playCard(state, state.humanId, effectCard.id, task.id)).toBe(true);
    expect(state.players[0]?.hand.map((c) => c.id)).toContain(drawn.id);
    expect(state.players[0]?.deck).toHaveLength(0);
  });

  it("カード効果はRuleSetのregistryを差し替えられる", () => {
    const state = testState();
    const task = addTask(state, "inbox", state.humanId, {
      requirements: { design: 5, dev: 4, test: 2 },
    });
    const effectCard = card(state, "design", 2, { kind: "draw", amount: 1 });
    state.players[0]!.hand = [effectCard];
    state.players[0]!.deck = [card(state, "dev", 2)];
    const noDraw = {
      ...BASE_RULES,
      effects: {
        ...BASE_RULES.effects,
        draw: { ...BASE_RULES.effects.draw, apply: () => {} },
      },
    };

    expect(playCard(state, state.humanId, effectCard.id, task.id, noDraw)).toBe(true);
    expect(state.players[0]?.hand).toHaveLength(0);
  });

  it("アクション効果で追加アクションを得る", () => {
    const state = testState();
    const task = addTask(state, "inbox", state.humanId, {
      requirements: { design: 1, dev: 1, test: 1 },
    });
    const effectCard = card(state, "design", 2, { kind: "action", amount: 1 });
    state.players[0]!.hand = [effectCard];

    expect(playCard(state, state.humanId, effectCard.id, task.id)).toBe(true);
    expect(state.players[0]?.actionsLeft).toBe(ACTIONS_PER_TURN);
  });

  it("負債除去効果はデッキとチーム負債を減らす", () => {
    const state = testState();
    const task = addTask(state, "inbox", state.humanId, {
      requirements: { design: 1, dev: 1, test: 1 },
    });
    const effectCard = card(state, "design", 2, { kind: "debt-clean", amount: 1 });
    const debt = card(state, "debt", 0);
    state.players[0]!.hand = [effectCard];
    state.players[0]!.discard = [debt];
    state.teamDebt = 1;

    expect(playCard(state, state.humanId, effectCard.id, task.id)).toBe(true);
    expect(state.players[0]?.discard.some((c) => c.id === debt.id)).toBe(false);
    expect(state.teamDebt).toBe(0);
  });

  it("納期トークンが貯まるとタスクはトラッシュされる", () => {
    const state = testState();
    const task = addTask(state, "wip", state.humanId, { deadline: 2, tokens: 1 });
    const attached = card(state, "dev", 3);
    task.attached.push({
      card: attached,
      ownerId: state.humanId,
      playType: "dev",
      playLevel: attached.level,
    });

    expireTasks(state);

    expect(task.lane).toBe("trash");
    expect(task.expiredLane).toBe("wip");
    expect(state.players[0]?.discard.some((c) => c.id === attached.id)).toBe(true);
    expect(state.teamDebt).toBe(0);
  });
});

describe("タスク山札", () => {
  it("山札が尽きたら捨て札をシャッフルして戻す", () => {
    const state = testState();
    state.taskDeck = [];
    state.taskDiscard = ["search", "payment"];
    state.tasks = [];

    refillOpen(state);

    const open = state.tasks.filter((task) => task.lane === "open");
    expect(open).toHaveLength(2);
    expect(state.taskDiscard).toEqual([]);
    expect(open.map((task) => task.defId).toSorted()).toEqual(["payment", "search"]);
  });

  it("獲得・期限切れしたタスクは捨て札に入る", () => {
    const state = testState();
    const task = addTask(state, "test", state.humanId, {
      requirements: { design: 0, dev: 0, test: 1 },
      score: 1,
    });
    attach(state, task, state.humanId, "test", 1);
    advanceTasks(state);
    expect(task.lane).toBe("done");
    expect(state.taskDiscard).toContain(task.defId);

    const expired = addTask(state, "open", null, { deadline: 1, tokens: 1 });
    // 山札補充で捨て札がすぐ再利用されないよう、この検証だけ補充枚数を0にする
    state.rules = { ...state.rules, openTasks: 0 };
    expireTasks(state);
    expect(expired.lane).toBe("trash");
    expect(state.taskDiscard).toContain(expired.defId);
  });
});

describe("インシデントとトークン効果", () => {
  it("インシデントが期限切れになると全員に負債が入る", () => {
    const state = testState();
    state.rules = { ...state.rules, openTasks: 0 };
    const incident = addTask(state, "open", null, {
      kind: "incident",
      penalty: { kind: "debt", target: "all", amount: 2 },
      deadline: 1,
      tokens: 1,
    });

    expireTasks(state);

    expect(incident.lane).toBe("trash");
    for (const player of state.players) {
      expect(player.discard.filter((entry) => entry.type === "debt")).toHaveLength(2);
    }
    expect(state.teamDebt).toBe(state.players.length * 2);
  });

  it("チームスコア罰則は最終スコアから引かれる", () => {
    const state = testState();
    state.rules = { ...state.rules, openTasks: 0 };
    addTask(state, "open", null, {
      kind: "incident",
      penalty: { kind: "teamScore", amount: 3 },
      deadline: 1,
      tokens: 1,
    });

    expireTasks(state);

    expect(state.scorePenalty).toBe(3);
  });

  it("担当者負債の罰則は担当者だけに配られる", () => {
    const state = testState();
    state.rules = { ...state.rules, openTasks: 0 };
    addTask(state, "open", state.humanId, {
      kind: "incident",
      penalty: { kind: "debt", target: "owner", amount: 2 },
      deadline: 1,
      tokens: 1,
    });

    expireTasks(state);

    expect(state.players[0]?.discard.filter((entry) => entry.type === "debt")).toHaveLength(2);
    expect(state.players[1]?.discard.filter((entry) => entry.type === "debt")).toHaveLength(0);
  });

  it("手札破棄の罰則は担当者の手札を捨てる", () => {
    const state = testState();
    state.rules = { ...state.rules, openTasks: 0 };
    const held = card(state, "design", 2);
    state.players[0]!.hand = [held];
    addTask(state, "open", state.humanId, {
      kind: "incident",
      penalty: { kind: "discardHand", target: "owner" },
      deadline: 1,
      tokens: 1,
    });

    expireTasks(state);

    expect(state.players[0]?.hand).toHaveLength(0);
    expect(state.players[0]?.discard.some((entry) => entry.id === held.id)).toBe(true);
  });

  it("アクション罰則は翌日の開始アクションを減らす", () => {
    const state = testState();
    state.rules = { ...state.rules, openTasks: 0 };
    addTask(state, "open", null, {
      kind: "incident",
      penalty: { kind: "loseAction", target: "all", amount: 1 },
      deadline: 1,
      tokens: 1,
    });

    expireTasks(state);
    expect(state.players.every((player) => player.actionPenalty === 1)).toBe(true);

    startPlayerTurn(state, state.humanId);
    expect(state.players[0]?.actionsLeft).toBe(ACTIONS_PER_TURN - 1);
  });

  it("LLMトークンはアクションを消費せずlv1作業として置ける", () => {
    const state = testState();
    const task = addTask(state, "inbox", state.humanId, {
      requirements: { design: 5, dev: 4, test: 2 },
    });
    state.players[0]!.tokens = { mi: 1 };

    expect(useToken(state, state.humanId, "mi", task.id)).toBe(true);
    expect(task.tokenWork.design).toBe(1);
    expect(taskSum(task, "design")).toBe(1);
    expect(state.players[0]?.actionsLeft).toBe(ACTIONS_PER_TURN);
    expect(state.players[0]?.tokens.mi).toBe(0);
    // リザルトの貢献ポイントにもLLMトークン分を加算する
    expect(state.players[0]?.contributed.design.points).toBe(1);
  });

  it("finishトークン政策は残り1点のタスクだけに使う", () => {
    const state = testState();
    const player = state.players[0]!;
    const task = addTask(state, "inbox", state.humanId, {
      requirements: { design: 5, dev: 0, test: 0 },
    });
    player.tokens = { mi: 1 };
    task.tokenWork.design = 2;

    useBotTokens(state, player, BASE_RULES, "finish");
    expect(player.tokens.mi).toBe(1);
    expect(task.tokenWork.design).toBe(2);

    task.tokenWork.design = 4;
    useBotTokens(state, player, BASE_RULES, "finish");
    expect(player.tokens.mi).toBe(0);
    expect(taskSum(task, "design")).toBe(5);
  });

  it("neverトークン政策はトークンを残す", () => {
    const state = testState();
    const player = state.players[0]!;
    const task = addTask(state, "inbox", state.humanId, {
      requirements: { design: 5, dev: 0, test: 0 },
    });
    player.tokens = { mi: 1 };
    task.tokenWork.design = 4;

    useBotTokens(state, player, BASE_RULES, "never");
    expect(player.tokens.mi).toBe(1);
    expect(task.tokenWork.design).toBe(4);
  });

  it("playBotRoundにトークン政策を渡せる", () => {
    const state = testState();
    for (const player of state.players) player.tokens = { mi: 1 };
    addTask(state, "inbox", state.humanId, {
      requirements: { design: 5, dev: 0, test: 0 },
    });

    playBotRound(state, undefined, BASE_RULES, { tokenPolicy: "never" });
    expect(state.players.every((player) => player.tokens.mi === 1)).toBe(true);
    expect(state.analytics.tokensUsed).toBe(0);
  });

  it("シールドは次の負債を防ぐ", () => {
    const state = testState();
    const player = state.players[0]!;
    player.shields = 1;

    addDebt(state, player, 1);
    expect(player.shields).toBe(0);
    expect(player.discard.filter((entry) => entry.type === "debt")).toHaveLength(0);

    addDebt(state, player, 1);
    expect(player.discard.filter((entry) => entry.type === "debt")).toHaveLength(1);
  });

  it("納期トークンで納期が延びる", () => {
    const state = testState();
    const task = addTask(state, "inbox", state.humanId, { deadline: 2 });
    const effectCard = card(state, "design", 1, { kind: "deadline", amount: 1 });
    state.players[0]!.hand = [effectCard];

    expect(playCard(state, state.humanId, effectCard.id, task.id)).toBe(true);
    expect(task.deadline).toBe(3);
  });
});

describe("ボードミーティング", () => {
  it("負債上限とテスト切れを優先して指摘する", () => {
    const state = testState();
    state.teamDebt = state.rules.debtLimit;
    addTask(state, "trash", null, { expiredLane: "test" });

    const outcome = computeOutcome(state);
    expect(outcome.tips[0]).toContain("負債上限");
    expect(outcome.tips.some((tip) => tip.includes("Review"))).toBe(true);
  });

  it("星を取るための点差と具体策を返す", () => {
    const state = testState();
    state.teamScore = 10;
    state.teamDebt = 1;

    const outcome = computeOutcome(state);
    expect(outcome.tips.some((tip) => tip.startsWith("星1まであと"))).toBe(true);
    expect(outcome.tips.some((tip) => tip.includes("負債1枚減らす"))).toBe(true);
  });
});

describe("デッキと報酬", () => {
  it("デッキ構成だけでは最終評価に加点されない", () => {
    const state = testState();
    const player = state.players[0]!;
    player.discard = [
      { id: 1, type: "design", level: 3, score: 2, title: "a", theme: "llm" },
      { id: 2, type: "dev", level: 3, score: 2, title: "b", theme: "llm" },
      { id: 3, type: "test", level: 3, score: 2, title: "c", theme: "llm" },
    ];
    state.teamScore = 10;
    state.teamDebt = 0;
    state.scorePenalty = 0;

    const outcome = computeOutcome(state);

    expect(outcome.finalScore).toBe(10);
  });

  it("賄えないリスクカードがあると負債カードを得る", () => {
    const state = testState();
    state.riskDeck = ["r-design2"];
    const task = addTask(state, "wip", state.humanId, {
      requirements: { design: 3, dev: 0, test: 0 },
      score: 1,
    });
    task.attached.push({
      card: card(state, "design", 3),
      ownerId: state.humanId,
      playType: "design",
      playLevel: 3,
    });

    advanceTasks(state);

    // 設計は要件ちょうど（余剰0）。リスクの設計+2を賄えず負債1。
    expect(task.lane).toBe("done");
    expect(state.teamDebt).toBe(1);
    expect(state.players[0]?.discard.some((c) => c.type === "debt")).toBe(true);
  });

  it("仕様変更カードは任意フェーズの余剰で吸収できる", () => {
    const state = testState();
    state.riskDeck = ["r-wild1a", "r-none1", "r-none2"];
    const task = addTask(state, "wip", state.humanId, {
      requirements: { design: 3, dev: 0, test: 0 },
      score: 4,
    });
    task.attached.push({
      card: card(state, "design", 4),
      ownerId: state.humanId,
      playType: "design",
      playLevel: 4,
    });

    advanceTasks(state);

    expect(task.lane).toBe("done");
    expect(state.lastAcquisition?.debt).toBe(0);
    expect(state.lastAcquisition?.score).toBe(4);
    expect(state.teamDebt).toBe(0);
    expect(state.riskStats["r-wild1a"]).toEqual({ drawn: 1, absorbed: 1, unmet: 0, debt: 0 });
  });

  it("想定外の好機でLLMトークンを得る", () => {
    const state = testState();
    state.riskDeck = ["r-token1a", "r-none1", "r-none2"];
    const before = state.players[0]?.tokens.mi ?? 0;
    const task = addTask(state, "test", state.humanId, {
      requirements: { design: 0, dev: 0, test: 3 },
      score: 4,
    });
    for (let index = 0; index < 3; index += 1) {
      task.attached.push({
        card: card(state, "test", 1),
        ownerId: state.humanId,
        playType: "test",
        playLevel: 1,
      });
    }

    advanceTasks(state);

    expect(task.lane).toBe("done");
    expect(state.players[0]?.tokens.mi).toBe(before + 1);
    expect(state.riskStats["r-token1a"]?.drawn).toBe(1);
  });

  it("要求合計に対するピース数でリスクカードの枚数が決まる", () => {
    const make = (requirement: number, pieces: number) => {
      const state = testState();
      state.riskDeck = ["r-none1", "r-none2", "r-none1", "r-none2"];
      const task = addTask(state, "wip", state.humanId, {
        requirements: { design: requirement, dev: 0, test: 0 },
        score: 1,
      });
      for (let index = 0; index < pieces; index += 1) {
        task.attached.push({
          card: card(state, "design", 1),
          ownerId: state.humanId,
          playType: "design",
          playLevel: 1,
        });
      }
      advanceTasks(state);
      return state;
    };

    // 要求合計18: 5枚→0、6枚→1、7枚→2、9枚→3
    expect(make(18, 5).riskDiscard).toHaveLength(0);
    expect(make(18, 6).riskDiscard).toHaveLength(1);
    expect(make(18, 7).riskDiscard).toHaveLength(2);
    expect(make(18, 9).riskDiscard).toHaveLength(3);
  });

  it("基本ルールでは設計カードを開発に置けない", () => {
    const state = testState();
    const task = addTask(state, "wip", state.humanId, {
      requirements: { design: 1, dev: 4, test: 2 },
    });
    const design = card(state, "design", 4);
    state.players[0]!.hand = [design];

    expect(playCard(state, state.humanId, design.id, task.id)).toBe(false);
    expect(state.players[0]?.actionsLeft).toBe(ACTIONS_PER_TURN);
  });

  it("テストはテストカード専用（他種類では代用できない）", () => {
    const state = testState();
    const task = addTask(state, "test", state.humanId, {
      requirements: { design: 1, dev: 1, test: 2 },
    });
    const design = card(state, "design", 4);
    state.players[0]!.hand = [design];

    expect(playCard(state, state.humanId, design.id, task.id)).toBe(false);
    expect(state.players[0]?.actionsLeft).toBe(ACTIONS_PER_TURN);
  });

  it("テストカードはReviewでもレーン補正なし（+1しない）", () => {
    const state = testState();
    const task = addTask(state, "test", state.humanId, {
      requirements: { design: 0, dev: 0, test: 5 },
    });
    const testCard = card(state, "test", 4);
    state.players[0]!.hand = [testCard];

    expect(playCard(state, state.humanId, testCard.id, task.id)).toBe(true);
    expect(task.attached[0]?.playLevel).toBe(4);
    expect(taskSum(task, "test")).toBe(4);
  });

  it("タスク報酬カードを廃棄するとスコアが消える", () => {
    const state = testState();
    const task = addTask(state, "test", state.humanId, {
      requirements: { design: 0, dev: 0, test: 1 },
      score: 4,
      reward: { type: "dev", level: 5 },
    });
    attach(state, task, state.humanId, "test", 1);
    advanceTasks(state);

    const reward = state.players[0]?.discard.find((entry) => entry.title === task.title);
    expect(reward?.score).toBe(4);
    expect(state.teamScore).toBe(4);

    state.players[0]!.hand = reward ? [reward] : [];
    state.players[0]!.discard = [];
    expect(discardCard(state, state.humanId, reward?.id ?? -1)).toBe(true);
    expect(state.teamScore).toBe(0);
    expect(state.players[0]?.score).toBe(0);
  });

  it("負債カードを廃棄すると負債が減る", () => {
    const state = testState();
    const debtCard = card(state, "debt", 0);
    state.players[0]!.hand = [debtCard];
    state.players[0]!.discard = [];
    state.teamDebt = 1;

    expect(discardCard(state, state.humanId, debtCard.id)).toBe(true);
    expect(state.teamDebt).toBe(0);
  });

  it("タスク報酬はすべてlv1以上", () => {
    expect(TASK_DEFS.every((task) => (task.reward?.level ?? 0) >= 1)).toBe(true);
  });

  it("1アクションで手札を1枚廃棄できる", () => {
    const state = testState();
    const design = card(state, "design", 2);
    state.players[0]!.hand = [design];

    expect(discardCard(state, state.humanId, design.id)).toBe(true);
    expect(state.players[0]?.hand).toHaveLength(0);
    expect(state.players[0]?.discard.some((c) => c.id === design.id)).toBe(false);
    expect(state.players[0]?.actionsLeft).toBe(ACTIONS_PER_TURN - 1);

    state.players[0]!.actionsLeft = 0;
    state.players[0]!.hand = [card(state, "dev", 2)];
    const blocked = state.players[0]!.hand[0]!;
    expect(discardCard(state, state.humanId, blocked.id)).toBe(false);
  });
});

describe("AI / 通しプレイ", () => {
  it("AIは1アクションだけ行動して次の人へ渡す", () => {
    const state = createGame(7);
    state.phase = "ai";
    state.activePlayerIndex = 1;
    const before = state.log.length;
    const next = reduce(state, { type: "RUN_AI_TURN" });
    expect(next.log.length).toBeGreaterThan(before);
    expect(next.activePlayerIndex).not.toBe(1);
  });

  it("10日間の通しプレイが同じシードで再現する", () => {
    function play(seed: number): GameState {
      const state = createGame(seed);
      let guard = 0;
      while (state.phase !== "over" && guard < 20) {
        playBotRound(state);
        guard += 1;
      }
      return state;
    }
    const a = play(123);
    const b = play(123);
    expect(a.phase).toBe("over");
    expect(a.outcome).not.toBeNull();
    expect(a.outcome).toEqual(b.outcome);
    expect(a.teamDebt).toBeGreaterThanOrEqual(0);
    expect(a.outcome?.stars).toBeGreaterThanOrEqual(0);
    expect(a.rules.starOne).toBeLessThan(a.rules.starTwo);
  });

  it("手札はターン開始時に5枚まで引き直される", () => {
    const state = createGame(1);
    const player = state.players[0]!;
    player.hand = [];
    startPlayerTurn(state, state.humanId);
    expect(player.hand).toHaveLength(HAND_SIZE);
    endPlayerTurn(state, state.humanId);
    expect(player.hand).toHaveLength(0);
    expect(player.actionsLeft).toBe(0);
  });

  it("Backlog は引いた分だけ補充される", () => {
    const state = createGame(1);
    const task = state.tasks.find((t) => t.lane === "open")!;
    const beforeOpen = state.tasks.filter((t) => t.lane === "open").length;
    pullTask(state, state.humanId, task.id);
    refillOpen(state);
    expect(state.tasks.filter((t) => t.lane === "open").length).toBe(beforeOpen);
  });
});

describe("テスト用オート進行", () => {
  it("AUTO_STEPは人間の手番もボットとして進める", () => {
    const state = testState();
    const next = reduce(state, { type: "AUTO_STEP" });
    expect(next.activePlayerIndex).toBe(1);
    expect(next.phase).toBe("ai");
  });
});
