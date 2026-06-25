import type { MindNode } from "../types";

export function isLeaf(nodes: Record<string, MindNode>, id: string): boolean {
  return (nodes[id]?.children.length ?? 0) === 0;
}

export function countDescendants(
  nodes: Record<string, MindNode>,
  id: string,
): { total: number; completed: number } {
  const root = nodes[id];
  if (!root) return { total: 0, completed: 0 };
  let total = 0;
  let completed = 0;
  const visit = (n: MindNode): void => {
    for (const cid of n.children) {
      const child = nodes[cid];
      if (!child) continue;
      total += 1;
      if (child.completed) completed += 1;
      visit(child);
    }
  };
  visit(root);
  return { total, completed };
}

export function isKanbanVisible(nodes: Record<string, MindNode>, id: string): boolean {
  const node = nodes[id];
  if (!node) return false;
  if (node.isRoot) return false;
  if (node.children.length === 0) return true;
  const { total, completed } = countDescendants(nodes, id);
  return total > 0 && total === completed;
}
