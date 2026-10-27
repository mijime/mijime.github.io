import { describe, expect, it } from "vitest";
import { computeFocusPan } from "./use-focus-selected";

describe("computeFocusPan", () => {
  it("returns null when node is inside viewport", () => {
    const rect = { width: 800, height: 600 };
    const nodePos = { x: 0, y: 0 };
    const view = { pan: { x: 0, y: 0 }, zoom: 1 };
    const result = computeFocusPan(rect, nodePos, view);
    expect(result).toBeNull();
  });

  it("returns null when rect.width is 0 (jsdom)", () => {
    const rect = { width: 0, height: 600 };
    const nodePos = { x: 100, y: 100 };
    const view = { pan: { x: 0, y: 0 }, zoom: 1 };
    const result = computeFocusPan(rect, nodePos, view);
    expect(result).toBeNull();
  });

  it("pans when node is beyond right edge", () => {
    const rect = { width: 800, height: 600 };
    const nodePos = { x: 500, y: 0 };
    const view = { pan: { x: 0, y: 0 }, zoom: 1 };
    const margin = 40;
    const result = computeFocusPan(rect, nodePos, view, margin);
    expect(result).not.toBeNull();
    expect(result!.x).toBeLessThan(0);
    expect(result!.y).toBe(0);
  });

  it("pans when node is beyond top edge", () => {
    const rect = { width: 800, height: 600 };
    const nodePos = { x: 0, y: -500 };
    const view = { pan: { x: 0, y: 0 }, zoom: 1 };
    const margin = 40;
    const result = computeFocusPan(rect, nodePos, view, margin);
    expect(result).not.toBeNull();
    expect(result!.x).toBe(0);
    expect(result!.y).toBeGreaterThan(0);
  });

  it("accounts for zoom in screen position calculation", () => {
    const rect = { width: 800, height: 600 };
    const nodePos = { x: 500, y: 500 };
    const view = { pan: { x: 0, y: 0 }, zoom: 2 };
    const margin = 40;
    const result = computeFocusPan(rect, nodePos, view, margin);
    expect(result).not.toBeNull();
  });

  it("pulls node to margin when beyond left edge", () => {
    const rect = { width: 800, height: 600 };
    const nodePos = { x: -500, y: 0 };
    const view = { pan: { x: 0, y: 0 }, zoom: 1 };
    const margin = 40;
    const result = computeFocusPan(rect, nodePos, view, margin);
    expect(result).not.toBeNull();
    expect(result!.x).toBeGreaterThan(0);
  });

  it("pulls node to margin when beyond bottom edge", () => {
    const rect = { width: 800, height: 600 };
    const nodePos = { x: 0, y: 500 };
    const view = { pan: { x: 0, y: 0 }, zoom: 1 };
    const margin = 40;
    const result = computeFocusPan(rect, nodePos, view, margin);
    expect(result).not.toBeNull();
    expect(result!.y).toBeLessThan(0);
  });
});
