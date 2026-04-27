import { describe, expect, it } from "bun:test";
import { resolveItemAction } from "./itemLogic";
import type { Cell } from "../types";

function emptyCell(): Cell {
  return { floorType: null, item: null, wall: { left: "none", top: "none" } };
}

function cellWithItem(type: "chair" | "desk"): Cell {
  return { floorType: null, item: { rotation: 0, type }, wall: { left: "none", top: "none" } };
}

describe("resolveItemAction - item tool", () => {
  it("drag to different cell → move", () => {
    const result = resolveItemAction({
      dragMoved: false,
      endCell: emptyCell(),
      endIdx: 5,
      startIdx: 0,
      toolItemType: "chair",
    });
    expect(result).toBe("move");
  });

  it("tap on empty cell → place", () => {
    const result = resolveItemAction({
      dragMoved: false,
      endCell: emptyCell(),
      endIdx: 3,
      startIdx: 3,
      toolItemType: "chair",
    });
    expect(result).toBe("place");
  });

  it("tap on same item type → rotate", () => {
    const result = resolveItemAction({
      dragMoved: false,
      endCell: cellWithItem("chair"),
      endIdx: 3,
      startIdx: 3,
      toolItemType: "chair",
    });
    expect(result).toBe("rotate");
  });

  it("tap on different item type → place (overwrite)", () => {
    const result = resolveItemAction({
      dragMoved: false,
      endCell: cellWithItem("desk"),
      endIdx: 3,
      startIdx: 3,
      toolItemType: "chair",
    });
    expect(result).toBe("place");
  });

  it("already dragged (dragMoved=true) and same cell → none", () => {
    const result = resolveItemAction({
      dragMoved: true,
      endCell: emptyCell(),
      endIdx: 3,
      startIdx: 3,
      toolItemType: "chair",
    });
    expect(result).toBe("none");
  });

  it("startIdx null → none", () => {
    const result = resolveItemAction({
      dragMoved: false,
      endCell: emptyCell(),
      endIdx: 3,
      startIdx: null,
      toolItemType: "chair",
    });
    expect(result).toBe("none");
  });

  it("endIdx null → none", () => {
    const result = resolveItemAction({
      dragMoved: false,
      endCell: emptyCell(),
      endIdx: null,
      startIdx: 3,
      toolItemType: "chair",
    });
    expect(result).toBe("none");
  });
});
