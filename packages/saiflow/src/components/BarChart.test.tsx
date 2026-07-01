import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BarChart } from "./BarChart";
import { SaiflowProvider } from "../store";

describe("BarChart", () => {
  it("renders nothing when rows is null", () => {
    const { container } = render(
      <SaiflowProvider>
        <BarChart />
      </SaiflowProvider>,
    );
    expect(container.textContent).toBe("");
  });

  it("renders legend with group names", () => {
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
              groupIncome: { "給与": 500 },
              groupExpense: { "生活費": 200 },
            },
          ],
        }}
      >
        <BarChart />
      </SaiflowProvider>,
    );
    expect(screen.getByText("給与")).toBeInTheDocument();
    expect(screen.getByText("生活費")).toBeInTheDocument();
  });

  it("renders SVG with rect elements for bar segments", () => {
    const { container } = render(
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
              groupIncome: { "給与": 300, "副業": 200 },
              groupExpense: { "生活費": 150, "光熱費": 50 },
            },
          ],
        }}
      >
        <BarChart />
      </SaiflowProvider>,
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    // Should have rects for bar segments (at least 4: 2 income + 2 expense)
    const rects = svg!.querySelectorAll("rect:not([fill='transparent'])");
    expect(rects.length).toBeGreaterThanOrEqual(4);
  });
});
