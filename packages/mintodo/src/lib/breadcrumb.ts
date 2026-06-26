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
  return path.join(" / ");
}

export function parentBreadcrumb(nodes: Record<string, MindNode>, id: string): string {
  const node = nodes[id];
  if (!node) return "";
  if (node.parentId === null) return node.text;
  return buildBreadcrumb(nodes, node.parentId);
}
