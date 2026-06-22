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
