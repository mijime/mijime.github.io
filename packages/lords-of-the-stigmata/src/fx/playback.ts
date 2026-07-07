import type { FxEvent } from "../types.ts";

/* 演出1件あたりの再生時間(ms)。テンポの調整はここだけ */
const DUR: Record<FxEvent["kind"], number> = {
  phase: 1300,
  dispatch: 950,
  recall: 500,
  promote: 900,
  upgrade: 900,
  acquire: 900,
  deepen: 900,
  pass: 550,
  income: 600,
  vp: 750,
  judgment: 1000,
  relic: 1100,
};

let queue: FxEvent[] = [];
let current: FxEvent | null = null;
let speed: 1 | 2 = 1;
let timer: ReturnType<typeof setTimeout> | null = null;
let onIdle: () => void = () => {};
let onChange: () => void = () => {};

export function initPlayback(cb: { onIdle: () => void; onChange: () => void }): void {
  onIdle = cb.onIdle;
  onChange = cb.onChange;
  queue = [];
  current = null;
  if (timer) clearTimeout(timer);
  timer = null;
}

export function enqueue(evs: FxEvent[]): void {
  if (!evs.length) return;
  queue.push(...evs);
  if (!current) next();
}

function next(): void {
  timer = null;
  current = queue.shift() ?? null;
  onChange();
  if (!current) {
    onIdle();
    return;
  }
  timer = setTimeout(next, DUR[current.kind] / speed);
}

export const getCurrentFx = (): FxEvent | null => current;
export const isPlaying = (): boolean => current !== null;
export const getSpeed = (): 1 | 2 => speed;

export function setSpeed(s: 1 | 2): void {
  speed = s;
}

export function skipAll(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  queue = [];
  current = null;
  onChange();
  onIdle();
}
