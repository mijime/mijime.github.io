// 🧩 すぽっ！ (Wooden Shape, Colour & Size Sorter)
//
// Upgraded spec:
//  - Unified Topbar segmented pill (🔺かたち / 🎨いろ / 🐘おおきさ) + Guide Banner.
//  - Pure visual wooden board (zero text labels inside holes so toddlers match by
//    shape, colour, and size directly).
//  - Unified `bindGrab`: drag a piece near its hole OR tap a piece to fly it straight in!

import { cheer, marimba, snapIn, speak } from "./audio";
import { loadLevel, saveLevel } from "./difficulty";
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

const LKEY = "otete-puzzle-level";

type ShapeDef = {
  id: string;
  name: string;
  color: string;
  stroke: string;
  path: string;
};

const SHAPES: readonly ShapeDef[] = [
  {
    id: "circle",
    name: "まる",
    color: "#ff5a5a",
    stroke: "#c92a2a",
    path: '<circle cx="60" cy="60" r="46" />',
  },
  {
    id: "triangle",
    name: "さんかく",
    color: "#ffd23f",
    stroke: "#e67700",
    path: '<path d="M60 12 L108 98 L12 98 Z" stroke-linejoin="round" />',
  },
  {
    id: "square",
    name: "しかく",
    color: "#4d8bff",
    stroke: "#1971c2",
    path: '<rect x="16" y="16" width="88" height="88" rx="16" />',
  },
  {
    id: "star",
    name: "ほし",
    color: "#37b24d",
    stroke: "#2b8a3e",
    path: '<polygon points="60,10 73,42 108,44 81,67 90,102 60,83 30,102 39,67 12,44 47,42" stroke-linejoin="round" />',
  },
  {
    id: "heart",
    name: "ハート",
    color: "#ff758f",
    stroke: "#c9184a",
    path: '<path d="M60 102 C60 102 14 72 14 40 C14 22 28 12 44 12 C53 12 60 19 60 26 C60 19 67 12 76 12 C92 12 106 22 106 40 C106 72 60 102 60 102 Z" stroke-linejoin="round" />',
  },
  {
    id: "flower",
    name: "おはな",
    color: "#b197fc",
    stroke: "#6741d9",
    path: '<path d="M60,12 C72,12 76,26 70,34 C80,28 94,36 90,48 C102,48 108,62 96,70 C104,80 94,94 82,88 C82,100 68,108 60,96 C52,108 38,100 38,88 C26,94 16,80 24,70 C12,62 18,48 30,48 C26,36 40,28 50,34 C44,26 48,12 60,12 Z" stroke-linejoin="round" />',
  },
];

const COLOR_ITEMS = [
  { id: "red", name: "あか", sub: "りんご", emoji: "🍎", color: "#ff5a5a", stroke: "#c92a2a" },
  { id: "yellow", name: "きいろ", sub: "バナナ", emoji: "🍌", color: "#ffd23f", stroke: "#e67700" },
  { id: "blue", name: "あお", sub: "おさかな", emoji: "🐟", color: "#4d8bff", stroke: "#1971c2" },
  { id: "green", name: "みどり", sub: "かえる", emoji: "🐸", color: "#37b24d", stroke: "#2b8a3e" },
  {
    id: "orange",
    name: "だいだい",
    sub: "みかん",
    emoji: "🍊",
    color: "#ff922b",
    stroke: "#d9480f",
  },
  {
    id: "purple",
    name: "むらさき",
    sub: "ぶどう",
    emoji: "🍇",
    color: "#9b5de5",
    stroke: "#5f3dc4",
  },
];

type PieceItem = {
  id: string;
  speech: string;
  holeSvg: string;
  pieceSvg: string;
  color: string;
};

type Mode = "shape" | "color" | "size";

function blockFaceSvg(): string {
  return `
    <circle cx="46" cy="56" r="4.5" fill="#2f2a3a"/>
    <circle cx="74" cy="56" r="4.5" fill="#2f2a3a"/>
    <circle cx="38" cy="64" r="5" fill="#ffffff" opacity="0.45"/>
    <circle cx="82" cy="64" r="5" fill="#ffffff" opacity="0.45"/>
    <path d="M 52 66 Q 60 74 68 66" fill="none" stroke="#2f2a3a" stroke-width="4" stroke-linecap="round"/>
  `;
}

export function renderPuzzle(root: HTMLElement, nav: Nav, initialMode: Mode = "shape"): () => void {
  let mode: Mode = initialMode;
  let level = loadLevel(LKEY, 0);
  let items: PieceItem[] = [];
  const placed = new Set<string>();
  let nextTimer = 0;

  const segs = [
    { key: "shape", emo: "🔺", label: "かたち" },
    { key: "color", emo: "🎨", label: "いろ" },
    { key: "size", emo: "🐘", label: "おおきさ" },
  ] as const;

  root.innerHTML = `
    <div class="stage-screen puzzle-screen">
      <div class="toy-topbar">
        ${HOME_PILL}
        ${segHtml(segs, mode)}
        <span class="topbar-spacer"></span>
      </div>

      <div id="pz-guide"></div>

      <div class="play-split">
        <div class="wood-board" id="pz-board"></div>
        <div class="toy-dock puzzle-tray" id="pz-tray"></div>
      </div>
    </div>
  `;

  const board = root.querySelector<HTMLElement>("#pz-board")!;
  const tray = root.querySelector<HTMLElement>("#pz-tray")!;

  const modePrompt = (): string =>
    mode === "shape"
      ? "おなじ かたちの あなに いれてね！"
      : mode === "color"
        ? "おなじ いろの あなに いれてね！"
        : "おおきい・ちいさい あなに いれてね！";

  const guide = createGuideBanner({
    friendIdx: 2,
    onReplay: () => speak(modePrompt()),
  });
  root.querySelector("#pz-guide")!.replaceWith(guide.el);

  bindHome(root, () => nav.home());
  bindSeg(root, (k) => {
    mode = (k as Mode) || "shape";
    dealRound();
  });

  function buildRoundItems(): PieceItem[] {
    const count = Math.min(4, Math.max(2, 2 + Math.floor(level / 3)));

    if (mode === "shape") {
      const picks = shuffle([...SHAPES]).slice(0, count);
      return picks.map((s) => ({
        id: s.id,
        speech: s.name,
        color: s.color,
        holeSvg: `
          <svg viewBox="0 0 120 120" class="pz-svg">
            <g fill="rgba(45, 32, 20, 0.28)" stroke="rgba(45, 32, 20, 0.42)" stroke-width="5">
              ${s.path}
            </g>
          </svg>`,
        pieceSvg: `
          <svg viewBox="0 0 120 120" class="pz-svg">
            <g fill="${s.color}" stroke="${s.stroke}" stroke-width="6">
              ${s.path}
            </g>
            ${blockFaceSvg()}
          </svg>`,
      }));
    }

    if (mode === "color") {
      const picks = shuffle([...COLOR_ITEMS]).slice(0, count);
      return picks.map((c) => ({
        id: c.id,
        speech: `${c.name}！ ${c.sub}`,
        color: c.color,
        holeSvg: `
          <svg viewBox="0 0 120 120" class="pz-svg">
            <circle cx="60" cy="60" r="46" fill="rgba(45, 32, 20, 0.2)" stroke="${c.color}" stroke-width="8" stroke-dasharray="12 8"/>
          </svg>`,
        pieceSvg: `
          <svg viewBox="0 0 120 120" class="pz-svg">
            <circle cx="60" cy="60" r="46" fill="${c.color}" stroke="${c.stroke}" stroke-width="6"/>
            <text x="60" y="66" text-anchor="middle" dominant-baseline="middle" font-size="52">${c.emoji}</text>
          </svg>`,
      }));
    }

    const shape = SHAPES[Math.trunc(Math.random() * SHAPES.length)]!;
    const sizes =
      count >= 3
        ? [
            { id: "big", label: "おおきい", scale: 1.15 },
            { id: "mid", label: "ちゅうくらい", scale: 0.86 },
            { id: "small", label: "ちいさい", scale: 0.62 },
          ]
        : [
            { id: "big", label: "おおきい", scale: 1.14 },
            { id: "small", label: "ちいさい", scale: 0.64 },
          ];
    return sizes.map((sz) => ({
      id: sz.id,
      speech: `${sz.label} ${shape.name}`,
      color: shape.color,
      holeSvg: `
        <svg viewBox="0 0 120 120" class="pz-svg" style="transform:scale(${sz.scale})">
          <g fill="rgba(45, 32, 20, 0.28)" stroke="rgba(45, 32, 20, 0.42)" stroke-width="5">
            ${shape.path}
          </g>
        </svg>`,
      pieceSvg: `
        <svg viewBox="0 0 120 120" class="pz-svg" style="transform:scale(${sz.scale})">
          <g fill="${shape.color}" stroke="${shape.stroke}" stroke-width="6">
            ${shape.path}
          </g>
          ${blockFaceSvg()}
        </svg>`,
    }));
  }

  function dealRound(): void {
    window.clearTimeout(nextTimer);
    placed.clear();
    items = buildRoundItems();
    const trayOrder = shuffle([...items]);

    guide.setMessage(modePrompt());
    guide.puppet.setMouth("smile");

    board.innerHTML = items
      .map(
        (it) => `
        <div class="pz-hole" data-id="${it.id}">
          <div class="pz-hole-art">${it.holeSvg}</div>
          <div class="pz-hole-filled"></div>
        </div>
      `,
      )
      .join("");

    tray.innerHTML = trayOrder
      .map(
        (it) => `
        <button class="pz-piece" data-id="${it.id}" type="button" aria-label="${it.speech}">
          ${it.pieceSvg}
        </button>
      `,
      )
      .join("");

    board.querySelectorAll<HTMLElement>(".pz-hole").forEach((holeEl) => {
      tap(holeEl, () => {
        const hid = holeEl.dataset.id ?? "";
        const it = items.find((x) => x.id === hid);
        if (!it || placed.has(hid)) return;
        marimba(2, 0.35);
        speak(it.speech);
        holeEl.classList.remove("pulse");
        void holeEl.offsetWidth;
        holeEl.classList.add("pulse");
      });
    });

    tray.querySelectorAll<HTMLElement>(".pz-piece").forEach((pieceEl) => {
      const id = pieceEl.dataset.id ?? "";
      const item = items.find((x) => x.id === id)!;
      const holeEl = board.querySelector<HTMLElement>(`.pz-hole[data-id="${id}"]`)!;

      bindGrab(pieceEl, {
        canStart: () => !placed.has(item.id),
        onStart: (x, y) => {
          marimba(1, 0.38);
          speak(item.speech);
          guide.puppet.lookAt(x, y);
        },
        onMove: (x, y) => {
          guide.puppet.lookAt(x, y);
          const hr = holeEl.getBoundingClientRect();
          const dist = Math.hypot(x - (hr.left + hr.width / 2), y - (hr.top + hr.height / 2));
          holeEl.classList.toggle("glow", dist < 140);
        },
        findTarget: (x, y, _dx, _dy, isTap) => {
          holeEl.classList.remove("glow");
          const hr = holeEl.getBoundingClientRect();
          const hcx = hr.left + hr.width / 2;
          const hcy = hr.top + hr.height / 2;
          if (isTap || Math.hypot(x - hcx, y - hcy) < 145) {
            return { x: hcx, y: hcy };
          }
          return null;
        },
        onSnap: (target) => {
          if (placed.has(item.id)) return;
          placed.add(item.id);
          pieceEl.classList.add("placed");
          holeEl.classList.add("filled");
          holeEl.querySelector<HTMLElement>(".pz-hole-filled")!.innerHTML = item.pieceSvg;

          snapIn(placed.size);
          speak(item.speech);
          guide.puppet.hop();
          guide.setMessage(`スポッ！ ${item.speech}！`);
          answerCorrect(target.x, target.y, [item.color, "#ffd23f", "#37b24d"]);

          if (placed.size >= items.length) {
            level++;
            saveLevel(LKEY, level);
            window.setTimeout(() => {
              guide.puppet.setMouth("joy");
              guide.setMessage("やったー！ ぜんぶ はまったね！");
              cheer();
              speak("ぜんぶ はまったね！ すごい！");
              roundFinished(true);
              board.classList.add("celebrate");
            }, 250);
            nextTimer = window.setTimeout(() => {
              board.classList.remove("celebrate");
              dealRound();
            }, 2000);
          }
        },
        onCancel: () => {
          guide.puppet.resetLook();
        },
      });
    });
  }

  dealRound();

  return () => {
    window.clearTimeout(nextTimer);
  };
}
