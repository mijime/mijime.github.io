import { useState } from "react";
import {
  ArrowRight,
  Building2,
  Gauge,
  Gem,
  Play,
  Sparkles,
  Star,
  Timer,
  TrendingDown,
  Users,
  X,
} from "lucide-react";
import { FlowDiagram } from "./FlowDiagram";

interface Props {
  onStart?: (days: number, aiCount: number, generationSwing: number) => void;
  onClose?: () => void;
  review?: boolean;
}

const DAY_OPTIONS = [10, 20, 30] as const;
const AI_OPTIONS = [3, 4, 5] as const;
const SWING_OPTIONS = [
  { value: 0, label: "安定", hint: "得損なし" },
  { value: 0.1, label: "標準", hint: "±10%" },
  { value: 0.2, label: "波乱", hint: "±20%" },
] as const;

function ChoiceRow<T extends number>({
  label,
  options,
  value,
  suffix,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: number;
  suffix: string;
  onChange: (value: T) => void;
}) {
  return (
    <section>
      <p className="mb-1 text-[9px] text-(--mid)">{label}</p>
      <div className="flex gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-sm border px-3 py-1.5 text-[11px] ${
              value === option
                ? "border-(--terra) bg-(--terra) text-white"
                : "border-(--border) bg-(--paper) text-(--mid) hover:border-(--terra)/50"
            }`}
          >
            {option}
            {suffix}
          </button>
        ))}
      </div>
    </section>
  );
}

export function IntroScreen({ onStart, onClose, review = false }: Props) {
  const [days, setDays] = useState(10);
  const [aiCount, setAiCount] = useState(4);
  const [swing, setSwing] = useState(0.1);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-black/55 p-3 sm:items-center">
      <div className="flow-slide w-full max-w-xl rounded-sm border border-(--border) bg-(--paper) shadow-2xl">
        <div className="flex items-center justify-between border-b border-(--border) bg-(--toolbar-bg) px-4 py-2.5">
          <h1 className="serif flex items-center gap-1.5 text-base font-semibold">
            <Sparkles size={14} className="text-(--terra)" /> LLMとエージェントのプロジェクト
          </h1>
          {review && (
            <button
              type="button"
              onClick={onClose}
              aria-label="閉じる"
              className="rounded-sm border border-(--border) p-1 text-(--mid) hover:border-(--terra) hover:text-(--terra)"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="space-y-3 px-4 py-4">
          <p className="text-[11px] leading-relaxed text-(--mid)">
            LLMとエージェントを売るSaaS企業のプロジェクト。カンバンを流して企業価値を伸ばす。
          </p>

          <FlowDiagram />

          <div className="grid grid-cols-3 gap-1">
            <div className="rounded-sm border border-(--border) bg-(--paper) px-2 py-1.5">
              <span className="flex items-center gap-1 text-[8px] text-(--mid)">
                <Building2 size={9} /> 企業価値
              </span>
              <span className="block text-[10px] font-medium">デッキの報酬</span>
            </div>
            <div className="rounded-sm border border-(--border) bg-(--paper) px-2 py-1.5">
              <span className="flex items-center gap-1 text-[8px] text-(--mid)">
                <TrendingDown size={9} /> 技術的負債
              </span>
              <span className="block text-[10px] font-medium">1枚 -2</span>
            </div>
            <div className="rounded-sm border border-(--border) bg-(--paper) px-2 py-1.5">
              <span className="flex items-center gap-1 text-[8px] text-(--mid)">
                <Star size={9} /> 評価
              </span>
              <span className="block text-[10px] font-medium">星3まで</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm border border-(--border) bg-(--grid)/40 px-2.5 py-1.5 text-[9px] text-(--mid)">
            <span className="inline-flex items-center gap-1 text-(--ink)">
              <Users size={10} /> あなた＋メンバー3〜5人
            </span>
            <span className="inline-flex items-center gap-1" title="仕上げ ↔ 着手">
              <Gauge size={9} /> 仕上げ
            </span>
            <span className="inline-flex items-center gap-1" title="報酬 ↔ 整理">
              <Gem size={9} /> 報酬
            </span>
            <span className="inline-flex items-center gap-1" title="納期 ↔ 長期">
              <Timer size={9} /> 納期
            </span>
          </div>

          {!review && (
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceRow
                label="日数"
                options={DAY_OPTIONS}
                value={days}
                suffix="日"
                onChange={setDays}
              />
              <ChoiceRow
                label="メンバー人数"
                options={AI_OPTIONS}
                value={aiCount}
                suffix="人"
                onChange={setAiCount}
              />
            </div>
          )}

          {!review && (
            <section>
              <p className="mb-1 text-[9px] text-(--mid)">タスクの得損</p>
              <div className="grid grid-cols-3 gap-1.5">
                {SWING_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSwing(option.value)}
                    className={`rounded-sm border px-2 py-1.5 text-center ${
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
          )}
        </div>

        <div className="flex items-center justify-end gap-1.5 border-t border-(--border) px-4 py-3">
          {review ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-sm bg-(--terra) px-4 py-1.5 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
            >
              閉じる <ArrowRight size={12} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onStart?.(days, aiCount, swing)}
              className="inline-flex items-center gap-1 rounded-sm bg-(--terra) px-4 py-1.5 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
            >
              <Play size={12} /> プロジェクトを開始
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
