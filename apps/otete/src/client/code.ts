// 🤖 プログラム (Toddler Pre-Coding Toy) — 2 playful programming modes for 2–3yo:
//
//  1. 🛤️ つなげて (Track-Building Logic):
//     Place road/rail panels (straight, curve, music crossing, rainbow jump) into
//     the gaps between the vehicle and the goal station. When connected, the
//     vehicle executes the route tile-by-tile!
//  2. 🤖 ダンス (Command Sequencing):
//     Line up action blocks (⬆️ジャンプ, 🌀くるりん, 🎵ダンス, 🍎もぐもぐ, 🫧しゃぼん)
//     into the 1-2-3 program slots and press ▶️スタート！ to watch the animal
//     friend execute the sequence step by step!

import {
  boing,
  bubblePop,
  cheer,
  chomp,
  chooChoo,
  marimba,
  plink,
  snapIn,
  speak,
  tone,
} from "./audio";
import { createFriendPuppet, FRIENDS } from "./character";
import { loadLevel, saveLevel } from "./difficulty";
import { burst, ring } from "./fx";
import type { Nav } from "./home";
import { answerCorrect, roundFinished } from "./reward";
import {
  HOME_PILL,
  bindGrab,
  bindHome,
  bindSeg,
  createGuideBanner,
  segHtml,
  shuffle,
  tap,
} from "./ui";

const LKEY = "otete-code-level";

type CodeMode = "track" | "dance";

/* ==========================================================================
   Mode 1 Definitions: 🛤️ つなげて (Track Panels)
   ========================================================================== */

type PanelKind = {
  id: string;
  name: string;
  badge: string;
  color: string;
  svg: string;
};

const PANELS: readonly PanelKind[] = [
  {
    id: "straight",
    name: "まっすぐ",
    badge: "━",
    color: "#4d8bff",
    svg: `
      <svg viewBox="0 0 100 100" class="code-tile-svg">
        <rect x="8" y="8" width="84" height="84" rx="18" fill="#e7f5ff" stroke="#4d8bff" stroke-width="5"/>
        <line x1="8" y1="50" x2="92" y2="50" stroke="#4d8bff" stroke-width="18" stroke-linecap="round"/>
        <line x1="14" y1="50" x2="86" y2="50" stroke="#ffffff" stroke-width="4" stroke-dasharray="8 8" stroke-linecap="round"/>
      </svg>`,
  },
  {
    id: "wave",
    name: "くねくね",
    badge: "〰️",
    color: "#37b24d",
    svg: `
      <svg viewBox="0 0 100 100" class="code-tile-svg">
        <rect x="8" y="8" width="84" height="84" rx="18" fill="#ebfbee" stroke="#37b24d" stroke-width="5"/>
        <path d="M 8 50 Q 30 20, 50 50 T 92 50" fill="none" stroke="#37b24d" stroke-width="16" stroke-linecap="round"/>
        <path d="M 12 50 Q 30 20, 50 50 T 88 50" fill="none" stroke="#ffffff" stroke-width="4" stroke-dasharray="7 7" stroke-linecap="round"/>
      </svg>`,
  },
  {
    id: "music",
    name: "おんぷ",
    badge: "🎵",
    color: "#f59f00",
    svg: `
      <svg viewBox="0 0 100 100" class="code-tile-svg">
        <rect x="8" y="8" width="84" height="84" rx="18" fill="#fff9db" stroke="#f59f00" stroke-width="5"/>
        <line x1="8" y1="50" x2="92" y2="50" stroke="#f59f00" stroke-width="16" stroke-linecap="round"/>
        <circle cx="50" cy="50" r="22" fill="#ffd43b" stroke="#f59f00" stroke-width="4"/>
        <text x="50" y="56" text-anchor="middle" dominant-baseline="middle" font-size="26">🎵</text>
      </svg>`,
  },
  {
    id: "jump",
    name: "ジャンプ",
    badge: "🌈",
    color: "#f06595",
    svg: `
      <svg viewBox="0 0 100 100" class="code-tile-svg">
        <rect x="8" y="8" width="84" height="84" rx="18" fill="#fff0f6" stroke="#f06595" stroke-width="5"/>
        <path d="M 10 56 Q 50 14, 90 56" fill="none" stroke="#f06595" stroke-width="16" stroke-linecap="round"/>
        <text x="50" y="66" text-anchor="middle" dominant-baseline="middle" font-size="26">🌈</text>
      </svg>`,
  },
];

const VEHICLES = [
  { who: "🚂", name: "きかんしゃ", goal: "🏠" },
  { who: "🚒", name: "しょうぼうしゃ", goal: "🏢" },
  { who: "🚗", name: "くるま", goal: "🏁" },
  { who: "🚀", name: "ロケット", goal: "🌙" },
];

/* ==========================================================================
   Mode 2 Definitions: 🤖 ダンス (Command Blocks)
   ========================================================================== */

type CmdBlock = {
  id: "jump" | "spin" | "dance" | "eat" | "bubble";
  emo: string;
  label: string;
  color: string;
};

const CMD_BLOCKS: readonly CmdBlock[] = [
  { id: "jump", emo: "⬆️", label: "ジャンプ", color: "#ff6b6b" },
  { id: "spin", emo: "🌀", label: "くるりん", color: "#4d8bff" },
  { id: "dance", emo: "🎵", label: "ダンス", color: "#f59f00" },
  { id: "eat", emo: "🍎", label: "もぐもぐ", color: "#37b24d" },
  { id: "bubble", emo: "🫧", label: "しゃぼん", color: "#9b5de5" },
];

export function renderCode(root: HTMLElement, nav: Nav): () => void {
  let mode: CodeMode = "track";
  let level = loadLevel(LKEY, 0);
  let vehIdx = 0;
  let friendIdx = 0;
  let locked = false;
  let timers: number[] = [];
  let replayFn: () => void = () => {};

  const later = (fn: () => void, ms: number): void => {
    timers.push(window.setTimeout(fn, ms));
  };
  const clearTimers = (): void => {
    timers.forEach((t) => clearTimeout(t));
    timers = [];
  };

  const segs = [
    { key: "track", emo: "🛤️", label: "つなげて" },
    { key: "dance", emo: "🤖", label: "ダンス" },
  ] as const;

  root.innerHTML = `
    <div class="stage-screen code-screen">
      <div class="toy-topbar">
        ${HOME_PILL}
        ${segHtml(segs, mode)}
        <span class="topbar-spacer"></span>
      </div>

      <div id="cd-guide"></div>

      <div class="count-main" id="cd-main"></div>
    </div>
  `;

  const main = root.querySelector<HTMLElement>("#cd-main")!;

  const guide = createGuideBanner({
    friendIdx: 2,
    onReplay: () => replayFn(),
  });
  root.querySelector("#cd-guide")!.replaceWith(guide.el);

  bindHome(root, () => nav.home());
  bindSeg(root, (k) => {
    mode = (k as CodeMode) || "track";
    render();
  });

  function render(): void {
    clearTimers();
    locked = false;
    guide.puppet.setMouth("smile");
    guide.puppet.resetLook();
    if (mode === "track") renderTrackMode();
    else renderDanceMode();
  }

  /* =======================================================================
     Mode 1: 🛤️ つなげて (Track-Building Logic)
     ======================================================================= */
  function renderTrackMode(): void {
    clearTimers();
    locked = false;

    const veh = VEHICLES[vehIdx % VEHICLES.length]!;
    vehIdx++;
    const slotCount = level < 2 ? 2 : 3;
    const targetPanels: PanelKind[] = Array.from(
      { length: slotCount },
      (_, i) => PANELS[(level + i) % PANELS.length]!,
    );
    const filled: (PanelKind | null)[] = Array.from({ length: slotCount }, () => null);
    const trayPanels = shuffle([...targetPanels]);

    const promptText = `パネルを はめて ${veh.who} を ${veh.goal} へ はしらせよう！`;
    replayFn = () => speak(`${veh.name} の みちを つなげよう！`);
    guide.setMessage(promptText, veh.who);

    main.innerHTML = `
      <div class="play-split">
        <div class="track-board" id="tk-board">
          <div class="track-row" id="tk-row">
            <div class="track-endpoint start" id="tk-start">
              <span class="tk-runner" id="tk-runner">${veh.who}</span>
            </div>
            ${targetPanels
              .map(
                (p, i) => `
              <div class="track-slot" data-slot="${i}" data-need="${p.id}">
                <div class="track-slot-ghost">${p.svg}</div>
                <div class="track-slot-fill"></div>
              </div>
            `,
              )
              .join("")}
            <div class="track-endpoint goal" id="tk-goal">
              <span class="tk-goal-emo">${veh.goal}</span>
            </div>
          </div>
        </div>

        <div class="toy-dock wood-dock" id="tk-tray">
          ${trayPanels
            .map(
              (p, i) => `
            <button class="track-piece" data-idx="${i}" data-id="${p.id}" type="button" aria-label="${p.name}">
              ${p.svg}
              <span class="track-piece-lbl">${p.badge} ${p.name}</span>
            </button>
          `,
            )
            .join("")}
        </div>
      </div>
    `;

    const slots = [...main.querySelectorAll<HTMLElement>(".track-slot")];
    const pieces = [...main.querySelectorAll<HTMLElement>(".track-piece")];
    const runner = main.querySelector<HTMLElement>("#tk-runner")!;
    const startEl = main.querySelector<HTMLElement>("#tk-start")!;
    const goalEl = main.querySelector<HTMLElement>("#tk-goal")!;

    function runTrain(): void {
      locked = true;
      chooChoo();
      guide.puppet.hop();
      guide.setMessage(`しゅっぱつ しんこう！ ${veh.who}💨`, "🚦");
      speak("しゅっぱつ しんこう！");

      const startRect = startEl.getBoundingClientRect();
      const waypoints = [...slots, goalEl];

      waypoints.forEach((wp, stepIdx) => {
        later(
          () => {
            const r = wp.getBoundingClientRect();
            const dx = r.left + r.width / 2 - (startRect.left + startRect.width / 2);
            const dy = r.top + r.height / 2 - (startRect.top + startRect.height / 2);
            const panel = filled[stepIdx];

            wp.classList.add("active-step");
            if (panel?.id === "jump") {
              runner.style.transform = `translate(${dx}px, ${dy - 26}px) scale(1.25)`;
              boing(1.25);
            } else {
              runner.style.transform = `translate(${dx}px, ${dy}px) scale(1.12)`;
            }

            if (panel?.id === "music") {
              marimba(2, 0.5);
              later(() => marimba(4, 0.5), 90);
              later(() => marimba(7, 0.5), 180);
            } else if (stepIdx < waypoints.length - 1) {
              marimba(stepIdx + 2, 0.45);
            }

            burst(r.left + r.width / 2, r.top + r.height / 2, 16, [
              panel?.color ?? "#ffd23f",
              "#ffd23f",
              "#69db7c",
            ]);

            if (stepIdx === waypoints.length - 1) {
              level++;
              saveLevel(LKEY, level);
              guide.puppet.setMouth("joy");
              guide.puppet.hop();
              guide.setMessage(`やったー！ ${veh.goal} に とうちゃく！`, "🎉");
              cheer();
              answerCorrect(r.left + r.width / 2, r.top + r.height / 2);
              roundFinished(true);
              speak("やったー！ とうちゃく！");
              later(renderTrackMode, 2200);
            }
          },
          (stepIdx + 1) * 560,
        );
      });
    }

    pieces.forEach((pieceEl) => {
      const idx = Number(pieceEl.dataset.idx ?? 0);
      const panel = trayPanels[idx]!;

      bindGrab(pieceEl, {
        canStart: () => !locked && !pieceEl.classList.contains("placed"),
        onStart: (x, y) => {
          marimba(1, 0.38);
          speak(panel.name);
          guide.puppet.lookAt(x, y);
        },
        onMove: (x, y) => {
          guide.puppet.lookAt(x, y);
          slots.forEach((sl, si) => {
            if (filled[si]) return;
            const sr = sl.getBoundingClientRect();
            const d = Math.hypot(x - (sr.left + sr.width / 2), y - (sr.top + sr.height / 2));
            sl.classList.toggle("glow", d < 120);
          });
        },
        findTarget: (x, y, _dx, _dy, isTap) => {
          slots.forEach((sl) => sl.classList.remove("glow"));
          // Prefer matching slot first, or nearest open slot on drag!
          let bestIdx = -1;
          if (isTap) {
            bestIdx = slots.findIndex((sl, si) => !filled[si] && sl.dataset.need === panel.id);
            if (bestIdx < 0) bestIdx = slots.findIndex((_, si) => !filled[si]);
          } else {
            let bestDist = 135;
            slots.forEach((sl, si) => {
              if (filled[si]) return;
              const sr = sl.getBoundingClientRect();
              const d = Math.hypot(x - (sr.left + sr.width / 2), y - (sr.top + sr.height / 2));
              if (d < bestDist) {
                bestDist = d;
                bestIdx = si;
              }
            });
          }
          if (bestIdx < 0) return null;
          const targetSlot = slots[bestIdx]!;
          targetSlot.dataset.pending = String(bestIdx);
          const sr = targetSlot.getBoundingClientRect();
          return { x: sr.left + sr.width / 2, y: sr.top + sr.height / 2 };
        },
        onSnap: (pt) => {
          const slotIdx = slots.findIndex(
            (sl, si) => !filled[si] && sl.dataset.pending === String(si),
          );
          const resolvedIdx = slotIdx >= 0 ? slotIdx : slots.findIndex((_, si) => !filled[si]);
          if (resolvedIdx < 0) return;

          const slotEl = slots[resolvedIdx]!;
          delete slotEl.dataset.pending;
          filled[resolvedIdx] = panel;
          pieceEl.classList.add("placed");
          slotEl.classList.add("filled");
          slotEl.querySelector<HTMLElement>(".track-slot-fill")!.innerHTML = panel.svg;

          snapIn(resolvedIdx + 1);
          burst(pt.x, pt.y, 16, [panel.color, "#ffd23f"]);
          guide.puppet.hop();

          if (filled.every(Boolean)) {
            later(runTrain, 320);
          } else {
            guide.setMessage(`カチッ！ ${panel.name} パネル！`, panel.badge);
          }
        },
        onCancel: () => {
          guide.puppet.resetLook();
        },
      });
    });
  }

  /* =======================================================================
     Mode 2: 🤖 ダンス (Command Sequence Programming)
     ======================================================================= */
  function renderDanceMode(): void {
    clearTimers();
    locked = false;

    const slotCount = 3;
    const recipe: CmdBlock[] = Array.from(
      { length: slotCount },
      () => CMD_BLOCKS[Math.trunc(Math.random() * CMD_BLOCKS.length)]!,
    );
    const queue: (CmdBlock | null)[] = Array.from({ length: slotCount }, () => null);

    const recipeIcons = recipe.map((r) => r.emo).join("→");
    replayFn = () => speak("ボタンを ならべて スタートを おしてね！");
    guide.setMessage(`うごきを ならべて ▶️スタート！ （おてほん ${recipeIcons}）`, "🤖");

    main.innerHTML = `
      <div class="play-split">
        <div class="dance-stage">
          <div class="dance-actor-wrap" id="dn-actor">
            <div class="dance-prop" id="dn-prop"></div>
          </div>

          <div class="code-seq-bar" id="dn-bar">
            <div class="code-slots" id="dn-slots">
              ${recipe
                .map(
                  (r, i) => `
                <button class="code-slot" data-slot="${i}" type="button" title="タップで けす">
                  <span class="code-slot-num">${i + 1}</span>
                  <span class="code-slot-hint">${r.emo}</span>
                  <span class="code-slot-fill"></span>
                </button>
              `,
                )
                .join('<span class="code-arrow">▶</span>')}
            </div>
            <button class="toy-action-btn code-run-btn" id="dn-run" type="button">▶️ スタート！</button>
          </div>
        </div>

        <div class="toy-dock wood-dock" id="dn-dock">
          ${CMD_BLOCKS.map(
            (b) => `
            <button class="cmd-btn" data-id="${b.id}" style="--cmd-c:${b.color}" type="button">
              <span class="cmd-emo">${b.emo}</span>
              <span class="cmd-lbl">${b.label}</span>
            </button>
          `,
          ).join("")}
        </div>
      </div>
    `;

    const actorWrap = main.querySelector<HTMLElement>("#dn-actor")!;
    const propEl = main.querySelector<HTMLElement>("#dn-prop")!;
    const slotEls = [...main.querySelectorAll<HTMLElement>(".code-slot")];
    const runBtn = main.querySelector<HTMLButtonElement>("#dn-run")!;

    const dancer = createFriendPuppet(FRIENDS[friendIdx % FRIENDS.length]!);
    friendIdx++;
    actorWrap.prepend(dancer.el);

    function syncSlots(): void {
      slotEls.forEach((el, i) => {
        const b = queue[i];
        el.classList.toggle("filled", Boolean(b));
        const fillEl = el.querySelector<HTMLElement>(".code-slot-fill")!;
        if (b) {
          fillEl.innerHTML = `<span class="slot-cmd-emo">${b.emo}</span><span class="slot-cmd-lbl">${b.label}</span>`;
        } else {
          fillEl.innerHTML = "";
        }
      });
    }

    // Allow tapping a filled slot to remove it before running
    slotEls.forEach((el, i) => {
      tap(el, () => {
        if (locked || !queue[i]) return;
        queue[i] = null;
        plink(9, 0.3);
        syncSlots();
      });
    });

    function performStep(cmd: CmdBlock): void {
      const r = actorWrap.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;

      actorWrap.classList.remove("act-jump", "act-spin", "act-dance");
      void actorWrap.offsetWidth;

      if (cmd.id === "jump") {
        actorWrap.classList.add("act-jump");
        dancer.setMouth("joy");
        boing(1.25);
        burst(cx, cy, 22, ["#ff6b6b", "#ffd23f", "#ffffff"]);
      } else if (cmd.id === "spin") {
        actorWrap.classList.add("act-spin");
        dancer.setMouth("open", 0.9);
        tone(360, 0.35, "sine", 0.4, 880);
        ring(cx, cy, "#4d8bff");
        burst(cx, cy, 18, ["#4d8bff", "#74c0fc", "#ffd23f"]);
      } else if (cmd.id === "dance") {
        actorWrap.classList.add("act-dance");
        dancer.setMouth("joy");
        [0, 2, 4, 7].forEach((n, idx) => later(() => marimba(n, 0.48), idx * 95));
        burst(cx, cy - 30, 20, ["#f59f00", "#ffd23f", "#ff758f"]);
      } else if (cmd.id === "eat") {
        propEl.textContent = "🍎";
        propEl.classList.add("show");
        dancer.setMouth("chew");
        dancer.hop();
        chomp();
        burst(cx, cy, 20, ["#37b24d", "#ff6b6b", "#ffd23f"]);
        later(() => propEl.classList.remove("show"), 520);
      } else if (cmd.id === "bubble") {
        dancer.setMouth("open", 0.8);
        dancer.hop();
        for (let i = 0; i < 4; i++) {
          later(() => bubblePop(0.95 + i * 0.12), i * 85);
        }
        ring(cx, cy, "#9b5de5");
        burst(cx, cy, 24, ["#74c0fc", "#b197fc", "#ffffff"]);
      }
      speak(cmd.label);
    }

    function executeProgram(): void {
      if (locked) return;
      // If no blocks were placed yet, fill with the recipe so tapping Start always works!
      if (!queue.some(Boolean)) {
        recipe.forEach((r, i) => {
          queue[i] = r;
        });
        syncSlots();
      }

      const activeSteps = queue
        .map((cmd, idx) => (cmd ? { cmd, idx } : null))
        .filter((x): x is { cmd: CmdBlock; idx: number } => x !== null);

      locked = true;
      plink(16, 0.4);

      activeSteps.forEach(({ cmd, idx }, stepOrder) => {
        later(() => {
          slotEls.forEach((s, si) => s.classList.toggle("active-step", si === idx));
          guide.setMessage(`${stepOrder + 1}！ ${cmd.emo} ${cmd.label}！`, cmd.emo);
          performStep(cmd);
        }, stepOrder * 820);
      });

      later(
        () => {
          slotEls.forEach((s) => s.classList.remove("active-step"));
          dancer.setMouth("joy");
          dancer.hop();
          level++;
          saveLevel(LKEY, level);
          const r = actorWrap.getBoundingClientRect();
          answerCorrect(r.left + r.width / 2, r.top + r.height / 2);
          roundFinished(true);
          cheer();
          guide.setMessage("すごーい！ ダンス だいせいこう！", "🎉");
          speak("やったー！ だいせいこう！");
          later(renderDanceMode, 2200);
        },
        activeSteps.length * 820 + 250,
      );
    }

    tap(runBtn, executeProgram);
    tap(dancer.el, executeProgram);

    let targetSlotIdx = -1;

    main.querySelectorAll<HTMLElement>(".cmd-btn").forEach((btn) => {
      const cmd = CMD_BLOCKS.find((b) => b.id === btn.dataset.id)!;

      bindGrab(btn, {
        canStart: () => !locked && queue.some((q) => !q),
        onStart: (x, y) => {
          targetSlotIdx = -1;
          marimba(1, 0.36);
          speak(cmd.label);
          dancer.lookAt(x, y);
        },
        onMove: (x, y) => {
          dancer.lookAt(x, y);
          let nearest = -1;
          let bestDist = 115;
          slotEls.forEach((sl, si) => {
            const sr = sl.getBoundingClientRect();
            const d = Math.hypot(x - (sr.left + sr.width / 2), y - (sr.top + sr.height / 2));
            if (d < bestDist) {
              bestDist = d;
              nearest = si;
            }
          });
          slotEls.forEach((sl, si) => sl.classList.toggle("glow", si === nearest));
        },
        findTarget: (x, y, _dx, dy, isTap) => {
          slotEls.forEach((sl) => sl.classList.remove("glow"));
          if (isTap) {
            targetSlotIdx = queue.findIndex((q) => !q);
          } else {
            let bestDist = 125;
            slotEls.forEach((sl, si) => {
              const sr = sl.getBoundingClientRect();
              const d = Math.hypot(x - (sr.left + sr.width / 2), y - (sr.top + sr.height / 2));
              if (d < bestDist) {
                bestDist = d;
                targetSlotIdx = si;
              }
            });
            // Also allow dragging upward toward the stage/bar generally
            if (targetSlotIdx < 0 && dy < -45) {
              targetSlotIdx = queue.findIndex((q) => !q);
            }
          }
          if (targetSlotIdx < 0) return null;
          const sr = slotEls[targetSlotIdx]!.getBoundingClientRect();
          return { x: sr.left + sr.width / 2, y: sr.top + sr.height / 2 };
        },
        onSnap: (pt) => {
          // Restore palette button to the dock so it can be dragged again
          btn.style.transition = "";
          btn.style.transform = "";
          dancer.resetLook();

          const idx = targetSlotIdx >= 0 ? targetSlotIdx : queue.findIndex((q) => !q);
          if (locked || idx < 0) return;

          queue[idx] = cmd;
          snapIn(idx + 1);
          syncSlots();
          burst(pt.x, pt.y, 14, [cmd.color, "#ffd23f"]);

          dancer.hop();
          guide.setMessage(
            queue.every(Boolean)
              ? "ぜんぶ ならんだよ！ ▶️スタート！"
              : `${idx + 1}ばんめに ${cmd.emo}${cmd.label}！`,
            cmd.emo,
          );

          if (queue.every(Boolean)) {
            later(executeProgram, 520);
          }
        },
        onCancel: () => {
          dancer.resetLook();
        },
      });
    });
  }

  render();

  return () => {
    clearTimers();
  };
}
