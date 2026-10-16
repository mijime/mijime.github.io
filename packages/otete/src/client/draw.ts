// 🎨 おえかき (Musical Magic Canvas) — pentatonic drawing, brushes, and speaking stamps.
//
// Upgraded spec:
//  - Unified Topbar (`🏠`, current brush badge, `🧽 けす`, `💾 ほぞん`, `🖼️ さくひん`)
//    replacing the legacy 4-corner buttons and floating toast.
//  - Unified Bottom Dock palette with chunky crayons, bubble/star brushes, and stamps.

import { boing, bubblePop, cheer, marimba, plink, speak, tone } from "./audio";
import { saveDrawing } from "./drawings";
import { burst, dissolve, ring } from "./fx";
import type { Nav } from "./home";
import { roundFinished } from "./reward";
import { isDark } from "./theme";
import { HOME_PILL, bindHome, tap } from "./ui";

type ToolKind = "rainbow" | "color" | "bubble" | "star" | "stamp" | "eraser";

type ToolDef = {
  id: string;
  kind: ToolKind;
  label: string;
  icon: string;
  hue?: number;
  hex?: string;
};

const TOOLS: readonly ToolDef[] = [
  { id: "rainbow", kind: "rainbow", label: "にじいろ", icon: "🌈" },
  { id: "red", kind: "color", label: "あか", icon: "🔴", hue: 355, hex: "#ff4d4d" },
  { id: "yellow", kind: "color", label: "きいろ", icon: "🟡", hue: 46, hex: "#ffd23f" },
  { id: "blue", kind: "color", label: "あお", icon: "🔵", hue: 214, hex: "#4d8bff" },
  { id: "green", kind: "color", label: "みどり", icon: "🟢", hue: 135, hex: "#37b24d" },
  { id: "pink", kind: "color", label: "ももいろ", icon: "🩷", hue: 332, hex: "#ff758f" },
  { id: "bubble", kind: "bubble", label: "しゃぼん", icon: "🫧" },
  { id: "star", kind: "star", label: "きらきら", icon: "⭐" },
  { id: "stamp", kind: "stamp", label: "スタンプ", icon: "🐶" },
  { id: "eraser", kind: "eraser", label: "けしごむ", icon: "🧼" },
];

const STAMPS: readonly { emoji: string; name: string }[] = [
  { emoji: "🐶", name: "いぬ" },
  { emoji: "🐱", name: "ねこ" },
  { emoji: "🐰", name: "うさぎ" },
  { emoji: "🐻", name: "くま" },
  { emoji: "🐼", name: "ぱんだ" },
  { emoji: "🐸", name: "かえる" },
  { emoji: "🦁", name: "らいおん" },
  { emoji: "🐘", name: "ぞう" },
  { emoji: "🚗", name: "くるま" },
  { emoji: "🚂", name: "きかんしゃ" },
  { emoji: "🚀", name: "ロケット" },
  { emoji: "🍎", name: "りんご" },
  { emoji: "🍓", name: "いちご" },
  { emoji: "🍌", name: "バナナ" },
  { emoji: "🌈", name: "にじ" },
  { emoji: "🌸", name: "おはな" },
  { emoji: "⭐", name: "ほし" },
  { emoji: "❤️", name: "ハート" },
];

type Stroke = {
  x: number;
  y: number;
  mx: number;
  my: number;
  hue: number;
  w: number;
  dist: number;
  moved: number;
  note: number;
  t: number;
};

export function renderDraw(root: HTMLElement, nav: Nav): () => void {
  let activeTool: ToolDef = TOOLS[0]!;
  let stampCursor = 0;
  let badgeTimer = 0;

  root.innerHTML = `
    <div class="stage-screen draw-screen">
      <canvas id="glow"></canvas>
      <canvas id="paint"></canvas>

      <div class="toy-topbar draw-topbar">
        ${HOME_PILL}
        <div class="toy-badge" id="d-status">🌈 にじいろ</div>
        <div class="home-tools">
          <button class="pill" id="d-clear" type="button" title="ぜんぶ けす">🗑️</button>
          <button class="pill" id="d-save" type="button" title="ほぞん">💾</button>
          <button class="pill" id="d-gal" type="button" title="さくひん" hidden>🖼️</button>
        </div>
      </div>

      <div class="draw-spacer"></div>

      <div class="toy-dock draw-palette" id="d-palette">
        ${TOOLS.map(
          (t, i) => `
          <button class="palette-btn${i === 0 ? " active" : ""}" data-id="${t.id}" type="button" aria-label="${t.label}">
            <span class="palette-emo">${t.icon}</span>
          </button>
        `,
        ).join("")}
      </div>
    </div>`;

  const paint = root.querySelector<HTMLCanvasElement>("#paint")!;
  const pctx = paint.getContext("2d")!;
  const glow = root.querySelector<HTMLCanvasElement>("#glow")!;
  const gctx = glow.getContext("2d")!;
  const statusEl = root.querySelector<HTMLElement>("#d-status")!;
  const clrBtn = root.querySelector<HTMLElement>("#d-clear")!;
  const savBtn = root.querySelector<HTMLElement>("#d-save")!;
  const galBtn = root.querySelector<HTMLButtonElement>("#d-gal")!;
  const paletteEl = root.querySelector<HTMLElement>("#d-palette")!;

  bindHome(root, () => nav.home());
  tap(galBtn, () => nav.gallery());

  const showStatus = (text: string, revertMs = 0): void => {
    window.clearTimeout(badgeTimer);
    statusEl.textContent = text;
    if (revertMs > 0) {
      badgeTimer = window.setTimeout(() => {
        statusEl.textContent = `${activeTool.icon} ${activeTool.label}`;
      }, revertMs);
    }
  };

  paletteEl.querySelectorAll<HTMLElement>(".palette-btn").forEach((btn) => {
    tap(btn, () => {
      const found = TOOLS.find((t) => t.id === btn.dataset.id);
      if (!found) return;
      activeTool = found;
      paletteEl
        .querySelectorAll(".palette-btn")
        .forEach((x) => x.classList.toggle("active", x === btn));
      showStatus(`${found.icon} ${found.label}`);
      marimba(4, 0.45);
      speak(found.label);
    });
  });

  let W = 0;
  let H = 0;
  let LW = 26;
  let DPR = 1;

  function resize(): void {
    const old = document.createElement("canvas");
    old.width = paint.width;
    old.height = paint.height;
    old.getContext("2d")!.drawImage(paint, 0, 0);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    DPR = dpr;
    W = window.innerWidth;
    H = window.innerHeight;
    LW = Math.max(20, Math.min(46, Math.min(W, H) * 0.055));
    paint.width = Math.round(W * dpr);
    paint.height = Math.round(H * dpr);
    paint.style.width = `${W}px`;
    paint.style.height = `${H}px`;
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pctx.lineCap = "round";
    pctx.lineJoin = "round";
    glow.width = Math.max(1, Math.round(paint.width * 0.5));
    glow.height = Math.max(1, Math.round(paint.height * 0.5));
    glow.style.width = `${W}px`;
    glow.style.height = `${H}px`;
    if (old.width) pctx.drawImage(old, 0, 0, W, H);
    updateGlow();
  }
  window.addEventListener("resize", resize);
  resize();

  const strokes = new Map<number, Stroke>();
  let lastGlow = 0;

  function updateGlow(): void {
    gctx.clearRect(0, 0, glow.width, glow.height);
    gctx.drawImage(paint, 0, 0, glow.width, glow.height);
  }

  function drawStarShape(x: number, y: number, r: number, hue: number): void {
    pctx.save();
    pctx.translate(x, y);
    pctx.rotate((Math.random() - 0.5) * 0.8);
    pctx.fillStyle = `hsl(${hue}, 100%, 62%)`;
    pctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      if (i) pctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else pctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    pctx.closePath();
    pctx.fill();
    pctx.restore();
  }

  function drawBubbleShape(x: number, y: number, r: number, hue: number): void {
    pctx.save();
    pctx.beginPath();
    pctx.arc(x, y, r, 0, Math.PI * 2);
    pctx.fillStyle = `hsla(${hue}, 95%, 72%, 0.34)`;
    pctx.fill();
    pctx.lineWidth = 3;
    pctx.strokeStyle = `hsla(${hue}, 95%, 62%, 0.85)`;
    pctx.stroke();
    pctx.beginPath();
    pctx.arc(x - r * 0.3, y - r * 0.3, r * 0.24, 0, Math.PI * 2);
    pctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    pctx.fill();
    pctx.restore();
  }

  function placeStamp(x: number, y: number, speakIt = false): void {
    const st = STAMPS[stampCursor % STAMPS.length]!;
    stampCursor++;
    const size = 68 + Math.random() * 28;
    pctx.save();
    pctx.translate(x, y);
    pctx.rotate((Math.random() - 0.5) * 0.45);
    pctx.font = `${Math.round(size)}px sans-serif`;
    pctx.textAlign = "center";
    pctx.textBaseline = "middle";
    pctx.fillText(st.emoji, 0, 0);
    pctx.restore();
    const h = Math.trunc(Math.random() * 360);
    burst(x, y, 18, [`hsl(${h},100%,65%)`, "#ffd23f", "#ffffff"]);
    boing(1.05);
    if (speakIt) {
      showStatus(`${st.emoji} ${st.name}`, 1800);
      speak(st.name);
    }
  }

  function strokeSeg(s: Stroke, nx: number, ny: number, d: number): void {
    if (activeTool.kind === "eraser") {
      const nmx = (s.x + nx) / 2;
      const nmy = (s.y + ny) / 2;
      pctx.save();
      pctx.globalCompositeOperation = "destination-out";
      pctx.lineWidth = LW * 1.5;
      pctx.beginPath();
      pctx.moveTo(s.mx, s.my);
      pctx.quadraticCurveTo(s.x, s.y, nmx, nmy);
      pctx.stroke();
      pctx.restore();
      s.mx = nmx;
      s.my = nmy;
      s.x = nx;
      s.y = ny;
      return;
    }

    if (activeTool.kind === "rainbow") {
      s.hue = (s.hue + d * 0.42) % 360;
    } else if (activeTool.kind === "color" && activeTool.hue !== undefined) {
      s.hue = activeTool.hue;
    } else {
      s.hue = (s.hue + d * 0.5) % 360;
    }

    if (activeTool.kind === "bubble") {
      if (s.dist > 28) {
        drawBubbleShape(
          nx + (Math.random() - 0.5) * 14,
          ny + (Math.random() - 0.5) * 14,
          16 + Math.random() * 22,
          s.hue,
        );
        bubblePop(0.9 + Math.random() * 0.4);
      }
      s.x = nx;
      s.y = ny;
      return;
    }

    if (activeTool.kind === "star") {
      if (s.dist > 26) {
        drawStarShape(
          nx + (Math.random() - 0.5) * 12,
          ny + (Math.random() - 0.5) * 12,
          16 + Math.random() * 18,
          s.hue,
        );
      }
      s.x = nx;
      s.y = ny;
      return;
    }

    const col = activeTool.hex ?? `hsl(${s.hue},100%,${isDark() ? 70 : 55}%)`;
    const nmx = (s.x + nx) / 2;
    const nmy = (s.y + ny) / 2;
    pctx.strokeStyle = col;
    pctx.lineWidth = s.w;
    pctx.beginPath();
    pctx.moveTo(s.mx, s.my);
    pctx.quadraticCurveTo(s.x, s.y, nmx, nmy);
    pctx.stroke();
    s.mx = nmx;
    s.my = nmy;
    s.x = nx;
    s.y = ny;
  }

  function down(e: PointerEvent): void {
    if ((e.target as Element)?.closest?.(".toy-topbar, .draw-palette")) return;
    e.preventDefault();
    const h = activeTool.hue ?? Math.trunc(Math.random() * 360);
    const note = Math.trunc(Math.random() * 8);
    strokes.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      mx: e.clientX,
      my: e.clientY,
      hue: h,
      w: LW,
      dist: 0,
      moved: 0,
      note,
      t: performance.now(),
    });

    if (activeTool.kind === "eraser") {
      pctx.save();
      pctx.globalCompositeOperation = "destination-out";
      pctx.beginPath();
      pctx.arc(e.clientX, e.clientY, LW * 0.75, 0, Math.PI * 2);
      pctx.fill();
      pctx.restore();
      bubblePop(1.1);
      ring(e.clientX, e.clientY, "#74c0fc");
      updateGlow();
      return;
    }
    if (activeTool.kind === "stamp") {
      placeStamp(e.clientX, e.clientY, true);
      updateGlow();
      return;
    }
    if (activeTool.kind === "bubble") {
      drawBubbleShape(e.clientX, e.clientY, 26 + Math.random() * 18, h);
      bubblePop(1);
      ring(e.clientX, e.clientY, `hsl(${h},95%,65%)`);
      updateGlow();
      return;
    }
    if (activeTool.kind === "star") {
      drawStarShape(e.clientX, e.clientY, 28 + Math.random() * 14, h);
      marimba(note, 0.45);
      burst(e.clientX, e.clientY, 12, [`hsl(${h},100%,65%)`, "#ffd23f"]);
      updateGlow();
      return;
    }

    pctx.fillStyle = activeTool.hex ?? `hsl(${h},100%,${isDark() ? 70 : 55}%)`;
    pctx.beginPath();
    pctx.arc(e.clientX, e.clientY, LW / 2, 0, 7);
    pctx.fill();
    marimba(note, 0.4);
    burst(e.clientX, e.clientY, 6, activeTool.hex ?? `hsl(${h},100%,65%)`);
    updateGlow();
  }

  function move(e: PointerEvent): void {
    const s = strokes.get(e.pointerId);
    if (!s) return;
    e.preventDefault();
    const nx = e.clientX;
    const ny = e.clientY;
    const d = Math.hypot(nx - s.x, ny - s.y);
    if (d < 2) return;
    s.moved += d;
    s.dist += d;

    if (activeTool.kind === "stamp") {
      if (s.dist > 75) {
        s.dist = 0;
        placeStamp(nx, ny, false);
        updateGlow();
      }
      s.x = nx;
      s.y = ny;
      return;
    }

    const tw = LW * Math.max(0.55, Math.min(1.3, 1.32 - d * 0.03));
    s.w += (tw - s.w) * 0.3;
    strokeSeg(s, nx, ny, d);

    if (s.dist > 42) {
      s.dist = 0;
      s.note += Math.random() < 0.7 ? 1 : -1;
      s.note = Math.max(0, Math.min(9, s.note));
      marimba(s.note, 0.36);
    }
    if (Math.random() < 0.45) burst(nx, ny, 1, activeTool.hex ?? `hsl(${s.hue},100%,70%)`);
    const now = performance.now();
    if (now - lastGlow > 90) {
      lastGlow = now;
      updateGlow();
    }
  }

  function up(e: PointerEvent): void {
    const s = strokes.get(e.pointerId);
    if (!s) return;
    strokes.delete(e.pointerId);
    const plainStroke =
      activeTool.kind !== "stamp" &&
      activeTool.kind !== "bubble" &&
      activeTool.kind !== "star" &&
      activeTool.kind !== "eraser";
    if (plainStroke && s.moved < 14 && performance.now() - s.t < 450) {
      drawStarShape(s.x, s.y, 32, s.hue);
      burst(s.x, s.y, 14, [activeTool.hex ?? `hsl(${s.hue},100%,65%)`, "#ffffff"]);
    }
    updateGlow();
  }

  document.addEventListener("pointerdown", down, { passive: false });
  document.addEventListener("pointermove", move, { passive: false });
  document.addEventListener("pointerup", up);
  document.addEventListener("pointercancel", up);

  function collectSeeds(): { x: number; y: number; c: string }[] {
    const w = paint.width;
    const h = paint.height;
    if (!w || !h) return [];
    let img: Uint8ClampedArray;
    try {
      img = pctx.getImageData(0, 0, w, h).data;
    } catch {
      return [];
    }
    const step = Math.max(6, Math.round(7 * DPR));
    const raw: { x: number; y: number; c: string }[] = [];
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const i = (y * w + x) * 4;
        if (img[i + 3]! > 40) {
          raw.push({ x: x / DPR, y: y / DPR, c: `rgb(${img[i]},${img[i + 1]},${img[i + 2]})` });
        }
      }
    }
    const max = 1200;
    if (raw.length <= max) return raw;
    const stride = raw.length / max;
    const out: { x: number; y: number; c: string }[] = [];
    for (let i = 0; i < max; i++) out.push(raw[Math.floor(i * stride)]!);
    return out;
  }

  function clearAll(): void {
    const seeds = collectSeeds();
    pctx.clearRect(0, 0, W, H);
    updateGlow();
    if (seeds.length > 0) {
      dissolve(seeds);
      tone(700, 0.45, "sine", 0.32, 160);
      showStatus("✨ ぴかぴか！", 1600);
      speak("ぴかぴか！");
    } else {
      plink(8, 0.3);
    }
    navigator.vibrate?.(50);
  }

  async function save(): Promise<void> {
    try {
      const c = document.createElement("canvas");
      c.width = paint.width;
      c.height = paint.height;
      const x = c.getContext("2d")!;
      x.fillStyle = isDark() ? "#12121c" : "#fffdf6";
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(paint, 0, 0);
      const id = await saveDrawing(c);
      if (id) {
        galBtn.hidden = false;
        showStatus("📁 ほぞんしたよ！", 2600);
        cheer();
        speak("さくひんに しまったよ！");
        roundFinished(true);
      } else {
        showStatus("ほぞんできなかった…", 2000);
      }
    } catch {
      showStatus("ほぞんできなかった…", 2000);
    }
  }

  tap(clrBtn, clearAll);
  tap(savBtn, () => {
    void save();
  });

  return () => {
    window.clearTimeout(badgeTimer);
    document.removeEventListener("pointerdown", down);
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", up);
    document.removeEventListener("pointercancel", up);
    window.removeEventListener("resize", resize);
  };
}
