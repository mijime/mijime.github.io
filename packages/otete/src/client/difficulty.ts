// Unbounded difficulty helpers and Japanese counting words.

export function loadLevel(key: string, initial = 0): number {
  try {
    const n = Math.floor(Number(localStorage.getItem(key)));
    return Number.isFinite(n) && n >= 0 ? n : initial;
  } catch {
    return initial;
  }
}

export function saveLevel(key: string, n: number): void {
  try {
    const level = Math.max(0, Math.floor(n));
    localStorage.setItem(key, String(level));
  } catch {
    /* ignore */
  }
}

export function clearLevel(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Saturating 0..1 curve: 0 at level 0, approaches 1 as the level grows. */
export const sat = (level: number, half: number): number => level / (level + half);

const ONES = ["", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう"];

function under100(n: number): string {
  const t = Math.floor(n / 10);
  const o = n % 10;
  const head = t === 0 ? "" : t === 1 ? "じゅう" : `${ONES[t]!}じゅう`;
  return head + (ONES[o] ?? "");
}

/** Japanese counting word for n (1..9999) using child-friendly よん / なな. */
export function jNum(n: number): string {
  const v = Math.max(0, Math.floor(n));
  if (v === 0) return "ゼロ";
  if (v < 10) return ONES[v]!;
  if (v < 100) return under100(v);
  if (v < 1000) {
    const h = Math.floor(v / 100);
    const r = v % 100;
    const head =
      h === 1
        ? "ひゃく"
        : h === 3
          ? "さんびゃく"
          : h === 6
            ? "ろっぴゃく"
            : h === 8
              ? "はっぴゃく"
              : `${ONES[h]!}ひゃく`;
    return head + (r ? under100(r) : "");
  }
  const k = Math.floor(v / 1000);
  const r = v % 1000;
  const head =
    k === 1 ? "せん" : k === 3 ? "さんぜん" : k === 8 ? "はっせん" : `${ONES[k] ?? String(k)}せん`;
  return head + (r ? jNum(r) : "");
}

/** Builds a rhythmic counting string like "いち、に、さん" up to n (capped at 5). */
export function jNumSpeech(n: number): string {
  if (n <= 5) {
    return Array.from({ length: n }, (_, i) => jNum(i + 1)).join("、");
  }
  return jNum(n);
}
