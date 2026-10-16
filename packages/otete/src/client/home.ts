import { openAdmin } from "./admin";
import { boing, isMuted, marimba, plink, setMuted, soundIcon, speak } from "./audio";
import { deleteDrawing, listDrawings, objectUrlsFor } from "./drawings";
import { dropOverlay, makeOverlay } from "./overlay";
import { themeIcon, toggleTheme } from "./theme";
import { HOME_PILL, bindHome, createGuideBanner, hint, holdTap, tap } from "./ui";

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

let homeFriendIdx = 0;

const CHEERS = [
  "いっぱい あそぼうね！",
  "どれで あそぶ？",
  "タッチ してみてね！",
  "わーい！ だいすき！",
  "いっしょに あそぼー！",
];

export function renderHome(root: HTMLElement, nav: Nav): void {
  root.innerHTML = `
    <div class="stage-screen home-screen">
      <div class="toy-topbar">
        <div class="toy-badge">🖐️ おてて</div>
        <div class="home-tools">
          <button class="icon-btn" id="h-set" aria-label="せってい" title="せってい（ながおし）">⚙️</button>
          <button class="icon-btn" id="h-snd" aria-label="おと">${soundIcon()}</button>
          <button class="icon-btn" id="h-theme" aria-label="よる / ひる">${themeIcon()}</button>
        </div>
      </div>

      <div class="home-layout">
        <div id="h-guide-slot"></div>

        <div class="home-toys-col">
          <div class="toy-box">
            <button class="toy-card" data-go="feed" style="--c1:#ff8787;--c2:#fa5252;--sh-c:#c92a2a" type="button">
              <span class="toy-emo">🍎</span>
              <span class="toy-lbl">もぐもぐ</span>
            </button>

            <button class="toy-card" data-go="peek" style="--c1:#74c0fc;--c2:#228be6;--sh-c:#1864ab" type="button">
              <span class="toy-emo">🫧</span>
              <span class="toy-lbl">あわあわ</span>
            </button>

            <button class="toy-card" data-go="puzzle" style="--c1:#63e6be;--c2:#0ca678;--sh-c:#087f5b" type="button">
              <span class="toy-emo">🧩</span>
              <span class="toy-lbl">すぽっ！</span>
            </button>

            <button class="toy-card" data-go="trace" style="--c1:#8ce99a;--c2:#2f9e44;--sh-c:#2b8a3e" type="button">
              <span class="toy-emo">🚂</span>
              <span class="toy-lbl">ぽっぽー</span>
            </button>

            <button class="toy-card" data-go="code" style="--c1:#b197fc;--c2:#7950f2;--sh-c:#5f3dc4" type="button">
              <span class="toy-emo">🤖</span>
              <span class="toy-lbl">プログラム</span>
            </button>

            <button class="toy-card" data-go="draw" style="--c1:#ff9ec0;--c2:#f06595;--sh-c:#a61e4d" type="button">
              <span class="toy-emo">🎨</span>
              <span class="toy-lbl">おえかき</span>
            </button>
          </div>

          <div class="shelf-row">
            <button class="shelf-btn" data-go="learn" style="--c1:#ffd43b;--c2:#f59f00;--sh-c:#d9480f" type="button">
              <span class="shelf-emo">📖</span>
              <span class="shelf-lbl">ずかん</span>
            </button>
            <button class="shelf-btn" data-go="count" style="--c1:#b197fc;--c2:#7950f2;--sh-c:#5f3dc4" type="button">
              <span class="shelf-emo">🔢</span>
              <span class="shelf-lbl">かず</span>
            </button>
            <button class="shelf-btn" data-go="camera" style="--c1:#66d9e8;--c2:#1098ad;--sh-c:#0b7285" type="button">
              <span class="shelf-emo">🪞</span>
              <span class="shelf-lbl">かがみ</span>
            </button>
            <button class="shelf-btn" data-go="gallery" style="--c1:#91a7ff;--c2:#4c6ef5;--sh-c:#364fc7" type="button">
              <span class="shelf-emo">🖼️</span>
              <span class="shelf-lbl">さくひん</span>
            </button>
          </div>
        </div>
      </div>
    </div>`;

  const guide = createGuideBanner({
    friendIdx: homeFriendIdx,
    onReplay: () => {
      homeFriendIdx = (homeFriendIdx + 1) % 4;
      guide.nextFriend(false);
      const msg = CHEERS[Math.trunc(Math.random() * CHEERS.length)]!;
      guide.setMessage(msg);
      boing(1.1);
      speak(msg);
    },
  });
  guide.setMessage("いっぱい あそぼうね！");
  root.querySelector("#h-guide-slot")!.replaceWith(guide.el);

  root.querySelectorAll<HTMLElement>("[data-go]").forEach((el, i) => {
    tap(el, () => {
      marimba(i + 2, 0.45);
      const go = el.dataset.go as keyof Nav | undefined;
      if (go && nav[go]) nav[go]();
    });
  });

  const themeBtn = root.querySelector<HTMLElement>("#h-theme")!;
  tap(themeBtn, () => {
    toggleTheme();
    themeBtn.textContent = themeIcon();
    plink(12, 0.3);
  });
  const sndBtn = root.querySelector<HTMLElement>("#h-snd")!;
  tap(sndBtn, () => {
    setMuted(!isMuted());
    sndBtn.textContent = soundIcon();
    if (!isMuted()) plink(12, 0.3);
  });
  const setBtn = root.querySelector<HTMLElement>("#h-set")!;
  holdTap(
    setBtn,
    800,
    () => {
      plink(12, 0.3);
      openAdmin();
    },
    () => hint(setBtn, "ながおしで おうちの せってい"),
  );
}

/** 🖼️ さくひん — Saved artworks and mirror snapshots. */
export function renderGallery(root: HTMLElement, nav: Nav): () => void {
  root.innerHTML = `
    <div class="stage-screen gallery-screen">
      <div class="toy-topbar">
        ${HOME_PILL}
        <div class="toy-badge">🖼️ さくひん</div>
        <span></span>
      </div>
      <div class="gallery-grid" id="g-grid"><div class="g-empty">よみこみ中…</div></div>
    </div>`;

  const viewer = document.createElement("div");
  viewer.className = "viewer";
  viewer.hidden = true;
  viewer.innerHTML =
    '<img alt="さくひん"><button class="pill viewer-close" type="button">✕</button>';
  document.body.append(viewer);

  bindHome(root, () => nav.home());

  const img = viewer.querySelector("img")!;
  const closeViewer = (): void => {
    viewer.hidden = true;
    img.removeAttribute("src");
  };
  tap(viewer.querySelector(".viewer-close")!, closeViewer);
  tap(viewer, closeViewer);

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
