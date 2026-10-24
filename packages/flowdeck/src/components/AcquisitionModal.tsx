import { AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import type { AcquisitionReport } from "../engine/types";
import { CARD_LABEL, LevelStars, effectLabel } from "./ui";

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center">
      <div className="flow-slide w-full max-w-lg rounded-sm border border-(--border) bg-(--paper) shadow-2xl">
        <div className="border-b border-(--border) bg-(--toolbar-bg) px-4 py-3">
          <p className="text-[9px] tracking-[0.25em] text-(--mid)">
            TASK ACQUIRED / DAY {report.day}
          </p>
          <h2 className="serif mt-1 text-lg font-semibold">タスク獲得</h2>
          <p className="mt-1 text-[11px]">{report.taskTitle}</p>
          <p className="mt-1 text-[9px] text-(--mid)">
            獲得者（最多貢献）: <strong className="text-(--ink)">{report.recipientName}</strong>
            {report.pullerId !== report.recipientId && (
              <span className="ml-2">引いた人: {report.pullerName}</span>
            )}
          </p>
        </div>

        <div className="space-y-2.5 p-4 text-[10px]">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-sm border border-(--border) bg-(--paper) px-2 py-1.5">
              <span className="block text-[8px] text-(--mid)">企業価値</span>
              <span className="text-[15px] font-semibold text-emerald-700 dark:text-emerald-400">
                +{report.score}
              </span>
            </div>
            <div className="rounded-sm border border-(--border) bg-(--paper) px-2 py-1.5">
              <span className="block text-[8px] text-(--mid)">報酬カード（獲得者へ）</span>
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
                <span className="mt-0.5 block text-[8px] text-(--terra)">
                  {effectLabel(report.reward.effect)}
                </span>
              )}
            </div>
          </div>

          <section>
            <h3 className="text-[9px] font-medium text-(--mid)">貢献（点 → 枚数 → 最後）</h3>
            <ul className="mt-1 space-y-0.5">
              {report.contributions.map((contribution, index) => (
                <li
                  key={contribution.playerId}
                  className={`flex items-center justify-between gap-2 rounded-sm px-1.5 py-0.5 text-[9px] ${
                    index === 0 ? "bg-(--terra)/10 font-semibold text-(--terra)" : "text-(--mid)"
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
                <li className="text-[9px] text-(--mid)">貢献カードなし（引いた人が獲得）。</li>
              )}
            </ul>
          </section>

          <section>
            <h3 className="text-[9px] font-medium text-(--mid)">不確実カード</h3>
            <ul className="mt-1 space-y-1">
              {report.uncertainty.map((card, index) => (
                <li
                  key={`${card.title}-${index}`}
                  className="rounded-sm border border-(--border) bg-(--paper) px-2 py-1"
                >
                  <span className="text-[10px] font-medium">{card.title}</span>
                  <span className="ml-2 text-[8px] text-(--mid)">{card.description}</span>
                </li>
              ))}
              {report.uncertainty.length === 0 && (
                <li className="text-[9px] text-(--mid)">不確実カードは引かれませんでした。</li>
              )}
            </ul>
          </section>

          {added.length > 0 && (
            <p className="text-[9px] text-(--mid)">
              追加要求: {added.map(([, label, value]) => `${label}+${value}`).join(" / ")}
            </p>
          )}

          {report.unmet && (
            <p className="flex items-center gap-1 rounded-sm border border-red-400/50 bg-red-500/10 px-2 py-1 text-[9px] text-red-700 dark:text-red-300">
              <AlertTriangle size={11} />
              要求未達: 賄えなかった不確実カード分の負債（タスクは獲得）
            </p>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-(--border) pt-2 text-[9px] text-(--mid)">
            <span>
              この獲得の負債 +{report.debt} / 技術的負債 {report.teamDebt} / {debtLimit}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-sm bg-(--terra) px-3 py-1.5 text-[10px] font-medium text-white transition-opacity hover:opacity-90"
            >
              閉じる <ArrowRight size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
