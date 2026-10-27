import type { CardInstance, TaskCard } from "../types";
import type { Phase } from "../rules/lanes";

export type PlayType = Phase;

export interface PlayCandidate {
  kind: "play";
  card: CardInstance;
  task: TaskCard;
  support: boolean;
  type: PlayType;
  remaining: number;
  required: number;
}

export type PullCandidate = { kind: "pull"; task: TaskCard };
export type TrashCandidate = { kind: "trash"; card: CardInstance };
export type BotAction = PlayCandidate | PullCandidate | TrashCandidate;
export type ScoredAction = { action: BotAction; score: number };

/** LLMトークンをいつ使うか。 */
export type TokenPolicy =
  /** 行動選択の前に、残り要求があるタスクへ使う（従来） */
  | "immediate"
  /** カードの行動を実行した後に使う */
  | "after"
  /** 残り1点のタスクだけ、行動前に使う */
  | "finish"
  /** 残り1点のタスクだけ、行動後に使う */
  | "after-finish"
  /** 使わない */
  | "never";

export interface BotOptions {
  tokenPolicy: TokenPolicy;
}

export const DEFAULT_BOT_OPTIONS: BotOptions = { tokenPolicy: "immediate" };
