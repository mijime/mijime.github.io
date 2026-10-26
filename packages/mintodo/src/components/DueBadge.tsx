import { Badge } from "@mijime/theme/ui";
import type { DueBadgeInfo } from "../lib/badges";

interface Props {
  due: DueBadgeInfo;
}

export function DueBadge({ due }: Props) {
  if (due.kind === "none") return null;
  if (due.kind === "overdue") {
    return (
      <Badge tone="danger" className="gap-1 font-bold">
        <span>⚠</span>
        超過
      </Badge>
    );
  }
  if (due.kind === "today") {
    return (
      <Badge tone="warning" className="animate-pulse gap-1 font-bold">
        <span>🔔</span>
        今日
      </Badge>
    );
  }
  return (
    <Badge tone="neutral" className="font-medium">
      あと {due.daysFromNow} 日
    </Badge>
  );
}
