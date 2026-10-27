import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewGameModal } from "./NewGameModal";

describe("NewGameModal", () => {
  it("日数・人数・タスクの得損を選んで開始する", () => {
    const onStart = vi.fn();
    render(
      <NewGameModal
        currentDays={10}
        currentAiCount={4}
        currentSwing={0.1}
        currentAiProfile="standard"
        onClose={vi.fn()}
        onStart={onStart}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "20日" }));
    fireEvent.click(screen.getByRole("button", { name: "5人" }));
    fireEvent.click(screen.getByRole("button", { name: /波乱/ }));
    fireEvent.click(screen.getByRole("button", { name: /この設定で開始/ }));

    expect(onStart).toHaveBeenCalledWith(20, 5, 0.2, "standard");
  });

  it("チームメイトを有能に切り替えて開始できる", () => {
    const onStart = vi.fn();
    render(
      <NewGameModal
        currentDays={10}
        currentAiCount={4}
        currentSwing={0.1}
        currentAiProfile="standard"
        onClose={vi.fn()}
        onStart={onStart}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /有能/ }));
    fireEvent.click(screen.getByRole("button", { name: /この設定で開始/ }));
    expect(onStart).toHaveBeenCalledWith(10, 4, 0.1, "strong");
  });

  it("現在の日数が長期プロジェクトでも開始できる", () => {
    const onStart = vi.fn();
    render(
      <NewGameModal
        currentDays={100}
        currentAiCount={4}
        currentSwing={0.1}
        currentAiProfile="standard"
        onClose={vi.fn()}
        onStart={onStart}
      />,
    );

    expect(screen.getByRole("button", { name: "100日" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /この設定で開始/ }));
    expect(onStart).toHaveBeenCalledWith(100, 4, 0.1, "standard");
  });
});
