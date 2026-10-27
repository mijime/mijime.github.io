import type { CSSProperties } from "react";

import { cx } from "./cx";

export interface SkeletonProps {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  rounded?: boolean;
  className?: string;
}

export function Skeleton({
  width = "100%",
  height = "1rem",
  rounded = true,
  className,
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cx("ui-skeleton", rounded && "ui-skeleton--rounded", className)}
      style={{ width, height }}
    />
  );
}
