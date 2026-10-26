export const HUMAN_ID = "p1";

export interface TeamRules {
  openTasks: number;
  debtLimit: number;
  starOne: number;
  starTwo: number;
  starThree: number;
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

export type AiProfile = "standard" | "strong";
export type ContributionPhase = "design" | "dev" | "test";

export interface ContributionStats {
  cards: number;
  points: number;
}

export interface CardEffectMap {
  draw: { amount: number };
  action: { amount: number };
  "debt-clean": { amount: number };
  deadline: { amount: number };
  token: { token: string; amount: number };
  shield: { amount: number };
}

export type CardEffectKind = keyof CardEffectMap;

export type CardEffect = {
  [K in CardEffectKind]: { kind: K } & CardEffectMap[K];
}[CardEffectKind];

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
  /** 実際に使った種類（代用ありルールでは代用元はlv1） */
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

export interface TaskPenaltyMap {
  debt: { target: "owner" | "all"; amount: number };
  teamScore: { amount: number };
  discardHand: { target: "owner" | "all" };
  loseAction: { target: "owner" | "all"; amount: number };
}

export type TaskPenaltyKind = keyof TaskPenaltyMap;

export type TaskPenalty = {
  [K in TaskPenaltyKind]: { kind: K } & TaskPenaltyMap[K];
}[TaskPenaltyKind];

export interface TaskDef {
  id: string;
  title: string;
  /** 自動生成時のテーマ。テンプレート生成では未設定 */
  theme?: string;
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
  /** mi などの作業トークン。レベル1作業としてフェーズに加算する */
  tokenWork: { design: number; dev: number; test: number };
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
  /** mi などの個人トークン */
  tokens: Record<string, number>;
  /** 次に受ける負債を防ぐシールド */
  shields?: number;
  /** 翌日開始時に失うアクション数 */
  actionPenalty: number;
  completed: number;
  score: number;
}

export interface RiskEffectMap {
  require: { phase: "design" | "dev" | "test"; amount: number };
  /** 任意フェーズの余剰で吸収できるリスク */
  wildcard: { amount: number };
  /** 想定外の好機。LLMトークンを得る */
  token: { amount: number };
  nothing: {};
}

export type RiskEffectKind = keyof RiskEffectMap;

export type RiskEffect = {
  [K in RiskEffectKind]: { kind: K } & RiskEffectMap[K];
}[RiskEffectKind];

export interface RiskDef {
  id: string;
  title: string;
  description: string;
  effect: RiskEffect;
}

export interface RiskStat {
  drawn: number;
  absorbed: number;
  unmet: number;
  debt: number;
}

export interface LogEntry {
  day: number;
  message: string;
  kind: "info" | "good" | "bad";
}

export interface GameAnalytics {
  actions: { play: number; pull: number; trash: number; pass: number };
  playByPhase: Record<ContributionPhase, number>;
  supportPlays: number;
  substitutions: number;
  tokensUsed: number;
  debtSources: { risk: number; incident: number; other: number };
  /** プレイヤーごとの行動傾向。リザルトのポジション判定に使う */
  players: Record<string, PlayerAnalytics>;
}

export interface PlayerAnalytics {
  actions: { play: number; pull: number; trash: number; pass: number };
  playByPhase: Record<ContributionPhase, number>;
  supportPlays: number;
  supportPoints: number;
  substitutions: number;
  tokensUsed: number;
  incidentPlays: number;
  effectPlays: number;
  debtCleaned: number;
}

export interface DaySnapshot {
  day: number;
  teamScore: number;
  teamDebt: number;
  open: number;
  wip: number;
  completed: number;
  lanes: Record<"open" | "inbox" | "wip" | "test" | "done", number>;
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
  contributed: Record<ContributionPhase, ContributionStats>;
  deck: Record<CardType, number>;
  /** リザルトのポジション判定に使う行動傾向 */
  analytics?: PlayerAnalytics;
  /** 判定されたポジション（24種 + オールラウンダー） */
  archetypeId?: string;
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
  risks: { title: string; description: string }[];
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
  version: 28;
  seed: number;
  rngState: number;
  day: number;
  totalDays: number;
  /** チームメイトAIの性格生成プロファイル */
  aiProfile: AiProfile;
  /** このゲームのタスク要求量の揺らぎ幅（0〜0.2） */
  generationSwing: number;
  phase: "human" | "ai" | "roundEnd" | "over";
  activePlayerIndex: number;
  humanId: string;
  players: PlayerState[];
  tasks: TaskCard[];
  /** このゲーム用に生成されたタスク定義 */
  taskDefs: TaskDef[];
  taskDeck: string[];
  taskDiscard: string[];
  riskDeck: string[];
  riskDiscard: string[];
  /** リスクカードごとの draw / 吸収 / 未吸収 / 発生した負債 */
  riskStats: Record<string, RiskStat>;
  /** ゲーム中の行動・負債発生源の集計。リザルトの傾向表示に使う */
  analytics: GameAnalytics;
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
  | { type: "AUTO_STEP" }
  | { type: "END_ROUND" }
  | { type: "DISCARD_CARD"; cardId: number }
  | { type: "USE_TOKEN"; token: string; taskId: string }
  | { type: "HYDRATE"; state: GameState }
  | {
      type: "RESTART";
      seed?: number;
      days?: number;
      aiCount?: number;
      generationSwing?: number;
      aiProfile?: AiProfile;
    };
