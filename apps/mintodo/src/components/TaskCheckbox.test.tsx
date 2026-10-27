import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskCheckbox } from "./TaskCheckbox";

describe("TaskCheckbox", () => {
  it("renders an unchecked box when not done", () => {
    render(<TaskCheckbox isDone={false} onToggle={() => {}} testId="cb" />);
    const cb = screen.getByTestId("cb") as HTMLInputElement;
    expect(cb.checked).toBe(false);
  });

  it("renders a checked box when done", () => {
    render(<TaskCheckbox isDone={true} onToggle={() => {}} testId="cb" />);
    const cb = screen.getByTestId("cb") as HTMLInputElement;
    expect(cb.checked).toBe(true);
  });

  it("calls onToggle when clicked and stops propagation", () => {
    const onToggle = vi.fn();
    const stop = vi.fn();
    render(
      <div onClick={stop}>
        <TaskCheckbox isDone={false} onToggle={onToggle} testId="cb" />
      </div>,
    );
    fireEvent.click(screen.getByTestId("cb"));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(stop).not.toHaveBeenCalled();
  });
});
