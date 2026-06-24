import { statusDotClass } from "../lib/badges";
import type { TaskStatus } from "../types";

interface Props {
  status: TaskStatus;
  dimmed?: boolean;
  testId?: string;
}

export function StatusDot({ status, dimmed = false, testId }: Props) {
  return (
    <span
      data-testid={testId}
      className={`inline-block w-2.5 h-2.5 rounded-full ${statusDotClass(status)} ${dimmed ? "opacity-40" : ""}`}
      style={{
        boxShadow: "0 0 0 2px var(--paper), 0 0 0 3px var(--mid)",
      }}
    />
  );
}
