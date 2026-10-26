import type { MindNode, TaskStatus } from "../types";

export type DueKind = "none" | "overdue" | "today" | "future";

export interface DueBadgeInfo {
  kind: DueKind;
  daysFromNow: number;
}

export interface BadgeInfo {
  due: DueBadgeInfo;
  showPriority: boolean;
  statusLabel: "INBOX" | "WIP" | "REVIEW" | "DONE";
}

const STATUS_LABEL: Record<TaskStatus, BadgeInfo["statusLabel"]> = {
  inbox: "INBOX",
  wip: "WIP",
  review: "REVIEW",
  done: "DONE",
};

function dueBadgeInfo(dueDate: string, isCompleted: boolean): DueBadgeInfo {
  if (!dueDate || isCompleted) {
    return { kind: "none", daysFromNow: 0 };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = due.getTime() - today.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) {
    return { kind: "overdue", daysFromNow: days };
  }
  if (days === 0) {
    return { kind: "today", daysFromNow: 0 };
  }
  return { kind: "future", daysFromNow: days };
}

export function formatBadges(node: MindNode): BadgeInfo {
  const isDone = node.status === "done" || node.completed;
  return {
    due: dueBadgeInfo(node.dueDate, isDone),
    showPriority: node.priority === "high",
    statusLabel: STATUS_LABEL[node.status],
  };
}

export function categoryBorderColor(c: MindNode["categoryColor"]): string {
  switch (c) {
    case "sky": {
      return "var(--tone-sky)";
    }
    case "emerald": {
      return "var(--tone-green)";
    }
    case "rose": {
      return "var(--tone-rose)";
    }
    default: {
      return "var(--mid)";
    }
  }
}

export function statusDotClass(s: TaskStatus): string {
  switch (s) {
    case "wip": {
      return "bg-(--info)";
    }
    case "review": {
      return "bg-(--warning)";
    }
    case "done": {
      return "bg-(--success)";
    }
    default: {
      return "bg-(--mid)";
    }
  }
}
