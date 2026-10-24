import { AlertTriangle } from "lucide-react";

export function DebtWarning({ debt, limit }: { debt: number; limit: number }) {
  if (debt < limit) return null;
  const over = debt - limit;

  return (
    <div className="mx-auto mt-1 max-w-[1440px] px-2" role="status" aria-live="polite">
      <div className="flex items-center gap-2 rounded-sm border border-red-400/60 bg-red-500/10 px-2.5 py-1 text-[10px] text-red-700 dark:text-red-200">
        <AlertTriangle size={12} className="shrink-0 text-red-600 dark:text-red-300" />
        <span className="min-w-0">
          技術的負債が上限（{limit}）{over > 0 ? `を${over}枚超過` : "に到達"}
          しています。このまま終了すると失敗です。
        </span>
        <span className="ml-auto shrink-0 tabular-nums text-red-600 dark:text-red-300">
          {debt}/{limit}
        </span>
      </div>
    </div>
  );
}
