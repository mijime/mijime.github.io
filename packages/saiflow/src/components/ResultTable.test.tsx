import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultTable } from "./ResultTable";
import { SaiflowProvider } from "../store";

describe("ResultTable", () => {
  it("renders nothing when rows is null", () => {
    const { container } = render(
      <SaiflowProvider>
        <ResultTable />
      </SaiflowProvider>,
    );
    expect(container.textContent).toBe("");
  });

  it("renders table when rows are present", () => {
    render(
      <SaiflowProvider
        state={{
          rows: [
            {
              age: 40,
              operations: [],
              balances: { 現金: 1000 },
              totalIncome: 500,
              totalExpense: 200,
              totalAssets: 1000,
              groupIncome: {},
              groupExpense: {},
            },
            {
              age: 41,
              operations: [],
              balances: { 現金: 1300 },
              totalIncome: 500,
              totalExpense: 200,
              totalAssets: 1300,
              groupIncome: {},
              groupExpense: {},
            },
          ],
        }}
      >
        <ResultTable />
      </SaiflowProvider>,
    );
    expect(screen.getByText("年齢")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getByText("41")).toBeInTheDocument();
  });

  it("displays asset column headers", () => {
    render(
      <SaiflowProvider
        state={{
          rows: [
            {
              age: 40,
              operations: [],
              balances: { 現金: 1000, NISA: 500 },
              totalIncome: 0,
              totalExpense: 0,
              totalAssets: 1500,
              groupIncome: {},
              groupExpense: {},
            },
          ],
        }}
      >
        <ResultTable />
      </SaiflowProvider>,
    );
    expect(screen.getByText("現金")).toBeInTheDocument();
    expect(screen.getByText("NISA")).toBeInTheDocument();
  });

  it("displays negative balance in red", () => {
    render(
      <SaiflowProvider
        state={{
          rows: [
            {
              age: 40,
              operations: [],
              balances: { 現金: -500 },
              totalIncome: 0,
              totalExpense: 500,
              totalAssets: -500,
              groupIncome: {},
              groupExpense: {},
            },
          ],
        }}
      >
        <ResultTable />
      </SaiflowProvider>,
    );
    const cells = screen.getAllByText("-500");
    cells.forEach((cell) => {
      expect(cell.className).toContain("text-red-500");
    });
  });
});
