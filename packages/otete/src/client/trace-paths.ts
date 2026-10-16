// Procedural pre-writing paths with UNBOUNDED difficulty.
//
// Every stroke is a single continuous curve built by integrating a "heading"
// that is a function of how far along the stroke we are:
//
//   heading(u) = base + wind·u + accel·u² + amp·wave(2π·freq·u + phase)
//
//   wind    net rotation       0 = straight/arc, 2π = one full circle
//   accel   rotation that keeps building = spiral
//   amp     wiggle size        bigger = wavier
//   freq    number of humps    higher = more, tighter wiggles
//   sharp   sine ⇄ triangle    higher = pointier zigzag
//   blocky  triangle ⇄ square  square = true ぎざぎざ (straight sides, sharp corners)
//
// The LEVEL is unbounded. A few dimensions saturate (wiggle size, turn), because
// beyond a point they stop adding difficulty; the ones that keep going — number
// of humps/teeth (freq) and the shrinking tolerance in trace.ts — carry the
// difficulty on forever, so there is no ceiling to the skill.
//
// The starting order follows the pre-writing stroke sequence
// (vertical → horizontal → circle → cross/diagonal; see docs/child-development.md):
// the easiest strokes snap to vertical/horizontal, and round/loop shapes only
// appear as the level rises.

import { sat } from "./difficulty";

export type Pt = [number, number];
export type TPath = { label: string; label2: string; pts: Pt[]; color: string };

export const TAU = Math.PI * 2;
const PALETTE = ["#9b5de5", "#ff6b6b", "#4d8bff", "#37b24d", "#00b4d8", "#ffb703"];
export const rand = (a: number, b: number): number => a + Math.random() * (b - a);
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const pick = <T>(a: readonly T[]): T => a[Math.trunc(Math.random() * a.length)]!;

export const BANDS = ["やさしい", "ふつう", "むずかしい", "すごい", "たつじん"];

/** Display name for a level. Beyond the fifth band it keeps counting up. */
export function bandName(level: number): string {
  const lv = Math.max(0, Math.floor(level));
  if (lv < BANDS.length) return BANDS[lv]!;
  return `${BANDS.at(-1)} +${lv - (BANDS.length - 1)}`;
}

/**
 * How far off the line still counts, as a fraction of the stage side. Shrinks
 * with level but never past a finger's width (a physical, not a skill, floor).
 */
export function tolerance(level: number): number {
  return Math.max(0.05, 0.125 * 0.88 ** Math.max(0, Math.floor(level)));
}

/** Stroke length grows to full size over the first few levels. */
export function strokeScale(level: number): number {
  return Math.min(1, 0.66 + Math.max(0, Math.floor(level)) * 0.12);
}

/** Clean traces needed before the level rises; a little more each time. */
export function needCount(level: number): number {
  return 3 + Math.floor(Math.max(0, Math.floor(level)) / 3);
}

/* ---------- geometry ---------- */

type Params = {
  wind: number;
  accel: number;
  amp: number;
  freq: number;
  sharp: number;
  blocky: number;
  phase: number;
};

// A wave that morphs sine -> triangle (sharp) -> square (blocky). The square
// version flips the heading between two angles, which draws a true ぎざぎざ.
function wave(z: number, sharp: number, blocky: number): number {
  const s = Math.sin(z);
  let w = s;
  if (sharp > 0) w += ((2 / Math.PI) * Math.asin(s) - s) * sharp;
  if (blocky > 0) w += (Math.sign(s) - w) * blocky;
  return w;
}

/** Parameters for one generated stroke at an unbounded `level`. */
function params(level: number): Params {
  const dir = Math.random() < 0.5 ? -1 : 1;
  const phase = Math.random() * TAU;
  // Repertoire opens up with the level; probabilities grow then saturate.
  const zigP = level < 2 ? 0 : Math.min(0.5, 0.08 + (level - 2) * 0.06);
  const circP = level < 4 ? 0 : Math.min(0.3, 0.06 + (level - 4) * 0.04);
  const spiralP = level < 6 ? 0 : Math.min(0.25, 0.05 + (level - 6) * 0.03);
  const roll = Math.random();
  if (roll < zigP) {
    // heading flips between two angles -> straight sides with sharp corners.
    // The number of teeth grows without bound.
    return {
      wind: 0,
      accel: 0,
      amp: rand(0.5, 0.9),
      freq: 2 + Math.floor(level / 2),
      sharp: 1,
      blocky: 1,
      phase,
    };
  }
  if (roll < zigP + circP) {
    // one full turn with almost no wiggle -> a circle
    return {
      wind: dir * TAU * rand(0.92, 1.08),
      accel: 0,
      amp: rand(0, 0.08),
      freq: 1,
      sharp: 0,
      blocky: 0,
      phase,
    };
  }
  if (roll < zigP + circP + spiralP) {
    // rotation that keeps building -> a spiral
    return {
      wind: dir * rand(0, 0.3),
      accel: dir * TAU * rand(1, 1.6),
      amp: rand(0, 0.06),
      freq: 1,
      sharp: 0,
      blocky: 0,
      phase,
    };
  }
  // smooth meander: size/turn saturate, but the hump count keeps rising
  const t = sat(level, 5);
  const wind = dir * t ** 1.4 * TAU * rand(0.05, 1);
  const accel = level > 3 ? dir * sat(level - 3, 4) * TAU * rand(0.2, 0.8) : 0;
  const amp = (0.03 + t ** 1.2 * 1.05) * rand(0.5, 1.05);
  const freq = 0.7 + level * 0.35 + rand(-0.2, 0.7);
  const sharp = clamp((freq - 1.7) / 1.8, 0, 1) * rand(0.7, 1);
  return { wind, accel, amp, freq, sharp, blocky: 0, phase };
}

/** A friendly name for the stroke, read off the parameters that made it. */
function describe(p: Params): [string, string] {
  if (p.blocky > 0.5) return ["ぎざぎざ", "かくかく"];
  if (p.accel !== 0 && Math.abs(p.accel) > TAU * 0.85) return ["うずまき", "ぐるぐる"];
  const turns = (Math.abs(p.wind) + Math.abs(p.accel)) / TAU;
  if (turns > 0.8) return ["まる", "ぐるっと"];
  if (p.amp > 0.45) return ["なみ", "ゆらゆら"];
  if (p.amp > 0.18 || p.freq > 1.6) return ["カーブ", "ゆるーり"];
  return ["せん", "まっすぐ"];
}

/** Centre the raw turtle path in 0.12..0.88, keeping its shape (aspect intact). */
function normalize(raw: Pt[]): Pt[] {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const [x, y] of raw) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const w = Math.max(maxX - minX, 1e-6);
  const h = Math.max(maxY - minY, 1e-6);
  const s = 0.76 / Math.max(w, h);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return raw.map(([x, y]) => [0.5 + (x - cx) * s, 0.5 + (y - cy) * s] as Pt);
}

/** Generate one stroke for an unbounded difficulty level. */
export function genFlow(level: number): TPath {
  const lv = Math.max(0, Math.floor(level));
  // More samples as the stroke gets busier, but bounded so it stays cheap.
  const steps = Math.round(120 + Math.min(lv, 30) * 10);
  const p = params(lv);
  // Easiest strokes start vertical/horizontal (the first pre-writing strokes),
  // then relax to any angle as the difficulty rises.
  const raw0 = Math.random() * TAU;
  const snap = clamp(1 - lv / 3, 0, 1) * 0.85;
  const nearest = Math.round(raw0 / (Math.PI / 2)) * (Math.PI / 2);
  const base = raw0 + (nearest - raw0) * snap;
  const stepLen = 1 / steps;
  const raw: Pt[] = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i < steps; i++) {
    const u = i / steps;
    const heading =
      base +
      p.wind * u +
      p.accel * u * u +
      p.amp * wave(TAU * p.freq * u + p.phase, p.sharp, p.blocky);
    raw.push([x, y]);
    x += Math.cos(heading) * stepLen;
    y += Math.sin(heading) * stepLen;
  }
  raw.push([x, y]);
  const [label, label2] = describe(p);
  return { label, label2, pts: normalize(raw), color: pick(PALETTE) };
}

export function scalePath(path: TPath, s: number): TPath {
  if (s === 1) return path;
  return {
    ...path,
    pts: path.pts.map(([x, y]) => [0.5 + (x - 0.5) * s, 0.5 + (y - 0.5) * s] as Pt),
  };
}

/** A path for `level`. The level is unbounded; there is no top step. */
export function makePath(level: number): TPath {
  return scalePath(genFlow(level), strokeScale(level));
}
