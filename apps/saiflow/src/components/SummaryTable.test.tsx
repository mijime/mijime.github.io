import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SummaryTable } from "./SummaryTable";
import { SaiflowProvider } from "../store";
import type { YearRow } from "../types";

const row: YearRow = {
  age: 35,
  operations: [{ eventName: "年収", op: { asset: "現金", op: "+", value: 500 }, flow: "income" }],
  balances: { 現金: 500 },
  totalIncome: 500,
  totalExpense: 0,
  totalAssets: 500,
  groupIncome: { "(未分類)": 500 },
  groupExpense: {},
};

describe("SummaryTable", () => {
  it("shows the amount unit in 万円", () => {
    render(
      <SaiflowProvider state={{ rows: [row] }}>
        <SummaryTable />
      </SaiflowProvider>,
    );
    expect(screen.getByText(/金額単位: 万円/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "詳細" }));
    expect(screen.getByText("年収")).toBeInTheDocument();
  });
});

describe("SummaryTable signs", () => {
  const negativeRow: YearRow = {
    age: 36,
    operations: [
      { eventName: "給与", op: { asset: "現金", op: "+", value: 100 }, flow: "income" },
      { eventName: "生活費", op: { asset: "現金", op: "-", value: 600 }, flow: "expense" },
    ],
    balances: { 現金: -500 },
    totalIncome: 100,
    totalExpense: 600,
    totalAssets: -500,
    groupIncome: { "(未分類)": 100 },
    groupExpense: { "(未分類)": 600 },
  };

  it("shows a negative net cashflow with a minus sign", () => {
    render(
      <SaiflowProvider state={{ rows: [negativeRow] }}>
        <SummaryTable />
      </SaiflowProvider>,
    );
    expect(screen.getAllByText("-600").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-500").length).toBeGreaterThan(0);
  });
});
