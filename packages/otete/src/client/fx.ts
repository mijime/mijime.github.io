// Unified 2D particle & bubble effects engine on the shared #fx canvas
// (plus reusable floating bubble field for peek & camera).

import { bubblePop, marimba } from "./audio";

let canvas!: HTMLCanvasElement;
let ctx!: CanvasRenderingContext2D;

export function initFx(el: HTMLCanvasElement): void {
  canvas = el;
  ctx = el.getContext("2d")!;
}

export const TAU = Math.PI * 2;
export const DEFAULT_COLORS = ["#ffd23f", "#ff6b6b", "#4d8bff", "#37b24d", "#9b5de5", "#00b4d8"];

type Shape = "dot" | "star" | "rect" | "ring-gem";
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  r: number;
  c: string;
  rot: number;
  vr: number;
  shape: Shape;
  g: number;
  decay: number;
};
type Ring = {
  x: number;
  y: number;
  r: number;
  vr: number;
  life: number;
  decay: number;
  c: string;
  lw: number;
};

const parts: Particle[] = [];
const rings: Ring[] = [];
const MAX = 1100;
let W = 0;
let H = 0;
let rafId = 0;

export function resizeFx(): void {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resizeFx);

function start(): void {
  if (!rafId) rafId = requestAnimationFrame(frame);
}

const pickColor = (colors: string | readonly string[]): string =>
  typeof colors === "string"
    ? colors
    : (colors[Math.trunc(Math.random() * colors.length)] ?? "#ffd23f");

/** Soft expanding ring pulse. */
export function ring(x: number, y: number, c = "#ffd23f"): void {
  rings.push({ x, y, r: 8, vr: 6.5, life: 1, decay: 0.035, c, lw: 7 });
  start();
}

export function burst(
  x: number,
  y: number,
  n = 16,
  colors: string | readonly string[] = DEFAULT_COLORS,
): void {
  for (let i = 0; i < n; i++) {
    if (parts.length >= MAX) parts.shift();
    const a = Math.random() * TAU;
    const sp = 2.4 + Math.random() * 7.5;
    const r = Math.random();
    const shape: Shape = r < 0.45 ? "dot" : r < 0.8 ? "star" : "rect";
    parts.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 2.4,
      life: 1,
      r: 4 + Math.random() * 7,
      c: pickColor(colors),
      rot: Math.random() * TAU,
      vr: (Math.random() - 0.5) * 0.35,
      shape,
      g: 0.24,
      decay: 0.015 + Math.random() * 0.012,
    });
  }
  start();
}

/** Shared celebration feedback: ring + rich particle spray. */
export function celebrate(
  x: number,
  y: number,
  colors: string | readonly string[] = DEFAULT_COLORS,
): void {
  burst(x, y, 42, colors);
  ring(x, y, typeof colors === "string" ? colors : (colors[0] ?? "#ffd23f"));
}

/** Full-screen confetti + rising gems for a finished round or saved drawing. */
export function confetti(n = 85): void {
  for (let i = 0; i < n; i++) {
    if (parts.length >= MAX) parts.shift();
    const isGem = i % 4 === 0;
    parts.push({
      x: Math.random() * W,
      y: isGem ? H + 20 + Math.random() * 80 : -20 - Math.random() * H * 0.35,
      vx: (Math.random() - 0.5) * 2.6,
      vy: isGem ? -(3.2 + Math.random() * 3.2) : 2.2 + Math.random() * 3.4,
      life: 1,
      r: isGem ? 9 + Math.random() * 9 : 5 + Math.random() * 7,
      c: DEFAULT_COLORS[Math.trunc(Math.random() * DEFAULT_COLORS.length)]!,
      rot: Math.random() * TAU,
      vr: (Math.random() - 0.5) * 0.35,
      shape: isGem ? "ring-gem" : i % 2 === 0 ? "rect" : "star",
      g: isGem ? -0.01 : 0.03,
      decay: 0.0042 + Math.random() * 0.003,
    });
  }
  start();
}

/** Dissolve drawn pixels into floating particles when clearing the canvas. */
export function dissolve(seeds: readonly { x: number; y: number; c: string }[]): void {
  for (const s of seeds) {
    if (parts.length >= MAX) break;
    parts.push({
      x: s.x,
      y: s.y,
      vx: (Math.random() - 0.5) * 1.8,
      vy: -0.4 - Math.random() * 1.4,
      life: 1,
      r: 1.5 + Math.random() * 2.5,
      c: s.c,
      rot: 0,
      vr: 0,
      shape: "dot",
      g: 0.05,
      decay: 0.026,
    });
  }
  start();
}

function drawStar(x: number, y: number, r: number, rot: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function frame(): void {
  rafId = 0;
  ctx.clearRect(0, 0, W, H);

  for (let i = rings.length - 1; i >= 0; i--) {
    const q = rings[i]!;
    q.r += q.vr;
    q.vr *= 0.97;
    q.life -= q.decay;
    if (q.life <= 0) {
      rings.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = q.life * 0.8;
    ctx.strokeStyle = q.c;
    ctx.lineWidth = q.lw * q.life;
    ctx.beginPath();
    ctx.arc(q.x, q.y, q.r, 0, TAU);
    ctx.stroke();
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    const q = parts[i]!;
    q.x += q.vx;
    q.y += q.vy;
    q.vy += q.g;
    q.vx *= 0.99;
    q.rot += q.vr;
    q.life -= q.decay;
    if (q.life <= 0) {
      parts.splice(i, 1);
      continue;
    }
    const a = Math.min(1, q.life);
    const r = Math.max(0.5, q.r * (0.55 + 0.45 * q.life));
    if (q.shape === "rect") {
      ctx.globalAlpha = a;
      ctx.fillStyle = q.c;
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(q.rot);
      ctx.fillRect(-r * 0.55, -r * 0.4, r * 1.1, r * 0.8);
      ctx.restore();
    } else if (q.shape === "ring-gem") {
      ctx.globalAlpha = a * 0.85;
      ctx.strokeStyle = q.c;
      ctx.lineWidth = Math.max(2, r * 0.28);
      ctx.beginPath();
      ctx.arc(q.x, q.y, r, 0, TAU);
      ctx.stroke();
    } else {
      ctx.fillStyle = q.c;
      ctx.globalAlpha = a * 0.3;
      ctx.beginPath();
      ctx.arc(q.x, q.y, r * 1.8, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = a;
      if (q.shape === "star") drawStar(q.x, q.y, r * 1.2, q.rot);
      else {
        ctx.beginPath();
        ctx.arc(q.x, q.y, r, 0, TAU);
        ctx.fill();
      }
    }
  }

  ctx.globalAlpha = 1;
  if (parts.length > 0 || rings.length > 0) rafId = requestAnimationFrame(frame);
}

/* ============================================================================
   Shared Floating Bubble Field (used by 🫧 あわあわ and 🪞 かがみ)
   ============================================================================ */

export type BubbleItem = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  hue: number;
  emoji?: string;
  wobble: number;
};

export function createBubbleField(emojis?: readonly string[]) {
  const items: BubbleItem[] = [];
  let popCount = 0;

  function spawn(w: number, h: number, x?: number, y?: number, r?: number): void {
    if (items.length >= 20) items.shift();
    const rad = r ?? 24 + Math.random() * 24;
    items.push({
      x: x ?? rad + Math.random() * Math.max(100, w - rad * 2),
      y: y ?? h + rad + Math.random() * 60,
      r: rad,
      vx: (Math.random() - 0.5) * 0.9,
      vy: -(0.9 + Math.random() * 1.4),
      hue: Math.trunc(Math.random() * 360),
      emoji: emojis ? emojis[Math.trunc(Math.random() * emojis.length)] : undefined,
      wobble: Math.random() * TAU,
    });
  }

  function popAtIndex(idx: number, screenX: number, screenY: number): void {
    const b = items[idx];
    if (!b) return;
    items.splice(idx, 1);
    popCount++;
    bubblePop(1 + (popCount % 5) * 0.08);
    marimba(popCount % 8, 0.4);
    ring(screenX, screenY, `hsl(${b.hue}, 95%, 65%)`);
    burst(screenX, screenY, 12, [`hsl(${b.hue}, 95%, 68%)`, "#ffd23f", "#ffffff"]);
  }

  function tryPop(localX: number, localY: number, screenX: number, screenY: number): boolean {
    for (let i = items.length - 1; i >= 0; i--) {
      const b = items[i]!;
      if (Math.hypot(b.x - localX, b.y - localY) <= b.r + 20) {
        popAtIndex(i, screenX, screenY);
        return true;
      }
    }
    return false;
  }

  function stepAndDraw(
    targetCtx: CanvasRenderingContext2D,
    w: number,
    h: number,
    now: number,
    autoSpawn = true,
  ): void {
    if (autoSpawn && Math.random() < 0.045 && items.length < 12) spawn(w, h);
    for (let i = items.length - 1; i >= 0; i--) {
      const b = items[i]!;
      b.y += b.vy;
      b.x += b.vx + Math.sin(now * 0.003 + b.wobble) * 0.45;
      if (b.y < -b.r * 2) {
        items.splice(i, 1);
        continue;
      }
      targetCtx.save();
      targetCtx.beginPath();
      targetCtx.arc(b.x, b.y, b.r, 0, TAU);
      targetCtx.fillStyle = `hsla(${b.hue}, 92%, 75%, 0.28)`;
      targetCtx.fill();
      targetCtx.lineWidth = 2.6;
      targetCtx.strokeStyle = `hsla(${b.hue}, 95%, 64%, 0.82)`;
      targetCtx.stroke();

      targetCtx.beginPath();
      targetCtx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.22, 0, TAU);
      targetCtx.fillStyle = "rgba(255, 255, 255, 0.86)";
      targetCtx.fill();

      if (b.emoji) {
        targetCtx.font = `${Math.round(b.r * 1.05)}px sans-serif`;
        targetCtx.textAlign = "center";
        targetCtx.textBaseline = "middle";
        targetCtx.fillText(b.emoji, b.x, b.y + 2);
      }
      targetCtx.restore();
    }
  }

  return { items, spawn, popAtIndex, tryPop, stepAndDraw };
}
