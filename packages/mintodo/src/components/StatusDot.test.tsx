import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatusDot } from "./StatusDot";

describe("StatusDot", () => {
  it("renders wip with bg-sky-500", () => {
    render(<StatusDot status="wip" testId="dot" />);
    const el = screen.getByTestId("dot");
    expect(el.className).toContain("bg-sky-500");
    expect(el.className).toContain("rounded-full");
  });

  it("renders review with bg-amber-500", () => {
    render(<StatusDot status="review" testId="dot" />);
    expect(screen.getByTestId("dot").className).toContain("bg-amber-500");
  });

  it("renders done with bg-emerald-500", () => {
    render(<StatusDot status="done" testId="dot" />);
    expect(screen.getByTestId("dot").className).toContain("bg-emerald-500");
  });

  it("renders inbox with bg-slate-400", () => {
    render(<StatusDot status="inbox" testId="dot" />);
    expect(screen.getByTestId("dot").className).toContain("bg-slate-400");
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
    fireEvent.click(el);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
