import type { MindNode } from "../types";

type Nodes = Record<string, MindNode>;

export interface TreeLayoutOptions {
  hSpacing?: number;
  vSpacing?: number;
}

export function computeTreePositions(
  rootId: string,
  nodes: Nodes,
  opts?: TreeLayoutOptions,
): Record<string, { x: number; y: number }> {
  const hSpacing = opts?.hSpacing ?? 360;
  const vSpacing = opts?.vSpacing ?? 140;
  const positions: Record<string, { x: number; y: number }> = {};
  if (!nodes[rootId]) return positions;

  let nextLeafY = 0;
  const visit = (id: string, depth: number): number => {
    const n = nodes[id]!;
    const kids = n.collapsed ? [] : n.children.filter((c) => nodes[c]);
    const y =
      kids.length === 0
        ? (() => {
            const leafY = nextLeafY;
            nextLeafY += vSpacing;
            return leafY;
          })()
        : (() => {
            const ys = kids.map((c) => visit(c, depth + 1));
            return (ys[0]! + ys.at(-1)!) / 2;
          })();
    positions[id] = { x: depth * hSpacing, y };
    return y;
  };
  visit(rootId, 0);

  const rootY = positions[rootId]!.y;
  if (rootY !== 0) {
    for (const p of Object.values(positions)) p.y -= rootY;
  }
  return positions;
}

export function applyTreeLayout(state: { nodes: Nodes }): Nodes {
  const rootId = Object.values(state.nodes).find((n) => n.isRoot)?.id ?? "root";
  const positions = computeTreePositions(rootId, state.nodes);
  const out: Nodes = {};
  for (const [id, n] of Object.entries(state.nodes)) {
    const p = positions[id];
    out[id] = p ? { ...n, x: p.x, y: p.y } : { ...n, x: 0, y: 0 };
  }
  return out;
}
