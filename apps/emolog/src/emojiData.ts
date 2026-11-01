import emojiDataUrl from "emoji-picker-element-data/en/emojibase/data.json?url";

export { emojiDataUrl };

let prefetched = false;

/**
 * 絵文字ピッカーのデータを先読みする。
 * 初回オフラインでもピッカーを開けるように、Service Worker のキャッシュに
 * 同一オリジンの JSON を載せておく。
 */
export function prefetchEmojiData(): void {
  if (prefetched) return;
  prefetched = true;
  void fetch(emojiDataUrl).catch(() => undefined);
}
