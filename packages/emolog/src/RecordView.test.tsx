import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RecordView } from "./RecordView";

describe("RecordView", () => {
  it("renders all favorite emoji buttons", () => {
    render(<RecordView favorites={["😊", "😢", "😡"]} onTap={vi.fn()} selectedList="メイン" />);
    expect(screen.getByText("😊")).toBeDefined();
    expect(screen.getByText("😢")).toBeDefined();
    expect(screen.getByText("😡")).toBeDefined();
  });

  it("renders note input with placeholder", () => {
    render(<RecordView favorites={["😊"]} onTap={vi.fn()} selectedList="メイン" />);
    const input = screen.getByPlaceholderText("いまの気持ちは？");
    expect(input).toBeDefined();
  });

  it("calls onTap with emoji and note when emoji button clicked", () => {
    const onTap = vi.fn();
    render(<RecordView favorites={["😊", "😢"]} onTap={onTap} selectedList="メイン" />);
    const input = screen.getByPlaceholderText("いまの気持ちは？") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "いい感じ" } });
    fireEvent.click(screen.getByText("😊"));
    expect(onTap).toHaveBeenCalledWith("😊", "いい感じ");
  });

  it("calls onTap with undefined note when input is empty", () => {
    const onTap = vi.fn();
    render(<RecordView favorites={["😊"]} onTap={onTap} selectedList="メイン" />);
    fireEvent.click(screen.getByText("😊"));
    expect(onTap).toHaveBeenCalledWith("😊", undefined);
  });

  it("clears note input after tap", () => {
    const onTap = vi.fn();
    render(<RecordView favorites={["😊"]} onTap={onTap} selectedList="メイン" />);
    const input = screen.getByPlaceholderText("いまの気持ちは？") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.click(screen.getByText("😊"));
    expect(input.value).toBe("");
  });

  it('renders "他の絵文字から選ぶ" toggle button', () => {
    render(<RecordView favorites={[]} onTap={vi.fn()} selectedList="メイン" />);
    expect(screen.getByText("＋ 絵文字を選ぶ")).toBeDefined();
  });

  it("shows empty favorites message when no favorites", () => {
    render(<RecordView favorites={[]} onTap={vi.fn()} selectedList="メイン" />);
    expect(screen.getByText("よく使う絵文字はまだありません")).toBeDefined();
  });
});
