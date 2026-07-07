import type {
  Engine,
  EngineEvent,
  GameState,
  Player,
  CountryKey,
  Frame,
  FactionKey,
  TrackKey,
} from "../types.ts";
import { PNAMES } from "../data/players.ts";
import { logEvent } from "./helpers.ts";
import { run } from "./step.ts";
import { buildAdjacency } from "./map.ts";
import { emptyTracks, advanceTrack } from "./tracks.ts";
import { FACTIONS } from "../data/factions.ts";

/** 空のゲーム状態 */
function emptyState(): GameState {
  return {
    started: false,
    players: [],
    board: [],
    sel: [],
    adj: {},
    roundTiles: [],
    round: 1,
    order: [],
    firstPasser: null,
    cur: -1,
    phase: "setup",
    seq: 1,
    uid: 1,
    logSeq: 1,
    relicPool: [],
    relicsTaken: {},
    finalizing: false,
    over: false,
    pickMode: null,
    pendingAction: null,
  };
}

/** 初期エンジン（セットアップ前） */
export function createEngine(): Engine {
  return {
    S: emptyState(),
    stack: [],
    pending: null,
    log: [],
    bannerKey: "",
    waitTicks: 0,
    over: false,
    finalResults: null,
    fx: [],
    fxSeq: 1,
  };
}

/** ゲーム開始：プレイヤーと盤を構成し runGame フレームを積む */
export function startGame(
  e: Engine,
  cpuCount: number,
  sel: CountryKey[],
  seed: number,
  relicPool: string[],
  roundTiles: string[],
  factions?: FactionKey[],
): void {
  e.S.sel = sel;
  e.S.adj = buildAdjacency(sel);
  e.S.roundTiles = roundTiles;
  const n = cpuCount + 1;
  for (let i = 0; i < n; i++) {
    const fk = factions?.[i] ?? null;
    const player: Player = {
      name: PNAMES[i],
      isAI: i > 0,
      vp: 0,
      tracks: emptyTracks(),
      act: { ac: 3, ap: 1 },
      doctrines: [],
      relics: [],
      passed: false,
      faction: fk,
      promoteCount: 0,
    };
    if (fk) {
      const def = FACTIONS[fk];
      for (const [k, v] of Object.entries(def.tracks)) {
        advanceTrack(player.tracks, k as TrackKey, v);
      }
      player.doctrines.push({ key: def.doctrine, lv: 1 });
    }
    e.S.players.push(player);
  }
  e.S.board = e.S.sel.map((k) => ({ key: k, pawns: [] }));
  e.S.order = [];
  for (let i = 0; i < n; i++) {
    e.S.order.push((seed + i) % n);
  }
  e.S.relicPool = relicPool;
  e.S.started = true;
  logEvent(e, "log.roundStart", { round: 1 }, "sys");
  e.stack.push({ kind: "runGame", pc: 0, locals: {} } satisfies Frame);
  run(e);
}

/**
 * イベントを適用：pending を解決し、step を回して次の停止点まで進める。
 * 純粋reducer（e を mutate して同一参照を返す。store がバージョンで変更検知）。
 */
export function dispatch(e: Engine, ev: EngineEvent): Engine {
  switch (ev.type) {
    case "tick":
      if (e.waitTicks > 0) e.waitTicks--;
      break;
    case "chooseAction": {
      const f = e.stack[e.stack.length - 1];
      if (e.pending?.kind === "action" && f) {
        f.locals.answer = ev.action;
        e.pending = null;
      }
      break;
    }
    case "pickCountry": {
      const f = e.stack[e.stack.length - 1];
      if (e.pending?.kind === "pickCountry" && f) {
        f.locals.answer = ev.key;
        e.pending = null;
      }
      break;
    }
    case "modal": {
      const f = e.stack[e.stack.length - 1];
      if (e.pending?.kind === "modal" && f) {
        f.locals.answer = ev.index;
        e.pending = null;
      }
      break;
    }
  }
  run(e);
  return e;
}

/** 自動進行が必要か（wait消化 or 既に走行可能だが描画待ち） */
export function needsTick(e: Engine): boolean {
  return e.pending === null && e.stack.length > 0 && e.waitTicks > 0;
}
