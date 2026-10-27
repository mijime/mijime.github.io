const TAG_PATTERN = /[#＃]([\p{L}\p{N}_-]+)/gu;

/** note からハッシュタグを抽出し、小文字化して重複を除く。 */
export function extractTags(note?: string): string[] {
  if (!note) return [];
  const tags = new Set<string>();
  for (const match of note.matchAll(TAG_PATTERN)) {
    const tag = match[1];
    if (tag) tags.add(normalizeTag(tag));
  }
  return [...tags];
}

/** 先頭の # / ＃ を除き、小文字化する。 */
export function normalizeTag(tag: string): string {
  return tag.replace(/^[#＃]+/, "").toLocaleLowerCase();
}
