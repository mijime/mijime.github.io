import type { ReactNode } from "react";

import { cx } from "./cx";

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string | number> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div className={cx("ui-segmented", className)} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={option.value === value}
          disabled={option.disabled}
          onClick={() => onChange(option.value)}
          className="ui-segmented__item"
        >
          <span>{option.label}</span>
          {option.hint && <span className="ui-segmented__hint">{option.hint}</span>}
        </button>
      ))}
    </div>
  );
}
