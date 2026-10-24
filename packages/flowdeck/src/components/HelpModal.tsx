import {
  ArrowRight,
  CalendarDays,
  CircleDot,
  Layers,
  MousePointerClick,
  Star,
  Trash2,
  X,
} from "lucide-react";
import type { TeamRules } from "../engine/types";
import { DEBT_SCORE_PENALTY } from "../engine/rules/balance";
import { FlowDiagram } from "./FlowDiagram";
import { LlmToken } from "./Token";
import { CARD_STYLE, CardTypeBadge } from "./ui";

function Step({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col items-center gap-0.5 text-center text-[8px] text-(--mid)">
      <span className="text-(--terra)">{icon}</span>
      {label}
    </span>
  );
}

export function HelpModal({ rules, onClose }: { rules: TeamRules; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center">
      <div className="flow-slide max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-sm border border-(--border) bg-(--paper) shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-(--border) bg-(--toolbar-bg) px-4 py-3">
          <h2 className="serif text-lg font-semibold">遊び方</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="rounded-sm border border-(--border) p-1 text-(--mid) hover:border-(--terra) hover:text-(--terra)"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4 text-[10px] text-(--mid)">
          <FlowDiagram />

          <section>
            <div className="flex items-center gap-1">
              <Step icon={<MousePointerClick size={12} />} label="カードを選ぶ" />
              <ArrowRight size={9} className="shrink-0 text-(--border)" />
              <Step icon={<Layers size={12} />} label="タスクに置く" />
              <ArrowRight size={9} className="shrink-0 text-(--border)" />
              <Step icon={<CircleDot size={12} />} label="3アクション" />
              <ArrowRight size={9} className="shrink-0 text-(--border)" />
              <Step icon={<CalendarDays size={12} />} label="日末 → 納期+1" />
            </div>
          </section>

          <section className="rounded-sm border border-(--border) bg-(--paper) p-2">
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  ["design", "設計"],
                  ["dev", "開発"],
                  ["test", "テスト"],
                ] as const
              ).map(([type, label]) => (
                <span
                  key={type}
                  className={`rounded-sm border px-1 py-1 text-center ${CARD_STYLE[type]}`}
                >
                  <CardTypeBadge type={type} size={11} className="mx-auto" />
                  <span className="mt-0.5 block text-[9px] font-medium">{label}</span>
                </span>
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[8px]">
              <span className="inline-flex items-center gap-1">
                <Star size={9} className="text-(--terra)" /> 報酬カード
              </span>
              <span className="inline-flex items-center gap-1">
                <Trash2 size={9} /> 廃棄は1アクション
              </span>
              <span className="inline-flex items-center gap-1">
                <LlmToken className="h-3.5 w-3.5" /> アクションなしで lv1
              </span>
            </div>
          </section>

          <section className="rounded-sm border border-(--border) bg-(--grid)/40 px-2.5 py-2">
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-(--ink)">
              <span>企業価値</span>
              <span className="text-(--mid)">−</span>
              <span>負債×{DEBT_SCORE_PENALTY}</span>
              <span className="text-(--mid)">=</span>
              <strong>見込み</strong>
            </div>
            <div className="mt-1 flex items-center justify-center gap-2 text-[8px]">
              <span>星1 {rules.starOne}</span>
              <span>星2 {rules.starTwo}</span>
              <span>星3 {rules.starThree}</span>
              <span className="text-red-600 dark:text-red-300">負債 {rules.debtLimit} で失敗</span>
            </div>
          </section>

          <section className="grid gap-1 sm:grid-cols-2">
            <p className="rounded-sm border border-(--border) px-2 py-1">
              各レーンは<strong className="text-(--ink)">同種カードのみ</strong>
              。LLMトークンはどのレーンにも置ける。
            </p>
            <p className="rounded-sm border border-(--border) px-2 py-1">
              獲得時にリスクカード。余剰で吸収し、超えた分は
              <strong className="text-(--ink)">企業価値-1</strong>。
            </p>
            <p className="rounded-sm border border-(--border) px-2 py-1">
              報酬は<strong className="text-(--ink)">貢献pt最多</strong>
              の人へ。同点は枚数、最後に置いた人。
            </p>
            <p className="rounded-sm border border-(--border) px-2 py-1">
              タスク報酬カードはデッキに残る間だけ企業価値。捨てるとスコアも消える。
            </p>
            <p className="rounded-sm border border-(--border) px-2 py-1">
              タスクの得損は開始時に選択。波乱ほど通常タスクの要求量が
              <strong className="text-(--ink)">0.8〜1.2倍</strong>に散らばる。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
