import type { HTMLAttributes } from "react";

import { cx } from "./cx";

export function SectionLabel({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className={cx("ui-label", className)} />;
}
