import type { FloorPlan } from "../types";

export interface Room {
  cells: number[];
  tatami: number;
  simpleShape: boolean;
}

/** Top-left cell of a room: smallest row, then smallest column. */
export function roomTopLeftCell(room: Room, width: number): number {
  let tl = room.cells[0];
  for (const idx of room.cells) {
    const x = idx % width;
    const y = Math.floor(idx / width);
    const tlx = tl % width;
    const tly = Math.floor(tl / width);
    if (y < tly || (y === tly && x < tlx)) {
      tl = idx;
    }
  }
  return tl;
}

export const ROOM_NAME_PRESETS = [
  "LDK",
  "リビング",
  "ダイニング",
  "キッチン",
  "トイレ",
  "洗面",
  "お風呂",
  "寝室",
  "子供部屋",
  "書斎",
  "和室",
  "廊下",
  "玄関",
  "収納",
  "納戸",
];

// Count polygon vertices by examining each grid corner shared by cells.
// A corner (cx, cy) is a vertex if exactly 1 or 3 of its 4 neighboring cells are inside.
// (2 = straight edge, 0/4 = interior/exterior)
function countVertices(cells: number[], width: number): number {
  const set = new Set(cells);
  const corners = new Set<number>();
  for (const idx of cells) {
    const x = idx % width;
    const y = Math.floor(idx / width);
    // 4 corners of this cell: (x,y), (x+1,y), (x,y+1), (x+1,y+1)
    corners.add(y * (width + 1) + x);
    corners.add(y * (width + 1) + x + 1);
    corners.add((y + 1) * (width + 1) + x);
    corners.add((y + 1) * (width + 1) + x + 1);
  }

  let vertices = 0;
  for (const corner of corners) {
    const cx = corner % (width + 1);
    const cy = Math.floor(corner / (width + 1));
    // 4 cells adjacent to this corner: top-left, top-right, bottom-left, bottom-right
    const tl = set.has((cy - 1) * width + (cx - 1));
    const tr = set.has((cy - 1) * width + cx);
    const bl = set.has(cy * width + (cx - 1));
    const br = set.has(cy * width + cx);
    const count = (tl ? 1 : 0) + (tr ? 1 : 0) + (bl ? 1 : 0) + (br ? 1 : 0);
    if (count === 1 || count === 3) {
      vertices++;
    }
  }
  return vertices;
}

function isBlocked(
  floor: FloorPlan,
  fromIdx: number,
  dir: "top" | "left" | "bottom" | "right",
): boolean {
  const { width, height, hWalls, vWalls } = floor;
  const x = fromIdx % width;
  const y = Math.floor(fromIdx / width);
  if (dir === "top") return y === 0 || hWalls[y * width + x] !== "none";
  if (dir === "bottom") return y + 1 >= height || hWalls[(y + 1) * width + x] !== "none";
  if (dir === "left") return x === 0 || vWalls[y * (width + 1) + x] !== "none";
  return x + 1 >= width || vWalls[y * (width + 1) + x + 1] !== "none";
}

export function detectRooms(floor: FloorPlan): Room[] {
  const total = floor.width * floor.height;
  const visited = new Uint8Array(total);
  const rooms: Room[] = [];

  for (let start = 0; start < total; start++) {
    if (visited[start]) {
      continue;
    }

    const region: number[] = [];
    let isExterior = false;
    const queue = [start];
    visited[start] = 1;

    while (queue.length > 0) {
      const idx = queue.pop()!;
      region.push(idx);

      const x = idx % floor.width;
      const y = Math.floor(idx / floor.width);
      if (x === 0 || x === floor.width - 1 || y === 0 || y === floor.height - 1) {
        isExterior = true;
      }

      const dirs: ["top" | "left" | "bottom" | "right", number][] = [
        ["top", idx - floor.width],
        ["bottom", idx + floor.width],
        ["left", idx - 1],
        ["right", idx + 1],
      ];

      for (const [dir, nidx] of dirs) {
        if (nidx < 0 || nidx >= total) {
          continue;
        }
        if (visited[nidx]) {
          continue;
        }
        if (isBlocked(floor, idx, dir)) {
          continue;
        }
        visited[nidx] = 1;
        queue.push(nidx);
      }
    }

    if (!isExterior && region.length >= 4) {
      const vertices = countVertices(region, floor.width);
      rooms.push({
        cells: region,
        simpleShape: vertices <= 6,
        tatami: region.length / 2,
      });
    }
  }

  return rooms;
}

export function drawRoomLabels(
  ctx: CanvasRenderingContext2D,
  floor: FloorPlan,
  cellSize: number,
  inkColor: string,
  outlineColor = "rgba(255,255,255,0.8)",
) {
  const rooms = detectRooms(floor);
  if (rooms.length === 0) {
    return;
  }

  ctx.save();
  ctx.font = "bold 13px 'IBM Plex Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const room of rooms) {
    // Centroid
    let sumX = 0;
    let sumY = 0;
    for (const idx of room.cells) {
      sumX += idx % floor.width;
      sumY += Math.floor(idx / floor.width);
    }
    const cx = (sumX / room.cells.length + 0.5) * cellSize;
    const cy = (sumY / room.cells.length + 0.5) * cellSize;

    if (!room.simpleShape && room.tatami < 14) {
      continue;
    }
    const name = floor.cells[roomTopLeftCell(room, floor.width)]?.roomName;

    ctx.strokeStyle = outlineColor;
    ctx.fillStyle = inkColor;
    ctx.lineWidth = 3;

    if (name) {
      ctx.font = "bold 14px 'IBM Plex Mono', monospace";
      ctx.strokeText(name, cx, cy - 7);
      ctx.fillText(name, cx, cy - 7);
      ctx.font = "bold 11px 'IBM Plex Mono', monospace";
      ctx.strokeText(`${room.tatami}畳`, cx, cy + 8);
      ctx.fillText(`${room.tatami}畳`, cx, cy + 8);
    } else {
      ctx.font = "bold 13px 'IBM Plex Mono', monospace";
      ctx.strokeText(`${room.tatami}畳`, cx, cy);
      ctx.fillText(`${room.tatami}畳`, cx, cy);
    }
  }

  ctx.restore();
}
