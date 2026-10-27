import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "./cx";

export interface ListRowProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  active?: boolean;
  leading?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}

export function ListRow({
  active = false,
  leading,
  title,
  description,
  meta,
  actions,
  className,
  ...props
}: ListRowProps) {
  return (
    <div {...props} className={cx("ui-list-row", active && "ui-list-row--active", className)}>
      {leading && <div className="ui-list-row__leading">{leading}</div>}
      <div className="ui-list-row__content">
        <div className="ui-list-row__title">{title}</div>
        {description && <div className="ui-list-row__description">{description}</div>}
        {meta}
      </div>
      {actions && <div className="ui-list-row__actions">{actions}</div>}
    </div>
  );
}
