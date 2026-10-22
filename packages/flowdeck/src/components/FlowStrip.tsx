import { AlertTriangle, CheckCircle2, Clock3, Hourglass, Layers } from "lucide-react";
import type { GameState } from "../engine/types";
import { LANE_LABEL } from "./ui";

const ACTIVE_LANES = ["inbox", "wip", "test"] as const;

export function FlowStrip({ state }: { state: GameState }) {
  const done = state.tasks.filter((task) => task.lane === "done");
  const active = state.tasks.filter(
    (task) => task.lane === "inbox" || task.lane === "wip" || task.lane === "test",
  );
  const leadTimes = done
    .filter((task) => task.acquiredDay !== null)
    .map((task) => Math.max(1, (task.acquiredDay ?? state.day) - task.revealedDay + 1));
  const avgLead =
    leadTimes.length > 0 ? leadTimes.reduce((sum, value) => sum + value, 0) / leadTimes.length : 0;
  const counts = ACTIVE_LANES.map((lane) => ({
    lane,
    count: state.tasks.filter((task) => task.lane === lane).length,
  })).toSorted((a, b) => b.count - a.count);
  const bottleneck = counts[0]?.count ? counts[0].lane : null;
  const oldest = active.toSorted((a, b) => b.tokens - a.tokens)[0] ?? null;

  return (
    <section className="mx-auto mt-1 max-w-[1440px] px-2">
      <div className="game-flow flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm border border-(--border) bg-(--paper) px-2 py-1 text-[8px] text-(--mid)">
        <span className="inline-flex items-center gap-1">
          <Layers size={9} />
          <strong className="text-(--ink)">WIP {active.length}</strong>
        </span>
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 size={9} /> 完了 {done.length}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock3 size={9} /> 平均リードタイム {avgLead.toFixed(1)}日
        </span>
        <span className="inline-flex items-center gap-1">
          <AlertTriangle size={9} /> ボトルネック {bottleneck ? LANE_LABEL[bottleneck] : "なし"}
        </span>
        {oldest && (
          <span className="inline-flex items-center gap-1">
            <Hourglass size={9} /> 最古タスク {oldest.tokens}日
          </span>
        )}
      </div>
    </section>
  );
}
