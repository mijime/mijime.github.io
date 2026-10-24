import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  GitBranch,
  Play,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

interface Props {
  onStart?: (days: number, aiCount: number) => void;
  onClose?: () => void;
  review?: boolean;
}

const STEPS = [
  {
    eyebrow: "STORY",
    title: "LLMとエージェントの四半期",
    icon: Building2,
    body: (
      <ul className="list-disc space-y-1.5 pl-4">
        <li>舞台は、LLMとエージェントを売るSaaS企業。</li>
        <li>あなたは四半期のチームを任された。</li>
        <li>カンバンを流して、企業価値を伸ばそう。</li>
      </ul>
    ),
  },
  {
    eyebrow: "GOAL",
    title: "企業価値を最大化",
    icon: Star,
    body: (
      <ul className="list-disc space-y-1.5 pl-4">
        <li>
          <strong>企業価値</strong> = デッキのタスク報酬カード。
        </li>
        <li>
          <strong>技術的負債</strong>は1枚 -2点。上限で失敗。
        </li>
        <li>最終スコアで星が決まる。3つ星を目指そう。</li>
      </ul>
    ),
  },
  {
    eyebrow: "FLOW",
    title: "カンバンを流す",
    icon: GitBranch,
    body: (
      <ul className="list-disc space-y-1.5 pl-4">
        <li className="font-medium text-(--ink)">Backlog → 設計 → 開発 → テスト → Done</li>
        <li>手札のカードをタスクに置く。1手ずつ順番に。</li>
        <li>全員が終わったら日末。納期が1つ進む。</li>
      </ul>
    ),
  },
  {
    eyebrow: "TEAM",
    title: "仲間はランダム",
    icon: Users,
    body: (
      <ul className="list-disc space-y-1.5 pl-4">
        <li>仲間は3〜5人。名前と性格はランダム。</li>
        <li>
          <strong>仕上げ↔着手 / 得点↔整理 / 納期↔長期</strong>の3軸。
        </li>
        <li>チームの癖を読んで動こう。</li>
      </ul>
    ),
  },
] as const;

export function IntroScreen({ onStart, onClose, review = false }: Props) {
  const [step, setStep] = useState(0);
  const [days, setDays] = useState(10);
  const [aiCount, setAiCount] = useState(4);
  const lastStep = review ? STEPS.length - 1 : STEPS.length;
  const last = step === lastStep;
  const current = step < STEPS.length ? STEPS[step] : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-black/55 p-3 sm:items-center">
      <div className="flow-slide w-full max-w-xl rounded-sm border border-(--border) bg-(--paper) shadow-2xl">
        <div className="flex items-center justify-between border-b border-(--border) bg-(--toolbar-bg) px-4 py-2.5">
          <p className="flex items-center gap-1 text-[9px] tracking-[0.25em] text-(--mid)">
            <Sparkles size={11} className="text-(--terra)" /> FLOWDECK / ONBOARDING
          </p>
          {!review && (
            <button
              type="button"
              onClick={() => setStep(STEPS.length)}
              className="text-[9px] text-(--mid) underline-offset-2 hover:text-(--terra) hover:underline"
            >
              スキップ
            </button>
          )}
        </div>

        <div className="px-5 py-5">
          {current ? (
            <>
              <p className="text-[9px] tracking-[0.25em] text-(--terra)">{current.eyebrow}</p>
              <h1 className="serif mt-1 flex items-center gap-2 text-xl font-semibold">
                <current.icon size={18} className="text-(--terra)" />
                {current.title}
              </h1>
              <div className="mt-3 space-y-2 text-[11px] leading-relaxed text-(--mid)">
                {current.body}
              </div>
            </>
          ) : (
            <>
              <p className="text-[9px] tracking-[0.25em] text-(--terra)">START</p>
              <h1 className="serif mt-1 flex items-center gap-2 text-xl font-semibold">
                <Play size={18} className="text-(--terra)" /> 四半期を始める
              </h1>

              <div className="mt-4 space-y-3 text-[11px]">
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

                <p className="rounded-sm border border-(--border) bg-(--grid)/40 px-3 py-2 text-[9px] text-(--mid)">
                  名前・性格・タスク名はランダム。同じシードなら同じ展開になります。
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-(--border) px-4 py-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: review ? STEPS.length : STEPS.length + 1 }, (_, index) => (
              <span
                key={index}
                className={`h-1.5 w-1.5 rounded-full ${
                  index === step ? "bg-(--terra)" : "bg-(--border)"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((value) => Math.max(0, value - 1))}
                className="inline-flex items-center gap-1 rounded-sm border border-(--border) px-2.5 py-1.5 text-[10px] text-(--mid) hover:border-(--terra) hover:text-(--terra)"
              >
                <ArrowLeft size={11} /> 戻る
              </button>
            )}
            {last ? (
              review ? (
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
                  onClick={() => onStart?.(days, aiCount)}
                  className="inline-flex items-center gap-1 rounded-sm bg-(--terra) px-4 py-1.5 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
                >
                  <Play size={12} /> 四半期を開始
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => setStep((value) => value + 1)}
                className="inline-flex items-center gap-1 rounded-sm bg-(--terra) px-3 py-1.5 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
              >
                次へ <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
