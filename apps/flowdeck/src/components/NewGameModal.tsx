import { useState } from "react";
import { Dices } from "lucide-react";
import { Button, Modal, SectionLabel, SegmentedControl } from "@mijime/theme/ui";
import { GAME_LENGTH_OPTIONS } from "../engine/rules/balance";

interface Props {
  currentDays: number;
  currentAiCount: number;
  onClose: () => void;
  onStart: (days: number, aiCount: number) => void;
}

const AI_OPTIONS = [3, 4, 5] as const;

export function NewGameModal({ currentDays, currentAiCount, onClose, onStart }: Props) {
  const [days, setDays] = useState(currentDays);
  const [aiCount, setAiCount] = useState(Math.max(3, Math.min(5, currentAiCount)));

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
          <Button variant="primary" size="sm" onClick={() => onStart(days, aiCount)}>
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

        <p className="flex items-center gap-1 rounded-sm border border-(--border) bg-(--grid)/40 px-3 py-2 text-[9px] text-(--mid)">
          <Dices size={12} className="text-(--accent)" />{" "}
          名前・タスクは開始時にランダム。チームメイトは標準、タスクの得損は標準（±10%）で固定
        </p>
      </div>
    </Modal>
  );
}
