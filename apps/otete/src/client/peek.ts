// 🫧 あわあわ・ばあっ！ (Bubble Scrub & Peek-a-Boo) — fine-motor scrubbing & discovery.
//
// Upgraded spec:
//  - Unified Guide Banner with animal friend giving sound hints ("わんわん！ だーれだ？")
//    in a locked 2-line bubble.
//  - Shared `createBubbleField` from `fx.ts` for floating soap bubbles.
//  - Forgiving scrubbing & tapping on the foam canvas pops it open with a joyful "ばあっ！".

import { boing, bubblePop, cheer, marimba, speak } from "./audio";
import { loadAllWords } from "./custom";
import { burst, createBubbleField } from "./fx";
import type { Nav } from "./home";
import { answerCorrect, roundFinished } from "./reward";
import { HOME_PILL, bindHome, createGuideBanner, shuffle, tap } from "./ui";
import { wordVisual } from "./visual";
import { playWord, type Word } from "./voice";

const SOUND_HINTS: Record<string, string> = {
  inu: "わんわん！ だーれだ？",
  neko: "にゃーにゃー！ だーれだ？",
  usagi: "ぴょんぴょん！ だーれだ？",
  kuma: "がおー！ だーれだ？",
  panda: "ころころ！ だーれだ？",
  kaeru: "けろけろ！ だーれだ？",
  raion: "がおーー！ だーれだ？",
  zou: "ぱおーん！ だーれだ？",
  buta: "ぶーぶー！ だーれだ？",
  ushi: "もーもー！ だーれだ？",
  niwatori: "こけこっこー！ だーれだ？",
  kuruma: "ぶっぶー！ なーんだ？",
  patokaa: "ぴーぽー！ なーんだ？",
  kyuukyuusha: "ぴーぽー！ なーんだ？",
  shoubousha: "うーかんかん！ なーんだ？",
  kikansha: "ぽっぽー！ なーんだ？",
  densha: "がたんごとん！ なーんだ？",
};

type FoamPuff = {
  x: number;
  y: number;
  r: number;
  color: string;
  cleared: boolean;
};

export function renderPeek(root: HTMLElement, nav: Nav): () => void {
  let words: Word[] = [];
  let deck: Word[] = [];
  let current: Word | null = null;
  let revealed = false;
  let roundCount = 0;
  let raf = 0;
  let nextTimer = 0;

  root.innerHTML = `
    <div class="stage-screen peek-screen">
      <div class="toy-topbar">
        ${HOME_PILL}
        <div class="toy-badge">🫧 あわあわ</div>
        <span class="topbar-spacer"></span>
      </div>

      <div id="pk-guide"></div>

      <div class="peek-stage" id="pk-stage">
        <div class="peek-card" id="pk-card">
          <div class="peek-secret" id="pk-secret"></div>
          <div class="peek-label" id="pk-label"></div>
          <canvas id="pk-foam"></canvas>
        </div>
        <canvas id="pk-bubbles"></canvas>
      </div>

      <div class="peek-dock">
        <button class="toy-action-btn" id="pk-next" type="button">▶ つぎの あわあわ</button>
      </div>
    </div>
  `;

  const stage = root.querySelector<HTMLElement>("#pk-stage")!;
  const card = root.querySelector<HTMLElement>("#pk-card")!;
  const secret = root.querySelector<HTMLElement>("#pk-secret")!;
  const label = root.querySelector<HTMLElement>("#pk-label")!;
  const foamCanvas = root.querySelector<HTMLCanvasElement>("#pk-foam")!;
  const foamCtx = foamCanvas.getContext("2d")!;
  const bubCanvas = root.querySelector<HTMLCanvasElement>("#pk-bubbles")!;
  const bubCtx = bubCanvas.getContext("2d")!;
  const nextBtn = root.querySelector<HTMLButtonElement>("#pk-next")!;

  const guide = createGuideBanner({
    friendIdx: 1,
    onReplay: () => {
      if (!current) return;
      if (revealed) void playWord(current);
      else speak(SOUND_HINTS[current.slug] ?? "あわを ゴシゴシ こすってね！");
    },
  });
  root.querySelector("#pk-guide")!.replaceWith(guide.el);

  bindHome(root, () => nav.home());

  const bubbles = createBubbleField();
  let CW = 0;
  let CH = 0;
  let SW = 0;
  let SH = 0;
  let puffs: FoamPuff[] = [];

  function resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cr = card.getBoundingClientRect();
    CW = Math.max(1, cr.width);
    CH = Math.max(1, cr.height);
    foamCanvas.width = Math.round(CW * dpr);
    foamCanvas.height = Math.round(CH * dpr);
    foamCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const sr = stage.getBoundingClientRect();
    SW = Math.max(1, sr.width);
    SH = Math.max(1, sr.height);
    bubCanvas.width = Math.round(SW * dpr);
    bubCanvas.height = Math.round(SH * dpr);
    bubCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!revealed && puffs.length > 0) drawFoam();
  }

  function makeFoam(): void {
    puffs = [];
    const cols = 6;
    const rows = 6;
    const palette = ["#ffffff", "#e7f5ff", "#f3f0ff", "#fff0f6", "#d0ebff", "#e3fafc"];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = ((c + 0.5 + (Math.random() - 0.5) * 0.35) / cols) * CW;
        const py = ((r + 0.5 + (Math.random() - 0.5) * 0.35) / rows) * CH;
        const rad = Math.max(CW, CH) * (0.13 + Math.random() * 0.04);
        puffs.push({
          x: px,
          y: py,
          r: rad,
          color: palette[(r * cols + c) % palette.length]!,
          cleared: false,
        });
      }
    }
    drawFoam();
  }

  function drawFoam(): void {
    foamCtx.clearRect(0, 0, CW, CH);
    for (const p of puffs) {
      if (p.cleared) continue;
      foamCtx.fillStyle = p.color;
      foamCtx.beginPath();
      foamCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      foamCtx.fill();

      foamCtx.strokeStyle = "rgba(116, 192, 252, 0.38)";
      foamCtx.lineWidth = 2.5;
      foamCtx.stroke();

      foamCtx.fillStyle = "rgba(255, 255, 255, 0.88)";
      foamCtx.beginPath();
      foamCtx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.24, 0, Math.PI * 2);
      foamCtx.fill();
    }

    const clearedCount = puffs.filter((p) => p.cleared).length;
    if (clearedCount < 3) {
      foamCtx.fillStyle = "#339af0";
      foamCtx.font = `900 ${Math.round(Math.min(CW, CH) * 0.28)}px sans-serif`;
      foamCtx.textAlign = "center";
      foamCtx.textBaseline = "middle";
      foamCtx.fillText("🫧", CW / 2, CH / 2);
    }
  }

  function pickNextWord(): Word {
    if (deck.length === 0) deck = shuffle([...words]);
    return deck.pop()!;
  }

  function startRound(): void {
    window.clearTimeout(nextTimer);
    if (words.length === 0) return;
    current = pickNextWord();
    revealed = false;
    halfwayHinted = false;
    card.classList.remove("revealed");
    label.textContent = "いないいない…";
    secret.innerHTML = wordVisual(current, "peek-img", false);

    resize();
    makeFoam();

    const hintText = SOUND_HINTS[current.slug] ?? "あわを ゴシゴシ こすってね！";
    guide.setMessage(hintText, "🫧");
    guide.puppet.setMouth("smile");
    speak(hintText);
  }

  let lastScrubSound = 0;
  let lastX = 0;
  let lastY = 0;
  let halfwayHinted = false;

  function scrubSegment(x0: number, y0: number, x1: number, y1: number): void {
    if (revealed) return;
    const rect = foamCanvas.getBoundingClientRect();
    const wipeRadius = Math.max(24, Math.min(CW, CH) * 0.095);
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / (wipeRadius * 0.45)));
    let newlyCleared = 0;

    for (let s = 0; s <= steps; s++) {
      const cx = x0 + ((x1 - x0) * s) / steps;
      const cy = y0 + ((y1 - y0) * s) / steps;
      const lx = cx - rect.left;
      const ly = cy - rect.top;
      if (lx < -20 || ly < -20 || lx > CW + 20 || ly > CH + 20) continue;

      for (const p of puffs) {
        if (!p.cleared && Math.hypot(p.x - lx, p.y - ly) <= wipeRadius) {
          p.cleared = true;
          newlyCleared++;
        }
      }
    }

    if (newlyCleared > 0) {
      drawFoam();
      const now = performance.now();
      if (now - lastScrubSound > 75) {
        lastScrubSound = now;
        bubblePop(0.9 + Math.random() * 0.4);
      }
      burst(x1, y1, 4, ["#74c0fc", "#a5d8ff", "#ffffff", "#ffd23f"]);
      const sr = stage.getBoundingClientRect();
      if (Math.random() < 0.55) {
        bubbles.spawn(SW, SH, x1 - sr.left, y1 - sr.top, 14 + Math.random() * 14);
      }
    }

    const clearedRatio = puffs.filter((p) => p.cleared).length / Math.max(1, puffs.length);
    if (!halfwayHinted && clearedRatio >= 0.26 && clearedRatio < 0.52) {
      halfwayHinted = true;
      guide.puppet.setMouth("open", 0.75);
      guide.setMessage("おっ！ みえてきた！ もうすこし ゴシゴシ！", "👀");
    }
    if (clearedRatio >= 0.52) revealNow();
  }

  function revealNow(): void {
    if (revealed || !current) return;
    revealed = true;
    puffs.forEach((p) => {
      p.cleared = true;
    });
    foamCtx.clearRect(0, 0, CW, CH);
    card.classList.add("revealed");
    label.textContent = current.label || "ばあっ！";

    guide.puppet.hop();
    guide.puppet.setMouth("joy");
    guide.setMessage(
      current.label ? `ばあっ！ ${current.label} だね！` : "ばあっ！ みつけたね！",
      current.emoji ?? "✨",
    );

    roundCount++;

    const r = card.getBoundingClientRect();
    answerCorrect(r.left + r.width / 2, r.top + r.height / 2, [
      "#74c0fc",
      "#ffd23f",
      "#ff758f",
      "#63e6be",
    ]);
    if (roundCount % 3 === 0) roundFinished(true);
    cheer();

    for (let i = 0; i < 8; i++) {
      bubbles.spawn(SW, SH, Math.random() * SW, SH * (0.4 + Math.random() * 0.5));
    }

    const w = current;
    speak("ばあっ！");
    window.setTimeout(() => {
      void playWord(w);
    }, 520);

    nextTimer = window.setTimeout(startRound, 4000);
  }

  tap(secret, () => {
    if (!revealed || !current) return;
    window.clearTimeout(nextTimer);
    boing(1.15);
    card.classList.remove("hop");
    void card.offsetWidth;
    card.classList.add("hop");
    const r = card.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 18, ["#ffd23f", "#74c0fc", "#ff758f"]);
    void playWord(current);
    nextTimer = window.setTimeout(startRound, 3800);
  });

  tap(nextBtn, () => {
    marimba(4, 0.4);
    startRound();
  });

  let scrubbing = false;
  stage.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    scrubbing = true;
    lastX = e.clientX;
    lastY = e.clientY;
    const sr = stage.getBoundingClientRect();
    guide.puppet.lookAt(e.clientX, e.clientY);
    bubbles.tryPop(e.clientX - sr.left, e.clientY - sr.top, e.clientX, e.clientY);
    scrubSegment(e.clientX, e.clientY, e.clientX, e.clientY);
  });

  stage.addEventListener("pointermove", (e) => {
    if (!scrubbing) return;
    e.preventDefault();
    const sr = stage.getBoundingClientRect();
    guide.puppet.lookAt(e.clientX, e.clientY);
    bubbles.tryPop(e.clientX - sr.left, e.clientY - sr.top, e.clientX, e.clientY);
    scrubSegment(lastX, lastY, e.clientX, e.clientY);
    lastX = e.clientX;
    lastY = e.clientY;
  });

  const stopScrub = (): void => {
    scrubbing = false;
    guide.puppet.resetLook();
  };
  stage.addEventListener("pointerup", stopScrub);
  stage.addEventListener("pointercancel", stopScrub);

  function frame(now: number): void {
    bubCtx.clearRect(0, 0, SW, SH);
    bubbles.stepAndDraw(bubCtx, SW, SH, now, true);
    raf = requestAnimationFrame(frame);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  void (async () => {
    const all = await loadAllWords();
    const favs = all.filter(
      (w) =>
        w.custom ||
        w.category === "どうぶつ" ||
        w.category === "のりもの" ||
        w.category === "たべもの",
    );
    words = favs.length >= 4 ? favs : all;
    for (let i = 0; i < 6; i++)
      bubbles.spawn(320, 320, Math.random() * 300, 100 + Math.random() * 200);
    startRound();
    raf = requestAnimationFrame(frame);
  })();

  return () => {
    cancelAnimationFrame(raf);
    window.clearTimeout(nextTimer);
    ro.disconnect();
  };
}
