import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DslEditor } from "./DslEditor";
import { SaiflowProvider } from "../store";

describe("DslEditor", () => {
  it("renders textarea with dslText from state", () => {
    render(
      <SaiflowProvider state={{ dslText: "# 初期設定\n現金:1000\n" }}>
        <DslEditor />
      </SaiflowProvider>,
    );
    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeInTheDocument();
    expect(textarea.textContent).toBe("# 初期設定\n現金:1000\n");
  });

  it("shows parse errors when present", () => {
    render(
      <SaiflowProvider
        state={{
          dslText: "# 初期設定\nbad",
        }}
      >
        <DslEditor />
      </SaiflowProvider>,
    );
    expect(screen.getByText(/形式である必要があります/)).toBeInTheDocument();
  });

  it("shows parse success indicator when config is parsed", () => {
    render(
      <SaiflowProvider
        state={{
          dslText: "# 初期設定\n現金:1000\n",
          parsed: {
            config: {
              currentAge: 39,
              simulationYears: 50,
              initialAssets: [{ name: "現金", value: 1000 }],
              events: [],
            },
          },
        }}
      >
        <DslEditor />
      </SaiflowProvider>,
    );
    expect(screen.getByText(/解析OK/)).toBeInTheDocument();
  });
});
