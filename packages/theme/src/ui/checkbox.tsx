import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

import { cx } from "./cx";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  description?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label className={cx("ui-check", className)} htmlFor={inputId}>
      <input ref={ref} id={inputId} type="checkbox" className="ui-check__input" {...props} />
      {(label || description) && (
        <span className="ui-check__text">
          {label && <span className="ui-check__label">{label}</span>}
          {description && <span className="ui-check__description">{description}</span>}
        </span>
      )}
    </label>
  );
});
