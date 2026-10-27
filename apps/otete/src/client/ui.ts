// Shared UI system:
//  - Unified pointer conventions (tap, tapOrHold, holdTap, armButton)
//  - Unified Topbar & Segmented Pill helpers
//  - Unified Mascot Guide Banner (2-line locked height, phrase-aware wrapping)
//  - Unified Magnetic Drag + 1-Tap Fly-In Assist (`bindGrab`)

import { boing, marimba, plink, speak } from "./audio";
import { createFriendPuppet, FRIENDS, type FriendPuppet } from "./character";
import { burst } from "./fx";

/** Immediate pointerdown tap with default and bubbling stopped. */
export function tap(el: Element, fn: () => void): void {
  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  });
}

/**
 * Scroll-friendly tap for buttons inside a scrollable row/grid (`.cat-row`, `.ws-photos`):
 * does not block touch-panning on pointerdown, and fires `fn` on release if not dragged.
 */
export function scrollTap(el: Element, fn: () => void): void {
  let x = 0;
  let y = 0;
  let moved = false;
  el.addEventListener("pointerdown", (e) => {
    const p = e as PointerEvent;
    x = p.clientX;
    y = p.clientY;
    moved = false;
  });
  el.addEventListener("pointermove", (e) => {
    const p = e as PointerEvent;
    if (Math.abs(p.clientX - x) > 12 || Math.abs(p.clientY - y) > 12) moved = true;
  });
  el.addEventListener("pointerup", () => {
    if (!moved) fn();
  });
}

/** Tap or press-and-hold inside a scrolling list (fires tap on release if not scrolled). */
export function tapOrHold(el: Element, onTap: () => void, onHold: () => void, holdMs = 500): void {
  let timer = 0;
  let x = 0;
  let y = 0;
  let moved = false;
  let held = false;
  const stop = (): void => {
    window.clearTimeout(timer);
  };
  el.addEventListener("pointerdown", (e) => {
    const p = e as PointerEvent;
    x = p.clientX;
    y = p.clientY;
    moved = false;
    held = false;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      held = true;
      onHold();
    }, holdMs);
  });
  el.addEventListener("pointermove", (e) => {
    const p = e as PointerEvent;
    if (Math.abs(p.clientX - x) > 12 || Math.abs(p.clientY - y) > 12) {
      moved = true;
      stop();
    }
  });
  el.addEventListener("pointerup", () => {
    stop();
    if (!moved && !held) onTap();
  });
  el.addEventListener("pointercancel", stop);
  el.addEventListener("pointerleave", stop);
}

/** Press-and-hold control: holding for `ms` runs `onHold`; shorter release runs `onTap`. */
export function holdTap(el: HTMLElement, ms: number, onHold: () => void, onTap?: () => void): void {
  let timer = 0;
  let down = false;
  let fired = false;
  const start = (e: PointerEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    down = true;
    fired = false;
    el.classList.add("holding");
    timer = window.setTimeout(() => {
      fired = true;
      el.classList.remove("holding");
      onHold();
    }, ms);
  };
  const end = (): void => {
    if (!down) return;
    down = false;
    window.clearTimeout(timer);
    el.classList.remove("holding");
    if (!fired) onTap?.();
  };
  el.addEventListener("pointerdown", start);
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  el.addEventListener("pointerleave", end);
}

/** Two-tap confirm for destructive controls. */
export function armButton(el: HTMLElement, onConfirm: () => void, ms = 4000): void {
  let timer = 0;
  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (el.classList.contains("armed")) {
      window.clearTimeout(timer);
      el.classList.remove("armed");
      onConfirm();
      return;
    }
    el.classList.add("armed");
    window.clearTimeout(timer);
    timer = window.setTimeout(() => el.classList.remove("armed"), ms);
  });
}

/** Transient hint tooltip below an element. */
export function hint(el: Element, text: string): void {
  const r = el.getBoundingClientRect();
  const tip = document.createElement("div");
  tip.className = "hint";
  tip.textContent = text;
  tip.style.left = `${Math.round(r.left + r.width / 2)}px`;
  tip.style.top = `${Math.round(r.bottom + 8)}px`;
  document.body.append(tip);
  requestAnimationFrame(() => tip.classList.add("show"));
  window.setTimeout(() => {
    tip.classList.remove("show");
    window.setTimeout(() => tip.remove(), 220);
  }, 1700);
}

/** The 🏠 button that heads every activity screen. */
export const HOME_PILL =
  '<button class="pill home-btn" type="button" aria-label="ホーム">🏠</button>';

export function bindHome(root: ParentNode, goHome: () => void): void {
  const el = root.querySelector(".home-btn");
  if (el) {
    tap(el, () => {
      plink(12, 0.35);
      goHome();
    });
  }
}

export type SegItem = { key: string; emo: string; label: string };

export function segHtml(items: readonly SegItem[], active: string): string {
  return `<div class="toy-segmented">${items
    .map(
      (it) =>
        `<button class="seg-btn${it.key === active ? " active" : ""}" data-seg="${it.key}" type="button">
          <span class="seg-emo">${it.emo}</span><span class="seg-lbl">${it.label}</span>
        </button>`,
    )
    .join("")}</div>`;
}

export function bindSeg(root: ParentNode, onPick: (key: string) => void): void {
  root.querySelectorAll<HTMLElement>(".seg-btn[data-seg]").forEach((btn) => {
    tap(btn, () => {
      if (btn.classList.contains("active")) return;
      root
        .querySelectorAll(".seg-btn[data-seg]")
        .forEach((b) => b.classList.toggle("active", b === btn));
      marimba(3, 0.4);
      onPick(btn.dataset.seg ?? "");
    });
  });
}

/**
 * Formats a Japanese message into phrase chunks (`<span class="msg-chunk">`)
 * separated by spaces so 2-line wrapping never splits a word mid-phrase
 * (e.g. "ちょうだ / い！" never happens).
 */
export function formatMsg(text: string): string {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return `<span class="msg-chunk">${escapeHtml(text)}</span>`;
  return parts.map((p) => `<span class="msg-chunk">${escapeHtml(p)}</span>`).join(" ");
}

function escapeHtml(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/* ============================================================================
   Unified Guide Banner (Mascot + 2-Line Locked Speech Bubble + Visual Slot)
   ============================================================================ */

export type GuideBanner = {
  el: HTMLElement;
  puppet: FriendPuppet;
  setMessage: (text: string, visualHtml?: string) => void;
  popBubble: () => void;
  nextFriend: (announce?: boolean) => void;
};

export function createGuideBanner(
  opts: {
    friendIdx?: number;
    onReplay?: () => void;
    actionHtml?: string;
  } = {},
): GuideBanner {
  let friendIdx = (opts.friendIdx ?? 0) % FRIENDS.length;
  const wrap = document.createElement("div");
  wrap.className = "guide-banner";
  wrap.innerHTML = `
    <div class="guide-mascot" title="タッチしてね！"></div>
    <button class="guide-bubble" type="button">
      <span class="guide-visual" hidden></span>
      <span class="guide-text"></span>
      <span class="guide-audio">🔊</span>
    </button>
    ${opts.actionHtml ? `<div class="guide-extra">${opts.actionHtml}</div>` : ""}
  `;

  const mascotHost = wrap.querySelector<HTMLElement>(".guide-mascot")!;
  const bubbleBtn = wrap.querySelector<HTMLButtonElement>(".guide-bubble")!;
  const visualEl = wrap.querySelector<HTMLElement>(".guide-visual")!;
  const textEl = wrap.querySelector<HTMLElement>(".guide-text")!;

  const puppet = createFriendPuppet(FRIENDS[friendIdx]!);
  mascotHost.append(puppet.el);

  function popBubble(): void {
    bubbleBtn.classList.remove("pop");
    void bubbleBtn.offsetWidth;
    bubbleBtn.classList.add("pop");
  }

  function setMessage(text: string, visualHtml = ""): void {
    textEl.innerHTML = formatMsg(text);
    if (visualHtml) {
      visualEl.innerHTML = visualHtml;
      visualEl.hidden = false;
    } else {
      visualEl.innerHTML = "";
      visualEl.hidden = true;
    }
  }

  function nextFriend(announce = true): void {
    friendIdx = (friendIdx + 1) % FRIENDS.length;
    puppet.setFriend(FRIENDS[friendIdx]!);
    puppet.hop();
    puppet.setMouth("joy");
    if (announce) {
      boing(1.1);
      speak(puppet.friend.greeting);
    }
    const r = mascotHost.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 14, ["#ffd23f", "#ff758f", "#63e6be"]);
    window.setTimeout(() => puppet.setMouth("smile"), 600);
  }

  const triggerReplay = (): void => {
    plink(14, 0.32);
    puppet.hop();
    popBubble();
    opts.onReplay?.();
  };

  tap(bubbleBtn, triggerReplay);
  tap(mascotHost, () => {
    if (opts.onReplay) triggerReplay();
    else nextFriend(true);
  });

  return { el: wrap, puppet, setMessage, popBubble, nextFriend };
}

/* ============================================================================
   Unified Magnetic Drag & 1-Tap Fly-In Assist (`bindGrab`)
   ============================================================================ */

export type GrabTarget = { x: number; y: number };

export function bindGrab(
  el: HTMLElement,
  opts: {
    canStart?: () => boolean;
    onStart?: (x: number, y: number) => void;
    onMove?: (x: number, y: number, dx: number, dy: number) => void;
    findTarget: (x: number, y: number, dx: number, dy: number, isTap: boolean) => GrabTarget | null;
    onSnap: (target: GrabTarget) => void;
    onCancel?: (x: number, y: number) => void;
  },
): void {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let dx = 0;
  let dy = 0;

  el.addEventListener("pointerdown", (e) => {
    if (opts.canStart && !opts.canStart()) return;
    e.preventDefault();
    e.stopPropagation();
    el.setPointerCapture?.(e.pointerId);
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    dx = 0;
    dy = 0;
    el.style.transition = "";
    el.classList.add("dragging");
    opts.onStart?.(e.clientX, e.clientY);
  });

  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    e.preventDefault();
    dx = e.clientX - startX;
    dy = e.clientY - startY;
    el.style.transform = `translate(${dx}px, ${dy}px) scale(1.16) rotate(-3deg)`;
    opts.onMove?.(e.clientX, e.clientY, dx, dy);
  });

  const finish = (e: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove("dragging");

    const moved = Math.hypot(dx, dy);
    const isTap = moved < 16;
    const target = opts.findTarget(e.clientX, e.clientY, dx, dy, isTap);

    if (target) {
      const rect = el.getBoundingClientRect();
      const curCx = rect.left + rect.width / 2;
      const curCy = rect.top + rect.height / 2;
      const flyX = dx + (target.x - curCx);
      const flyY = dy + (target.y - curCy);
      el.style.transition = "transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.1), opacity 0.22s ease";
      el.style.transform = `translate(${flyX}px, ${flyY}px) scale(0.45)`;
      window.setTimeout(() => {
        opts.onSnap(target);
      }, 190);
    } else {
      boing(0.95);
      el.style.transition = "transform 0.26s cubic-bezier(0.2, 1.3, 0.4, 1)";
      el.style.transform = "";
      opts.onCancel?.(e.clientX, e.clientY);
      window.setTimeout(() => {
        el.style.transition = "";
      }, 270);
    }
  };

  el.addEventListener("pointerup", finish);
  el.addEventListener("pointercancel", finish);
}

/** Fisher-Yates shuffle in place. */
export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.trunc(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}
