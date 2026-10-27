import type { ReactNode } from "react";
import { X } from "lucide-react";

import { IconButton } from "./icon-button";
import { cx } from "./cx";

export type ToastTone = "info" | "success" | "warning" | "danger";

export interface ToastProps {
  tone?: ToastTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  className?: string;
}

export function Toast({
  tone = "info",
  title,
  children,
  action,
  onClose,
  closeLabel = "閉じる",
  className,
}: ToastProps) {
  return (
    <div role="status" className={cx("ui-toast", `ui-toast--${tone}`, className)}>
      <div className="ui-toast__body-wrap">
        {title && <div className="ui-toast__title">{title}</div>}
        {children && <div className="ui-toast__body">{children}</div>}
      </div>
      {action && <div className="ui-toast__action">{action}</div>}
      {onClose && (
        <IconButton label={closeLabel} size="icon-sm" onClick={onClose}>
          <X size={12} />
        </IconButton>
      )}
    </div>
  );
}

export interface ToastStackProps {
  children: ReactNode;
  className?: string;
}

export function ToastStack({ children, className }: ToastStackProps) {
  return (
    <div className={cx("ui-toast-stack", className)} aria-live="polite">
      {children}
    </div>
  );
}
