import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SaveStatus } from "./SaveStatus";
import { SaiflowProvider } from "../store";

describe("SaveStatus", () => {
  it("shows a retry button after a failed save", () => {
    const onRetry = vi.fn();
    render(
      <SaiflowProvider state={{ saveStatus: "error", saveError: "quota exceeded" }}>
        <SaveStatus onRetry={onRetry} />
      </SaiflowProvider>,
    );
    expect(screen.getByText("保存に失敗")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "再試行" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows the saved time", () => {
    render(
      <SaiflowProvider
        state={{
          saveStatus: "saved",
          lastSavedAt: new Date("2026-01-02T03:04:00"),
        }}
      >
        <SaveStatus onRetry={() => {}} />
      </SaiflowProvider>,
    );
    expect(screen.getByText(/保存済み/)).toBeInTheDocument();
  });

  it("renders nothing while idle", () => {
    const { container } = render(
      <SaiflowProvider state={{ saveStatus: "idle" }}>
        <SaveStatus onRetry={() => {}} />
      </SaiflowProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
