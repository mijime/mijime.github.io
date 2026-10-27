import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AdvPlanner } from "./AdvPlanner";
import { SaiflowProvider } from "../store";

function renderPlanner(hasEvents = false) {
  const onComplete = vi.fn();
  const onStartNew = vi.fn();
  render(
    <SaiflowProvider
      state={{
        currentAge: 35,
        simulationYears: 50,
        started: true,
        activeTab: "adv",
        scenarioName: "ADVプラン",
        scenarios: [
          {
            name: "ADVプラン",
            events: hasEvents
              ? [
                  {
                    name: "初期現金",
                    startAge: 35,
                    endAge: 35,
                    ops: [{ asset: "現金", op: "+", value: 100 }],
                  },
                ]
              : [],
          },
        ],
        activeScenarioIndex: 0,
      }}
    >
      <AdvPlanner onComplete={onComplete} onStartNew={onStartNew} />
    </SaiflowProvider>,
  );
  return { onComplete, onStartNew };
}

describe("AdvPlanner", () => {
  it("starts from the profile and reaches the housing decision", async () => {
    renderPlanner();
    expect(screen.getByText("ADV入力")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "この内容でスタート" }));
    expect(await screen.findByText("住まいをどうしますか？")).toBeInTheDocument();

    fireEvent.click(screen.getByText(/賃貸を続ける/));
    expect(await screen.findByText("子どもはどうしますか？")).toBeInTheDocument();
  });

  it("shows a landing when the plan already has events", () => {
    const { onStartNew } = renderPlanner(true);
    expect(screen.getByText(/このプランにはすでにイベントがあります/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "新しいプランをADVで作る" }));
    expect(onStartNew).toHaveBeenCalledOnce();
  });

  it("can append future events to an existing plan", async () => {
    renderPlanner(true);
    fireEvent.click(screen.getByRole("button", { name: "このプランに未来のイベントを追加" }));
    expect(await screen.findByText("住まいをどうしますか？")).toBeInTheDocument();
    fireEvent.click(screen.getByText("住まいを変更しない"));
    expect(await screen.findByText("子どもはどうしますか？")).toBeInTheDocument();
  });
});
