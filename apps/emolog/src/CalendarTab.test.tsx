import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as store from "./store";
import { CalendarTab } from "./CalendarTab";

function previousMonthDate(): string {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

describe("CalendarTab", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(store, "getEntriesByDateRange").mockResolvedValue([]);
    vi.spyOn(store, "getEntries").mockResolvedValue([]);
  });

  it("opens the selected day and returns to the same month", async () => {
    const date = previousMonthDate();
    render(<CalendarTab listId={1} onSelectEmoji={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "前月" }));
    await screen.findByTitle(date);
    fireEvent.click(screen.getByTitle(date));

    await waitFor(() => expect(store.getEntries).toHaveBeenCalledWith(date, 1));
    expect(await screen.findByText("この日の記録はありません")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "カレンダーへ戻る" }));
    const selected = screen.getByTitle(date);
    expect(selected.className).toContain("emolog-cal-selected");
  });
});
