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

function fromHash(): Screen {
  return ROUTES[window.location.hash] ?? "home";
}

function render(screen: Screen): void {
  closeOverlays();
  dispose?.();
  dispose = null;
  app.innerHTML = "";
  app.dataset.screen = screen;

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

  ["contextmenu", "gesturestart", "gesturechange", "dblclick", "selectstart", "dragstart"].forEach(
    (ev) =>
      document.addEventListener(ev, ((e: Event) => e.preventDefault()) as EventListener, {
        passive: false,
      }),
  );

  document.addEventListener(
    "touchmove",
    (e) => {
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
