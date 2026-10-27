import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { groupLogByDay } from "./components/LogPanel";

beforeEach(() => {
  localStorage.clear();
});

describe("Flowdeck App", () => {
  it("ヘッダー・Backlog・チームボード・手札を表示する", () => {
    render(<App />);

    expect(screen.getByText("あなたの手番")).toBeInTheDocument();
    expect(screen.getAllByText(/Backlog/).length).toBeGreaterThan(0);
    expect(screen.getByText("チームボード")).toBeInTheDocument();
    expect(screen.getAllByText("チーム").length).toBeGreaterThan(0);
    expect(screen.getByText("パス")).toBeInTheDocument();
  });

  it("ログを日付ごとに区切る", () => {
    const groups = groupLogByDay([
      { day: 1, message: "開始", kind: "info" },
      { day: 1, message: "行動", kind: "good" },
      { day: 2, message: "終了", kind: "bad" },
    ]);
    expect(groups.map((group) => group.day)).toEqual([1, 2]);
    expect(groups[0]?.entries).toHaveLength(2);
    expect(groups[1]?.entries).toHaveLength(1);
  });
});
