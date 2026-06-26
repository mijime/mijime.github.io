import { useRef } from "react";
import { Check } from "lucide-react";
import { statusDotClass } from "../lib/badges";
import type { TaskStatus } from "../types";

const CLICK_DELAY_MS = 200;

interface Props {
  status: TaskStatus;
  dimmed?: boolean;
  testId?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  showCheckIcon?: boolean;
  className?: string;
}

export function StatusDot({
  status,
  dimmed = false,
  testId,
  onClick,
  onDoubleClick,
  showCheckIcon = false,
  className,
}: Props) {
  const baseClass = `w-2.5 h-2.5 rounded-full ${statusDotClass(status)} ${dimmed ? "opacity-40" : ""}`;
  const style = { boxShadow: "0 0 0 2px var(--paper), 0 0 0 3px var(--mid)" };
  const timerRef = useRef<number | null>(null);
  if (onClick) {
    return (
      <button
        type="button"
        data-testid={testId}
        aria-label={`status ${status} (click to advance, double-click to go back)`}
        onClick={(e) => {
          e.stopPropagation();
          if (timerRef.current !== null) window.clearTimeout(timerRef.current);
          timerRef.current = window.setTimeout(() => {
            timerRef.current = null;
            onClick();
          }, CLICK_DELAY_MS);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          onDoubleClick?.();
        }}
        className={`inline-flex items-center justify-center ${baseClass} cursor-pointer border-0 p-0 ${className ?? ""}`}
        style={style}
      >
        {showCheckIcon && status === "done" ? <Check size={10} /> : null}
      </button>
    );
  }
  return (
    <span
      data-testid={testId}
      className={`inline-block ${baseClass} ${className ?? ""}`}
      style={style}
    />
  );
}
