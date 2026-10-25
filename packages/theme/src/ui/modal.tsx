import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

import { IconButton } from "./icon-button";
import { cx } from "./cx";

export interface ModalProps {
  open?: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  align?: "center" | "bottom";
  closeLabel?: string;
  ariaLabel?: string;
  hideCloseButton?: boolean;
  className?: string;
  bodyClassName?: string;
  testId?: string;
}

export function Modal({
  open = true,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  align = "center",
  closeLabel = "閉じる",
  ariaLabel,
  hideCloseButton = false,
  className,
  bodyClassName,
  testId,
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => panelRef.current?.focus());

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      data-testid={testId}
      className={cx("ui-modal-overlay", align === "bottom" && "ui-modal-overlay--bottom")}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ? undefined : ariaLabel}
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cx("ui-modal", `ui-modal--${size}`, className)}
      >
        {(title || !hideCloseButton) && (
          <div className="ui-modal__header">
            <div className="ui-modal__heading">
              {title && (
                <h2 id={titleId} className="ui-modal__title">
                  {title}
                </h2>
              )}
              {description && <p className="ui-modal__description">{description}</p>}
            </div>
            {!hideCloseButton && (
              <IconButton label={closeLabel} size="icon-sm" onClick={onClose}>
                <X size={14} />
              </IconButton>
            )}
          </div>
        )}
        <div className={cx("ui-modal__body", bodyClassName)}>{children}</div>
        {footer && <div className="ui-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
