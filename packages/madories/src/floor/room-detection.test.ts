import { describe, it, expect } from "vitest";
import { createFloorPlan } from "../store";
import { setWallsPure } from "./walls";
import { detectRooms } from "./room-detection";

describe("room-detection", () => {
  it("detects a single 2x2 room enclosed by walls", () => {
    // Create a 6x6 floor
    let floor = createFloorPlan("test", 6, 6);

    // Enclose cells (1,1) to (2,2) with walls on all 4 sides
    // hWalls: y*width + x (width=6 means 6*(6+1)=42 elements)
    // vWalls: y*(width+1) + x ((6+1)*6=42 elements)
    // Horizontal walls above room: (1,1), (2,1)
    // Horizontal walls below room: (1,3), (2,3)
    // Vertical walls left of room: (1,1), (1,2)
    // Vertical walls right of room: (3,1), (3,2)
    floor = setWallsPure(
      floor,
      [
        { kind: "h", x: 1, y: 1 },
        { kind: "h", x: 2, y: 1 },
        { kind: "h", x: 1, y: 3 },
        { kind: "h", x: 2, y: 3 },
        { kind: "v", x: 1, y: 1 },
        { kind: "v", x: 1, y: 2 },
        { kind: "v", x: 3, y: 1 },
        { kind: "v", x: 3, y: 2 },
      ],
      "solid",
    );

    const rooms = detectRooms(floor);

    expect(rooms).toHaveLength(1);
    expect(rooms[0].cells).toHaveLength(4);
    expect(new Set(rooms[0].cells)).toEqual(
      new Set([
        1 * 6 + 1, // (1,1)
        1 * 6 + 2, // (2,1)
        2 * 6 + 1, // (1,2)
        2 * 6 + 2, // (2,2)
      ]),
    );
  });
});
