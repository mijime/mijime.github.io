import type { HTMLAttributes } from "react";

import { cx } from "./cx";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "paper" | "inset";
  floating?: boolean;
}

export function Panel({ tone = "paper", floating = false, className, ...props }: PanelProps) {
  return (
    <div
      {...props}
      className={cx(
        "ui-panel",
        tone === "inset" && "ui-panel--inset",
        floating && "ui-panel--floating",
        className,
      )}
    />
  );
}
