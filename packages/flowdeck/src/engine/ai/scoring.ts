import { playerWip } from "../metrics";
import type { RuleSet } from "../rules";
import { effectivePlayLevel } from "../rules/lanes";
import type { CardInstance, GameState, PersonalityWeights, PlayerState, TaskCard } from "../types";
import { playFeature, playValue, pullFeature, taskValue, urgencyOf } from "./features";
import type { PlayCandidate } from "./types";

const PLAY_BASE = 60;
const PULL_BASE = 55;
const TRASH_BASE = 0;
const FOCUS_SCALE = 45;
const GREED_SCALE = 50;
const URGENCY_SCALE = 50;
/** 性格に関係なく、納期が近いタスクを最低限は優先する */
const URGENCY_BASE = 24;

export function playScore(
  candidate: PlayCandidate,
  weights: PersonalityWeights,
  rules: RuleSet,
): number {
  const feature = playFeature(candidate, rules);
  const quality = candidate.type === "test" ? 0.5 + 0.5 * feature : Math.min(0.2, feature * 0.2);
  const hygiene = Math.max(0, -weights.greed);
  const urgency = urgencyOf(candidate.task);
  const playLevel = effectivePlayLevel(
    candidate.card,
    candidate.type,
    rules.balance.allowSubstitution,
  );
  const completion = playLevel >= candidate.remaining ? 1 : 0.35;

  return (
    PLAY_BASE +
    weights.focus * FOCUS_SCALE * feature +
    Math.max(0, weights.greed) * GREED_SCALE * playValue(candidate.task, candidate.card, rules) +
    hygiene * 12 * quality +
    (candidate.task.kind === "incident" ? 20 : 0) +
    weights.urgency * URGENCY_SCALE * urgency * completion +
    URGENCY_BASE * urgency * completion
  );
}

export function pullScore(
  task: TaskCard,
  state: GameState,
  player: PlayerState,
  weights: PersonalityWeights,
): number {
  const own = playerWip(state, player.id);

  return (
    PULL_BASE -
    weights.focus * FOCUS_SCALE * pullFeature(state, player) +
    Math.max(0, weights.greed) * 40 * taskValue(task) +
    weights.urgency * 30 * urgencyOf(task) +
    (task.kind === "incident" ? 20 : 0) -
    own * 14
  );
}

export function trashScore(
  card: CardInstance,
  state: GameState,
  weights: PersonalityWeights,
): number {
  // タスク報酬カードは AI の性格に関係なく捨てない
  if (card.score !== undefined || card.title) return Number.NEGATIVE_INFINITY;
  const hygiene = Math.max(0, -weights.greed);
  const debtPressure = state.teamDebt / Math.max(1, state.rules.debtLimit);

  // 負債は全AIが片付ける（能力の下限）。低レベルカードの廃棄だけ性格に任せる。
  if (card.type === "debt") {
    return 80 + debtPressure * 20 + hygiene * 10;
  }
  if (card.level > 3) return Number.NEGATIVE_INFINITY;
  const feature = (4 - card.level) / 3;
  return TRASH_BASE + hygiene * 70 * feature;
}
