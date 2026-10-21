import { useState } from "react";
import { Dices, X } from "lucide-react";

interface Props {
  currentDays: number;
  currentAiCount: number;
  onClose: () => void;
  onStart: (days: number, aiCount: number) => void;
}

export function NewGameModal({ currentDays, currentAiCount, onClose, onStart }: Props) {
  const [days, setDays] = useState(currentDays);
  const [aiCount, setAiCount] = useState(Math.max(3, Math.min(5, currentAiCount)));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center">
      <div className="flow-slide w-full max-w-lg rounded-sm border border-(--border) bg-(--paper) shadow-2xl">
        <div className="flex items-center justify-between border-b border-(--border) bg-(--toolbar-bg) px-4 py-3">
          <div>
            <p className="text-[9px] tracking-[0.25em] text-(--mid)">NEW GAME / RANDOM TEAM</p>
            <h2 className="serif mt-1 text-lg font-semibold">新しいゲーム</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="rounded-sm border border-(--border) p-1 text-(--mid) hover:border-(--terra) hover:text-(--terra)"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4 p-4 text-[11px]">
          <section>
            <p className="mb-1.5 text-[9px] text-(--mid)">日数</p>
            <div className="flex gap-1.5">
              {[10, 20, 30].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDays(option)}
                  className={`rounded-sm border px-3 py-1.5 text-[11px] ${
                    days === option
                      ? "border-(--terra) bg-(--terra) text-white"
                      : "border-(--border) bg-(--paper) text-(--mid) hover:border-(--terra)/50"
                  }`}
                >
                  {option}日
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-1.5 text-[9px] text-(--mid)">チーム人数</p>
            <div className="flex gap-1.5">
              {[3, 4, 5].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAiCount(option)}
                  className={`rounded-sm border px-3 py-1.5 text-[11px] ${
                    aiCount === option
                      ? "border-(--terra) bg-(--terra) text-white"
                      : "border-(--border) bg-(--paper) text-(--mid) hover:border-(--terra)/50"
                  }`}
                >
                  {option}人
                </button>
              ))}
            </div>
            <p className="mt-1 text-[9px] text-(--mid)">合計 {aiCount + 1}人</p>
          </section>

          <section className="rounded-sm border border-(--border) bg-(--grid)/40 px-3 py-2 text-[10px] text-(--mid)">
            <p className="flex items-center gap-1 text-(--ink)">
              <Dices size={12} />{" "}
              名前・アイコン・性格・タスク名は開始時にランダム。3つの符号付きの重みで決まります
            </p>
            <p className="mt-1">
              仕上げ↔着手、得点↔整理、納期↔長期のバランスが、メンバーごとに違う形で決まります。
            </p>
          </section>

          <div className="flex justify-end gap-2 border-t border-(--border) pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-(--border) px-3 py-1.5 text-[10px] text-(--mid) hover:border-(--terra) hover:text-(--terra)"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => onStart(days, aiCount)}
              className="rounded-sm bg-(--terra) px-4 py-1.5 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
            >
              ランダム編成で開始
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
