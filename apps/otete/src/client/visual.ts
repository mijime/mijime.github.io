// Shared word visual: a parent's photo when there is one, otherwise the emoji.
// Keeping this in one place lets ことば / もぐもぐ / あわあわ render either kind the same way.

import type { Word, WordPhoto } from "./voice";

/** HTML for a word's picture: `<img>` for a photo, a big `<span>` for an emoji.
 *  Pass `photo` to use one specific picture (a word can have several). */
export function wordVisual(w: Word, cls: string, thumb = false, photo?: WordPhoto): string {
  const p = photo ?? w.photos?.[0];
  const url = p?.url ?? w.url;
  if (url) {
    const src = thumb ? (p?.thumbUrl ?? w.thumbUrl ?? url) : url;
    return `<img class="${cls}" loading="lazy" src="${src}" alt="${w.label}">`;
  }
  return `<span class="${cls} emoji-visual" role="img" aria-label="${w.label}">${w.emoji ?? "❓"}</span>`;
}
