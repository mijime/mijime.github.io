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
