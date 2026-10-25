import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditorPanel } from "./EditorPanel";
import { SaiflowProvider } from "../store";

describe("EditorPanel", () => {
  it("renders DSL tab button as active by default", () => {
    render(
      <SaiflowProvider>
        <EditorPanel />
      </SaiflowProvider>,
    );
    const dslBtn = screen.getByRole("button", { name: "DSL" });
    expect(dslBtn).toBeInTheDocument();
  });

  it("renders GUI tab button", () => {
    render(
      <SaiflowProvider>
        <EditorPanel />
      </SaiflowProvider>,
    );
    expect(screen.getByText("GUI")).toBeInTheDocument();
  });
});

describe("EditorPanel with parse errors", () => {
  it("disables the GUI tab and keeps the DSL editor visible", () => {
    render(
      <SaiflowProvider
        state={{
          activeTab: "gui",
          parsed: { errors: [{ line: 1, message: "bad" }] },
          dslText: "bad",
        }}
      >
        <EditorPanel />
      </SaiflowProvider>,
    );

    expect(screen.getByRole("button", { name: "GUI" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "DSL" })).toBeInTheDocument();
  });
});
