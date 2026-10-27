import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatusDot } from "./StatusDot";

describe("StatusDot", () => {
  it("renders wip with bg-(--info)", () => {
    render(<StatusDot status="wip" testId="dot" />);
    const el = screen.getByTestId("dot");
    expect(el.className).toContain("bg-(--info)");
    expect(el.className).toContain("rounded-full");
  });

  it("renders review with bg-(--warning)", () => {
    render(<StatusDot status="review" testId="dot" />);
    expect(screen.getByTestId("dot").className).toContain("bg-(--warning)");
  });

  it("renders done with bg-(--success)", () => {
    render(<StatusDot status="done" testId="dot" />);
    expect(screen.getByTestId("dot").className).toContain("bg-(--success)");
  });

  it("renders inbox with bg-(--mid)", () => {
    render(<StatusDot status="inbox" testId="dot" />);
    expect(screen.getByTestId("dot").className).toContain("bg-(--mid)");
  });

  it("uses box-shadow ring", () => {
    const { container } = render(<StatusDot status="wip" />);
    const el = container.querySelector("span") as HTMLElement;
    expect(el.style.boxShadow).toContain("var(--paper)");
    expect(el.style.boxShadow).toContain("var(--mid)");
  });

  it("renders as a button and calls onClick when onClick is provided", () => {
    const onClick = vi.fn();
    render(<StatusDot status="wip" testId="btn" onClick={onClick} />);
    const el = screen.getByTestId("btn");
    expect(el.tagName).toBe("BUTTON");
    vi.useFakeTimers();
    fireEvent.click(el);
    expect(onClick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(onClick).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("fires onDoubleClick when double-clicked", () => {
    const onClick = vi.fn();
    const onDoubleClick = vi.fn();
    render(<StatusDot status="wip" testId="dot" onClick={onClick} onDoubleClick={onDoubleClick} />);
    const el = screen.getByTestId("dot");
    vi.useFakeTimers();
    fireEvent.dblClick(el);
    expect(onDoubleClick).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(250);
    expect(onClick).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("single click after delay dispatches onClick", () => {
    const onClick = vi.fn();
    render(<StatusDot status="wip" testId="btn" onClick={onClick} />);
    const el = screen.getByTestId("btn");
    vi.useFakeTimers();
    fireEvent.click(el);
    vi.advanceTimersByTime(200);
    expect(onClick).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("shows a Check icon when showCheckIcon is true and status is done", () => {
    render(<StatusDot status="done" testId="dot" onClick={vi.fn()} showCheckIcon />);
    const btn = screen.getByTestId("dot");
    expect(btn.querySelector("svg")).toBeTruthy();
  });

  it("does not render a Check icon when showCheckIcon is true but onClick is not provided", () => {
    render(<StatusDot status="done" testId="dot" showCheckIcon />);
    const el = screen.getByTestId("dot");
    expect(el.tagName).toBe("SPAN");
    expect(el.querySelector("svg")).toBeNull();
  });
});
