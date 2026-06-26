import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DslEditor } from "./DslEditor";
import { SaiflowProvider } from "../store";

describe("DslEditor", () => {
  it("renders textarea with dslText from state", () => {
    render(
      <SaiflowProvider state={{ dslText: "# 現状維持\n現金,0,0,現金+1000\n" }}>
        <DslEditor />
      </SaiflowProvider>,
    );
    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeInTheDocument();
    expect(textarea.textContent).toBe("# 現状維持\n現金,0,0,現金+1000\n");
  });

  it("shows parse errors when present", () => {
    render(
      <SaiflowProvider
        state={{
          dslText: "# テスト\nbad",
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
          dslText: "# 現状維持\n現金,0,0,現金+1000\n",
          parsed: {
            config: {
              currentAge: 39,
              simulationYears: 50,
              scenario: {
                name: "現状維持",
                events: [
                  {
                    name: "現金",
                    startYear: 0,
                    endYear: 0,
                    ops: [{ asset: "現金", op: "+", value: 1000 }],
                  },
                ],
              },
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
