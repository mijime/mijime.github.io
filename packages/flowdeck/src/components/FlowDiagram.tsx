import { Fragment } from "react";
import { ArrowRight } from "lucide-react";
import { LANE_LABEL, LaneIcon } from "./ui";

const LANES = ["open", "inbox", "wip", "test", "done"] as const;

const LANE_TONE: Record<(typeof LANES)[number], string> = {
  open: "text-sky-600 dark:text-sky-300",
  inbox: "text-violet-600 dark:text-violet-300",
  wip: "text-blue-600 dark:text-blue-300",
  test: "text-amber-600 dark:text-amber-300",
  done: "text-emerald-600 dark:text-emerald-300",
};

const LANE_NOTE: Record<(typeof LANES)[number], string> = {
  open: "未着手",
  inbox: "設計",
  wip: "開発",
  test: "テスト",
  done: "完了",
};

export function FlowDiagram() {
  return (
    <div className="flex items-stretch gap-0.5" aria-label="Backlog から Done までの流れ">
      {LANES.map((lane, index) => (
        <Fragment key={lane}>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-sm border border-(--border) bg-(--paper) px-1 py-1.5 text-center">
            <LaneIcon lane={lane} size={12} className={LANE_TONE[lane]} />
            <span className="text-[7.5px] font-medium leading-tight">{LANE_LABEL[lane]}</span>
            <span className="text-[7px] leading-tight text-(--mid)">{LANE_NOTE[lane]}</span>
          </div>
          {index < LANES.length - 1 && (
            <ArrowRight size={9} className="mt-3 shrink-0 text-(--mid)" aria-hidden="true" />
          )}
        </Fragment>
      ))}
    </div>
  );
}
