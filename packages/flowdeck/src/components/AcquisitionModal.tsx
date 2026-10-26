import { AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { Badge, Button, Modal } from "@mijime/theme/ui";
import type { AcquisitionReport } from "../engine/types";
import { CARD_LABEL, LevelStars, effectDescription, effectLabel } from "./ui";

interface Props {
  report: AcquisitionReport;
  debtLimit: number;
  onClose: () => void;
}

export function AcquisitionModal({ report, debtLimit, onClose }: Props) {
  const added = (
    [
      ["design", "設計", report.added.design],
      ["dev", "開発", report.added.dev],
      ["test", "テスト", report.added.test],
    ] as const
  ).filter(([, , value]) => value > 0);

  return (
    <Modal
      open
      onClose={onClose}
      title="タスク完了"
      description={report.taskTitle}
      size="lg"
      align="bottom"
      footer={
        <div className="flex w-full items-center justify-between gap-2 text-[9px] text-(--mid)">
          <span>
            この完了の負債 +{report.debt} / 技術的負債 {report.teamDebt} / {debtLimit}
          </span>
          <Button variant="primary" size="sm" onClick={onClose}>
            閉じる <ArrowRight size={11} />
          </Button>
        </div>
      }
    >
      <div className="space-y-2.5 text-[10px]">
        <div className="flex flex-wrap items-center justify-between gap-1 text-[9px] text-(--mid)">
          <span className="inline-flex items-center gap-1 text-(--accent)">
            <Sparkles size={9} /> {report.recipientName}
            {report.pullerId !== report.recipientId && <span>引: {report.pullerName}</span>}
          </span>
          <Badge tone="neutral">Day {report.day}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-sm border border-(--border) bg-(--paper) px-2 py-1.5">
            <span className="block text-[8px] text-(--mid)">企業価値</span>
            <span className="text-[15px] font-semibold text-(--success)">+{report.score}</span>
          </div>
          <div className="rounded-sm border border-(--border) bg-(--paper) px-2 py-1.5">
            <span className="block text-[8px] text-(--mid)">報酬カード（受取者へ）</span>
            <span
              className={`text-[12px] font-medium ${
                report.reward.level > 0 ? "text-(--ink)" : "text-(--mid)"
              }`}
            >
              <Sparkles size={10} className="mr-0.5 inline" />
              {CARD_LABEL[report.reward.type]}{" "}
              <LevelStars level={report.reward.level} className="text-[9px]" />
            </span>
            {report.reward.effect && (
              <span
                className="mt-0.5 block text-[8px] text-(--accent)"
                title={effectDescription(report.reward.effect) ?? undefined}
              >
                {effectLabel(report.reward.effect)}
              </span>
            )}
          </div>
        </div>

        <section>
          <h3 className="text-[9px] font-medium text-(--mid)">貢献</h3>
          <ul className="mt-1 space-y-0.5">
            {report.contributions.map((contribution, index) => (
              <li
                key={contribution.playerId}
                className={`flex items-center justify-between gap-2 rounded-sm px-1.5 py-0.5 text-[9px] ${
                  index === 0 ? "bg-(--accent)/10 font-semibold text-(--accent)" : "text-(--mid)"
                }`}
              >
                <span>
                  {index === 0 && <Sparkles size={9} className="mr-0.5 inline" />}
                  {contribution.playerName}
                </span>
                <span>
                  {contribution.points}pt / {contribution.cards}枚
                </span>
              </li>
            ))}
            {report.contributions.length === 0 && (
              <li className="text-[9px] text-(--mid)">貢献カードなし（引いた人が受取）。</li>
            )}
          </ul>
        </section>

        <section>
          <h3 className="text-[9px] font-medium text-(--mid)">リスクカード</h3>
          <ul className="mt-1 space-y-1">
            {report.risks.map((card, index) => (
              <li
                key={`${card.title}-${index}`}
                className="rounded-sm border border-(--border) bg-(--paper) px-2 py-1"
              >
                <span className="text-[10px] font-medium">{card.title}</span>
                <span className="ml-2 text-[8px] text-(--mid)">{card.description}</span>
              </li>
            ))}
            {report.risks.length === 0 && (
              <li className="text-[9px] text-(--mid)">リスクカードは引かれませんでした。</li>
            )}
          </ul>
        </section>

        {added.length > 0 && (
          <p className="text-[9px] text-(--mid)">
            追加要求: {added.map(([, label, value]) => `${label}+${value}`).join(" / ")}
          </p>
        )}

        {report.unmet && (
          <p className="flex items-center gap-1 rounded-sm border border-(--danger)/50 bg-(--danger)/10 px-2 py-1 text-[9px] text-(--danger)">
            <AlertTriangle size={11} />
            リスク未吸収: 負債 +{report.debt}
          </p>
        )}
      </div>
    </Modal>
  );
}
