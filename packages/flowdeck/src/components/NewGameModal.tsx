import { useState } from "react";
import { Dices, X } from "lucide-react";

interface Props {
  currentDays: number;
  currentAiCount: number;
  currentSwing: number;
  onClose: () => void;
  onStart: (days: number, aiCount: number, generationSwing: number) => void;
}

const SWING_OPTIONS = [
  { value: 0, label: "安定", hint: "得損なし" },
  { value: 0.1, label: "標準", hint: "±10%" },
  { value: 0.2, label: "波乱", hint: "±20%" },
] as const;

export function NewGameModal({
  currentDays,
  currentAiCount,
  currentSwing,
  onClose,
  onStart,
}: Props) {
  const [days, setDays] = useState(currentDays);
  const [aiCount, setAiCount] = useState(Math.max(3, Math.min(5, currentAiCount)));
  const [swing, setSwing] = useState(currentSwing);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center">
      <div className="flow-slide w-full max-w-lg rounded-sm border border-(--border) bg-(--paper) shadow-2xl">
        <div className="flex items-center justify-between border-b border-(--border) bg-(--toolbar-bg) px-4 py-3">
          <h2 className="serif text-lg font-semibold">新しいゲーム</h2>
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
            <p className="mb-1.5 text-[9px] text-(--mid)">メンバー人数</p>
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
          </section>

          <section>
            <p className="mb-1.5 text-[9px] text-(--mid)">タスクの得損</p>
            <div className="flex gap-1.5">
              {SWING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSwing(option.value)}
                  className={`flex-1 rounded-sm border px-2 py-1.5 text-center ${
                    swing === option.value
                      ? "border-(--terra) bg-(--terra) text-white"
                      : "border-(--border) bg-(--paper) text-(--mid) hover:border-(--terra)/50"
                  }`}
                >
                  <span className="block text-[11px]">{option.label}</span>
                  <span className="block text-[7px] opacity-70">{option.hint}</span>
                </button>
              ))}
            </div>
          </section>

          <p className="flex items-center gap-1 rounded-sm border border-(--border) bg-(--grid)/40 px-3 py-2 text-[9px] text-(--mid)">
            <Dices size={12} className="text-(--terra)" /> 名前・性格・タスクは開始時にランダム
          </p>

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
              onClick={() => onStart(days, aiCount, swing)}
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
