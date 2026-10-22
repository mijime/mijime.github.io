export const HUMAN_ID = "p1";
export const ACTIONS_PER_TURN = 3;
export const HAND_SIZE = 5;
export const TOTAL_DAYS = 10;
export const DEBT_SCORE_PENALTY = 2;

export interface TeamRules {
  openTasks: number;
  debtLimit: number;
  starOne: number;
  starTwo: number;
  starThree: number;
}

/**
 * 人数×日数の目標値。
 * ランダム編成の分布を基準に、1星は下位25%、2星は上位25%、3星は上位10%。
 * 目標値はカード追加のたびに再計測する。
 * 参照は厳密な最適解ではなく、固定した強政策の近似。
 */
const TEAM_RULES_TABLE: Record<number, Record<number, TeamRules>> = {
  4: {
    10: { openTasks: 3, debtLimit: 15, starOne: 11, starTwo: 23, starThree: 28 },
    20: { openTasks: 3, debtLimit: 29, starOne: 30, starTwo: 47, starThree: 57 },
    30: { openTasks: 3, debtLimit: 39, starOne: 53, starTwo: 78, starThree: 88 },
  },
  5: {
    10: { openTasks: 4, debtLimit: 18, starOne: 17, starTwo: 27, starThree: 33 },
    20: { openTasks: 4, debtLimit: 32, starOne: 43, starTwo: 63, starThree: 69 },
    30: { openTasks: 4, debtLimit: 42, starOne: 69, starTwo: 96, starThree: 107 },
  },
  6: {
    10: { openTasks: 4, debtLimit: 22, starOne: 20, starTwo: 33, starThree: 42 },
    20: { openTasks: 4, debtLimit: 36, starOne: 55, starTwo: 74, starThree: 83 },
    30: { openTasks: 4, debtLimit: 46, starOne: 89, starTwo: 117, starThree: 128 },
  },
};

export function teamRulesFor(playerCount: number, totalDays = 10): TeamRules {
  const byDays = TEAM_RULES_TABLE[playerCount] ?? TEAM_RULES_TABLE[5]!;
  return byDays[totalDays] ?? byDays[10]!;
}

export type CardType = "design" | "dev" | "test" | "debt";
export type TaskLane = "open" | "inbox" | "wip" | "test" | "done" | "trash";
export interface PersonalityWeights {
  /** + 仕上げ / - 着手 */
  focus: number;
  /** + 得点・報酬 / - 整理・品質 */
  greed: number;
  /** + 納期 / - 長期 */
  urgency: number;
}
export type ContributionPhase = "design" | "dev" | "test";

export interface ContributionStats {
  cards: number;
  points: number;
}

export type CardEffect =
  | { kind: "draw"; amount: number }
  | { kind: "action"; amount: number }
  | { kind: "boost"; amount: number }
  | { kind: "debt-clean"; amount: number }
  /** 今のフェーズの要求を軽減するトークン */
  | { kind: "requirement"; amount: number }
  /** タスクの納期を延ばすトークン */
  | { kind: "deadline"; amount: number };

export interface CardInstance {
  id: number;
  type: CardType;
  level: number;
  title?: string;
  effect?: CardEffect;
  /** タスク報酬カードのスコア。デッキに残っている間だけチームスコアに数える */
  score?: number;
}

export interface AttachedCard {
  card: CardInstance;
  ownerId: string;
  /** 実際に使った種類（代用時は設計/開発のlv1） */
  playType: CardType;
  playLevel: number;
}

export interface TaskRequirements {
  design: number;
  dev: number;
  test: number;
}

export interface TaskReward {
  type: "design" | "dev" | "test";
  level: number;
  effect?: CardEffect;
}

export type TaskKind = "normal" | "incident";

export type TaskPenalty =
  | { kind: "allPlayersDebt"; amount: number }
  | { kind: "ownerDebt"; amount: number }
  | { kind: "teamScore"; amount: number }
  | { kind: "discardHand"; target: "owner" | "all" }
  | { kind: "loseAction"; target: "owner" | "all"; amount: number }
  | { kind: "deadlineToken"; amount: number };

export interface TaskDef {
  id: string;
  title: string;
  requirements: TaskRequirements;
  score: number;
  /** 納期トークンがこの数に達したらトラッシュ */
  deadline: number;
  /** 獲得時にタスクカード自身がなる報酬カード */
  reward: TaskReward;
  /** 通常タスク or インシデント */
  kind?: TaskKind;
  /** インシデントが期限切れになった時の罰則 */
  penalty?: TaskPenalty;
}

export interface TaskCard {
  id: string;
  defId: string;
  title: string;
  requirements: TaskRequirements;
  score: number;
  deadline: number;
  tokens: number;
  reward: TaskReward;
  kind: TaskKind;
  penalty?: TaskPenalty;
  lane: TaskLane;
  ownerId: string | null;
  attached: AttachedCard[];
  revealedDay: number;
  acquiredDay: number | null;
  expiredLane: TaskLane | null;
}

export interface PlayerState {
  id: string;
  name: string;
  isHuman: boolean;
  weights: PersonalityWeights;
  contributed: Record<ContributionPhase, ContributionStats>;
  deck: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  actionsLeft: number;
  /** 翌日開始時に失うアクション数 */
  actionPenalty: number;
  completed: number;
  score: number;
}

export type UncertaintyEffect =
  | { kind: "require"; phase: "design" | "dev" | "test"; amount: number }
  | { kind: "debt"; amount: number }
  | { kind: "score"; amount: number }
  | { kind: "nothing" };

export interface UncertaintyDef {
  id: string;
  title: string;
  description: string;
  effect: UncertaintyEffect;
}

export interface LogEntry {
  day: number;
  message: string;
  kind: "info" | "good" | "bad";
}

export interface DaySnapshot {
  day: number;
  teamScore: number;
  teamDebt: number;
  open: number;
  wip: number;
  completed: number;
  perPlayer: {
    id: string;
    wip: number;
    completed: number;
    hand: number;
    deck: number;
    discard: number;
  }[];
}

export interface PlayerOutcome {
  id: string;
  name: string;
  isHuman: boolean;
  weights: PersonalityWeights;
  completed: number;
  score: number;
  avgWip: number;
  lowCards: number;
  contributed: Record<ContributionPhase, ContributionStats>;
  deck: Record<CardType, number>;
}

export interface Contribution {
  playerId: string;
  playerName: string;
  points: number;
  cards: number;
  lastOrder: number;
}

export interface AcquisitionReport {
  id: string;
  day: number;
  taskTitle: string;
  pullerId: string;
  pullerName: string;
  recipientId: string;
  recipientName: string;
  contributions: Contribution[];
  score: number;
  reward: TaskReward;
  uncertainty: { title: string; description: string }[];
  mitigation: number;
  added: { design: number; dev: number; test: number };
  unmet: boolean;
  debt: number;
  teamDebt: number;
}

export interface Outcome {
  finalScore: number;
  stars: number;
  teamScore: number;
  teamDebt: number;
  scorePenalty: number;
  completed: number;
  failed: boolean;
  perPlayer: PlayerOutcome[];
  avgLeadTime: number;
  avgWip: number;
  bottleneck: "inbox" | "wip" | "test" | null;
  expired: number;
  testExpired: number;
  tips: string[];
}

export interface GameState {
  version: 16;
  seed: number;
  rngState: number;
  day: number;
  totalDays: number;
  phase: "human" | "ai" | "roundEnd" | "over";
  activePlayerIndex: number;
  humanId: string;
  players: PlayerState[];
  tasks: TaskCard[];
  /** このゲーム用に生成されたタスク定義 */
  taskDefs: TaskDef[];
  taskDeck: string[];
  taskDiscard: string[];
  uncertaintyDeck: string[];
  uncertaintyDiscard: string[];
  teamScore: number;
  teamDebt: number;
  scorePenalty: number;
  nextCardId: number;
  nextTaskId: number;
  log: LogEntry[];
  metrics: DaySnapshot[];
  outcome: Outcome | null;
  lastAcquisition: AcquisitionReport | null;
  rules: TeamRules;
}

export type Action =
  | { type: "PULL_TASK"; taskId: string }
  | { type: "PLAY_CARD"; cardId: number; taskId: string }
  | { type: "END_TURN" }
  | { type: "RUN_AI_TURN" }
  | { type: "END_ROUND" }
  | { type: "DISCARD_CARD"; cardId: number }
  | { type: "HYDRATE"; state: GameState }
  | { type: "RESTART"; seed?: number; days?: number; aiCount?: number };
