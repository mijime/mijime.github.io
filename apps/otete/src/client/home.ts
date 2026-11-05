import { openAdmin } from "./admin";
import { isMuted, plink, setMuted, soundIcon } from "./audio";
import { deleteDrawing, listDrawings, objectUrlsFor } from "./drawings";
import { dropOverlay, makeOverlay } from "./overlay";
import { themeIcon, toggleTheme } from "./theme";
import { tap, tapOrHold } from "./ui";

export type Nav = {
  home: () => void;
  feed: () => void;
  peek: () => void;
  puzzle: () => void;
  trace: () => void;
  code: () => void;
  draw: () => void;
  learn: () => void;
  count: () => void;
  camera: () => void;
  gallery: () => void;
};

type Toy = { go: keyof Nav; emo: string; label: string; desc: string };

// The otete top page and the games below it have different owners: a grown-up
// picks what to play, the toddler plays it. So the catalogue is a site-style
// list (see /apps/ for the visual language) while the games stay tactile toys.
const CHEST: Toy[] = [
  { go: "feed", emo: "🍎", label: "もぐもぐ", desc: "feeding" },
  { go: "peek", emo: "🫧", label: "あわあわ", desc: "bubbles" },
  { go: "puzzle", emo: "🧩", label: "すぽっ！", desc: "shape sorter" },
  { go: "trace", emo: "🚂", label: "ぽっぽー", desc: "train tracing" },
  { go: "code", emo: "🤖", label: "プログラム", desc: "musical code" },
  { go: "draw", emo: "🎨", label: "おえかき", desc: "musical drawing" },
  { go: "learn", emo: "📖", label: "ずかん", desc: "picture book" },
  { go: "count", emo: "🔢", label: "かず", desc: "numbers" },
  { go: "camera", emo: "🪞", label: "かがみ", desc: "magic mirror" },
  { go: "gallery", emo: "🖼️", label: "さくひん", desc: "artworks" },
];

export function renderHome(root: HTMLElement, nav: Nav): void {
  root.innerHTML = `
    <div class="otete-home">
      <header class="otete-home-head">
        <div>
          <h1 class="otete-home-title">otete</h1>
          <p class="otete-home-desc">toddler activity box</p>
        </div>
        <div class="otete-home-tools">
          <button class="otete-tool" id="h-snd" type="button" aria-label="おと">${soundIcon()}</button>
          <button class="otete-tool" id="h-theme" type="button" aria-label="よる / ひる">${themeIcon()}</button>
          <button class="otete-tool" id="h-set" type="button" aria-label="おうちの せってい" title="おうちの せってい">⚙️</button>
        </div>
      </header>

      <ul class="toy-list">
        ${CHEST.map(
          (toy, i) => `
          <li class="toy-row" style="--i:${i}">
            <button class="toy-row-btn" data-go="${toy.go}" type="button">
              <span class="toy-row-emo" aria-hidden="true">${toy.emo}</span>
              <span class="toy-row-label">${toy.label}</span>
              <span class="toy-row-desc">${toy.desc}</span>
              <span class="toy-row-arrow" aria-hidden="true">→</span>
            </button>
          </li>`,
        ).join("")}
      </ul>
    </div>`;

  root.querySelectorAll<HTMLElement>("[data-go]").forEach((el) => {
    // Fire on release, and only for a quick tap: no reaction to a
    // press-and-hold or to a drag that turns into a scroll. The catalogue is
    // thumbed through by grown-ups and small hands rest on the rows.
    tapOrHold(
      el,
      () => {
        plink(6, 0.3);
        const go = el.dataset.go as keyof Nav | undefined;
        if (go && nav[go]) nav[go]();
      },
      () => {},
      450,
    );
  });

  const sndBtn = root.querySelector<HTMLElement>("#h-snd")!;
  tap(sndBtn, () => {
    setMuted(!isMuted());
    sndBtn.textContent = soundIcon();
    if (!isMuted()) plink(12, 0.3);
  });
  const themeBtn = root.querySelector<HTMLElement>("#h-theme")!;
  tap(themeBtn, () => {
    toggleTheme();
    themeBtn.textContent = themeIcon();
    plink(12, 0.3);
  });
  tap(root.querySelector<HTMLElement>("#h-set")!, () => {
    plink(12, 0.3);
    openAdmin();
  });
}

export function renderGallery(root: HTMLElement, nav: Nav): () => void {
  root.innerHTML = `
    <div class="otete-page otete-page--gallery">
      <header class="otete-page-head">
        <h1 class="otete-page-title">さくひん</h1>
        <button class="otete-back" id="g-home" type="button">← もどる</button>
      </header>
      <div class="gallery-grid" id="g-grid"><div class="g-empty">よみこみ中…</div></div>
    </div>`;

  const viewer = document.createElement("div");
  viewer.className = "viewer";
  viewer.hidden = true;
  viewer.innerHTML =
    '<img alt="さくひん"><button class="pill viewer-close" type="button">✕</button>';
  document.body.append(viewer);

  tap(root.querySelector<HTMLElement>("#g-home")!, () => nav.home());

  const img = viewer.querySelector("img")!;
  const closeViewer = (): void => {
    viewer.hidden = true;
    img.removeAttribute("src");
  };
  tap(viewer.querySelector(".viewer-close")!, () => {
    plink(9, 0.25);
    closeViewer();
  });
  tap(viewer, () => {
    plink(9, 0.25);
    closeViewer();
  });

  const grid = root.querySelector<HTMLElement>("#g-grid")!;
  let urls = new Map<string, { full: string; thumb: string }>();
  let release: () => void = () => {};

  const dropUrl = (id: string): void => {
    const u = urls.get(id);
    if (!u) return;
    URL.revokeObjectURL(u.full);
    URL.revokeObjectURL(u.thumb);
    urls.delete(id);
  };

  function confirmDelete(id: string, wrap: HTMLElement): void {
    const ov = makeOverlay();
    ov.innerHTML = `<div class="sheet">
      <h3>この さくひんを けす？</h3>
      <div class="sheet-actions">
        <button class="pill" id="c-cancel" type="button">やめる</button>
        <button class="pill danger" id="c-del" type="button">けす</button>
      </div></div>`;

    ov.addEventListener("pointerdown", (e) => {
      if (e.target === ov) {
        e.preventDefault();
        dropOverlay(ov);
      }
    });
    tap(ov.querySelector("#c-cancel")!, () => dropOverlay(ov));
    tap(ov.querySelector("#c-del")!, () => {
      void (async () => {
        await deleteDrawing(id);
        dropUrl(id);
        wrap.remove();
        closeViewer();
        if (!grid.querySelector(".thumb-wrap")) {
          grid.innerHTML = '<div class="g-empty">まだ さくひんが ないよ</div>';
        }
        dropOverlay(ov);
        plink(12, 0.3);
      })();
    });
  }

  void (async () => {
    try {
      const rows = await listDrawings();
      if (rows.length === 0) {
        grid.innerHTML = '<div class="g-empty">まだ さくひんが ないよ</div>';
        return;
      }
      const made = objectUrlsFor(rows);
      urls = made.urls;
      release = made.release;
      grid.innerHTML = rows
        .map(
          (r) => `<div class="thumb-wrap">
          <button class="thumb" data-id="${r.id}" type="button"><img loading="lazy" src="${urls.get(r.id)!.thumb}" alt=""></button>
          <button class="del" data-del="${r.id}" type="button" title="けす">🗑</button>
        </div>`,
        )
        .join("");
      grid.querySelectorAll<HTMLElement>(".thumb").forEach((el) => {
        tap(el, () => {
          plink(12, 0.35);
          img.src = urls.get(el.dataset.id ?? "")?.full ?? "";
          viewer.hidden = false;
        });
      });
      grid.querySelectorAll<HTMLElement>(".del").forEach((el) => {
        tap(el, () => {
          const wrap = el.closest(".thumb-wrap") as HTMLElement | null;
          if (wrap) confirmDelete(el.dataset.del ?? "", wrap);
        });
      });
    } catch {
      grid.innerHTML = '<div class="g-empty">よみこめなかった…</div>';
    }
  })();

  return () => {
    closeViewer();
    release();
    viewer.remove();
  };
}
