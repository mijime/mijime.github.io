import type { HTMLAttributes } from "react";

import { cx } from "./cx";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "raised" | "surface" | "inset";
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
}

export function Card({
  tone = "raised",
  padding = "md",
  interactive = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={cx(
        "ui-card",
        `ui-card--${tone}`,
        `ui-card--p-${padding}`,
        interactive && "ui-card--interactive",
        className,
      )}
    />
  );
}
