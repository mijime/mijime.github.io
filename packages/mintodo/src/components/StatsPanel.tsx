import { useMemo } from "react";
import { useMindStore } from "../hooks/use-mind-store";

export function StatsPanel() {
  const { state } = useMindStore();
  const stats = useMemo(() => {
    const all = Object.values(state.nodes).filter((n) => !n.isRoot);
    const total = all.length;
    const completed = all.filter((n) => n.completed).length;
    return { completed, total };
  }, [state.nodes]);
  const percent = stats.total === 0 ? 0 : (stats.completed / stats.total) * 100;

  return (
    <div className="absolute bottom-4 right-4 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 pointer-events-auto min-w-[160px]">
      <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
        進捗ステータス
      </h3>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-500 dark:text-slate-400">完了タスク</span>
        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
          {stats.completed}/{stats.total}
        </span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
        <div
          className="bg-indigo-600 h-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
