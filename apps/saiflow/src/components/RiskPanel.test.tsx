import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RiskPanel } from "./RiskPanel";
import { SaiflowProvider } from "../store";

describe("RiskPanel", () => {
  it("runs a Monte Carlo simulation and shows percentiles", async () => {
    render(
      <SaiflowProvider
        state={{
          currentAge: 35,
          simulationYears: 10,
          scenarios: [
            {
              name: "test",
              events: [
                {
                  name: "給料",
                  startAge: 35,
                  endAge: 44,
                  ops: [{ asset: "現金", op: "+", value: 500 }],
                },
                {
                  name: "生活費",
                  startAge: 35,
                  endAge: null,
                  ops: [{ asset: "現金", op: "-", value: 250 }],
                },
              ],
            },
          ],
          activeScenarioIndex: 0,
        }}
      >
        <RiskPanel trials={10} />
      </SaiflowProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "10回試算する" }));
    expect(await screen.findByText("途中で資産がマイナスになる確率")).toBeInTheDocument();
    expect(screen.getByText("P50")).toBeInTheDocument();
    expect(screen.getByText("P90")).toBeInTheDocument();
    expect(screen.getByText(/シード: 42/)).toBeInTheDocument();
  });
});
