import type { MindNode } from "../types";

export function effectiveEstimate(nodes: Record<string, MindNode>, id: string): number {
  const node = nodes[id];
  if (!node) return 0;
  if (node.completed) return 0;
  if (node.estimate !== null && node.estimate > 0) return node.estimate;
  // Leaf without @estimate → implicit 4h; non-leaf sums children only
  if (node.children.length === 0) return 4;
  let sum = 0;
  for (const cid of node.children) {
    sum += effectiveEstimate(nodes, cid);
  }
  return sum;
}

export function computeEstimates(nodes: Record<string, MindNode>): Map<string, number> {
  const out = new Map<string, number>();
  const compute = (node: MindNode): number => {
    if (node.estimate !== null && node.estimate > 0) return node.estimate;
    if (node.children.length === 0) return 4;
    let sum = 0;
    for (const cid of node.children) sum += visit(cid);
    return sum;
  };
  const visit = (id: string): number => {
    if (out.has(id)) return out.get(id)!;
    const node = nodes[id];
    if (!node) return 0;
    const result = compute(node);
    out.set(id, result);
    return result;
  };
  const root = Object.values(nodes).find((n) => n.isRoot);
  if (root) visit(root.id);
  return out;
}
