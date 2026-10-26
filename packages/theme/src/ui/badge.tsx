import type { HTMLAttributes } from "react";

import { cx } from "./cx";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "violet"
  | "blue"
  | "amber"
  | "red"
  | "green"
  | "teal"
  | "sky"
  | "indigo"
  | "orange"
  | "lime"
  | "rose"
  | "fuchsia"
  | "cyan";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: "sm" | "md";
}

export function Badge({ tone = "neutral", size = "sm", className, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cx("ui-badge", `ui-badge--${tone}`, size === "md" && "ui-badge--md", className)}
    />
  );
}
