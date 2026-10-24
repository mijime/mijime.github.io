import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IntroScreen } from "./IntroScreen";

describe("IntroScreen", () => {
  it("ストーリーから開始設定まで進み、選んだ設定で開始する", () => {
    const onStart = vi.fn();
    render(<IntroScreen onStart={onStart} />);

    expect(screen.getByText("LLMとエージェントの四半期")).toBeInTheDocument();
    for (let index = 0; index < 4; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: /次へ/ }));
    }
    expect(screen.getByText("四半期を始める")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "20日" }));
    fireEvent.click(screen.getByRole("button", { name: "5人" }));
    fireEvent.click(screen.getByRole("button", { name: /四半期を開始/ }));
    expect(onStart).toHaveBeenCalledWith(20, 5);
  });
});
