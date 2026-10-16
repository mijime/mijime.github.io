// On-device IndexedDB storage managed by Dexie:
//  - voices: parent voice recordings keyed by `<category>/<slug>`
//  - words: custom words added by a parent
//  - galleries: photos per word (custom by slug, built-in by `<category>/<slug>`)
//  - drawings: saved artworks & mirror snapshots

import Dexie from "dexie";
import type { Table } from "dexie";

export type VoiceRow = { key: string; blob: Blob };

export type CustomWord = {
  slug: string;
  label: string;
  reading: string;
  category: string;
  createdAt: number;
};

export type GalleryPhoto = { id: string; full: Blob; thumb: Blob; createdAt: number };
export type GalleryRow = { key: string; photos: GalleryPhoto[] };

export type DrawingRow = { id: string; png: Blob; thumb: Blob; createdAt: number };

class OteteDB extends Dexie {
  voices!: Table<VoiceRow, string>;
  words!: Table<CustomWord, string>;
  galleries!: Table<GalleryRow, string>;
  drawings!: Table<DrawingRow, string>;

  constructor() {
    super("otete");
    this.version(1).stores({
      voices: "key",
      words: "slug, category, createdAt",
      galleries: "key",
      drawings: "id, createdAt",
    });
  }
}

export const db = new OteteDB();
export const ready: Promise<void> = Promise.resolve();
