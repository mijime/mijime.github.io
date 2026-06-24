import type { DueBadgeInfo } from "../lib/badges";

interface Props {
  due: DueBadgeInfo;
}

export function DueBadge({ due }: Props) {
  if (due.kind === "none") return null;
  if (due.kind === "overdue") {
    return (
      <span className="bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 shrink-0 border border-rose-200 dark:border-rose-900/30">
        <span>⚠</span>
        超過
      </span>
    );
  }
  if (due.kind === "today") {
    return (
      <span className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 shrink-0 border border-amber-200 dark:border-amber-900/30 animate-pulse">
        <span>🔔</span>
        今日
      </span>
    );
  }
  return (
    <span className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0">
      あと {due.daysFromNow} 日
    </span>
  );
}
