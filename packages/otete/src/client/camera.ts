// 🪞 かがみ (Magic Interactive Mirror) — self-recognition, dress-up, and motion bubble play.
//
// Upgraded spec:
//  - Unified Topbar (`🏠`, status badge, `🔊`) and Bottom Dock (costumes + shutter).
//  - Reuses `createBubbleField` from `fx.ts` for floating bubbles/toys that pop on
//    touch OR when waving hands in front of the camera.

import {
  boing,
  cheer,
  chooChoo,
  isMuted,
  plink,
  setMuted,
  soundIcon,
  speak,
  tone,
  unlockAudio,
} from "./audio";
import { saveDrawing } from "./drawings";
import { burst, celebrate, createBubbleField } from "./fx";
import type { Nav } from "./home";
import { roundFinished } from "./reward";
import { HOME_PILL, bindHome, tap } from "./ui";

type CostumeId = "bunny" | "bear" | "crown" | "fire" | "bubbles";

type CostumeDef = {
  id: CostumeId;
  icon: string;
  label: string;
  voice: string;
  frameColor: string;
};

const COSTUMES: readonly CostumeDef[] = [
  {
    id: "bunny",
    icon: "🐰",
    label: "うさぎ",
    voice: "ぴょんぴょん！ かわいい うさぎさん！",
    frameColor: "#ff85a1",
  },
  {
    id: "bear",
    icon: "🐻",
    label: "くま",
    voice: "がおー！ くまさんに へんしん！",
    frameColor: "#e09153",
  },
  {
    id: "crown",
    icon: "👑",
    label: "おうかん",
    voice: "きらきら！ おうさま・おひめさま！",
    frameColor: "#ffd23f",
  },
  {
    id: "fire",
    icon: "🚒",
    label: "しょうぼう",
    voice: "うーかんかん！ しょうぼうたい！",
    frameColor: "#ff5a5a",
  },
  {
    id: "bubbles",
    icon: "🫧",
    label: "しゃぼん",
    voice: "しゃぼんだま パチンって わってみよう！",
    frameColor: "#74c0fc",
  },
];

const TOY_EMOJIS = ["🫧", "🎈", "⭐", "🍎", "🍓", "🎵", "🌸"];

export function renderCamera(root: HTMLElement, nav: Nav): () => void {
  let costume: CostumeDef = COSTUMES[0]!;
  let stream: MediaStream | null = null;
  let rafId = 0;
  let cameraReady = false;
  let statusTimer = 0;

  root.innerHTML = `
    <div class="stage-screen camera-screen">
      <video id="cam-video" playsinline muted autoplay></video>
      <canvas id="cam-canvas"></canvas>
      <div class="camera-flash" id="cam-flash"></div>

      <div class="toy-topbar camera-topbar">
        ${HOME_PILL}
        <div class="toy-badge" id="cam-status">🪞 まほうの かがみ</div>
        <button class="icon-btn" id="cam-snd" type="button" aria-label="おと">${soundIcon()}</button>
      </div>

      <div class="draw-spacer"></div>

      <div class="camera-dock">
        <div class="toy-dock costume-row" id="cam-costumes">
          ${COSTUMES.map(
            (c, i) => `
            <button class="costume-btn${i === 0 ? " active" : ""}" data-id="${c.id}" type="button">
              <span class="costume-emo">${c.icon}</span>
              <span class="costume-lbl">${c.label}</span>
            </button>
          `,
          ).join("")}
        </div>
        <button class="shutter-btn" id="cam-snap" type="button" aria-label="しゃしんを とる">
          <span class="shutter-emo">📸</span>
          <span class="shutter-lbl">パシャッ！</span>
        </button>
      </div>
    </div>`;

  const video = root.querySelector<HTMLVideoElement>("#cam-video")!;
  const canvas = root.querySelector<HTMLCanvasElement>("#cam-canvas")!;
  const ctx = canvas.getContext("2d")!;
  const flashEl = root.querySelector<HTMLElement>("#cam-flash")!;
  const statusEl = root.querySelector<HTMLElement>("#cam-status")!;
  const snapBtn = root.querySelector<HTMLButtonElement>("#cam-snap")!;
  const sndBtn = root.querySelector<HTMLElement>("#cam-snd")!;
  const costumesEl = root.querySelector<HTMLElement>("#cam-costumes")!;

  bindHome(root, () => nav.home());
  tap(sndBtn, () => {
    setMuted(!isMuted());
    sndBtn.textContent = soundIcon();
    if (!isMuted()) plink(12);
  });

  const showStatus = (text: string, revertMs = 2200): void => {
    window.clearTimeout(statusTimer);
    statusEl.textContent = text;
    if (revertMs > 0) {
      statusTimer = window.setTimeout(() => {
        statusEl.textContent = `${costume.icon} ${costume.label}`;
      }, revertMs);
    }
  };

  const bubbles = createBubbleField(TOY_EMOJIS);
  let W = 0;
  let H = 0;
  let headX = 0;
  let headY = 0;
  let headBounce = 0;

  const MW = 64;
  const MH = 48;
  const motionCanvas = document.createElement("canvas");
  motionCanvas.width = MW;
  motionCanvas.height = MH;
  const motionCtx = motionCanvas.getContext("2d", { willReadFrequently: true })!;
  let prevLuma: Uint8Array | null = null;
  let lastMotionCheck = 0;

  function layout(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = root.clientWidth || window.innerWidth;
    H = root.clientHeight || window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!headX || !headY) {
      headX = W / 2;
      headY = H * 0.42;
    }
  }

  costumesEl.querySelectorAll<HTMLElement>(".costume-btn").forEach((btn) => {
    tap(btn, () => {
      const found = COSTUMES.find((c) => c.id === btn.dataset.id);
      if (!found) return;
      costume = found;
      costumesEl
        .querySelectorAll(".costume-btn")
        .forEach((b) => b.classList.toggle("active", b === btn));
      headBounce = performance.now();
      showStatus(`${costume.icon} ${costume.label}`, 0);
      if (costume.id === "fire") chooChoo();
      else boing(1.1);
      speak(costume.voice);
      burst(headX, headY - 60, 18, [costume.frameColor, "#ffd23f", "#ffffff"]);
    });
  });

  canvas.style.pointerEvents = "auto";
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const x = e.clientX;
    const y = e.clientY;
    if (bubbles.tryPop(x, y, x, y)) return;

    if (y > 76 && y < H - 150) {
      headX = x;
      headY = y;
      headBounce = performance.now();
      boing(1.12);
      burst(x, y - 50, 14, [costume.frameColor, "#ffd23f"]);
      speak(costume.label);
    }
  });

  function checkCameraMotion(now: number): void {
    if (!cameraReady || video.readyState < 2 || now - lastMotionCheck < 90) return;
    lastMotionCheck = now;
    try {
      motionCtx.drawImage(video, 0, 0, MW, MH);
      const data = motionCtx.getImageData(0, 0, MW, MH).data;
      const cur = new Uint8Array(MW * MH);
      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        cur[p] = Math.floor((data[i]! * 77 + data[i + 1]! * 150 + data[i + 2]! * 29) / 256);
      }
      if (prevLuma) {
        for (let i = bubbles.items.length - 1; i >= 0; i--) {
          const t = bubbles.items[i]!;
          const vx = Math.max(0, Math.min(MW - 1, Math.floor((1 - t.x / W) * MW)));
          const vy = Math.max(0, Math.min(MH - 1, Math.floor((t.y / H) * MH)));
          const idx = vy * MW + vx;
          if (Math.abs((cur[idx] ?? 0) - (prevLuma[idx] ?? 0)) > 36) {
            bubbles.popAtIndex(i, t.x, t.y);
          }
        }
      }
      prevLuma = cur;
    } catch {
      /* ignore */
    }
  }

  function drawCostume(
    targetCtx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    scale: number,
    now: number,
  ): void {
    if (costume.id === "bubbles") return;
    targetCtx.save();
    targetCtx.translate(cx, cy);
    targetCtx.scale(scale, scale);
    targetCtx.rotate(Math.sin(now * 0.003) * 0.04);

    targetCtx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    targetCtx.lineWidth = 3;
    targetCtx.setLineDash([8, 10]);
    targetCtx.beginPath();
    targetCtx.ellipse(0, 10, 95, 110, 0, 0, Math.PI * 2);
    targetCtx.stroke();
    targetCtx.setLineDash([]);

    if (costume.id === "bunny") {
      for (const dir of [-1, 1]) {
        targetCtx.save();
        targetCtx.translate(dir * 52, -108);
        targetCtx.rotate(dir * 0.16 + Math.sin(now * 0.005 + dir) * 0.06);
        targetCtx.fillStyle = "#fff0f5";
        targetCtx.strokeStyle = "#ff85a1";
        targetCtx.lineWidth = 5;
        targetCtx.beginPath();
        targetCtx.ellipse(0, -35, 26, 68, 0, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.stroke();
        targetCtx.fillStyle = "#ff85a1";
        targetCtx.beginPath();
        targetCtx.ellipse(0, -32, 13, 46, 0, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.restore();
      }
      targetCtx.fillStyle = "rgba(255, 117, 143, 0.55)";
      targetCtx.beginPath();
      targetCtx.ellipse(-64, 24, 20, 12, 0, 0, Math.PI * 2);
      targetCtx.ellipse(64, 24, 20, 12, 0, 0, Math.PI * 2);
      targetCtx.fill();
    } else if (costume.id === "bear") {
      for (const dir of [-1, 1]) {
        targetCtx.save();
        targetCtx.translate(dir * 74, -88);
        targetCtx.fillStyle = "#d98a4e";
        targetCtx.strokeStyle = "#5c3d28";
        targetCtx.lineWidth = 5;
        targetCtx.beginPath();
        targetCtx.arc(0, 0, 38, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.stroke();
        targetCtx.fillStyle = "#f9cca8";
        targetCtx.beginPath();
        targetCtx.arc(0, 0, 20, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.restore();
      }
    } else if (costume.id === "crown") {
      targetCtx.save();
      targetCtx.translate(0, -118);
      targetCtx.fillStyle = "#ffd23f";
      targetCtx.strokeStyle = "#e67700";
      targetCtx.lineWidth = 5;
      targetCtx.beginPath();
      targetCtx.moveTo(-72, 26);
      targetCtx.lineTo(-82, -38);
      targetCtx.lineTo(-36, -6);
      targetCtx.lineTo(0, -52);
      targetCtx.lineTo(36, -6);
      targetCtx.lineTo(82, -38);
      targetCtx.lineTo(72, 26);
      targetCtx.closePath();
      targetCtx.fill();
      targetCtx.stroke();
      targetCtx.restore();
    } else if (costume.id === "fire") {
      targetCtx.save();
      targetCtx.translate(0, -110);
      targetCtx.fillStyle = "#ff4d4d";
      targetCtx.strokeStyle = "#c92a2a";
      targetCtx.lineWidth = 5;
      targetCtx.beginPath();
      targetCtx.arc(0, 16, 80, Math.PI, 0);
      targetCtx.lineTo(100, 28);
      targetCtx.lineTo(-100, 28);
      targetCtx.closePath();
      targetCtx.fill();
      targetCtx.stroke();
      targetCtx.fillStyle = "#ffd23f";
      targetCtx.beginPath();
      targetCtx.arc(0, -14, 22, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.restore();
    }

    targetCtx.restore();
  }

  function frame(now: number): void {
    rafId = requestAnimationFrame(frame);
    ctx.clearRect(0, 0, W, H);

    if (!cameraReady) {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#d0ebff");
      grad.addColorStop(1, "#fff0f6");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    checkCameraMotion(now);

    let bounceScale = Math.min(1.15, Math.max(0.75, Math.min(W, H) / 390));
    if (headBounce) {
      const dt = (now - headBounce) / 1000;
      if (dt < 0.45) bounceScale *= 1 + 0.22 * Math.sin((dt / 0.45) * Math.PI);
      else headBounce = 0;
    }
    drawCostume(ctx, headX, headY, bounceScale, now);
    bubbles.stepAndDraw(ctx, W, H, now, true);
  }

  async function snapPhoto(): Promise<void> {
    tone(880, 0.06, "sine", 0.45);
    setTimeout(() => tone(1320, 0.1, "triangle", 0.45), 65);
    flashEl.classList.add("on");
    window.setTimeout(() => flashEl.classList.remove("on"), 220);

    try {
      const out = document.createElement("canvas");
      out.width = Math.max(320, Math.round(W));
      out.height = Math.max(320, Math.round(H));
      const octx = out.getContext("2d")!;

      if (cameraReady && video.videoWidth) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const cover = Math.max(out.width / vw, out.height / vh);
        const dw = vw * cover;
        const dh = vh * cover;
        octx.save();
        octx.translate(out.width, 0);
        octx.scale(-1, 1);
        octx.drawImage(video, (out.width - dw) / 2, (out.height - dh) / 2, dw, dh);
        octx.restore();
      } else {
        octx.fillStyle = "#fff0f6";
        octx.fillRect(0, 0, out.width, out.height);
      }

      octx.drawImage(canvas, 0, 0, out.width, out.height);
      octx.strokeStyle = costume.frameColor;
      octx.lineWidth = 18;
      octx.strokeRect(9, 9, out.width - 18, out.height - 18);

      const id = await saveDrawing(out);
      if (id) {
        cheer();
        celebrate(W / 2, H / 2, [costume.frameColor, "#ffd23f", "#69db7c"]);
        roundFinished(true);
        speak("パシャッ！ いい おかお！");
        showStatus("📸 さくひんに ほぞんしたよ！");
      }
    } catch {
      showStatus("とれなかった…");
    }
  }

  tap(snapBtn, () => {
    void snapPhoto();
  });

  async function startCamera(): Promise<void> {
    unlockAudio();
    if (!navigator.mediaDevices?.getUserMedia) {
      showStatus("🫧 タッチで あそべるよ！");
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      video.srcObject = stream;
      await video.play().catch(() => {});
      cameraReady = true;
      speak("ばあっ！ まほうの かがみ だよ！");
    } catch {
      showStatus("🫧 しゃぼんだまで あそぼう！");
    }
  }

  layout();
  for (let i = 0; i < 6; i++)
    bubbles.spawn(W, H, Math.random() * W, H * (0.25 + Math.random() * 0.55));
  rafId = requestAnimationFrame(frame);
  void startCamera();

  window.addEventListener("resize", layout);

  return () => {
    window.clearTimeout(statusTimer);
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener("resize", layout);
    for (const t of stream?.getTracks() ?? []) t.stop();
    stream = null;
    video.srcObject = null;
  };
}
