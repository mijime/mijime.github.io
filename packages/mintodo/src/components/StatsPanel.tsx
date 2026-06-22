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
    <div
      className="absolute bottom-4 right-4 z-10 p-4 rounded pointer-events-auto min-w-[160px]"
      style={{ background: "var(--toolbar-bg)", border: "1px solid var(--border)" }}
    >
      <h3 className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--mid)" }}>
        進捗ステータス
      </h3>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs" style={{ color: "var(--mid)" }}>
          完了タスク
        </span>
        <span className="text-sm font-bold" style={{ color: "var(--ink)" }}>
          {stats.completed}/{stats.total}
        </span>
      </div>
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ background: "var(--grid)" }}
      >
        <div
          className="h-full transition-all duration-300"
          style={{ background: "var(--terra)", width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
