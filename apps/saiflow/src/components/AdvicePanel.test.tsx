import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdvicePanel } from "./AdvicePanel";
import { SaiflowProvider } from "../store";
import type { YearRow } from "../types";

const row: YearRow = {
  age: 35,
  operations: [],
  balances: { 現金: 1000 },
  totalIncome: 500,
  totalExpense: 200,
  totalAssets: 1000,
  groupIncome: {},
  groupExpense: {},
};

describe("AdvicePanel", () => {
  it("shows automatically generated findings", () => {
    render(
      <SaiflowProvider
        state={{
          currentAge: 35,
          rows: [row, { ...row, age: 36, totalAssets: 1200 }],
          scenarios: [{ name: "test", events: [] }],
          activeScenarioIndex: 0,
        }}
      >
        <AdvicePanel />
      </SaiflowProvider>,
    );

    expect(screen.getByText("この計画の気づき")).toBeInTheDocument();
    expect(screen.getByText("総資産はマイナスになりません")).toBeInTheDocument();
    expect(screen.getByText(/ルールベースで自動判定/)).toBeInTheDocument();
  });

  it("shows a danger badge for negative assets", () => {
    render(
      <SaiflowProvider
        state={{
          currentAge: 35,
          rows: [{ ...row, totalAssets: -100 }],
          scenarios: [{ name: "test", events: [] }],
          activeScenarioIndex: 0,
        }}
      >
        <AdvicePanel />
      </SaiflowProvider>,
    );

    expect(screen.getByText(/要対応 1/)).toBeInTheDocument();
    expect(screen.getByText(/総資産がマイナスです/)).toBeInTheDocument();
  });
});
