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
} from "lucide-react";
import { Button, Modal, SectionLabel, SegmentedControl } from "@mijime/theme/ui";
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

const noop = () => {};

function ChoiceRow<T extends number>({
  label,
  options,
  value,
  suffix,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  suffix: string;
  onChange: (value: T) => void;
}) {
  return (
    <section>
      <SectionLabel className="mb-1 block">{label}</SectionLabel>
      <SegmentedControl
        ariaLabel={label}
        value={value}
        onChange={onChange}
        options={options.map((option) => ({ value: option, label: `${option}${suffix}` }))}
      />
    </section>
  );
}

export function IntroScreen({ onStart, onClose, review = false }: Props) {
  const [days, setDays] = useState<10 | 20 | 30>(10);
  const [aiCount, setAiCount] = useState<3 | 4 | 5>(4);
  const [swing, setSwing] = useState(0.1);

  return (
    <Modal
      open
      onClose={onClose ?? noop}
      title={
        <span className="flex items-center gap-1.5 text-base">
          <Sparkles size={14} className="text-(--accent)" /> LLMとエージェントのプロジェクト
        </span>
      }
      size="lg"
      align="bottom"
      hideCloseButton={!review}
      footer={
        review ? (
          <Button variant="primary" size="sm" onClick={onClose}>
            閉じる <ArrowRight size={12} />
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={() => onStart?.(days, aiCount, swing)}>
            <Play size={12} /> プロジェクトを開始
          </Button>
        )
      }
    >
      <div className="space-y-3">
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
            <SectionLabel className="mb-1 block">タスクの得損</SectionLabel>
            <SegmentedControl
              ariaLabel="タスクの得損"
              value={swing}
              onChange={setSwing}
              options={SWING_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
                hint: option.hint,
              }))}
              className="w-full [&>button]:flex-1"
            />
          </section>
        )}
      </div>
    </Modal>
  );
}
