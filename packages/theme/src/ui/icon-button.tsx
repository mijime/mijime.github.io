import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Button } from "./button";
import type { ButtonVariant } from "./button";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "icon" | "icon-sm";
}

export function IconButton({
  label,
  children,
  variant = "ghost",
  size = "icon",
  ...props
}: IconButtonProps) {
  return (
    <Button aria-label={label} title={label} variant={variant} size={size} {...props}>
      {children}
    </Button>
  );
}
