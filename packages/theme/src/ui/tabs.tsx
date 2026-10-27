import type { ReactNode } from "react";

import { cx } from "./cx";

export interface TabOption<T extends string | number> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  testId?: string;
}

export interface TabsProps<T extends string | number> {
  options: ReadonlyArray<TabOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  size?: "sm" | "md";
  className?: string;
}

export function Tabs<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
  className,
}: TabsProps<T>) {
  return (
    <div
      className={cx("ui-tabs", size === "sm" && "ui-tabs--sm", className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="tab"
            data-testid={option.testId}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className="ui-tabs__item"
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
