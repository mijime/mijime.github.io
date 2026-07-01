import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CashflowTable } from "./CashflowTable";
import { SaiflowProvider } from "../store";

describe("CashflowTable", () => {
  it("renders nothing when rows is null", () => {
    const { container } = render(
      <SaiflowProvider>
        <CashflowTable />
      </SaiflowProvider>,
    );
    expect(container.textContent).toBe("");
  });

  it("renders group rows with income and expense sub-rows", () => {
    render(
      <SaiflowProvider
        state={{
          rows: [
            {
              age: 40,
              operations: [],
              balances: { 現金: 800 },
              totalIncome: 500,
              totalExpense: 200,
              totalAssets: 800,
              groupIncome: { 給与: 500 },
              groupExpense: { 生活費: 200 },
            },
          ],
        }}
      >
        <CashflowTable />
      </SaiflowProvider>,
    );
    expect(screen.getByText(/給与/)).toBeInTheDocument();
    expect(screen.getByText(/生活費/)).toBeInTheDocument();
    expect(screen.getByText("収入合計")).toBeInTheDocument();
    expect(screen.getByText("支出合計")).toBeInTheDocument();
    expect(screen.getByText("収支")).toBeInTheDocument();
    expect(screen.getByText("資産残高")).toBeInTheDocument();
  });

  it("shows year headers with age", () => {
    render(
      <SaiflowProvider
        state={{
          rows: [
            {
              age: 40,
              operations: [],
              balances: { 現金: 0 },
              totalIncome: 0,
              totalExpense: 0,
              totalAssets: 0,
              groupIncome: {},
              groupExpense: {},
            },
          ],
        }}
      >
        <CashflowTable />
      </SaiflowProvider>,
    );
    expect(screen.getByText("40歳")).toBeInTheDocument();
  });

  it("toggles group collapse on header click", () => {
    render(
      <SaiflowProvider
        state={{
          rows: [
            {
              age: 40,
              operations: [],
              balances: { 現金: 0 },
              totalIncome: 100,
              totalExpense: 0,
              totalAssets: 100,
              groupIncome: { 給与: 100 },
              groupExpense: {},
            },
          ],
        }}
      >
        <CashflowTable />
      </SaiflowProvider>,
    );
    // Initially expanded: ▼ icon visible
    expect(screen.getByText(/▼/)).toBeInTheDocument();
    // Click the group header
    fireEvent.click(screen.getByText(/給与/));
    // Now collapsed: ▶ icon visible
    expect(screen.getByText(/▶/)).toBeInTheDocument();
  });

  it("displays negative net in red", () => {
    render(
      <SaiflowProvider
        state={{
          rows: [
            {
              age: 40,
              operations: [],
              balances: { 現金: -200 },
              totalIncome: 100,
              totalExpense: 300,
              totalAssets: -200,
              groupIncome: { 給与: 100 },
              groupExpense: { 生活費: 300 },
            },
          ],
        }}
      >
        <CashflowTable />
      </SaiflowProvider>,
    );
    // The net row should contain -200 with red text (収支 = 100 - 300 = -200)
    const netCells = screen.getAllByText("-200");
    const redCell = netCells.find((cell) => cell.className.includes("text-red-500"));
    expect(redCell).toBeTruthy();
  });
});
