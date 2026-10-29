import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as store from "./store";
import { ReviewView } from "./ReviewView";

const date = "2026-10-28";

function at(hour: number, minute: number): number {
  return new Date(2026, 9, 28, hour, minute).getTime();
}

describe("ReviewView timeline", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows entries in chronological order without hourly rows", async () => {
    vi.spyOn(store, "getEntries").mockResolvedValue([
      { id: 2, date, timestamp: at(18, 30), emoji: "🌙", note: "夜の記録", tags: ["night"] },
      { id: 1, date, timestamp: at(8, 15), emoji: "☀️", note: "朝の記録" },
    ]);

    const { container } = render(
      <ReviewView
        date={date}
        listId={1}
        todayStr={date}
        onBack={() => {}}
        onDateChange={() => {}}
        onSelectEmoji={() => {}}
      />,
    );

    await waitFor(() =>
      expect(container.querySelectorAll(".emolog-history-entry")).toHaveLength(2),
    );

    expect(container.querySelector(".emolog-daycal-row")).toBeNull();

    const rows = [...container.querySelectorAll(".emolog-history-entry")];
    expect(rows[0].textContent).toContain("08:15");
    expect(rows[0].textContent).toContain("☀️");
    expect(rows[1].textContent).toContain("18:30");
    expect(rows[1].textContent).toContain("🌙");
    expect(screen.getByText("夜の記録")).toBeTruthy();
    expect(screen.getByText("#night")).toBeTruthy();
    expect(screen.getByText("10時間15分の空き")).toBeTruthy();
  });

  it("edits a note from the day timeline", async () => {
    vi.spyOn(store, "getEntries").mockResolvedValue([
      { id: 1, date, timestamp: at(8, 15), emoji: "☀️", note: "朝の記録" },
    ]);
    const update = vi.spyOn(store, "updateEntryNote").mockResolvedValue(1);

    render(
      <ReviewView
        date={date}
        listId={1}
        todayStr={date}
        onBack={() => {}}
        onDateChange={() => {}}
        onSelectEmoji={() => {}}
      />,
    );

    await screen.findByText("朝の記録");
    fireEvent.click(screen.getByRole("button", { name: "メモを編集" }));
    const input = await screen.findByPlaceholderText("メモを入力");
    fireEvent.change(input, { target: { value: "更新した記録" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(update).toHaveBeenCalledWith(1, "更新した記録"));
    expect(await screen.findByText("更新した記録")).toBeTruthy();
  });

  it("changes an emoji from the picker on double click", async () => {
    vi.spyOn(store, "getEntries").mockResolvedValue([
      { id: 1, date, timestamp: at(8, 15), emoji: "☀️", note: "朝の記録" },
    ]);
    const update = vi.spyOn(store, "updateEntryEmoji").mockResolvedValue(1);

    const { container } = render(
      <ReviewView
        date={date}
        listId={1}
        todayStr={date}
        onBack={() => {}}
        onDateChange={() => {}}
        onSelectEmoji={() => {}}
      />,
    );

    await waitFor(() =>
      expect(container.querySelector(".emolog-history-emoji")?.textContent).toBe("☀️"),
    );
    fireEvent.doubleClick(container.querySelector(".emolog-history-emoji")!);

    const picker = container.querySelector("emoji-picker");
    expect(picker).toBeTruthy();
    fireEvent(picker!, new CustomEvent("emoji-click", { detail: { unicode: "🌤️" } }));

    await waitFor(() => expect(update).toHaveBeenCalledWith(1, "🌤️"));
    await waitFor(() => expect(container.querySelector("emoji-picker")).toBeNull());
  });

  it("deletes an entry and can undo it", async () => {
    vi.spyOn(store, "getEntries").mockResolvedValue([
      { id: 1, date, timestamp: at(8, 15), emoji: "☀️", note: "朝の記録" },
    ]);
    const remove = vi.spyOn(store, "deleteEntry").mockResolvedValue(undefined);
    const onSnackBar = vi.fn();

    render(
      <ReviewView
        date={date}
        listId={1}
        todayStr={date}
        onBack={() => {}}
        onDateChange={() => {}}
        onSelectEmoji={() => {}}
        onSnackBar={onSnackBar}
      />,
    );

    await screen.findByText("朝の記録");
    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() => expect(screen.queryByText("朝の記録")).toBeNull());
    expect(onSnackBar).toHaveBeenCalledWith("削除しました", expect.any(Object));

    const action = onSnackBar.mock.calls[0]![1] as { onClick: () => void };
    action.onClick();

    expect(await screen.findByText("朝の記録")).toBeTruthy();
    expect(remove).not.toHaveBeenCalled();
  });
});
