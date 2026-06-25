import type { TaskStatus } from "../types";

const ORDER: readonly TaskStatus[] = ["done", "review", "wip", "inbox"];

export function previousStatus(current: TaskStatus): TaskStatus {
  const i = ORDER.indexOf(current);
  return ORDER[(i + 1) % ORDER.length]!;
}
