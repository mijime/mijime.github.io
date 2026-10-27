import type { ReactNode } from "react";

import { cx } from "./cx";

export interface TooltipProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ label, children, className }: TooltipProps) {
  return (
    <span className={cx("ui-tooltip", className)} data-tooltip={label}>
      {children}
    </span>
  );
}
