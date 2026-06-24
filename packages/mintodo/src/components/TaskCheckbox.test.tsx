import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskCheckbox } from "./TaskCheckbox";

describe("TaskCheckbox", () => {
  it("renders an empty square when not done", () => {
    render(<TaskCheckbox isDone={false} onToggle={() => {}} testId="cb" />);
    const btn = screen.getByTestId("cb");
    expect(btn.className).toContain("border-[1.5px]");
    expect(btn.textContent).toBe("");
  });

  it("renders a check mark and filled background when done", () => {
    render(<TaskCheckbox isDone={true} onToggle={() => {}} testId="cb" />);
    const btn = screen.getByTestId("cb");
    expect(btn.textContent).toBe("✓");
    expect(btn.className).toContain("bg-emerald-500");
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
