import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DebtWarning } from "./DebtWarning";

describe("DebtWarning", () => {
  it("上限未満では表示しない", () => {
    const { container } = render(<DebtWarning debt={10} limit={11} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("上限到達で警告する", () => {
    render(<DebtWarning debt={11} limit={11} />);
    expect(screen.getByRole("status")).toHaveTextContent(/上限/);
    expect(screen.getByText("11/11")).toBeInTheDocument();
  });

  it("超過枚数を表示する", () => {
    render(<DebtWarning debt={13} limit={11} />);
    expect(screen.getByText(/2枚超過/)).toBeInTheDocument();
  });
});
