import type {
  CountryKey,
  Pawn,
  PawnType,
  Engine,
  GameState,
  BoardCountry,
  Gain,
  FxEvent,
} from "../types.ts";
import { COUNTRIES } from "../data/countries.ts";
import { advanceTrack } from "./tracks.ts";

/* ============================================================
   状態参照ヘルパー（engine.S を対象に、純粋に読むだけ）
============================================================ */
export const PC = (S: GameState): number => S.players.length;
export const cdef = (k: CountryKey) => COUNTRIES[k];
export const country = (S: GameState, k: CountryKey): BoardCountry => {
  const c = S.board.find((x) => x.key === k);
  if (!c) throw new Error(`盤上に国がありません: ${k}`);
  return c;
};
export const cap = (S: GameState, k: CountryKey): number => cdef(k).cap(PC(S));
export const hasDoc = (p: GameState["players"][number], k: string) =>
  p.doctrines.find((d) => d.key === k);
export const docLv = (p: GameState["players"][number], k: string): number => {
  const d = hasDoc(p, k);
  return d ? d.lv : 0;
};
export const onBoard = (S: GameState, pi: number): { c: BoardCountry; pw: Pawn }[] => {
  const a: { c: BoardCountry; pw: Pawn }[] = [];
  S.board.forEach((c) =>
    c.pawns.forEach((pw) => {
      if (pw.owner === pi) a.push({ c, pw });
    }),
  );
  return a;
};
export const inflOf = (pw: Pawn): number => (pw.type === "ap" ? 3 : 1);
export const inflIn = (c: BoardCountry, pi: number): number =>
  c.pawns.reduce((s, pw) => s + (pw.owner === pi ? inflOf(pw) : 0), 0);
export const countIn = (c: BoardCountry, pi: number): number =>
  c.pawns.filter((pw) => pw.owner === pi).length;

export function ranksOf(S: GameState, c: BoardCountry): { pi: number; inf: number }[] {
  const arr = S.players.map((_p, i) => ({ pi: i, inf: inflIn(c, i) })).filter((x) => x.inf > 0);
  arr.sort((a, b) => b.inf - a.inf);
  return arr;
}
export function topOf(S: GameState, c: BoardCountry): number[] {
  const r = ranksOf(S, c);
  if (!r.length) return [];
  const m = r[0].inf;
  return r.filter((x) => x.inf === m).map((x) => x.pi);
}
export function secondOf(S: GameState, c: BoardCountry): number[] {
  const r = ranksOf(S, c);
  if (!r.length) return [];
  const m = r[0].inf;
  const rest = r.filter((x) => x.inf < m);
  if (!rest.length) return [];
  const m2 = rest[0].inf;
  return rest.filter((x) => x.inf === m2).map((x) => x.pi);
}
export const presencePlayers = (c: BoardCountry): number[] => {
  const set = new Set<number>();
  c.pawns.forEach((pw) => set.add(pw.owner));
  return [...set];
};

/* ============================================================
   ログ
============================================================ */
export function logEvent(
  e: Engine,
  key: string,
  params?: Record<string, string | number>,
  cls?: string,
): void {
  e.log.push({ id: e.S.logSeq++, key, params, cls });
}

/** wait 演出：waitTicksをセットして1度停止させる */
export function setWait(e: Engine, n: number): void {
  e.waitTicks = n;
}

type FxEventInput = FxEvent extends infer T ? (T extends FxEvent ? Omit<T, "id"> : never) : never;

export function fxEvent(e: Engine, ev: FxEventInput): void {
  e.fx.push({ ...ev, id: e.fxSeq++ } as FxEvent);
}

/** VP加算＋vp演出イベント。理由(sourceKey)はロケールキー fx.vpSrc.* の末尾 */
export function gainVp(
  e: Engine,
  pi: number,
  n: number,
  sourceKey: string,
  countryKey?: CountryKey,
): void {
  if (n <= 0) return;
  e.S.players[pi].vp += n;
  fxEvent(e, { kind: "vp", pi, n, sourceKey, country: countryKey });
}

/** コマを盤に配置 */
export function placePawn(e: Engine, pi: number, type: PawnType, key: CountryKey): Pawn {
  const c = country(e.S, key);
  const p = e.S.players[pi];
  if (type === "ac") p.act.ac--;
  else p.act.ap--;
  const pw: Pawn = {
    owner: pi,
    type,
    seq: e.S.seq++,
    uid: e.S.uid++,
  };
  c.pawns.push(pw);
  fxEvent(e, { kind: "dispatch", pi, pawn: type, country: key, uid: pw.uid });
  logEvent(e, "log.dispatch", { player: pi, pawn: type, country: key });
  return pw;
}

/** 即時効果を適用(国効果・教義効果で共用) */
export function applyGain(
  e: Engine,
  pi: number,
  g: Gain,
  sourceKey = "effect",
  countryKey?: CountryKey,
): void {
  const p = e.S.players[pi];
  if (g.ac) p.act.ac += g.ac;
  if (g.ap) p.act.ap += g.ap;
  if (g.vp) gainVp(e, pi, g.vp, sourceKey, countryKey);
  if (g.track) advanceTrack(p.tracks, g.track, 1);
}
