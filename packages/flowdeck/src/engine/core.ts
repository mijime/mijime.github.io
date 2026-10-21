import { discardHand, drawCards } from "./hand";
import { pushLog } from "./log";
import { makeSnapshot, playerById, recomputeTeamStats } from "./metrics";
import { computeOutcome } from "./scoring";
import { advanceTasks, canPull, expireTasks, refillOpen } from "./tasks";
import type { CardInstance, GameState, PlayerState } from "./types";
import { ACTIONS_PER_TURN } from "./types";

export function pullTask(state: GameState, playerId: string, taskId: string): boolean {
  const player = state.players.find((p) => p.id === playerId);
  const task = state.tasks.find((t) => t.id === taskId && t.lane === "open");
  if (!player || !task || player.actionsLeft <= 0) return false;
  if (!canPull(state)) return false;

  task.lane = "inbox";
  task.ownerId = playerId;
  player.actionsLeft -= 1;
  refillOpen(state);
  pushLog(state, `${player.name}: ${task.title} を Ready へ`, "info");
  return true;
}

function applyCardEffect(
  state: GameState,
  player: PlayerState,
  card: CardInstance,
  task: {
    title: string;
    requirements: { design: number; dev: number; test: number };
    deadline: number;
  },
  targetType: "design" | "dev" | "test",
): void {
  const effect = card.effect;
  if (!effect || effect.amount <= 0) return;

  if (effect.kind === "draw") {
    const drawn = drawCards(state, player, effect.amount);
    if (drawn > 0) pushLog(state, `${player.name}: カード効果で${drawn}枚ドロー`, "good");
    return;
  }

  if (effect.kind === "action") {
    player.actionsLeft += effect.amount;
    pushLog(state, `${player.name}: カード効果でアクション +${effect.amount}`, "good");
    return;
  }

  if (effect.kind === "debt-clean") {
    let removed = 0;
    for (const zone of [player.hand, player.deck, player.discard]) {
      const index = zone.findIndex((candidate) => candidate.type === "debt");
      if (index >= 0) {
        zone.splice(index, 1);
        removed += 1;
        if (removed >= effect.amount) break;
      }
    }
    if (removed > 0) {
      recomputeTeamStats(state);
      pushLog(state, `${player.name}: カード効果で負債 ${removed}枚を除去`, "good");
    }
    return;
  }

  if (effect.kind === "requirement") {
    const before = task.requirements[targetType];
    task.requirements[targetType] = Math.max(0, before - effect.amount);
    const reduced = before - task.requirements[targetType];
    if (reduced > 0) {
      pushLog(state, `${player.name}: 要件トークン -${reduced} → ${task.title}`, "good");
    }
    return;
  }

  if (effect.kind === "deadline") {
    task.deadline += effect.amount;
    pushLog(state, `${player.name}: 納期トークン +${effect.amount} → ${task.title}`, "good");
  }
}

export function playCard(
  state: GameState,
  playerId: string,
  cardId: number,
  taskId: string,
): boolean {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.actionsLeft <= 0) return false;

  const handIndex = player.hand.findIndex((card) => card.id === cardId);
  const card = player.hand[handIndex];
  if (!card || card.type === "debt") return false;

  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return false;

  const targetType =
    task.lane === "inbox"
      ? "design"
      : task.lane === "wip"
        ? "dev"
        : task.lane === "test"
          ? "test"
          : null;
  if (!targetType) return false;

  if (targetType === "test" && card.type !== "test") return false;

  const playType = targetType;
  const boost = card.effect?.kind === "boost" ? card.effect.amount : 0;
  const playLevel = (card.type === targetType ? card.level : 1) + boost;
  player.hand.splice(handIndex, 1);
  task.attached.push({ card, ownerId: playerId, playType, playLevel });
  player.contributed[playType].cards += 1;
  player.contributed[playType].points += playLevel;
  player.actionsLeft -= 1;
  applyCardEffect(state, player, card, task, playType);

  const support = task.ownerId !== playerId;
  const substitute = card.type !== targetType;
  const typeLabel = playType === "design" ? "設計" : playType === "dev" ? "開発" : "テスト";
  pushLog(
    state,
    `${player.name}: ${typeLabel}lv${playLevel}${substitute ? `（${card.type}lv${card.level}代用）` : ""}${
      support ? " 支援" : ""
    } → ${task.title}`,
    "info",
  );

  advanceTasks(state);
  return true;
}

export function discardCard(state: GameState, playerId: string, cardId: number): boolean {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.actionsLeft <= 0) return false;
  const index = player.hand.findIndex((card) => card.id === cardId);
  if (index < 0) return false;
  const [card] = player.hand.splice(index, 1);
  if (!card) return false;
  player.actionsLeft -= 1;
  recomputeTeamStats(state);
  pushLog(state, `${player.name}: ${card.title ?? `${card.type} lv${card.level}`} を廃棄`, "info");
  return true;
}

export function endPlayerTurn(state: GameState, playerId: string): void {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return;
  const remaining = player.actionsLeft;
  const debt = player.hand.filter((card) => card.type === "debt").length;
  discardHand(player);
  player.actionsLeft = 0;
  if (remaining > 0) {
    pushLog(state, `${player.name}: パス（残り${remaining}アクションを放棄）`, "info");
  }
  if (debt > 0) {
    pushLog(state, `${player.name}: 負債カード ${debt}枚を含む手札を捨て札へ`, "bad");
  }
}

/** 次のアクションができるプレイヤーへ。誰もいなければ日末へ */
export function advanceAction(state: GameState): void {
  const count = state.players.length;
  const current = state.activePlayerIndex;
  for (let offset = 1; offset <= count; offset += 1) {
    const index = (current + offset) % count;
    const player = state.players[index];
    if (player && player.actionsLeft > 0) {
      state.activePlayerIndex = index;
      state.phase = index === 0 ? "human" : "ai";
      return;
    }
  }
  state.phase = "roundEnd";
}

/** 1アクション後の共通処理。使い切ったら手札を捨て、次の人へ */
export function finishAction(state: GameState): void {
  const player = state.players[state.activePlayerIndex];
  if (player && player.actionsLeft <= 0) endPlayerTurn(state, player.id);
  advanceAction(state);
}

/** 全員の手札・アクションをリセットして、あなたから1手ずつ始める */
export function startRound(state: GameState): void {
  for (const player of state.players) startPlayerTurn(state, player.id);
  state.phase = "human";
  state.activePlayerIndex = 0;
  if ((state.players[0]?.actionsLeft ?? 0) <= 0) advanceAction(state);
}

export function startPlayerTurn(state: GameState, playerId: string): void {
  const player = playerById(state, playerId);
  discardHand(player);
  const penalty = player.actionPenalty;
  player.actionPenalty = 0;
  player.actionsLeft = Math.max(0, ACTIONS_PER_TURN - penalty);
  if (penalty > 0) {
    pushLog(
      state,
      `${player.name}: 罰則でアクション -${penalty}（${player.actionsLeft}手で開始）`,
      "bad",
    );
  }
  drawCards(state, player, 5);
}

export function finishRound(state: GameState): void {
  expireTasks(state);
  recomputeTeamStats(state);
  state.metrics.push(makeSnapshot(state));
  pushLog(state, `Day ${state.day} 終了`, "info");
  state.day += 1;

  if (state.day > state.totalDays) {
    state.phase = "over";
    state.outcome = computeOutcome(state);
    pushLog(state, "プロジェクト終了", "good");
    return;
  }

  startRound(state);
  pushLog(state, `Day ${state.day} 開始`, "info");
}
