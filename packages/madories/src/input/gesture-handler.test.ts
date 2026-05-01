import { describe, expect, it } from "bun:test";
import { GestureHandler } from "./gesture-handler";

describe("GestureHandler", () => {
  it("single pointer down → emits tap on up without move", () => {
    const taps: { x: number; y: number }[] = [];
    const gh = new GestureHandler({ onTap: (x, y) => taps.push({ x, y }) });
    gh.onPointerDown({ clientX: 100, clientY: 200, pointerId: 1 });
    gh.onPointerUp({ clientX: 100, clientY: 200, pointerId: 1 });
    expect(taps).toEqual([{ x: 100, y: 200 }]);
  });

  it("single pointer drag → emits onDrag, no tap", () => {
    const taps: unknown[] = [];
    const drags: { dx: number; dy: number }[] = [];
    const gh = new GestureHandler({
      onDrag: (dx, dy) => drags.push({ dx, dy }),
      onTap: () => taps.push(undefined),
    });
    gh.onPointerDown({ clientX: 0, clientY: 0, pointerId: 1 });
    gh.onPointerMove({ clientX: 20, clientY: 10, pointerId: 1 });
    gh.onPointerUp({ clientX: 20, clientY: 10, pointerId: 1 });
    expect(taps).toHaveLength(0);
    expect(drags.length).toBeGreaterThan(0);
  });

  it("two pointer pinch → emits onPinch with scale > 1 when spreading", () => {
    const pinches: { scale: number; cx: number; cy: number }[] = [];
    const gh = new GestureHandler({
      onPinch: (s, cx, cy) => pinches.push({ cx, cy, scale: s }),
    });
    gh.onPointerDown({ clientX: 100, clientY: 100, pointerId: 1 });
    gh.onPointerDown({ clientX: 200, clientY: 100, pointerId: 2 });
    // Spread: distance 100→200
    gh.onPointerMove({ clientX: 50, clientY: 100, pointerId: 1 });
    gh.onPointerMove({ clientX: 250, clientY: 100, pointerId: 2 });
    expect(pinches.length).toBeGreaterThan(0);
    expect(pinches.at(-1)!.scale).toBeGreaterThan(1);
  });

  it("two pointer pan → emits onPan", () => {
    const pans: { dx: number; dy: number }[] = [];
    const gh = new GestureHandler({ onPan: (dx, dy) => pans.push({ dx, dy }) });
    gh.onPointerDown({ clientX: 100, clientY: 100, pointerId: 1 });
    gh.onPointerDown({ clientX: 200, clientY: 100, pointerId: 2 });
    gh.onPointerMove({ clientX: 110, clientY: 110, pointerId: 1 });
    gh.onPointerMove({ clientX: 210, clientY: 110, pointerId: 2 });
    expect(pans.length).toBeGreaterThan(0);
  });
});
