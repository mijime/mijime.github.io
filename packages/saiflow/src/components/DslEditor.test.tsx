import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { DslEditor } from "./DslEditor";
import { SaiflowProvider, useSaiflowState } from "../store";
import { useDslSync } from "../useDslSync";
import type { YearRow } from "../types";

function Harness({ children }: { children: ReactNode }) {
  useDslSync();
  return <>{children}</>;
}

describe("DslEditor", () => {
  it("renders textarea with dslText from state", () => {
    render(
      <SaiflowProvider state={{ dslText: "# 現状維持\n現金,0,0,現金+1000\n" }}>
        <DslEditor />
      </SaiflowProvider>,
    );
    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeInTheDocument();
    expect((textarea as HTMLTextAreaElement).value).toBe("# 現状維持\n現金,0,0,現金+1000\n");
  });

  it("shows parse errors when present", () => {
    render(
      <SaiflowProvider
        state={{
          dslText: "# テスト\nbad",
        }}
      >
        <Harness>
          <DslEditor />
        </Harness>
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
                    startAge: 0,
                    endAge: 0,
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

describe("DslEditor error handling", () => {
  const row: YearRow = {
    age: 35,
    operations: [],
    balances: { 現金: 100 },
    totalIncome: 100,
    totalExpense: 0,
    totalAssets: 100,
    groupIncome: {},
    groupExpense: {},
  };

  function RowsProbe() {
    const state = useSaiflowState();
    return <div data-testid="rows">{state.rows?.length ?? 0}</div>;
  }

  it("keeps the last result visible while the DSL has errors", async () => {
    render(
      <SaiflowProvider state={{ dslText: "bad line", rows: [row] }}>
        <Harness>
          <DslEditor />
          <RowsProbe />
        </Harness>
      </SaiflowProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/エラーあり/)).toBeInTheDocument();
    });
    expect(screen.getByTestId("rows")).toHaveTextContent("1");
    expect(screen.getByText("bad line", { selector: "code" })).toBeInTheDocument();
  });

  it("records the last valid DSL after a successful parse", async () => {
    render(
      <SaiflowProvider state={{ dslText: "# A\n,現金,35,35,現金+100\n" }}>
        <Harness>
          <DslEditor />
          <LastValidProbe />
        </Harness>
      </SaiflowProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("last-valid")).toHaveTextContent("現金+100");
    });
  });

  function LastValidProbe() {
    const state = useSaiflowState();
    return <div data-testid="last-valid">{state.lastValidDsl}</div>;
  }
});
