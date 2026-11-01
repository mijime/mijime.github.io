import { initMuted, unlockAudio } from "./audio";
import { renderCamera } from "./camera";
import { renderCode } from "./code";
import { renderCount } from "./count";
import { renderDraw } from "./draw";
import { renderFeed } from "./feed";
import { initFx, resizeFx } from "./fx";
import { renderGallery, renderHome, type Nav } from "./home";
import { renderLearn } from "./learn";
import { closeOverlays } from "./overlay";
import { renderPeek } from "./peek";
import { renderPuzzle } from "./puzzle";
import { initTheme } from "./theme";
import { renderTrace } from "./trace";

let app!: HTMLElement;
let dispose: (() => void) | null = null;

type Screen =
  | "home"
  | "feed"
  | "peek"
  | "puzzle"
  | "trace"
  | "code"
  | "draw"
  | "learn"
  | "count"
  | "camera"
  | "gallery";

const ROUTES: Record<string, Screen> = {
  "": "home",
  "#home": "home",
  "#feed": "feed",
  "#peek": "peek",
  "#puzzle": "puzzle",
  "#shape": "puzzle",
  "#color": "puzzle",
  "#trace": "trace",
  "#code": "code",
  "#draw": "draw",
  "#learn": "learn",
  "#count": "count",
  "#camera": "camera",
  "#gallery": "gallery",
};

// Parent-facing screens that live under the site's common app header and
// scroll like a normal page: the toy box (home) and the 🖼️ archive.
// Everything else is a full-screen toddler activity.
const CHROME_SCREENS = new Set<Screen>(["home", "gallery"]);

function fromHash(): Screen {
  return ROUTES[window.location.hash] ?? "home";
}

// Publish the current view mode so styles.css (and the site's own CSS) can
// switch between the fixed full-screen play layout and the normal-flow chrome
// layout. See `data-otete-view` in styles.css and apps/main/global.css.
function applyView(screen: Screen): void {
  const chrome = CHROME_SCREENS.has(screen);
  document.documentElement.dataset.oteteView = chrome ? "chrome" : "play";
  setBackGuardPlaying(!chrome);
  // Coming back to a chrome screen (or first boot on one) should always
  // show the page from the top.
  if (chrome) window.scrollTo(0, 0);
}

// Chrome pages rely on native scrolling and leaving the app via browser back;
// the toddlers' gesture guards below are for the play surface only.
function isPlayView(): boolean {
  return document.documentElement.dataset.oteteView === "play";
}

function render(screen: Screen): void {
  closeOverlays();
  dispose?.();
  dispose = null;
  app.innerHTML = "";
  app.dataset.screen = screen;
  applyView(screen);

  const nav: Nav = {
    home: () => navigate("home"),
    feed: () => navigate("feed"),
    peek: () => navigate("peek"),
    puzzle: () => navigate("puzzle"),
    trace: () => navigate("trace"),
    code: () => navigate("code"),
    draw: () => navigate("draw"),
    learn: () => navigate("learn"),
    count: () => navigate("count"),
    camera: () => navigate("camera"),
    gallery: () => navigate("gallery"),
  };

  switch (screen) {
    case "home":
      renderHome(app, nav);
      break;
    case "feed":
      dispose = renderFeed(app, nav);
      break;
    case "peek":
      dispose = renderPeek(app, nav);
      break;
    case "puzzle":
      dispose = renderPuzzle(app, nav);
      break;
    case "trace":
      dispose = renderTrace(app, nav);
      break;
    case "code":
      dispose = renderCode(app, nav);
      break;
    case "draw":
      dispose = renderDraw(app, nav);
      break;
    case "learn":
      dispose = renderLearn(app, nav);
      break;
    case "count":
      dispose = renderCount(app, nav);
      break;
    case "camera":
      dispose = renderCamera(app, nav);
      break;
    case "gallery":
      dispose = renderGallery(app, nav);
      break;
  }
}

function navigate(screen: Screen): void {
  const hash = `#${screen}`;
  if (window.location.hash !== hash) window.location.hash = hash;
  else render(screen);
}

// iPadOS 13+ reports itself as a Mac, so check both the classic iOS UA and
// "touch-capable Mac" before enabling the Safari-only workaround below.
function isIosSafari(): boolean {
  return (
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// iOS Safari treats a swipe that starts at the very edge of the screen as
// back/forward navigation. CSS cannot turn that off (overscroll-behavior does
// not cover it), but cancelling the touchstart in the edge strip does. The toys
// are all about dragging a finger around, so without this a toddler's
// horizontal drag from the edge leaves the page.
//
// Chrome/Edge's two-finger trackpad swipe is covered by overscroll-behavior in
// styles.css and blockHorizontalHistorySwipe() as well.
function blockEdgeSwipeBack(): void {
  if (!isIosSafari()) return;
  const edge = 24;
  document.addEventListener(
    "touchstart",
    (e) => {
      if (!isPlayView()) return;
      const touch = e.touches[0];
      if (e.touches.length !== 1 || !touch) return;
      const target = e.target instanceof Element ? e.target : null;
      // The home button sits at the top-left, inside the edge strip. Never
      // steal touches from the topbar or from a real control: the swipe guard
      // is only for the play surface (canvas / stage / background).
      if (target?.closest(".toy-topbar, button, a, input, textarea, select, [role='button']")) {
        return;
      }
      if (touch.clientX < edge || touch.clientX > window.innerWidth - edge) {
        e.preventDefault();
      }
    },
    { passive: false },
  );
}

// Chrome/Edge on a trackpad turn a horizontal two-finger wheel into history
// navigation. overscroll-behavior: none in styles.css normally stops that, but
// cancel any horizontal wheel that no inner scroller wants as a backstop.
function blockHorizontalHistorySwipe(): void {
  document.addEventListener(
    "wheel",
    (e) => {
      if (!isPlayView()) return;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      if (inScrollable(e.target)) return;
      e.preventDefault();
    },
    { passive: false },
  );
}

// Android's system back gesture is handled by the OS and cannot be cancelled
// from a web page. Keep one extra history entry so the first back is swallowed
// inside the toy; a quick second back is treated as intentional and leaves.
// On the chrome screens (toy box / 🖼️ gallery) the guard is dropped so the
// browser's own back navigation works normally.
const BACK_GUARD = "oteteBackGuard";

let setBackGuardPlaying: (playing: boolean) => void = () => {};

function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

function installAndroidBackGuard(): void {
  if (!isAndroid()) return;

  let firstBackAt = 0;
  let lastBackUrl = "";
  let allowBack = false;
  let playing = false;

  const arm = (): void => {
    if (!playing) return;
    const state = history.state as Record<string, unknown> | null;
    if (state?.[BACK_GUARD]) return;
    history.pushState({ ...state, [BACK_GUARD]: true }, "", location.href);
  };

  const disarm = (): void => {
    const state = history.state as Record<string, unknown> | null;
    if (!state?.[BACK_GUARD]) return;
    const next = { ...state };
    delete next[BACK_GUARD];
    history.replaceState(next, "", location.href);
  };

  window.addEventListener("popstate", () => {
    if (allowBack) {
      allowBack = false;
      firstBackAt = 0;
      lastBackUrl = "";
      return;
    }
    if (!playing) return;
    const state = history.state as Record<string, unknown> | null;
    // Landing on a guard entry means the top guard was not consumed (for
    // example, an older traversal settling after a hash change). Never count
    // that as a user back.
    if (state?.[BACK_GUARD]) {
      arm();
      return;
    }
    const now = performance.now();
    const url = location.href;
    // A popstate at a different URL is a normal in-app navigation (or a hash
    // change that landed while the previous back was still settling), not the
    // second half of a double-back.
    if (url === lastBackUrl && now - firstBackAt < 1200) {
      allowBack = true;
      firstBackAt = 0;
      lastBackUrl = "";
      history.back();
      return;
    }
    firstBackAt = now;
    lastBackUrl = url;
    arm();
  });
  window.addEventListener("hashchange", arm);
  window.addEventListener("pageshow", arm);

  setBackGuardPlaying = (next: boolean): void => {
    playing = next;
    if (playing) arm();
    else disarm();
  };

  arm();
}

function inScrollable(target: EventTarget | null): boolean {
  for (let n = target instanceof Element ? target : null; n; n = n.parentElement) {
    const s = getComputedStyle(n);
    const y =
      (s.overflowY === "auto" || s.overflowY === "scroll") && n.scrollHeight > n.clientHeight + 1;
    const x =
      (s.overflowX === "auto" || s.overflowX === "scroll") && n.scrollWidth > n.clientWidth + 1;
    if (x || y) return true;
  }
  return false;
}

export function mount(root: HTMLElement, fxCanvas: HTMLCanvasElement): void {
  app = root;
  initFx(fxCanvas);

  window.addEventListener("hashchange", () => render(fromHash()));

  blockEdgeSwipeBack();
  blockHorizontalHistorySwipe();
  installAndroidBackGuard();

  ["contextmenu", "gesturestart", "gesturechange", "dblclick", "selectstart", "dragstart"].forEach(
    (ev) =>
      document.addEventListener(ev, ((e: Event) => e.preventDefault()) as EventListener, {
        passive: false,
      }),
  );

  document.addEventListener(
    "touchmove",
    (e) => {
      // Chrome pages scroll natively under the site header; don't block it.
      if (!isPlayView()) return;
      if (inScrollable(e.target)) return;
      e.preventDefault();
    },
    { passive: false },
  );

  document.addEventListener("pointerdown", () => unlockAudio(), { passive: true });

  initMuted();
  initTheme();
  resizeFx();
  render(fromHash());
}
