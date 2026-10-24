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
        onClose={vi.fn()}
        onStart={onStart}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "20日" }));
    fireEvent.click(screen.getByRole("button", { name: "5人" }));
    fireEvent.click(screen.getByRole("button", { name: /波乱/ }));
    fireEvent.click(screen.getByRole("button", { name: /ランダム編成で開始/ }));

    expect(onStart).toHaveBeenCalledWith(20, 5, 0.2);
  });
});
