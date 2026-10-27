import type { ReactNode } from "react";

import { cx } from "./cx";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx("ui-switch", checked && "ui-switch--on", className)}
    >
      <span className="ui-switch__track" aria-hidden="true">
        <span className="ui-switch__thumb" />
      </span>
      {(label || description) && (
        <span className="ui-switch__text">
          {label && <span className="ui-switch__label">{label}</span>}
          {description && <span className="ui-switch__description">{description}</span>}
        </span>
      )}
    </button>
  );
}
