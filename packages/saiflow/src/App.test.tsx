import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "./App";
import { db, saveScenario } from "./storage";

describe("App", () => {
  beforeEach(async () => {
    await db.scenarios.clear();
  });

  it("shows onboarding when there is no saved data", async () => {
    render(<App />);
    expect(await screen.findByText("サンプルで始める")).toBeInTheDocument();
    expect(screen.getByText("空のシナリオで始める")).toBeInTheDocument();
  });

  it("starts with the sample and shows the result table", async () => {
    render(<App />);
    fireEvent.click(await screen.findByText("サンプルで始める"));

    await waitFor(() => {
      expect(screen.getByLabelText("ファイル名")).toHaveValue("サンプル: 現状維持と早期リタイア");
    });
    expect(screen.getByRole("button", { name: "収支表" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "アドバイス" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "リスク" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "詳細" }));
    expect(screen.getAllByText("年収").length).toBeGreaterThan(0);
  });

  it("opens the most recent saved scenario", async () => {
    await saveScenario({
      name: "既存の計画",
      dslText: "# 既存\n,初期現金,35,35,現金+1000\n",
      currentAge: 35,
      simulationYears: 50,
    });
    render(<App />);
    expect(await screen.findByLabelText("ファイル名")).toHaveValue("既存の計画");
    expect(screen.getByRole("button", { name: "収支表" })).toBeInTheDocument();
  });

  it("opens an invalid saved scenario in the DSL tab and locks the GUI tab", async () => {
    await saveScenario({
      name: "壊れた計画",
      dslText: "# 壊れた計画\nbad line\n",
      currentAge: 35,
      simulationYears: 50,
    });
    render(<App />);

    expect(await screen.findByText("DSLにエラーがあります")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "DSL" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "GUI" })).toBeDisabled();
  });

  it("keeps DSL edits when switching to the GUI tab", async () => {
    render(<App />);
    fireEvent.click(await screen.findByText("空のシナリオで始める"));

    fireEvent.click(screen.getByRole("button", { name: "DSL" }));
    fireEvent.change(screen.getByRole("textbox", { name: "DSL" }), {
      target: { value: "# 新しいシナリオ\n,現金,35,35,現金+100\n" },
    });
    fireEvent.click(screen.getByRole("button", { name: "GUI" }));

    await waitFor(() => {
      expect(screen.getByText("35歳 → 35歳")).toBeInTheDocument();
    });
  });

  it("warns about offset-based age data", async () => {
    await saveScenario({
      name: "古い形式の計画",
      dslText: "# 古い形式\n,年収,0,20,現金+500\n",
      currentAge: 35,
      simulationYears: 50,
    });
    render(<App />);
    expect(await screen.findByText("イベントの年齢がすべて現在年齢より前です")).toBeInTheDocument();
  });

  it("persists a renamed document", async () => {
    await saveScenario({
      name: "元の名前",
      dslText: "# 元の名前\n,初期現金,35,35,現金+1000\n",
      currentAge: 35,
      simulationYears: 50,
    });
    render(<App />);

    const input = await screen.findByLabelText("ファイル名");
    fireEvent.change(input, { target: { value: "新しい名前" } });

    await waitFor(
      async () => {
        const [latest] = await db.scenarios.orderBy("updatedAt").toArray();
        expect(latest.name).toBe("新しい名前");
      },
      { timeout: 3000 },
    );
  });
});
