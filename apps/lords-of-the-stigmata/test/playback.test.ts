import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  enqueue,
  getCurrentFx,
  initPlayback,
  isPlaying,
  setSpeed,
  skipAll,
} from "../src/fx/playback.ts";
import type { FxEvent } from "../src/types.ts";

const fx = (id: number): FxEvent => ({ id, kind: "pass", pi: 0 });

describe("playback", () => {
  let idle: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.useFakeTimers();
    idle = vi.fn();
    initPlayback({ onIdle: idle, onChange: () => {} });
  });
  afterEach(() => {
    skipAll();
    vi.useRealTimers();
  });

  it("plays events one at a time then calls onIdle", () => {
    enqueue([fx(1), fx(2)]);
    expect(getCurrentFx()?.id).toBe(1);
    expect(isPlaying()).toBe(true);
    vi.advanceTimersByTime(600); // pass duration = 550ms
    expect(getCurrentFx()?.id).toBe(2);
    vi.advanceTimersByTime(600);
    expect(getCurrentFx()).toBeNull();
    expect(idle).toHaveBeenCalledOnce();
  });

  it("speed 2 halves duration", () => {
    setSpeed(2);
    enqueue([fx(1)]);
    vi.advanceTimersByTime(300);
    expect(isPlaying()).toBe(false);
    setSpeed(1);
  });

  it("skipAll drains queue immediately", () => {
    enqueue([fx(1), fx(2), fx(3)]);
    skipAll();
    expect(isPlaying()).toBe(false);
    expect(idle).toHaveBeenCalled();
  });
});
