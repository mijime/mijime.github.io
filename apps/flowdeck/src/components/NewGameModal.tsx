import { useState } from "react";
import { Dices } from "lucide-react";
import { Button, Modal, SectionLabel, SegmentedControl } from "@mijime/theme/ui";
import { GAME_LENGTH_OPTIONS } from "../engine/rules/balance";
import { AI_PROFILE_OPTIONS } from "../engine/ai/profiles";
import type { AiProfile } from "../engine/types";

interface Props {
  currentDays: number;
  currentAiCount: number;
  currentSwing: number;
  currentAiProfile: AiProfile;
  onClose: () => void;
  onStart: (days: number, aiCount: number, generationSwing: number, aiProfile: AiProfile) => void;
}

const AI_OPTIONS = [3, 4, 5] as const;
const SWING_OPTIONS = [
  { value: 0, label: "安定", hint: "得損なし" },
  { value: 0.1, label: "標準", hint: "±10%" },
  { value: 0.2, label: "波乱", hint: "±20%" },
] as const;

export function NewGameModal({
  currentDays,
  currentAiCount,
  currentSwing,
  currentAiProfile,
  onClose,
  onStart,
}: Props) {
  const [days, setDays] = useState(currentDays);
  const [aiCount, setAiCount] = useState(Math.max(3, Math.min(5, currentAiCount)));
  const [swing, setSwing] = useState(currentSwing);
  const [aiProfile, setAiProfile] = useState<AiProfile>(currentAiProfile);

  return (
    <Modal
      open
      onClose={onClose}
      title="新しいゲーム"
      size="lg"
      align="bottom"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onStart(days, aiCount, swing, aiProfile)}
          >
            この設定で開始
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-[11px]">
        <section>
          <SectionLabel className="mb-1.5 block">日数</SectionLabel>
          <SegmentedControl
            ariaLabel="日数"
            value={days}
            onChange={setDays}
            options={GAME_LENGTH_OPTIONS.map((option) => ({ value: option, label: `${option}日` }))}
          />
        </section>

        <section>
          <SectionLabel className="mb-1.5 block">メンバー人数</SectionLabel>
          <SegmentedControl
            ariaLabel="メンバー人数"
            value={aiCount}
            onChange={setAiCount}
            options={AI_OPTIONS.map((option) => ({ value: option, label: `${option}人` }))}
          />
        </section>

        <section>
          <SectionLabel className="mb-1.5 block">チームメイト</SectionLabel>
          <SegmentedControl
            ariaLabel="チームメイト"
            value={aiProfile}
            onChange={setAiProfile}
            options={AI_PROFILE_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
              hint: option.hint,
            }))}
            className="w-full [&>button]:flex-1"
          />
        </section>

        <section>
          <SectionLabel className="mb-1.5 block">タスクの得損</SectionLabel>
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

        <p className="flex items-center gap-1 rounded-sm border border-(--border) bg-(--grid)/40 px-3 py-2 text-[9px] text-(--mid)">
          <Dices size={12} className="text-(--accent)" />{" "}
          名前・タスクは開始時にランダム。性格はチームメイト設定に従う
        </p>
      </div>
    </Modal>
  );
}
