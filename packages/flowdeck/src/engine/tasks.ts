import { TASK_BY_ID } from "../data/tasks";
import { UNCERTAINTY_BY_ID } from "../data/uncertainty";
import { addCardToDiscard, discardHand } from "./hand";
import { pushLog } from "./log";
import { playerById, recomputeTeamStats, taskContributions, taskSum } from "./metrics";
import type { GameState, PlayerState, TaskCard } from "./types";
import { shuffle } from "./rng";

export function createTask(state: GameState, defId: string): TaskCard {
  const def = state.taskDefs.find((task) => task.id === defId) ?? TASK_BY_ID[defId];
  if (!def) throw new Error(`unknown task: ${defId}`);
  return {
    id: `t${state.nextTaskId++}`,
    defId: def.id,
    title: def.title,
    requirements: { ...def.requirements },
    score: def.score,
    deadline: def.deadline,
    tokens: 0,
    reward: { ...def.reward },
    tokenWork: { design: 0, dev: 0, test: 0 },
    kind: def.kind ?? "normal",
    penalty: def.penalty ? { ...def.penalty } : undefined,
    lane: "open",
    ownerId: null,
    attached: [],
    revealedDay: state.day,
    acquiredDay: null,
    expiredLane: null,
  };
}

export function refillOpen(state: GameState): void {
  let open = state.tasks.filter((task) => task.lane === "open").length;
  while (open < state.rules.openTasks) {
    if (state.taskDeck.length === 0) {
      if (state.taskDiscard.length === 0) break;
      state.taskDeck = shuffle(state, state.taskDiscard);
      state.taskDiscard = [];
      pushLog(state, "タスクの捨て札を山札に戻してシャッフル", "info");
    }
    const defId = state.taskDeck.shift();
    if (!defId) break;
    state.tasks.push(createTask(state, defId));
    open += 1;
  }
}

export function addDebt(state: GameState, player: PlayerState, amount: number): void {
  addCardToDiscard(state, player, "debt", 0, amount);
  recomputeTeamStats(state);
  pushLog(state, `${player.name} に負債 +${amount}`, "bad");
}

export function returnAttachedCards(state: GameState, task: TaskCard): void {
  for (const attached of task.attached) {
    const owner = state.players.find((player) => player.id === attached.ownerId);
    if (owner) owner.discard.push(attached.card);
  }
  task.attached = [];
}

function drawUncertaintyDef(state: GameState): string | null {
  if (state.uncertaintyDeck.length === 0) {
    if (state.uncertaintyDiscard.length === 0) return null;
    state.uncertaintyDeck = shuffle(state, state.uncertaintyDiscard);
    state.uncertaintyDiscard = [];
  }
  const defId = state.uncertaintyDeck.shift();
  if (!defId) return null;
  state.uncertaintyDiscard.push(defId);
  return defId;
}

function acquireTask(state: GameState, task: TaskCard): void {
  if (!task.ownerId) return;
  const puller = playerById(state, task.ownerId);
  const contributions = taskContributions(state, task);
  const recipient = contributions[0] ? playerById(state, contributions[0].playerId) : puller;
  const base = task.requirements;
  const designSum = taskSum(task, "design");
  const devSum = taskSum(task, "dev");
  const testSum = taskSum(task, "test");
  const pieces =
    task.attached.length + task.tokenWork.design + task.tokenWork.dev + task.tokenWork.test;
  // 要求合計に対する作業ピース数（カード＋LLMトークン）の比率で0〜3枚引く。
  const requirementTotal = base.design + base.dev + base.test;
  let draws = 0;
  if (requirementTotal > 0) {
    if (2 * pieces >= requirementTotal) draws = 3;
    else if (8 * pieces >= 3 * requirementTotal) draws = 2;
    else if (3 * pieces >= requirementTotal) draws = 1;
  }
  const added = { design: 0, dev: 0, test: 0 };
  const requirements: { phase: "design" | "dev" | "test"; amount: number }[] = [];
  const uncertaintyReports: { title: string; description: string }[] = [];
  let extraDebt = 0;
  let scoreBonus = 0;

  for (let i = 0; i < draws; i += 1) {
    const defId = drawUncertaintyDef(state);
    if (!defId) break;
    const def = UNCERTAINTY_BY_ID[defId];
    if (!def) continue;
    uncertaintyReports.push({ title: def.title, description: def.description });
    switch (def.effect.kind) {
      case "require":
        added[def.effect.phase] += def.effect.amount;
        requirements.push({ phase: def.effect.phase, amount: def.effect.amount });
        pushLog(state, `不確実: ${def.title}`, "bad");
        break;
      case "debt":
        extraDebt += def.effect.amount;
        pushLog(state, `不確実: ${def.title}`, "bad");
        break;
      case "score":
        scoreBonus += def.effect.amount;
        pushLog(state, `不確実: ${def.title}`, "good");
        break;
      case "nothing":
        pushLog(state, `不確実: ${def.title}`, "info");
        break;
    }
  }

  // 要求は合算せず、不確実カード1枚ごとに作業で賄えたか判定する。
  // ベース要件を超えた分（余剰作業）だけが不確実を吸収できる。
  const surplus = {
    design: Math.max(0, designSum - base.design),
    dev: Math.max(0, devSum - base.dev),
    test: Math.max(0, testSum - base.test),
  };
  let unmet = 0;
  for (const requirement of requirements) {
    if (surplus[requirement.phase] >= requirement.amount) {
      surplus[requirement.phase] -= requirement.amount;
    } else {
      unmet += 1;
    }
  }
  if (unmet > 0) {
    extraDebt += unmet;
    pushLog(state, `要求未達: ${task.title}（不確実 ${unmet}枚を賄えず / 負債 +${unmet}）`, "bad");
  }
  if (extraDebt > 0) addDebt(state, recipient, extraDebt);

  // モーダルは人間が獲得者になった時だけ対象にする。AI の獲得で上書きしない。
  if (recipient.isHuman) {
    state.lastAcquisition = {
      id: task.id,
      day: state.day,
      taskTitle: task.title,
      pullerId: puller.id,
      pullerName: puller.name,
      recipientId: recipient.id,
      recipientName: recipient.name,
      contributions,
      score: task.score + scoreBonus,
      reward: { ...task.reward },
      uncertainty: uncertaintyReports,
      added: { ...added },
      unmet: unmet > 0,
      debt: extraDebt,
      teamDebt: state.teamDebt,
    };
  }

  task.lane = "done";
  task.acquiredDay = state.day;
  state.taskDiscard.push(task.defId);
  recipient.completed += 1;
  const contributionText = contributions.length > 0 ? ` / 獲得者: ${recipient.name}` : "";
  pushLog(
    state,
    `獲得: ${task.title}（チーム +${task.score + scoreBonus}${contributionText}）`,
    "good",
  );

  recipient.discard.push({
    id: state.nextCardId++,
    type: task.reward.type,
    level: task.reward.level,
    title: task.title,
    effect: task.reward.effect,
    score: task.score + scoreBonus,
  });
  recomputeTeamStats(state);
  pushLog(
    state,
    `報酬カード: ${task.title}（${task.reward.type} lv${task.reward.level}）を捨て札へ`,
    "good",
  );

  returnAttachedCards(state, task);
}

/** 要件を満たしたタスクを次のレーンへ進める */
export function advanceTasks(state: GameState): void {
  let changed = true;
  let guard = 0;
  while (changed && guard < 50) {
    guard += 1;
    changed = false;
    for (const task of state.tasks) {
      if (!task.ownerId) continue;
      if (task.lane === "inbox") {
        if (taskSum(task, "design") < task.requirements.design) continue;
        task.lane = "wip";
        pushLog(state, `In Progress へ: ${task.title}`, "info");
        changed = true;
      } else if (task.lane === "wip") {
        if (taskSum(task, "dev") < task.requirements.dev) continue;
        if (task.requirements.test > 0) {
          task.lane = "test";
          pushLog(state, `Review へ: ${task.title}`, "info");
          changed = true;
        } else {
          acquireTask(state, task);
          changed = true;
        }
      } else if (task.lane === "test") {
        if (taskSum(task, "test") < task.requirements.test) continue;
        acquireTask(state, task);
        changed = true;
      }
    }
  }
}

export function activeWip(state: GameState): number {
  return state.tasks.filter(
    (task) => task.lane === "inbox" || task.lane === "wip" || task.lane === "test",
  ).length;
}

export function canPull(state: GameState): boolean {
  return state.tasks.some((task) => task.lane === "open");
}

function penaltyTargets(state: GameState, task: TaskCard, target: "owner" | "all"): PlayerState[] {
  if (target === "all") return state.players;
  const owner = task.ownerId
    ? state.players.find((player) => player.id === task.ownerId)
    : undefined;
  return owner ? [owner] : state.players;
}

function applyExpiryPenalty(state: GameState, task: TaskCard): void {
  const penalty = task.penalty;
  if (!penalty) return;

  if (penalty.kind === "allPlayersDebt" || penalty.kind === "ownerDebt") {
    const targets =
      penalty.kind === "allPlayersDebt" ? state.players : penaltyTargets(state, task, "owner");
    pushLog(
      state,
      `罰則: ${task.title} → ${penalty.kind === "allPlayersDebt" ? "全員" : "担当者"}に負債 ${penalty.amount}枚`,
      "bad",
    );
    for (const player of targets) addDebt(state, player, penalty.amount);
    return;
  }

  if (penalty.kind === "teamScore") {
    state.scorePenalty += penalty.amount;
    pushLog(state, `罰則: ${task.title} → チームスコア -${penalty.amount}`, "bad");
    return;
  }

  if (penalty.kind === "discardHand") {
    const targets = penaltyTargets(state, task, penalty.target);
    for (const player of targets) {
      const discarded = discardHand(player);
      pushLog(state, `罰則: ${task.title} → ${player.name} の手札 ${discarded}枚を捨て札へ`, "bad");
    }
    return;
  }

  if (penalty.kind === "loseAction") {
    const targets = penaltyTargets(state, task, penalty.target);
    for (const player of targets) player.actionPenalty += penalty.amount;
    pushLog(
      state,
      `罰則: ${task.title} → ${penalty.target === "all" ? "全員" : "担当者"}の次回アクション -${penalty.amount}`,
      "bad",
    );
    return;
  }

  const active = state.tasks.filter(
    (entry) => entry.lane === "inbox" || entry.lane === "wip" || entry.lane === "test",
  );
  for (const entry of active) entry.tokens += penalty.amount;
  pushLog(state, `罰則: ${task.title} → 進行中タスクに納期トークン +${penalty.amount}`, "bad");
}

export function expireTasks(state: GameState): void {
  for (const task of state.tasks) {
    if (task.lane === "done" || task.lane === "trash") continue;
    task.tokens += 1;
    if (task.tokens < task.deadline) continue;

    const previous = task.lane;
    task.expiredLane = previous;
    task.lane = "trash";
    state.taskDiscard.push(task.defId);

    if (task.penalty) applyExpiryPenalty(state, task);

    if (previous === "open") {
      pushLog(state, `納期切れ（Backlog）: ${task.title}`, "bad");
      continue;
    }

    returnAttachedCards(state, task);
    pushLog(state, `納期切れ: ${task.title}（カードは捨て札へ）`, "bad");
  }
  refillOpen(state);
}
