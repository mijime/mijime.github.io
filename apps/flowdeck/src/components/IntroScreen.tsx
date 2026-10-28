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
import { GAME_LENGTH_OPTIONS, type GameLength } from "../engine/rules/balance";
import { FlowDiagram } from "./FlowDiagram";

interface Props {
  onStart?: (days: number, aiCount: number) => void;
  onClose?: () => void;
  review?: boolean;
}

const AI_OPTIONS = [3, 4, 5] as const;

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
  const [days, setDays] = useState<GameLength>(10);
  const [aiCount, setAiCount] = useState<3 | 4 | 5>(4);

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
          <Button variant="primary" size="sm" onClick={() => onStart?.(days, aiCount)}>
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
              options={GAME_LENGTH_OPTIONS}
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
          <p className="rounded-sm border border-(--border) bg-(--grid)/40 px-2.5 py-1.5 text-[9px] text-(--mid)">
            チームメイトは標準、タスクの得損は標準（±10%）で固定。効果カードの組み合わせで追加作業を狙う。レリックタスクは高難度。
          </p>
        )}
      </div>
    </Modal>
  );
}
