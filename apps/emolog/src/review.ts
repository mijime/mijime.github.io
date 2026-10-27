import { formatTime, type Entry } from "./types";

export interface DailyReview {
  date: string;
  entries: Entry[];
  total: number;
  topEmoji: { emoji: string; count: number } | null;
  tags: { tag: string; count: number }[];
  notes: Entry[];
  firstAt: number | null;
  lastAt: number | null;
}

export function buildDailyReview(entries: Entry[], date: string): DailyReview {
  const dayEntries = entries
    .filter((entry) => entry.date === date)
    .toSorted((a, b) => a.timestamp - b.timestamp);

  const emojiCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  for (const entry of dayEntries) {
    emojiCounts.set(entry.emoji, (emojiCounts.get(entry.emoji) ?? 0) + 1);
    for (const tag of entry.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const topEmojiEntry = [...emojiCounts.entries()].toSorted(
    ([emojiA, countA], [emojiB, countB]) => {
      if (countB !== countA) return countB - countA;
      return emojiA.localeCompare(emojiB);
    },
  )[0];

  return {
    date,
    entries: dayEntries,
    total: dayEntries.length,
    topEmoji: topEmojiEntry ? { emoji: topEmojiEntry[0], count: topEmojiEntry[1] } : null,
    tags: [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .toSorted((a, b) => (b.count !== a.count ? b.count - a.count : a.tag.localeCompare(b.tag))),
    notes: dayEntries.filter((entry) => entry.note),
    firstAt: dayEntries[0]?.timestamp ?? null,
    lastAt: dayEntries.at(-1)?.timestamp ?? null,
  };
}

export function formatReviewSpan(review: DailyReview): string | null {
  if (review.firstAt === null || review.lastAt === null) return null;
  if (review.firstAt === review.lastAt) return formatTime(review.firstAt);
  return `${formatTime(review.firstAt)} - ${formatTime(review.lastAt)}`;
}

/** タイムスタンプのローカル時刻ごとにエントリをまとめる。 */
export function groupByHour(entries: Entry[]): Map<number, Entry[]> {
  const groups = new Map<number, Entry[]>();
  for (const entry of entries) {
    const hour = new Date(entry.timestamp).getHours();
    const group = groups.get(hour);
    if (group) {
      group.push(entry);
    } else {
      groups.set(hour, [entry]);
    }
  }
  return groups;
}
