import type { TaskStatus } from "../types";

const ORDER: readonly TaskStatus[] = ["done", "review", "wip", "inbox"];
const FORWARD: readonly TaskStatus[] = ["inbox", "wip", "review", "done"];

export function previousStatus(current: TaskStatus): TaskStatus {
  const i = ORDER.indexOf(current);
  return ORDER[(i + 1) % ORDER.length]!;
}

export function nextStatus(current: TaskStatus): TaskStatus {
  const i = FORWARD.indexOf(current);
  return FORWARD[Math.min(i + 1, FORWARD.length - 1)]!;
}
