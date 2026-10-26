import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IntroScreen } from "./IntroScreen";

describe("IntroScreen", () => {
  it("ストーリーから開始設定まで進み、選んだ設定で開始する", () => {
    const onStart = vi.fn();
    render(<IntroScreen onStart={onStart} />);

    expect(screen.getByText("LLMとエージェントのプロジェクト")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "20日" }));
    fireEvent.click(screen.getByRole("button", { name: "5人" }));
    fireEvent.click(screen.getByRole("button", { name: /波乱/ }));
    fireEvent.click(screen.getByRole("button", { name: /プロジェクトを開始/ }));
    expect(onStart).toHaveBeenCalledWith(20, 5, 0.2, "strong");
  });

  it("長期プロジェクト（100日）も選べる", () => {
    const onStart = vi.fn();
    render(<IntroScreen onStart={onStart} />);

    fireEvent.click(screen.getByRole("button", { name: "100日" }));
    fireEvent.click(screen.getByRole("button", { name: /有能/ }));
    fireEvent.click(screen.getByRole("button", { name: /プロジェクトを開始/ }));
    expect(onStart).toHaveBeenCalledWith(100, 4, 0.1, "strong");
  });
});
