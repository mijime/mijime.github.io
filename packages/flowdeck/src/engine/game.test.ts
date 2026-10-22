import { describe, expect, it } from "vitest";
import { playBotRound, reduce } from "./reducer";
import { TASK_DEFS } from "../data/tasks";
import { pushLog } from "./log";
import { createGame } from "./setup";
import { advanceTasks, createTask, expireTasks, refillOpen } from "./tasks";
import { discardCard, endPlayerTurn, playCard, pullTask, startPlayerTurn } from "./core";
import type { CardInstance, GameState, TaskCard } from "./types";
import { ACTIONS_PER_TURN, HAND_SIZE } from "./types";

function testState(): GameState {
  const state = createGame(1);
  state.tasks = [];
  state.taskDeck = [];
  state.taskDiscard = [];
  state.uncertaintyDeck = [];
  state.uncertaintyDiscard = [];
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
    expect(state.taskDeck).toHaveLength(TASK_DEFS.length - state.rules.openTasks);
    expect(state.uncertaintyDeck).toHaveLength(16);
    expect(state.phase).toBe("human");
    expect(state.rules).toMatchObject({ openTasks: 4, debtLimit: 18, starThree: 33 });
    expect(state.players.filter((player) => !player.isHuman)).toHaveLength(4);
    expect(state.players.every((player) => player.hand.length === HAND_SIZE)).toBe(true);
  });

  it("4人にすると4人用のルールになる", () => {
    const state = createGame(1, 10, 3);
    expect(state.players).toHaveLength(4);
    expect(state.rules).toMatchObject({
      openTasks: 3,
      debtLimit: 15,
      starThree: 28,
    });
  });

  it("20日/30日で目標と負債上限が伸びる", () => {
    const twenty = createGame(1, 20, 4);
    expect(twenty.totalDays).toBe(20);
    expect(twenty.rules).toMatchObject({ debtLimit: 32, starOne: 43, starTwo: 63, starThree: 69 });
    const thirty = createGame(1, 30, 4);
    expect(thirty.totalDays).toBe(30);
    expect(thirty.rules).toMatchObject({ debtLimit: 42, starOne: 69, starTwo: 96, starThree: 107 });
  });

  it("AIの名前・性格は開始時にランダムで決まる", () => {
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
    expect(state.taskDefs).toHaveLength(TASK_DEFS.length);
    expect(new Set(state.taskDefs.map((task) => task.title)).size).toBe(state.taskDefs.length);
    expect(state.taskDefs.some((task) => task.title.includes("の"))).toBe(true);
    expect(state.taskDefs.some((task) => task.kind === "incident")).toBe(true);
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

  it("獲得時に不確実カードと報酬のレポートを残す", () => {
    const state = testState();
    state.uncertaintyDeck = ["u-design4a"];
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
    expect(report?.uncertainty).toEqual([
      { title: "仕様追加 +2", description: "miの設計提案で要求が +2 される" },
    ]);
    expect(report?.added.design).toBe(2);
    expect(report?.unmet).toBe(true);
    expect(report?.debt).toBe(1);
    expect(report?.teamDebt).toBe(1);
  });

  it("報酬カードの効果が捨て札に入る", () => {
    const state = testState();
    const task = addTask(state, "test", state.humanId, {
      requirements: { design: 0, dev: 0, test: 1 },
      score: 1,
      reward: { type: "design", level: 5, effect: { kind: "draw", amount: 1 } },
    });
    attach(state, task, state.humanId, "test", 1);

    advanceTasks(state);

    const reward = state.players[0]?.discard.find((c) => c.title === task.title);
    expect(reward?.effect).toEqual({ kind: "draw", amount: 1 });
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

  it("獲得者は引いた人ではなく、貢献ポイントが最大の人", () => {
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

  it("ブースト効果は実効レベルを上げる", () => {
    const state = testState();
    const task = addTask(state, "inbox", state.humanId, {
      requirements: { design: 3, dev: 1, test: 1 },
    });
    const effectCard = card(state, "design", 1, { kind: "boost", amount: 2 });
    state.players[0]!.hand = [effectCard];

    expect(playCard(state, state.humanId, effectCard.id, task.id)).toBe(true);
    expect(task.attached[0]?.playLevel).toBe(3);
    expect(task.lane).toBe("wip");
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
      penalty: { kind: "allPlayersDebt", amount: 2 },
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
      penalty: { kind: "ownerDebt", amount: 2 },
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

  it("納期トークン罰則は進行中タスクを進める", () => {
    const state = testState();
    state.rules = { ...state.rules, openTasks: 0 };
    addTask(state, "open", null, {
      kind: "incident",
      penalty: { kind: "deadlineToken", amount: 1 },
      deadline: 1,
      tokens: 1,
    });
    const active = addTask(state, "inbox", state.humanId, { deadline: 9, tokens: 0 });

    expireTasks(state);

    expect(active.tokens).toBeGreaterThan(0);
  });

  it("要件トークンで現在フェーズの要求が下がる", () => {
    const state = testState();
    const task = addTask(state, "inbox", state.humanId, {
      requirements: { design: 5, dev: 4, test: 2 },
    });
    const effectCard = card(state, "design", 2, { kind: "requirement", amount: 1 });
    state.players[0]!.hand = [effectCard];

    expect(playCard(state, state.humanId, effectCard.id, task.id)).toBe(true);
    expect(task.requirements.design).toBe(4);
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

describe("デッキと報酬", () => {
  it("要求の不確実カードで未達になると負債カードを得る", () => {
    const state = testState();
    state.uncertaintyDeck = ["u-design4"];
    const task = addTask(state, "test", state.humanId, {
      requirements: { design: 1, dev: 1, test: 1 },
      score: 1,
    });
    task.attached.push({
      card: card(state, "test", 1),
      ownerId: state.humanId,
      playType: "test",
      playLevel: 1,
    });

    advanceTasks(state);

    expect(task.lane).toBe("done");
    expect(state.teamDebt).toBe(1);
    expect(state.players[0]?.discard.some((c) => c.type === "debt")).toBe(true);
  });

  it("不確実カードの負債効果でチーム負債が増える", () => {
    const state = testState();
    state.uncertaintyDeck = ["u-debt1"];
    const task = addTask(state, "test", state.humanId, {
      requirements: { design: 0, dev: 0, test: 1 },
      score: 1,
    });
    task.attached.push({
      card: card(state, "test", 1),
      ownerId: state.humanId,
      playType: "test",
      playLevel: 1,
    });

    advanceTasks(state);

    expect(state.teamDebt).toBe(1);
    expect(state.players[0]?.discard.some((c) => c.type === "debt")).toBe(true);
  });

  it("超過テストは要求αを軽減する", () => {
    const state = testState();
    state.uncertaintyDeck = ["u-design4"];
    const task = addTask(state, "test", state.humanId, {
      requirements: { design: 2, dev: 0, test: 2 },
      score: 1,
    });
    task.attached.push({
      card: card(state, "design", 4),
      ownerId: state.humanId,
      playType: "design",
      playLevel: 4,
    });
    task.attached.push({
      card: card(state, "test", 4),
      ownerId: state.humanId,
      playType: "test",
      playLevel: 4,
    });

    advanceTasks(state);

    expect(task.lane).toBe("done");
    expect(state.teamDebt).toBe(0);
  });

  it("テスト要件が高いタスクほど不確実カードを多く引く", () => {
    const state = testState();
    state.uncertaintyDeck = ["u-debt0a", "u-debt0b", "u-debt0a"];
    const task = addTask(state, "test", state.humanId, {
      requirements: { design: 0, dev: 0, test: 4 },
      score: 1,
    });
    task.attached.push({
      card: card(state, "test", 4),
      ownerId: state.humanId,
      playType: "test",
      playLevel: 4,
    });

    advanceTasks(state);

    expect(state.uncertaintyDiscard).toHaveLength(2);
  });

  it("設計カードは開発としてlv1代用できる", () => {
    const state = testState();
    const task = addTask(state, "wip", state.humanId, {
      requirements: { design: 1, dev: 1, test: 2 },
    });
    const design = card(state, "design", 4);
    state.players[0]!.hand = [design];

    expect(playCard(state, state.humanId, design.id, task.id)).toBe(true);
    expect(task.attached[0]?.playType).toBe("dev");
    expect(task.attached[0]?.playLevel).toBe(1);
    expect(task.lane).toBe("test");
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
    expect(TASK_DEFS.every((task) => task.reward.level >= 1)).toBe(true);
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
