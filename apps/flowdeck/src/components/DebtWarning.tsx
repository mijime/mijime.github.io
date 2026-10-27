import { AlertTriangle } from "lucide-react";

export function DebtWarning({ debt, limit }: { debt: number; limit: number }) {
  if (debt < limit) return null;
  const over = debt - limit;

  return (
    <div className="mx-auto mt-1 max-w-[1440px] px-2" role="status" aria-live="polite">
      <div className="flex items-center gap-2 rounded-sm border border-(--danger)/50 bg-(--danger)/10 px-2.5 py-1 text-[10px] text-(--danger)">
        <AlertTriangle size={12} className="shrink-0 text-(--danger)" />
        <span className="min-w-0">
          技術的負債が上限（{limit}）{over > 0 ? `を${over}枚超過` : "に到達"}
          しています。このまま終了すると失敗です。
        </span>
        <span className="ml-auto shrink-0 tabular-nums text-(--danger)">
          {debt}/{limit}
        </span>
      </div>
    </div>
  );
}
