import { Button } from "@mijime/theme/ui";
import { useSaiflowState } from "../store";

export function SaveStatus({ onRetry }: { onRetry: () => void }) {
  const { saveStatus, lastSavedAt, saveError } = useSaiflowState();

  if (saveStatus === "idle") return null;

  if (saveStatus === "error") {
    return (
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="text-red-500" title={saveError ?? undefined}>
          保存に失敗
        </span>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          再試行
        </Button>
      </div>
    );
  }

  if (saveStatus === "dirty") {
    return <span className="text-[11px] opacity-40">未保存</span>;
  }

  if (saveStatus === "saving") {
    return <span className="text-[11px] opacity-40">保存中…</span>;
  }

  return (
    <span className="text-[11px] opacity-40 tabular-nums">
      保存済み
      {lastSavedAt
        ? ` ${lastSavedAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`
        : ""}
    </span>
  );
}
