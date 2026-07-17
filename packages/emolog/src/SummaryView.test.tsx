import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SummaryView } from "./SummaryView";
import * as store from "./store";
import type { Entry } from "./types";

function e(emoji: string, overrides: Partial<Entry> = {}): Entry {
  return {
    id: Math.random(),
    date: "2026-07-15",
    timestamp: 0,
    emoji,
    ...overrides,
  };
}

describe("SummaryView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders period selector with three buttons", () => {
    vi.spyOn(store, "getEntriesByDateRange").mockResolvedValue([]);
    render(<SummaryView onSelectEmoji={() => {}} />);
    expect(screen.getByText("7日")).toBeDefined();
    expect(screen.getByText("30日")).toBeDefined();
    expect(screen.getByText("すべて")).toBeDefined();
  });

  it("defaults to 7d period", () => {
    const spy = vi.spyOn(store, "getEntriesByDateRange").mockResolvedValue([]);
    render(<SummaryView onSelectEmoji={() => {}} />);
    expect(spy).toHaveBeenCalled();
  });

  it("shows empty state when no entries", async () => {
    vi.spyOn(store, "getEntriesByDateRange").mockResolvedValue([]);
    render(<SummaryView onSelectEmoji={() => {}} />);
    expect(await screen.findByText("この期間の記録はありません")).toBeDefined();
  });

  it("shows stats and rankings with entries", async () => {
    vi.spyOn(store, "getEntriesByDateRange").mockResolvedValue([e("😊"), e("😊"), e("😢")]);
    render(<SummaryView onSelectEmoji={() => {}} />);
    expect(await screen.findByText("3")).toBeDefined();
    const twos = await screen.findAllByText("2");
    expect(twos).toHaveLength(2);
    expect(screen.getByText("66.7%")).toBeDefined();
    expect(screen.getByText("33.3%")).toBeDefined();
  });

  it("calls onSelectEmoji when ranking emoji is clicked", async () => {
    vi.spyOn(store, "getEntriesByDateRange").mockResolvedValue([e("😊")]);
    const onSelect = vi.fn();
    render(<SummaryView onSelectEmoji={onSelect} />);
    const emojiBtn = await screen.findByText("😊");
    fireEvent.click(emojiBtn);
    expect(onSelect).toHaveBeenCalledWith("😊");
  });

  it("switches period and calls different store method for all", () => {
    const rangeSpy = vi.spyOn(store, "getEntriesByDateRange").mockResolvedValue([]);
    const allSpy = vi.spyOn(store, "getAllEntries").mockResolvedValue([]);
    render(<SummaryView onSelectEmoji={() => {}} />);
    expect(rangeSpy).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByText("30日"));
    expect(rangeSpy).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByText("すべて"));
    expect(allSpy).toHaveBeenCalledOnce();
  });
});
