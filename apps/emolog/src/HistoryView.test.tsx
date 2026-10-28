import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as store from "./store";
import type { Entry } from "./types";
import { HistoryView } from "./HistoryView";

const entries: Entry[] = [
  { id: 1, date: "2026-10-27", timestamp: 1000, emoji: "😀", note: "old note" },
  { id: 2, date: "2026-10-27", timestamp: 2000, emoji: "😢", note: "" },
  { id: 3, date: "2026-10-26", timestamp: 3000, emoji: "😡", note: "yesterday" },
];

function renderHistory(props: Partial<ComponentProps<typeof HistoryView>> = {}) {
  return render(
    <HistoryView
      selectedListId={1}
      filterEmoji={null}
      onFilterEmoji={() => {}}
      filterTag={null}
      onFilterTag={() => {}}
      onSnackBar={() => {}}
      {...props}
    />,
  );
}

describe("HistoryView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(store, "getAllTags").mockResolvedValue([]);
  });

  it("shows newest dates and entries first", async () => {
    vi.spyOn(store, "getEntriesByDateRange").mockResolvedValue(entries);
    const { container } = renderHistory();

    await screen.findByText("😢");
    const dates = [...container.querySelectorAll(".emolog-history-date")].map((el) =>
      el.textContent?.trim(),
    );
    expect(dates[0]).toContain("10/27");
    expect(dates[1]).toContain("10/26");

    const emojis = [...container.querySelectorAll(".emolog-history-emoji")].map(
      (el) => el.textContent,
    );
    expect(emojis[0]).toBe("😢");
    expect(emojis[1]).toBe("😀");
  });

  it("edits a note inline from history", async () => {
    vi.spyOn(store, "getEntriesByDateRange").mockResolvedValue(entries);
    const update = vi.spyOn(store, "updateEntryNote").mockResolvedValue(1);
    renderHistory();

    await screen.findByText("😢");
    fireEvent.click(screen.getAllByRole("button", { name: "メモを編集" })[0]);
    const input = await screen.findByPlaceholderText("メモを入力");
    fireEvent.change(input, { target: { value: "updated note" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(update).toHaveBeenCalledWith(2, "updated note"));
  });

  it("renders hashtags and filters by tag", async () => {
    const tagged = [
      { ...entries[0], tags: ["work"] },
      { ...entries[1], tags: ["private"] },
    ];
    vi.spyOn(store, "getEntriesByDateRange").mockResolvedValue(tagged);
    vi.spyOn(store, "getAllTags").mockResolvedValue(["private", "work"]);
    const onFilterTag = vi.fn();
    render(
      <HistoryView
        selectedListId={1}
        filterEmoji={null}
        onFilterEmoji={() => {}}
        filterTag={null}
        onFilterTag={onFilterTag}
        onSnackBar={() => {}}
      />,
    );
    await screen.findByText("😢");
    fireEvent.click(screen.getAllByText("#work")[0]!);
    expect(onFilterTag).toHaveBeenCalledWith("work");
  });

  it("renders a map link for entries with a location", async () => {
    vi.spyOn(store, "getEntriesByDateRange").mockResolvedValue([
      { ...entries[0], location: { lat: 35.6, lng: 139.7 } },
    ]);
    renderHistory();
    const link = await screen.findByTitle("地図で開く");
    expect(link.getAttribute("href")).toContain("35.6,139.7");
  });

  it("changes an emoji from the picker on double click", async () => {
    vi.spyOn(store, "getEntriesByDateRange").mockResolvedValue([entries[0]]);
    const update = vi.spyOn(store, "updateEntryEmoji").mockResolvedValue(1);
    const { container } = renderHistory();

    await screen.findByText("😀");
    fireEvent.doubleClick(container.querySelector(".emolog-history-emoji")!);

    const picker = container.querySelector("emoji-picker");
    expect(picker).toBeTruthy();
    fireEvent(picker!, new CustomEvent("emoji-click", { detail: { unicode: "😎" } }));

    await waitFor(() => expect(update).toHaveBeenCalledWith(1, "😎"));
    await waitFor(() => expect(container.querySelector("emoji-picker")).toBeNull());
  });

  it("loads emoji matches from the whole history instead of the latest page", async () => {
    const all = vi.spyOn(store, "getAllEntries").mockResolvedValue([
      { id: 99, date: "2020-02-02", timestamp: 1000, emoji: "😀", note: "very old" },
      { id: 100, date: "2020-02-03", timestamp: 2000, emoji: "😢", note: "other" },
    ]);
    renderHistory({ filterEmoji: "😀" });
    await screen.findByText("very old");
    expect(all).toHaveBeenCalledWith(1);
    expect(screen.queryByText("other")).toBeNull();
  });

  it("searches notes across the whole history", async () => {
    vi.spyOn(store, "getEntriesByDateRange").mockResolvedValue(entries);
    vi.spyOn(store, "getAllEntries").mockResolvedValue([
      { id: 99, date: "2020-02-02", timestamp: 1000, emoji: "😀", note: "very old" },
      { id: 100, date: "2020-02-03", timestamp: 2000, emoji: "😢", note: "other" },
    ]);
    renderHistory();
    await screen.findByText("😢");

    fireEvent.change(screen.getByLabelText("履歴を検索"), { target: { value: "very" } });

    expect(await screen.findByText("very old")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("other")).toBeNull());
  });

  it("filters tags against the whole history", async () => {
    vi.spyOn(store, "getEntriesByDateRange").mockResolvedValue(entries);
    vi.spyOn(store, "getAllEntries").mockResolvedValue([
      {
        id: 99,
        date: "2020-02-02",
        timestamp: 1000,
        emoji: "😀",
        note: "old work",
        tags: ["work"],
      },
      {
        id: 100,
        date: "2020-02-03",
        timestamp: 2000,
        emoji: "😢",
        note: "old private",
        tags: ["private"],
      },
    ]);
    renderHistory({ filterTag: "work" });

    expect(await screen.findByText("old work")).toBeTruthy();
    expect(screen.queryByText("old private")).toBeNull();
  });
});
