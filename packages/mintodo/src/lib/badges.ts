import type { MindNode } from "../types";

export interface BadgeInfo {
  dueHtml: string;
  showHigh: boolean;
  showBadgeRow: boolean;
}

function dueDateBadgeHtml(dueDate: string, isCompleted: boolean): string {
  if (!dueDate || isCompleted) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = due.getTime() - today.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) {
    return `<span class="bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0 border border-rose-200 dark:border-rose-900/30"><span>⚠</span> 超過</span>`;
  }
  if (days === 0) {
    return `<span class="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0 border border-amber-200 dark:border-amber-900/30 animate-pulse"><span>🔔</span> 今日</span>`;
  }
  return `<span class="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0">あと ${days} 日</span>`;
}

export function formatBadges(node: MindNode): BadgeInfo {
  const isDone = node.status === "done" || node.completed;
  const dueHtml = dueDateBadgeHtml(node.dueDate, isDone);
  const showHigh = node.priority === "high";
  const showBadgeRow = dueHtml !== "" || showHigh;
  return { dueHtml, showHigh, showBadgeRow };
}

export function categoryDotClass(c: MindNode["categoryColor"]): string {
  switch (c) {
    case "sky": {
      return "bg-sky-400";
    }
    case "emerald": {
      return "bg-emerald-400";
    }
    case "rose": {
      return "bg-rose-400";
    }
    default: {
      return "bg-slate-400";
    }
  }
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

export function statusDotClass(s: MindNode["status"]): string {
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
