import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ViewModeToggle } from "./ViewModeToggle";
import { MindProvider, useMindStore } from "../hooks/use-mind-store";
import { createInitialState, type State } from "../store";
import type { ViewMode } from "../types";

function Probe() {
  const { state } = useMindStore();
  return <span data-testid="vm">{state.viewMode}</span>;
}

function renderToggle(initialViewMode: ViewMode = "mindmap") {
  const s: State = { ...createInitialState(), viewMode: initialViewMode };
  return render(
    <MindProvider initialState={s}>
      <ViewModeToggle />
      <Probe />
    </MindProvider>,
  );
}

describe("ViewModeToggle", () => {
  it("renders both buttons", () => {
    renderToggle();
    expect(screen.getByTestId("view-mode-mindmap")).toBeTruthy();
    expect(screen.getByTestId("view-mode-kanban")).toBeTruthy();
  });

  it("highlights the active mode", () => {
    renderToggle("kanban");
    const kanbanBtn = screen.getByTestId("view-mode-kanban") as HTMLButtonElement;
    expect(kanbanBtn.getAttribute("aria-pressed")).toBe("true");
    const mindmapBtn = screen.getByTestId("view-mode-mindmap") as HTMLButtonElement;
    expect(mindmapBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("clicking dispatches SET_VIEW_MODE", () => {
    renderToggle("mindmap");
    act(() => {
      fireEvent.click(screen.getByTestId("view-mode-kanban"));
    });
    expect(screen.getByTestId("vm").textContent).toBe("kanban");
  });
});
