import type { Priority } from "../types";

export function priorityClass(priority: Priority): string {
  switch (priority) {
    case "high": {
      return "font-bold tracking-wide uppercase";
    }
    case "low": {
      return "italic";
    }
    default: {
      return "";
    }
  }
}
