// Parent-added ことば: a photo taken on the phone plus a name, kept on the
// device in IndexedDB (see db.ts). Nothing here reaches the server, so custom
// words live on this phone only and go away if the browser data is cleared.
//
// A word can have SEVERAL photos (a gallery): a parent adds different pictures
// of the same thing so the child learns the concept, not one specific image.
// Custom words are keyed by slug, a built-in word's photos by `<category>/<slug>`
// (see wordKey). The photo is cropped square and resized down: a ~900px full
// image for the word sheet and a ~320px thumbnail for the grid.

import type { Word, WordPhoto } from "./voice";
import { db, ready } from "./db";
import type { CustomWord, GalleryPhoto } from "./db";
import { EMOJI_WORDS } from "../scripts/emoji-words";

/** The genres a custom word can join: the same ones the built-in words use. */
export const CATEGORIES = [
  "どうぶつ",
  "たべもの",
  "のりもの",
  "みぢか",
  "しぜん",
  "からだ",
  "あそび",
  "ひと",
  "ぎょうじ",
] as const;

/** The gallery key for a word: a custom word by slug, a built-in word by
 *  `<category>/<slug>` (the same split the old photos/wordPhotos tables used). */
export const wordKey = (w: { custom?: boolean; slug: string; category: string }): string =>
  w.custom ? w.slug : `${w.category}/${w.slug}`;

/** Object URLs, created once per stored photo and reused, so navigating between
 *  screens doesn't leak blobs or re-decode the photos. */
const photoUrls = new Map<string, { url: string; thumbUrl: string }>();

function refFor(p: GalleryPhoto): WordPhoto {
  let u = photoUrls.get(p.id);
  if (!u) {
    u = { url: URL.createObjectURL(p.full), thumbUrl: URL.createObjectURL(p.thumb) };
    photoUrls.set(p.id, u);
  }
  return { id: p.id, url: u.url, thumbUrl: u.thumbUrl };
}

function release(p: GalleryPhoto): void {
  const u = photoUrls.get(p.id);
  if (u) {
    URL.revokeObjectURL(u.url);
    URL.revokeObjectURL(u.thumbUrl);
    photoUrls.delete(p.id);
  }
}

function newPhotoId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

/** Ask the browser to keep this data when storage is tight (best effort). */
export function requestPersistence(): void {
  try {
    void navigator.storage?.persist();
  } catch {
    /* ignore */
  }
}

export async function listCustomWords(): Promise<CustomWord[]> {
  try {
    await ready;
    return await db.words.toArray();
  } catch {
    return [];
  }
}

/** Custom words as `Word`s with object URLs for their photos, ready to render. */
export async function loadCustomWords(): Promise<Word[]> {
  const metas = await listCustomWords();
  const photosList = await Promise.all(metas.map((m) => getWordPhotos(m.slug)));
  const out: Word[] = [];
  for (const [i, m] of metas.entries()) {
    const photos = photosList[i] ?? [];
    if (photos.length === 0) continue; // a custom word is its photo
    out.push({
      slug: m.slug,
      label: m.label,
      reading: m.reading,
      category: m.category,
      custom: true,
      photos,
      url: photos[0]!.url,
      thumbUrl: photos[0]!.thumbUrl,
    });
  }
  return out;
}

/**
 * Built-in words (a module bundled at build time) + this phone's custom words,
 * in display order. The app is a static site, so nothing is fetched: the
 * dictionary ships inside main.js.
 */
export async function loadAllWords(): Promise<Word[]> {
  const builtin = await withOverrides([...EMOJI_WORDS]);
  const custom = await loadCustomWords();
  return [...builtin, ...custom].toSorted(
    (a, b) => a.category.localeCompare(b.category, "ja") || a.label.localeCompare(b.label, "ja"),
  );
}

/** Attach any parent photos that stand in for a built-in word's emoji. */
async function withOverrides(words: Word[]): Promise<Word[]> {
  if (words.length === 0) return words;
  try {
    await ready;
    const rows = await db.galleries.toArray();
    if (rows.length === 0) return words;
    const byKey = new Map(rows.map((r) => [r.key, r]));
    return words.map((w) => {
      const row = byKey.get(`${w.category}/${w.slug}`);
      if (!row || row.photos.length === 0) return w;
      const photos = row.photos.map(refFor);
      return { ...w, photos, url: photos[0]!.url, thumbUrl: photos[0]!.thumbUrl };
    });
  } catch {
    return words;
  }
}

/* ---------- a word's gallery ---------- */

/** Raw stored photos (blobs) for a word, for the edit form. */
export async function getRawWordPhotos(key: string): Promise<GalleryPhoto[]> {
  try {
    await ready;
    const row = await db.galleries.get(key);
    return row?.photos ?? [];
  } catch {
    return [];
  }
}

/** A word's photos as object URLs, ready to render. */
export async function getWordPhotos(key: string): Promise<WordPhoto[]> {
  const raw = await getRawWordPhotos(key);
  return raw.map((p) => refFor(p));
}

/** Add one photo to a word's gallery and return the new list. */
export async function addWordPhoto(
  key: string,
  photo: { full: Blob; thumb: Blob },
): Promise<WordPhoto[]> {
  requestPersistence();
  await ready;
  const row = (await db.galleries.get(key)) ?? { key, photos: [] };
  row.photos.push({
    id: newPhotoId(),
    full: photo.full,
    thumb: photo.thumb,
    createdAt: Date.now(),
  });
  await db.galleries.put(row);
  return row.photos.map(refFor);
}

/** Remove one photo (by id) from a word's gallery and return what is left. */
export async function deleteWordPhoto(key: string, id: string): Promise<WordPhoto[]> {
  await ready;
  const row = await db.galleries.get(key);
  if (!row) return [];
  const gone = row.photos.find((p) => p.id === id);
  if (gone) release(gone);
  row.photos = row.photos.filter((p) => p.id !== id);
  if (row.photos.length > 0) await db.galleries.put(row);
  else await db.galleries.delete(key);
  return row.photos.map(refFor);
}

/** Remove every photo of a word (used when deleting a custom word). */
export async function clearWordPhotos(key: string): Promise<void> {
  await ready;
  const row = await db.galleries.get(key);
  if (!row) return;
  row.photos.forEach(release);
  await db.galleries.delete(key);
}

export function newSlug(): string {
  return `my-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Save (or replace) a custom word's text. Its photos live in the gallery. */
export async function saveCustomWord(
  meta: Omit<CustomWord, "createdAt"> & { createdAt?: number },
): Promise<void> {
  requestPersistence();
  await ready;
  await db.words.put({ ...meta, createdAt: meta.createdAt ?? Date.now() });
}

export async function deleteCustomWord(slug: string): Promise<void> {
  await ready;
  await clearWordPhotos(slug);
  await db.words.delete(slug);
}

/* ---------- photo: square crop + downsize ---------- */

/** Encode one square region of a decoded image at `max` px (never upscaled). */
async function square(
  bitmap: ImageBitmap,
  sx: number,
  sy: number,
  side: number,
  max: number,
): Promise<Blob> {
  const scale = Math.min(1, max / side); // never upscale
  const size = Math.max(1, Math.round(side * scale));
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no canvas 2d");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  const blob = await new Promise<Blob | null>((resolve) => {
    c.toBlob(resolve, "image/jpeg", 0.82);
  });
  if (!blob) throw new Error("could not encode the photo");
  return blob;
}

/** The two JPEG sizes a word stores, from a square region the parent picked. */
export async function encodeSquare(
  bitmap: ImageBitmap,
  sx: number,
  sy: number,
  side: number,
): Promise<{ full: Blob; thumb: Blob }> {
  const full = await square(bitmap, sx, sy, side, 900);
  const thumb = await square(bitmap, sx, sy, side, 320);
  return { full, thumb };
}

/** Crop a camera/gallery file to its centre square and make the two JPEGs. */
export async function preparePhoto(file: Blob): Promise<{ full: Blob; thumb: Blob }> {
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    return await encodeSquare(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side);
  } finally {
    bitmap.close();
  }
}
