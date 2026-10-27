import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DueBadge } from "./DueBadge";

describe("DueBadge", () => {
  it("renders nothing for kind none", () => {
    const { container } = render(<DueBadge due={{ kind: "none", daysFromNow: 0 }} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders 超過 for overdue", () => {
    const { container } = render(<DueBadge due={{ kind: "overdue", daysFromNow: -3 }} />);
    expect(container.textContent).toContain("超過");
  });

  it("renders 今日 for today with pulse animation class", () => {
    const { container } = render(<DueBadge due={{ kind: "today", daysFromNow: 0 }} />);
    expect(container.textContent).toContain("今日");
    expect((container.firstChild as HTMLElement).className).toContain("animate-pulse");
  });

  it("renders あと N 日 for future", () => {
    const { container } = render(<DueBadge due={{ kind: "future", daysFromNow: 5 }} />);
    expect(container.textContent).toBe("あと 5 日");
  });
});
