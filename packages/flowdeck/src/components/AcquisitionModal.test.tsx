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
  uncertainty: [{ title: "要求設計 +2", description: "獲得時の要求が +2 される" }],
  mitigation: 0,
  added: { design: 2, dev: 0, test: 0 },
  unmet: true,
  debt: 1,
  teamDebt: 1,
};

describe("AcquisitionModal", () => {
  it("獲得内容・不確実カード・報酬を表示する", () => {
    const onClose = vi.fn();
    render(<AcquisitionModal report={report} debtLimit={12} onClose={onClose} />);

    expect(screen.getByText("タスク獲得")).toBeInTheDocument();
    expect(screen.getByText("レポート確認")).toBeInTheDocument();
    expect(screen.getByText("要求設計 +2")).toBeInTheDocument();
    expect(screen.getByText(/開発/)).toBeInTheDocument();
    expect(screen.getByText("5pt / 2枚")).toBeInTheDocument();
    expect(screen.getByText("引いた人: ミナ")).toBeInTheDocument();
    expect(screen.getByText("要求未達: 負債カード +1（タスクは獲得）")).toBeInTheDocument();

    fireEvent.click(screen.getByText("閉じる"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
