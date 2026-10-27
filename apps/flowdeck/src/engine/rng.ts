export interface RngHolder {
  rngState: number;
}

export function nextRandom(holder: RngHolder): number {
  holder.rngState = (holder.rngState + 0x6d2b79f5) | 0;
  let t = holder.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(holder: RngHolder, maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  return Math.floor(nextRandom(holder) * maxExclusive);
}

export function shuffle<T>(holder: RngHolder, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randInt(holder, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff) + 1;
}
