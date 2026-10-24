import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AcquisitionModal } from "./AcquisitionModal";
import type { AcquisitionReport } from "../engine/types";

const report: AcquisitionReport = {
  id: "t-report",
  day: 1,
  taskTitle: "レポート確認",
  pullerId: "p2",
  pullerName: "ミナ",
  recipientId: "p1",
  recipientName: "あなた",
  contributions: [
    { playerId: "p1", playerName: "あなた", points: 5, cards: 2, lastOrder: 2 },
    { playerId: "p2", playerName: "ミナ", points: 3, cards: 1, lastOrder: 1 },
  ],
  score: 4,
  reward: { type: "dev", level: 5 },
  risks: [{ title: "仕様追加 +2", description: "設計の余剰作業 2 で吸収" }],
  added: { design: 2, dev: 0, test: 0 },
  unmet: true,
  debt: 1,
  teamDebt: 1,
};

describe("AcquisitionModal", () => {
  it("完了内容・リスクカード・報酬を表示する", () => {
    const onClose = vi.fn();
    render(<AcquisitionModal report={report} debtLimit={12} onClose={onClose} />);

    expect(screen.getByText("タスク完了")).toBeInTheDocument();
    expect(screen.getByText("レポート確認")).toBeInTheDocument();
    expect(screen.getByText("仕様追加 +2")).toBeInTheDocument();
    expect(screen.getByText(/開発/)).toBeInTheDocument();
    expect(screen.getByText("5pt / 2枚")).toBeInTheDocument();
    expect(screen.getByText("引: ミナ")).toBeInTheDocument();
    expect(screen.getByText("リスク未吸収: 負債 +1")).toBeInTheDocument();

    fireEvent.click(screen.getByText("閉じる"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
