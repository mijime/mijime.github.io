import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "icon" | "icon-sm";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", type = "button", className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      {...props}
      className={cx("ui-btn", `ui-btn--${variant}`, `ui-btn--${size}`, className)}
    />
  );
});
