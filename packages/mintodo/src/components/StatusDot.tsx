import { statusDotClass } from "../lib/badges";
import type { TaskStatus } from "../types";

interface Props {
  status: TaskStatus;
  dimmed?: boolean;
  testId?: string;
  onClick?: () => void;
}

export function StatusDot({ status, dimmed = false, testId, onClick }: Props) {
  const className = `inline-block w-2.5 h-2.5 rounded-full ${statusDotClass(status)} ${dimmed ? "opacity-40" : ""}`;
  const style = { boxShadow: "0 0 0 2px var(--paper), 0 0 0 3px var(--mid)" };
  if (onClick) {
    return (
      <button
        type="button"
        data-testid={testId}
        aria-label={`status ${status} (click to cycle backwards)`}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`${className} cursor-pointer border-0 p-0`}
        style={style}
      />
    );
  }
  return <span data-testid={testId} className={className} style={style} />;
}
