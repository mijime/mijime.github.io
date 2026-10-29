import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmojiButton } from "./EmojiButton";

describe("EmojiButton", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens the editor after a long press", () => {
    vi.useFakeTimers();
    const onEdit = vi.fn();
    render(<EmojiButton emoji="😀" onEdit={onEdit} />);
    const emoji = screen.getByText("😀");

    fireEvent.pointerDown(emoji, { pointerType: "touch", clientX: 10, clientY: 10 });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onEdit).toHaveBeenCalledTimes(1);

    // 長押し直後のクリックではフィルタなどが発火しない
    fireEvent.pointerUp(emoji, { pointerType: "touch", clientX: 10, clientY: 10 });
    fireEvent.click(emoji);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("does not open the editor when the pointer moves", () => {
    vi.useFakeTimers();
    const onEdit = vi.fn();
    render(<EmojiButton emoji="😀" onEdit={onEdit} />);
    const emoji = screen.getByText("😀");

    fireEvent.pointerDown(emoji, { pointerType: "touch", clientX: 10, clientY: 10 });
    fireEvent.pointerMove(emoji, { pointerType: "touch", clientX: 10, clientY: 40 });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onEdit).not.toHaveBeenCalled();
  });

  it("opens the editor on double click", () => {
    const onEdit = vi.fn();
    render(<EmojiButton emoji="😀" onEdit={onEdit} />);

    fireEvent.doubleClick(screen.getByText("😀"));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
