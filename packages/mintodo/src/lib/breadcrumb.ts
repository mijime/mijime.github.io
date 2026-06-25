import type { MindNode } from "../types";

export function buildBreadcrumb(nodes: Record<string, MindNode>, targetId: string): string {
  const path: string[] = [];
  let cur: MindNode | undefined = nodes[targetId];
  while (cur) {
    path.unshift(cur.text);
    if (!cur.parentId) break;
    cur = nodes[cur.parentId];
    if (!cur) break;
  }
  if (path.length <= 3) return path.join(" / ");
  return `… / ${path.slice(-2).join(" / ")}`;
}
