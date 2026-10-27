// Saved おえかき, kept in IndexedDB on this device (see db.ts).
//
// This used to be a server API (`POST/GET/DELETE /api/drawings`, files under
// `data/drawings/`). The app is a static site now, so the pictures live in the
// same on-device database as everything else — no server, nothing to sync, and
// they go away only if the browser data is cleared.

import { db, ready } from "./db";
import type { DrawingRow } from "./db";

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), type, quality);
    } catch {
      resolve(null);
    }
  });
}

/** A small JPEG copy for the さくひん grid, so the grid doesn't decode a
 *  full-size PNG per tile. */
async function makeThumb(source: HTMLCanvasElement, max = 360): Promise<Blob | null> {
  const scale = Math.min(1, max / Math.max(source.width, source.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(source.width * scale));
  c.height = Math.max(1, Math.round(source.height * scale));
  const x = c.getContext("2d");
  if (!x) return null;
  x.drawImage(source, 0, 0, c.width, c.height);
  return toBlob(c, "image/jpeg", 0.82);
}

/** Store a finished picture. Returns the row id, or null if it couldn't be
 *  encoded (in which case nothing is saved). */
export async function saveDrawing(picture: HTMLCanvasElement): Promise<string | null> {
  const png = await toBlob(picture, "image/png");
  if (!png) return null;
  const thumb = (await makeThumb(picture)) ?? png;
  const id = newId();
  await ready;
  await db.drawings.put({ id, png, thumb, createdAt: Date.now() });
  return id;
}

/** Newest first. */
export async function listDrawings(): Promise<DrawingRow[]> {
  try {
    await ready;
    const rows = await db.drawings.toArray();
    return rows.toSorted((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function deleteDrawing(id: string): Promise<void> {
  try {
    await ready;
    await db.drawings.delete(id);
  } catch {
    /* ignore */
  }
}

/** One object URL per stored blob, reused while the screen is open. */
export function objectUrlsFor(rows: DrawingRow[]): {
  urls: Map<string, { full: string; thumb: string }>;
  release: () => void;
} {
  const urls = new Map<string, { full: string; thumb: string }>();
  for (const r of rows) {
    urls.set(r.id, { full: URL.createObjectURL(r.png), thumb: URL.createObjectURL(r.thumb) });
  }
  return {
    urls,
    release: () => {
      for (const u of urls.values()) {
        URL.revokeObjectURL(u.full);
        URL.revokeObjectURL(u.thumb);
      }
    },
  };
}
