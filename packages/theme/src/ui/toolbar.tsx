import type { HTMLAttributes } from "react";

import { cx } from "./cx";

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "between";
  sticky?: boolean;
}

export function Toolbar({ align = "between", sticky = false, className, ...props }: ToolbarProps) {
  return (
    <div
      {...props}
      role={props.role ?? "toolbar"}
      className={cx(
        "ui-toolbar",
        `ui-toolbar--${align}`,
        sticky && "ui-toolbar--sticky",
        className,
      )}
    />
  );
}
