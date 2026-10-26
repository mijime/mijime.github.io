import { beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ScenarioMenu } from "./ScenarioMenu";
import { SaiflowProvider, useSaiflowState } from "../store";
import { db, saveScenario } from "../storage";

function NameProbe() {
  const state = useSaiflowState();
  return <div data-testid="name">{state.scenarioName}</div>;
}

describe("ScenarioMenu", () => {
  beforeEach(async () => {
    await db.scenarios.clear();
  });

  it("loads another document after deleting the current one", async () => {
    await saveScenario({
      name: "残る計画",
      dslText: "# 残る計画\n,現金,35,35,現金+100\n",
      currentAge: 35,
      simulationYears: 50,
    });
    const currentId = await saveScenario({
      name: "消す計画",
      dslText: "# 消す計画\n,現金,35,35,現金+200\n",
      currentAge: 35,
      simulationYears: 50,
    });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <SaiflowProvider state={{ started: true, scenarioId: currentId, scenarioName: "消す計画" }}>
        <ScenarioMenu onSample={vi.fn()} onBlank={vi.fn()} />
        <NameProbe />
      </SaiflowProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "保存一覧" }));
    const deleteBtn = await screen.findByRole("button", { name: "消す計画を削除" });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByTestId("name")).toHaveTextContent("残る計画");
    });
    confirmSpy.mockRestore();
  });

  it("opens a saved document from the list", async () => {
    await saveScenario({
      name: "古い計画",
      dslText: "# 古い計画\n,現金,35,35,現金+100\n",
      currentAge: 35,
      simulationYears: 50,
    });
    const newerId = await saveScenario({
      name: "新しい計画",
      dslText: "# 新しい計画\n,現金,35,35,現金+200\n",
      currentAge: 35,
      simulationYears: 50,
    });

    render(
      <SaiflowProvider
        state={{
          started: true,
          scenarioId: newerId,
          scenarioName: "新しい計画",
        }}
      >
        <ScenarioMenu onSample={vi.fn()} onBlank={vi.fn()} />
        <NameProbe />
      </SaiflowProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "保存一覧" }));
    const oldName = await screen.findByText("古い計画");
    const row = oldName.parentElement?.parentElement;
    if (!row) throw new Error("row not found");
    fireEvent.click(within(row).getByRole("button", { name: /開く/ }));

    await waitFor(() => {
      expect(screen.getByTestId("name")).toHaveTextContent("古い計画");
    });
  });
});
