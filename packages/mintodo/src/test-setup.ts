import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

if (URL.createObjectURL === undefined) {
  URL.createObjectURL = (_blob: Blob) => `blob:${crypto.randomUUID()}`;
}
if (URL.revokeObjectURL === undefined) {
  URL.revokeObjectURL = (_url: string) => {
    // No-op
  };
}
if (globalThis.ResizeObserver === undefined) {
  /* eslint-disable class-methods-use-this */
  class ResizeObserverMock {
    public observe(_target: Element): void {}
    public unobserve(_target: Element): void {}
    public disconnect(): void {}
  }
  /* eslint-enable class-methods-use-this */
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

// Jsdom does not support Element.animate
if (typeof Element.prototype.animate !== "function") {
  Element.prototype.animate = () => ({}) as Animation;
}

// Jsdom does not implement PointerEvent
if (typeof globalThis.PointerEvent !== "function") {
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class, max-classes-per-file
  globalThis.PointerEvent = class PointerEvent extends MouseEvent {
    public readonly pointerId: number;
    public readonly pointerType: string;
    public readonly isPrimary: boolean;

    public constructor(type: string, init: Record<string, unknown> = {}) {
      super(type, init);
      this.pointerId = (init.pointerId as number) ?? 0;
      this.pointerType = (init.pointerType as string) ?? "mouse";
      this.isPrimary = (init.isPrimary as boolean) ?? true;
    }
  } as unknown as typeof PointerEvent;
}

// Jsdom getBoundingClientRect always returns zeros for unstyled elements.
// Dnd-kit needs non-zero rects for collision detection.
// eslint-disable-next-line @typescript-eslint/unbound-method
const origGetBoundingClientRect = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = function  getBoundingClientRect() {
  const rect = origGetBoundingClientRect.call(this);
  if (rect.width > 0 || rect.height > 0) return rect;
  // Assign reasonable defaults so dnd-kit collision detection works
  const w = 240;
  const h = 80;
  return { x: rect.x, y: rect.y, width: w, height: h, top: rect.y, right: rect.x + w, bottom: rect.y + h, left: rect.x, toJSON: () => null } as unknown as DOMRect;
};

// Jsdom does not support setPointerCapture / releasePointerCapture / hasPointerCapture
// Required by @dnd-kit/core PointerSensor
function noopSetPointerCapture(_pointerId: number): void {}
function noopReleasePointerCapture(_pointerId: number): void {}
function noopHasPointerCapture(_pointerId: number): boolean { return false; }
if (typeof HTMLElement.prototype.setPointerCapture !== "function") {
  HTMLElement.prototype.setPointerCapture = noopSetPointerCapture;
}
if (typeof HTMLElement.prototype.releasePointerCapture !== "function") {
  HTMLElement.prototype.releasePointerCapture = noopReleasePointerCapture;
}
if (typeof HTMLElement.prototype.hasPointerCapture !== "function") {
  HTMLElement.prototype.hasPointerCapture = noopHasPointerCapture;
}
