import type { MindNode } from "../types";

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

export function sortByDfs(nodes: Record<string, MindNode>): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  const roots = Object.values(nodes).filter((n) => n.isRoot || !n.parentId || !nodes[n.parentId]);

  function visit(id: string): void {
    if (visited.has(id)) return;
    visited.add(id);
    result.push(id);
    const node = nodes[id];
    if (!node) return;
    for (const cid of node.children) {
      if (!visited.has(cid)) visit(cid);
    }
  }

  for (const root of roots) visit(root.id);

  for (const id of Object.keys(nodes)) {
    if (!visited.has(id)) visit(id);
  }

  return result;
}

export function isKanbanVisible(nodes: Record<string, MindNode>, id: string): boolean {
  const node = nodes[id];
  if (!node) return false;
  if (node.isRoot) return false;
  if (node.children.length === 0) return true;
  const { total, completed } = countDescendants(nodes, id);
  return total > 0 && total === completed;
}
