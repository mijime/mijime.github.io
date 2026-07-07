/* ============================================================
   型定義 — 全モジュールが共有するゲームドメインの契約
============================================================ */

/** コマの種別：信徒(ac) / 使徒(ap) */
export type PawnType = "ac" | "ap";

/** 国キー（COUNTRIES のキー "A"〜"O"） */
export type CountryKey = string;

/** 教義キー（DOCTRINES のキー） */
export type DoctrineKey = string;

/** 勢力キー */
export type FactionKey = "senkyoshi" | "shisai" | "junkyosha" | "kenja" | "kaitakusha" | "shinpika";

/** 聖遺物キー（RELICS のキー） */
export type RelicKey = string;

/** 信仰トラックキー */
export type TrackKey = "mission" | "sacrament" | "sacrifice" | "wisdom";

/** 信仰トラック */
export type Tracks = Record<TrackKey, number>;

/** 即時効果の共通形(国効果・教義効果で共用) */
export interface Gain {
  ac?: number;
  ap?: number;
  vp?: number;
  track?: TrackKey;
}

/** ゲームフェーズ */
export type Phase = "setup" | "income" | "action" | "judgment" | "final";

/** 盤上に配置されたコマ */
export interface Pawn {
  owner: number;
  type: PawnType;
  seq: number;
  uid: number;
}

/** プレイヤーの所有する教義（レベル付き） */
export interface OwnedDoctrine {
  key: DoctrineKey;
  lv: 1 | 2;
}

/** コマのストック（活動エリア / 聖堂で共用する形） */
export interface Stock {
  ac: number;
  ap: number;
}

/** プレイヤー（教祖） */
export interface Player {
  name: string;
  isAI: boolean;
  vp: number;
  tracks: Tracks;
  act: Stock;
  doctrines: OwnedDoctrine[];
  relics: RelicKey[];
  passed: boolean;
  faction: FactionKey | null;
}

/** 盤上の国（配置されたコマを保持） */
export interface BoardCountry {
  key: CountryKey;
  pawns: Pawn[];
}

/** 国の静的定義 */
export interface CountryDef {
  col: number;
  /** プレイヤー数 n から配置上限を返す */
  cap: (n: number) => number;
  /** 派遣時に派遣者へ適用する即時効果。apExtra なら使徒派遣で2回適用 */
  effect: Gain & { apExtra?: boolean };
}

/** 教義の静的定義 */
export interface DoctrineDef {
  /** acquire 時に前進するトラック(性格付け) */
  track: TrackKey;
  lv1: Gain;
  lv2: Gain;
  /** Lv2 到達時の終了時ボーナスVP */
  endVp: number;
}

/** 聖遺物の静的定義 */
export interface RelicDef {
  /** 終了時VP */
  vp: number;
  /** そのラウンド中に達成すべき条件(完全公開・決定論) */
  cond: (S: GameState, pi: number) => boolean;
}

/** 国選択モード（人間の3Dクリック待ち） */
export interface PickMode {
  valid: CountryKey[];
  resolve: (key: CountryKey | null) => void;
}

/** プレイヤーが選択しうるアクション（判別Union） */
export type Action =
  | { type: "pass" }
  | { type: "dispatch"; pawn: PawnType; country: CountryKey }
  | { type: "promote" }
  | { type: "acquire"; doc: DoctrineKey }
  | { type: "deepen"; doc: DoctrineKey }
  | { type: "upgrade"; country: CountryKey };

/** アクションの解決待ちコールバック */
export type PendingAction = (action: Action) => void;

/** ゲーム全体の状態 */
export interface GameState {
  started: boolean;
  players: Player[];
  board: BoardCountry[];
  sel: CountryKey[];
  adj: Record<CountryKey, CountryKey[]>;
  roundTiles: string[];
  round: number;
  order: number[];
  firstPasser: number | null;
  cur: number;
  phase: Phase;
  seq: number;
  uid: number;
  logSeq: number;
  relicPool: RelicKey[];
  relicsTaken: Record<RelicKey, number>;
  finalizing: boolean;
  over: boolean;
  pickMode: PickMode | null;
  pendingAction: PendingAction | null;
}

/** モーダルの選択肢 */
export interface ModalOption {
  labelKey: string;
  labelParams?: Record<string, string | number>;
  descKey?: string;
  descParams?: Record<string, string | number>;
  costKey?: string;
  costParams?: Record<string, string | number>;
  disabled?: boolean;
}

/* ============================================================
   エンジン（純粋reducerステートマシン）
============================================================ */

/** ログ1件 */
export interface LogEntry {
  id: number;
  key: string;
  params?: Record<string, string | number>;
  cls?: string;
}

/** 演出イベント（追記専用。UI再生レイヤーが消化する） */
export type FxEvent =
  | { id: number; kind: "phase"; phase: Phase; round: number }
  | { id: number; kind: "dispatch"; pi: number; pawn: PawnType; country: CountryKey; uid: number }
  | { id: number; kind: "recall"; pi: number; pawn: PawnType; country: CountryKey }
  | { id: number; kind: "promote"; pi: number }
  | { id: number; kind: "upgrade"; pi: number; country: CountryKey }
  | { id: number; kind: "acquire"; pi: number; doc: DoctrineKey }
  | { id: number; kind: "deepen"; pi: number; doc: DoctrineKey }
  | { id: number; kind: "pass"; pi: number }
  | { id: number; kind: "income"; pi: number; ac: number; ap: number }
  | { id: number; kind: "vp"; pi: number; n: number; sourceKey: string; country?: CountryKey }
  | { id: number; kind: "judgment"; pi: number; country: CountryKey }
  | { id: number; kind: "relic"; pi: number; relic: RelicKey };

/** 人間入力要求（判別Union）。null なら自動進行可能 */
export type Pending =
  | { kind: "action"; pi: number }
  | {
      kind: "pickCountry";
      pi: number;
      valid: CountryKey[];
      labelKey: string;
      labelParams?: Record<string, string | number>;
      allowSkip: boolean;
      skipKey?: string;
    }
  | {
      kind: "modal";
      pi: number;
      titleKey: string;
      titleParams?: Record<string, string | number>;
      subKey?: string;
      subParams?: Record<string, string | number>;
      opts: ModalOption[];
      cancelKey?: string;
    };

/** エンジンへ送るイベント */
export type EngineEvent =
  | { type: "tick" }
  | { type: "chooseAction"; action: Action }
  | { type: "pickCountry"; key: CountryKey | null }
  | { type: "modal"; index: number | null };

/**
 * 手続きフレーム。pc(program counter) で分岐する小さな手続き。
 * locals に作業変数を保持し、ret に子フレームの戻り値を受け取る。
 */
export interface Frame {
  kind: string;
  pc: number;
  /** 作業用ローカル変数（手続きごとに自由に使う） */
  locals: Record<string, unknown>;
  /** pop した子フレームの戻り値の受け皿 */
  ret?: unknown;
}

/** エンジン全体の状態 */
export interface Engine {
  S: GameState;
  stack: Frame[];
  pending: Pending | null;
  log: LogEntry[];
  bannerKey: string;
  /** wait 演出のための残り tick 数（>0 の間は自動進行を1tick遅らせる） */
  waitTicks: number;
  over: boolean;
  /** 最終審判の結果（描画用） */
  finalResults: FinalResult[] | null;
  /** 演出イベント（追記専用） */
  fx: FxEvent[];
  fxSeq: number;
}

/** 最終審判の結果（1プレイヤー分） */
export interface FinalResult {
  pi: number;
  total: number;
  lines: { key: string; n: number; params?: Record<string, string | number> }[];
  boardInfl: number;
  apCnt: number;
  pawnsCount: number;
}
