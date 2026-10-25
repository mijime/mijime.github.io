import type { ReactNode } from "react";

import { cx } from "./cx";

export interface StatChipProps {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "good" | "bad" | "warn";
  title?: string;
  className?: string;
}

export function StatChip({
  label,
  value,
  icon,
  tone = "neutral",
  title,
  className,
}: StatChipProps) {
  return (
    <span
      title={title}
      className={cx(
        "ui-stat",
        tone === "good" && "ui-stat--good",
        tone === "bad" && "ui-stat--bad",
        tone === "warn" && "ui-stat--warn",
        className,
      )}
    >
      {icon && <span className="ui-stat__icon">{icon}</span>}
      <span className="ui-stat__label">{label}</span>
      <span className="ui-stat__value">{value}</span>
    </span>
  );
}
