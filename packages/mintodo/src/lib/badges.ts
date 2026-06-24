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
      return "#0ea5e9";
    }
    case "emerald": {
      return "#10b981";
    }
    case "rose": {
      return "#f43f5e";
    }
    default: {
      return "var(--mid)";
    }
  }
}

export function statusDotClass(s: TaskStatus): string {
  switch (s) {
    case "wip": {
      return "bg-sky-500";
    }
    case "review": {
      return "bg-amber-500";
    }
    case "done": {
      return "bg-emerald-500";
    }
    default: {
      return "bg-slate-400";
    }
  }
}
