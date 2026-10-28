import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewGameModal } from "./NewGameModal";

describe("NewGameModal", () => {
  it("日数と人数を選んで開始する", () => {
    const onStart = vi.fn();
    render(
      <NewGameModal currentDays={10} currentAiCount={4} onClose={vi.fn()} onStart={onStart} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "20日" }));
    fireEvent.click(screen.getByRole("button", { name: "5人" }));
    fireEvent.click(screen.getByRole("button", { name: /この設定で開始/ }));

    expect(onStart).toHaveBeenCalledWith(20, 5);
  });

  it("チームメイトとタスクの得損は選べない", () => {
    render(
      <NewGameModal currentDays={10} currentAiCount={4} onClose={vi.fn()} onStart={vi.fn()} />,
    );

    expect(screen.queryByRole("button", { name: /有能/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /波乱/ })).not.toBeInTheDocument();
  });

  it("現在の日数が長期プロジェクトでも開始できる", () => {
    const onStart = vi.fn();
    render(
      <NewGameModal currentDays={100} currentAiCount={4} onClose={vi.fn()} onStart={onStart} />,
    );

    expect(screen.getByRole("button", { name: "100日" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /この設定で開始/ }));
    expect(onStart).toHaveBeenCalledWith(100, 4);
  });
});
