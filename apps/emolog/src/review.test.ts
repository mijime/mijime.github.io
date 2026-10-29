import { describe, expect, it } from "vitest";
import {
  buildDailyReview,
  buildTimelineGaps,
  formatGapDuration,
  formatReviewSpan,
  groupByHour,
} from "./review";
import type { Entry } from "./types";

function entry(timestamp: number, emoji: string, overrides: Partial<Entry> = {}): Entry {
  return {
    date: "2026-10-27",
    timestamp,
    emoji,
    ...overrides,
  };
}

describe("buildDailyReview", () => {
  it("returns an empty review for a day without entries", () => {
    const review = buildDailyReview([], "2026-10-27");
    expect(review.total).toBe(0);
    expect(review.topEmoji).toBeNull();
    expect(review.entries).toEqual([]);
    expect(review.firstAt).toBeNull();
  });

  it("filters by date and sorts by timestamp", () => {
    const entries = [
      entry(2000, "😢"),
      entry(1000, "😊"),
      { ...entry(3000, "😡"), date: "2026-10-26" },
    ];
    const review = buildDailyReview(entries, "2026-10-27");
    expect(review.total).toBe(2);
    expect(review.entries.map((item) => item.emoji)).toEqual(["😊", "😢"]);
    expect(review.firstAt).toBe(1000);
    expect(review.lastAt).toBe(2000);
  });

  it("computes the top emoji and tag counts", () => {
    const entries = [
      entry(1000, "😊", { tags: ["work"], note: "#work" }),
      entry(2000, "😊", { tags: ["work", "praise"], note: "#work #praise" }),
      entry(3000, "😢", { tags: ["work"], note: "#work" }),
    ];
    const review = buildDailyReview(entries, "2026-10-27");
    expect(review.topEmoji).toEqual({ emoji: "😊", count: 2 });
    expect(review.tags).toEqual([
      { tag: "work", count: 3 },
      { tag: "praise", count: 1 },
    ]);
    expect(review.notes).toHaveLength(3);
  });
});

describe("formatReviewSpan", () => {
  it("formats first and last timestamps", () => {
    const review = buildDailyReview([entry(1000, "😊"), entry(2000, "😢")], "2026-10-27");
    expect(formatReviewSpan(review)).toMatch(/\d{2}:\d{2} - \d{2}:\d{2}/);
  });

  it("returns null for an empty day", () => {
    expect(formatReviewSpan(buildDailyReview([], "2026-10-27"))).toBeNull();
  });
});

describe("groupByHour", () => {
  it("groups entries by local hour", () => {
    const at = (hour: number, minute = 0) => new Date(2026, 9, 27, hour, minute).getTime();
    const groups = groupByHour([
      entry(at(9, 10), "😊"),
      entry(at(9, 30), "😢"),
      entry(at(21, 0), "😡"),
    ]);
    expect(groups.get(9)).toHaveLength(2);
    expect(groups.get(21)).toHaveLength(1);
    expect(groups.get(10)).toBeUndefined();
  });
});

describe("buildTimelineGaps", () => {
  const at = (hour: number, minute = 0) => new Date(2026, 9, 27, hour, minute).getTime();

  it("reports only gaps of at least 30 minutes", () => {
    const gaps = buildTimelineGaps([
      entry(at(9, 0), "😊"),
      entry(at(9, 20), "😢"),
      entry(at(11, 45), "😡"),
    ]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ index: 2, label: "2時間25分" });
  });

  it("formats gap durations", () => {
    expect(formatGapDuration(45 * 60_000)).toBe("45分");
    expect(formatGapDuration(90 * 60_000)).toBe("1時間30分");
    expect(formatGapDuration(2 * 60 * 60_000)).toBe("2時間");
  });
});
