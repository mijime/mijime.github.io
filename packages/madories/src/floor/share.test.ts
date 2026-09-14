import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../store";
import { setWallsPure } from "./walls";
import { decodeFloors, encodeFloors, floorsToText, textToFloors } from "./share";

describe("share roundtrip", () => {
  it("encodes and decodes a 40x40 floor with content", async () => {
    let floor = createFloorPlan("1F");
    const edges = [];
    for (let x = 4; x < 36; x++) {
      edges.push({ kind: "h" as const, x, y: 4 }, { kind: "h" as const, x, y: 35 });
    }
    for (let y = 4; y < 36; y++) {
      edges.push({ kind: "v" as const, x: 4, y }, { kind: "v" as const, x: 36, y });
    }
    floor = setWallsPure(floor, edges, "solid");
    for (let y = 5; y < 35; y++) {
      for (let x = 5; x < 35; x++) {
        floor.cells[y * 40 + x] = { floorType: "wood", item: null };
      }
    }
    const text = floorsToText([floor]);
    const encoded = await encodeFloors([floor]);
    const decoded = await decodeFloors(encoded);
    expect(decoded).toHaveLength(1);
    // DSL normalizes to the content bbox (3,3)-(36,35) → 34x33.
    expect(decoded[0].width).toBe(34);
    expect(decoded[0].height).toBe(33);
    expect(decoded[0].cells[2 * 34 + 2].floorType).toBe("wood");
    expect(textToFloors(text)[0].width).toBe(34);
  });
});
