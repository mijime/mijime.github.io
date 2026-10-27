// 🚂 ぽっぽー！ (Train & Vehicle Track Tracing) — pre-writing stroke control.
//
// Upgraded spec:
//  - Unified Topbar + 2-line Guide Banner showing the goal and celebrating treats.
//  - Drag along the track OR tap ahead on the track to advance smoothly.
//  - Lifting a finger mid-stroke keeps progress locked in.

import { cheer, chooChoo, marimba, speak, tone } from "./audio";
import { loadLevel, saveLevel } from "./difficulty";
import { burst } from "./fx";
import type { Nav } from "./home";
import { answerCorrect, roundFinished } from "./reward";
import { makePath, needCount, tolerance, TAU, type Pt, type TPath } from "./trace-paths";
import { HOME_PILL, bindHome, createGuideBanner, tap } from "./ui";

const DKEY = "otete-trace-diff";
const PKEY = "otete-trace-progress";

type Racer = {
  who: string;
  name: string;
  goal: string;
  treats: [string, string, string];
  sound: string;
};

const RACERS: readonly Racer[] = [
  {
    who: "🚂",
    name: "きかんしゃ",
    goal: "🏠",
    treats: ["🍓", "🍎", "⭐"],
    sound: "ぽっぽー！ しゅっぱつ！",
  },
  {
    who: "🚒",
    name: "しょうぼうしゃ",
    goal: "🏢",
    treats: ["💧", "🔔", "⭐"],
    sound: "うーかんかん！ いこう！",
  },
  {
    who: "🚗",
    name: "くるま",
    goal: "🏁",
    treats: ["🍊", "🍌", "⭐"],
    sound: "ぶっぶー！ はしるよ！",
  },
  {
    who: "🚀",
    name: "ロケット",
    goal: "🌙",
    treats: ["⭐", "🪐", "🌟"],
    sound: "びゅーん！ うちゅうへ！",
  },
  {
    who: "🐰",
    name: "うさぎさん",
    goal: "🥕",
    treats: ["🍓", "🍀", "🌸"],
    sound: "ぴょんぴょん！ にんじんへ！",
  },
];

type Treat = { idx: number; emoji: string; got: boolean };

export function renderTrace(root: HTMLElement, nav: Nav): () => void {
  let diff = loadLevel(DKEY, 1);
  let progress = loadLevel(PKEY, 0);
  let racerIdx = 0;
  let racer: Racer = RACERS[0]!;
  let path: TPath = makePath(diff);
  let covered: boolean[] = [];
  let treats: Treat[] = [];
  let done = false;
  let started = false;
  let lx = 0;
  let ly = 0;
  let raf = 0;
  let nextTimer = 0;
  let lastSpark = 0;
  let lastChug = 0;

  root.innerHTML = `
    <div class="stage-screen trace-screen">
      <div class="toy-topbar">
        ${HOME_PILL}
        <button class="friend-switch" id="t-vehicle" type="button" title="のりものを かえる">
          <span id="t-who">🚂 きかんしゃ</span> 🔄
        </button>
        <span class="topbar-spacer"></span>
      </div>

      <div id="t-guide"></div>

      <div class="trace-stage">
        <canvas id="t-canvas"></canvas>
      </div>
    </div>`;

  const canvas = root.querySelector<HTMLCanvasElement>("#t-canvas")!;
  const ctx = canvas.getContext("2d")!;
  const whoEl = root.querySelector<HTMLElement>("#t-who")!;
  const vehicleBtn = root.querySelector<HTMLElement>("#t-vehicle")!;

  const guide = createGuideBanner({
    friendIdx: 3,
    onReplay: () => {
      chooChoo();
      speak(racer.sound);
    },
  });
  root.querySelector("#t-guide")!.replaceWith(guide.el);

  bindHome(root, () => nav.home());

  let W = 0;
  let H = 0;
  let spanW = 0;
  let spanH = 0;
  let ox = 0;
  let oy = 0;
  let tol = 44;

  function resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    spanW = W * 0.84;
    spanH = H * 0.8;
    ox = (W - spanW) / 2;
    oy = (H - spanH) / 2;
    tol = Math.max(38, Math.min(W, H) * tolerance(diff) * 1.15);
  }

  const map = (p: Pt): Pt => [ox + p[0] * spanW, oy + p[1] * spanH];

  tap(vehicleBtn, () => {
    racerIdx = (racerIdx + 1) % RACERS.length;
    racer = RACERS[racerIdx]!;
    whoEl.textContent = `${racer.who} ${racer.name}`;
    chooChoo();
    speak(racer.sound);
    load(false);
  });

  function load(pickNewRacer = true): void {
    window.clearTimeout(nextTimer);
    path = makePath(diff);
    if (pickNewRacer) {
      racerIdx = (racerIdx + 1) % RACERS.length;
      racer = RACERS[racerIdx]!;
    }
    whoEl.textContent = `${racer.who} ${racer.name}`;
    covered = path.pts.map((_, i) => i === 0);
    const n = path.pts.length;
    treats = [
      { idx: Math.floor(n * 0.28), emoji: racer.treats[0], got: false },
      { idx: Math.floor(n * 0.56), emoji: racer.treats[1], got: false },
      { idx: Math.floor(n * 0.82), emoji: racer.treats[2], got: false },
    ];
    done = false;
    started = false;
    guide.puppet.setMouth("smile");
    guide.setMessage(`ゆびで なぞって ${racer.goal} へ いこう！`, racer.who);
  }

  function frontier(): number {
    let f = 0;
    let gap = 0;
    for (let i = 0; i < covered.length; i++) {
      if (covered[i]) {
        f = i;
        gap = 0;
      } else if (++gap > 12) break;
    }
    return f;
  }

  const progressFrac = (): number => frontier() / Math.max(1, covered.length - 1);

  function stroke(x: number, y: number, isInitialTap = false): void {
    if (done) return;
    const curFront = frontier();

    // Tap-ahead assist: if a young toddler taps ahead along the road, step the train forward!
    if (isInitialTap) {
      let nearestIdx = -1;
      let nearestDist = tol * 1.65;
      for (let i = curFront + 1; i <= Math.min(path.pts.length - 1, curFront + 32); i++) {
        const p = map(path.pts[i]!);
        const d = Math.hypot(x - p[0], y - p[1]);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }
      if (nearestIdx > curFront) {
        for (let i = curFront; i <= nearestIdx; i++) covered[i] = true;
      }
    }

    const steps = Math.max(1, Math.ceil(Math.hypot(x - lx, y - ly) / (tol * 0.35)));
    let gained = 0;
    const maxReach = Math.min(path.pts.length - 1, frontier() + 30);

    for (let s = 0; s <= steps; s++) {
      const px = lx + ((x - lx) * s) / steps;
      const py = ly + ((y - ly) * s) / steps;
      for (let i = 0; i <= maxReach; i++) {
        if (covered[i]) continue;
        const p = map(path.pts[i]!);
        if (Math.hypot(px - p[0], py - p[1]) <= tol * 1.18) {
          covered[i] = true;
          gained++;
        }
      }
    }
    lx = x;
    ly = y;

    const newFront = frontier();
    for (let i = 0; i <= newFront; i++) covered[i] = true;

    treats.forEach((tr, ti) => {
      if (!tr.got && newFront >= tr.idx) {
        tr.got = true;
        const tp = map(path.pts[tr.idx]!);
        const rect = canvas.getBoundingClientRect();
        burst(rect.left + tp[0], rect.top + tp[1], 18, ["#ffd23f", "#ff6b6b", "#69db7c"]);
        marimba(3 + ti * 2, 0.5);
        guide.puppet.hop();
        guide.setMessage(`${tr.emoji} ゲット！ そのまま すすもう！`, tr.emoji);
      }
    });

    const now = performance.now();
    if (gained && now - lastChug > 70) {
      lastChug = now;
      tone(340 + progressFrac() * 440, 0.07, "triangle", 0.16);
    }

    if (newFront >= covered.length - 4) succeed();
  }

  function succeed(): void {
    if (done) return;
    done = true;
    started = false;

    guide.puppet.hop();
    guide.puppet.setMouth("joy");
    guide.setMessage("やったー！ とうちゃく したね！", racer.goal);

    chooChoo();
    cheer();
    speak("とうちゃく！ できたね！");

    progress++;
    if (progress >= needCount(diff)) {
      diff++;
      progress = 0;
      saveLevel(DKEY, diff);
      resize();
    }
    saveLevel(PKEY, progress);

    const r = canvas.getBoundingClientRect();
    answerCorrect(r.left + r.width / 2, r.top + r.height / 2, [path.color, "#ffd23f", "#37b24d"]);
    roundFinished(true);
    nextTimer = window.setTimeout(() => load(true), 1850);
  }

  function onDown(e: PointerEvent): void {
    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);
    started = true;
    const r = canvas.getBoundingClientRect();
    lx = e.clientX - r.left;
    ly = e.clientY - r.top;
    guide.puppet.lookAt(e.clientX, e.clientY);
    stroke(lx, ly, true);
  }

  function onMove(e: PointerEvent): void {
    if (!started) return;
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    guide.puppet.lookAt(e.clientX, e.clientY);
    stroke(e.clientX - r.left, e.clientY - r.top, false);
    const now = performance.now();
    if (now - lastSpark > 45) {
      lastSpark = now;
      burst(e.clientX, e.clientY, 2, [path.color, "#ffd23f"]);
    }
  }

  function end(): void {
    if (!started || done) return;
    started = false;
    guide.puppet.resetLook();
    if (progressFrac() >= 0.84) succeed();
  }

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);

  function drawEmoji(em: string, x: number, y: number, size: number): void {
    ctx.fillStyle = "#1b1b1b";
    ctx.font = `${Math.round(size)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(em, x, y);
  }

  function draw(now: number): void {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // 1. Roadbed
    ctx.strokeStyle = "rgba(180, 155, 120, 0.28)";
    ctx.lineWidth = tol * 1.55;
    ctx.beginPath();
    path.pts.forEach((p, i) => {
      const q = map(p);
      if (i) ctx.lineTo(q[0], q[1]);
      else ctx.moveTo(q[0], q[1]);
    });
    ctx.stroke();

    // 2. Wooden sleepers
    ctx.strokeStyle = "rgba(140, 105, 70, 0.38)";
    ctx.lineWidth = 6;
    const stepTie = Math.max(4, Math.floor(path.pts.length / 22));
    for (let i = 1; i < path.pts.length - 1; i += stepTie) {
      const p0 = map(path.pts[i - 1]!);
      const p1 = map(path.pts[i + 1]!);
      const q = map(path.pts[i]!);
      const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) + Math.PI / 2;
      const hw = tol * 0.58;
      ctx.beginPath();
      ctx.moveTo(q[0] - Math.cos(ang) * hw, q[1] - Math.sin(ang) * hw);
      ctx.lineTo(q[0] + Math.cos(ang) * hw, q[1] + Math.sin(ang) * hw);
      ctx.stroke();
    }

    // 3. Dashed center guide
    ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
    ctx.lineWidth = 5;
    ctx.setLineDash([8, 14]);
    ctx.beginPath();
    path.pts.forEach((p, i) => {
      const q = map(p);
      if (i) ctx.lineTo(q[0], q[1]);
      else ctx.moveTo(q[0], q[1]);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Illuminated track behind the train
    const fi = Math.min(frontier(), path.pts.length - 1);
    if (fi > 0) {
      ctx.save();
      ctx.strokeStyle = path.color;
      ctx.shadowColor = path.color;
      ctx.shadowBlur = 16;
      ctx.lineWidth = tol * 1.15;
      ctx.beginPath();
      for (let i = 0; i <= fi; i++) {
        const q = map(path.pts[i]!);
        if (i) ctx.lineTo(q[0], q[1]);
        else ctx.moveTo(q[0], q[1]);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 5. Collectible treats
    for (const tr of treats) {
      if (tr.got) continue;
      const tp = map(path.pts[tr.idx]!);
      const bounce = Math.sin(now / 180 + tr.idx) * 4;
      ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
      ctx.beginPath();
      ctx.arc(tp[0], tp[1] + bounce, tol * 0.65, 0, TAU);
      ctx.fill();
      drawEmoji(tr.emoji, tp[0], tp[1] + bounce, tol * 0.95);
    }

    // 6. Goal station
    const goal = map(path.pts.at(-1)!);
    const gs = 1 + 0.08 * Math.sin(now / 240);
    ctx.fillStyle = "rgba(255, 210, 63, 0.44)";
    ctx.beginPath();
    ctx.arc(goal[0], goal[1], tol * 1.45 * gs, 0, TAU);
    ctx.fill();
    drawEmoji(racer.goal, goal[0], goal[1], tol * 1.75 * gs);

    // 7. Gentle guide dot when finger is lifted
    if (!started && !done) {
      const ph = (now / 900) % 1;
      const rem = path.pts.length - 1 - fi;
      const q = map(path.pts[fi + Math.floor(ph * rem)]!);
      ctx.fillStyle = "rgba(255, 107, 107, 0.72)";
      ctx.beginPath();
      ctx.arc(q[0], q[1], tol * 0.42, 0, TAU);
      ctx.fill();
    }

    // 8. Train/racer riding the frontier
    const pos = map(path.pts[fi]!);
    const bob = done
      ? -Math.abs(Math.sin(now / 90)) * tol * 0.75
      : Math.sin(now / 160) * tol * 0.14;
    const pop = done ? 1 + 0.28 * Math.abs(Math.sin(now / 120)) : 1.08;
    ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
    ctx.beginPath();
    ctx.arc(pos[0], pos[1] + bob, tol * 1.05 * pop, 0, TAU);
    ctx.fill();
    drawEmoji(racer.who, pos[0], pos[1] + bob, tol * 1.75 * pop);

    raf = requestAnimationFrame(draw);
  }

  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);
  resize();
  load(false);
  chooChoo();
  raf = requestAnimationFrame(draw);

  return () => {
    cancelAnimationFrame(raf);
    window.clearTimeout(nextTimer);
    ro.disconnect();
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", end);
    canvas.removeEventListener("pointercancel", end);
  };
}
