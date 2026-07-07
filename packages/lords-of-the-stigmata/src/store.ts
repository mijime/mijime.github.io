import type { Engine, EngineEvent, CountryKey, RelicKey, FactionKey } from "./types.ts";
import {
  createEngine,
  startGame as engineStart,
  dispatch as engineDispatch,
  needsTick,
} from "./engine/engine.ts";
import { decideAction } from "./engine/ai.ts";
import { enqueue, initPlayback, isPlaying } from "./fx/playback.ts";

/* ============================================================
   React 連携ストア（useSyncExternalStore 用）
============================================================ */

let engine: Engine = createEngine();
let version = 0;
let fxCursor = 0;
const listeners = new Set<() => void>();

function notify(): void {
  version++;
  listeners.forEach((l) => l());
}

/** 新規fxを再生キューへ。再生中は次tickを止める(再生完了ゲート) */
function flushFx(): void {
  if (engine.fx.length > fxCursor) {
    enqueue(engine.fx.slice(fxCursor));
    fxCursor = engine.fx.length;
  }
}

initPlayback({
  onIdle: () => scheduleTick(),
  onChange: () => notify(),
});

let tickTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleTick(): void {
  if (tickTimer !== null || isPlaying()) return;
  const aiTurn = engine.pending?.kind === "action" && engine.S.players[engine.pending.pi].isAI;
  if (!aiTurn && !needsTick(engine)) return;
  tickTimer = setTimeout(() => {
    tickTimer = null;
    if (isPlaying()) return;
    if (engine.pending?.kind === "action" && engine.S.players[engine.pending.pi].isAI) {
      engine = engineDispatch(engine, {
        type: "chooseAction",
        action: decideAction(engine, engine.pending.pi),
      });
    } else {
      engine = engineDispatch(engine, { type: "tick" });
    }
    flushFx();
    notify();
    scheduleTick();
  }, 40);
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getSnapshot(): number {
  return version;
}

export function getEngine(): Engine {
  return engine;
}

export function startGame(
  cpuCount: number,
  sel: CountryKey[],
  seed: number,
  relicPool: RelicKey[],
  roundTiles: string[],
  factions: FactionKey[],
): void {
  engineStart(engine, cpuCount, sel, seed, relicPool, roundTiles, factions);
  flushFx();
  notify();
  scheduleTick();
}

export function send(ev: EngineEvent): void {
  engine = engineDispatch(engine, ev);
  flushFx();
  notify();
  scheduleTick();
}

export { getCurrentFx, getSpeed, setSpeed, skipAll } from "./fx/playback.ts";
