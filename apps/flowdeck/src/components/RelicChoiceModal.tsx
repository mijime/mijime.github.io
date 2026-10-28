import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button, Modal } from "@mijime/theme/ui";
import { RELIC_CAP, RELIC_BY_ID } from "../data/relics";
import type { PendingRelicChoice } from "../engine/types";

interface Props {
  choice: PendingRelicChoice;
  onChoose: (relicId: string, discardRelicId?: string) => void;
}

export function RelicChoiceModal({ choice, onChoose }: Props) {
  const [selected, setSelected] = useState<string | null>(choice.options[0] ?? null);
  const [discard, setDiscard] = useState<string | null>(null);
  const needsReplace = choice.replace;
  const canChoose = selected !== null && (!needsReplace || discard !== null);

  return (
    <Modal
      open
      onClose={() => undefined}
      hideCloseButton
      title="チームレリック"
      description={`${choice.taskTitle} 完了`}
      size="lg"
      align="bottom"
      footer={
        <Button
          variant="primary"
          size="sm"
          disabled={!canChoose}
          onClick={() => {
            if (selected) onChoose(selected, discard ?? undefined);
          }}
        >
          このレリックを獲得
        </Button>
      }
    >
      <div className="space-y-3 text-[10px]">
        <p className="text-(--mid)">
          3つから1つ選ぶ。レリックはチーム全員に効く。上限 {RELIC_CAP} 個。
        </p>

        <div className="grid gap-2 sm:grid-cols-3">
          {choice.options.map((id) => {
            const relic = RELIC_BY_ID.get(id);
            const active = selected === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelected(id)}
                className={`rounded-sm border px-2 py-2 text-left transition-colors ${
                  active
                    ? "border-(--accent) bg-(--accent)/10 ring-1 ring-(--accent)/40"
                    : "border-(--border) bg-(--paper) hover:border-(--accent)/50"
                }`}
              >
                <span className="flex items-center gap-1 text-[11px] font-semibold text-(--ink)">
                  <Sparkles size={11} className="text-(--accent)" />
                  {relic?.name ?? id}
                </span>
                <span className="mt-1 block text-[8.5px] leading-relaxed text-(--mid)">
                  {relic?.description ?? ""}
                </span>
              </button>
            );
          })}
        </div>

        {needsReplace && (
          <section className="rounded-sm border border-(--danger)/40 bg-(--danger)/5 p-2">
            <h3 className="text-[9px] font-medium text-(--danger)">
              上限に達しています。交換で捨てるレリックを選択
            </h3>
            <div className="mt-1 flex flex-wrap gap-1">
              {choice.currentRelics.map((id) => {
                const relic = RELIC_BY_ID.get(id);
                const active = discard === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDiscard(id)}
                    className={`rounded-sm border px-1.5 py-0.5 text-[9px] ${
                      active
                        ? "border-(--danger) bg-(--danger)/15 font-semibold text-(--danger)"
                        : "border-(--border) text-(--mid) hover:border-(--danger)/50"
                    }`}
                  >
                    {relic?.name ?? id}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}
