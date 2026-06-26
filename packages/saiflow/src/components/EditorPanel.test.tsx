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
