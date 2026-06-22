import type { MindNode } from "../types";

type Nodes = Record<string, MindNode>;

export interface RadialOptions {
  rootId: string;
  nodes: Nodes;
  ringDistance?: number;
  startAngle?: number;
}

function isAncestorCollapsed(nodes: Nodes, id: string): boolean {
  let cur = nodes[id];
  if (!cur) return true;
  while (cur.parentId) {
    const p = nodes[cur.parentId];
    if (!p) return false;
    if (p.collapsed) return true;
    cur = p;
  }
  return false;
}

function isVisible(nodes: Nodes, id: string): boolean {
  const n = nodes[id];
  if (!n) return false;
  if (n.isRoot) return true;
  return !isAncestorCollapsed(nodes, id);
}

function visibleChildren(nodes: Nodes, id: string): string[] {
  const n = nodes[id];
  if (!n) return [];
  if (n.collapsed) return [];
  return n.children.filter((c) => isVisible(nodes, c));
}

function leafCount(nodes: Nodes, id: string): number {
  const kids = visibleChildren(nodes, id);
  if (kids.length === 0) return 1;
  let s = 0;
  for (const c of kids) s += leafCount(nodes, c);
  return s;
}

function placeChildren(
  parentId: string,
  arcStart: number,
  arcEnd: number,
  parentDepth: number,
  originX: number,
  originY: number,
  out: Record<string, { x: number; y: number }>,
  ctx: { nodes: Nodes; ring: number; start: number },
): void {
  const kids = visibleChildren(ctx.nodes, parentId);
  if (kids.length === 0) return;

  if (parentDepth === 0) {
    if (kids.length === 1) {
      const childX = originX + Math.cos(ctx.start) * ctx.ring;
      const childY = originY + Math.sin(ctx.start) * ctx.ring;
      out[kids[0]] = { x: childX, y: childY };
      placeChildren(kids[0], 0, Math.PI * 2, 1, childX, childY, out, ctx);
      return;
    }
    const slice = (Math.PI * 2) / kids.length;
    for (let i = 0; i < kids.length; i++) {
      const angle = ctx.start + i * slice;
      const childX = originX + Math.cos(angle) * ctx.ring;
      const childY = originY + Math.sin(angle) * ctx.ring;
      out[kids[i]] = { x: childX, y: childY };
      placeChildren(kids[i], i * slice, (i + 1) * slice, 1, childX, childY, out, ctx);
    }
    return;
  }

  const total = kids.reduce((s, c) => s + leafCount(ctx.nodes, c), 0);
  let cursor = arcStart;
  for (const kid of kids) {
    const w = leafCount(ctx.nodes, kid) / total;
    const span = (arcEnd - arcStart) * w;
    place(kid, cursor, cursor + span, parentDepth + 1, originX, originY, out, ctx);
    cursor += span;
  }
}

function place(
  id: string,
  arcStart: number,
  arcEnd: number,
  depth: number,
  originX: number,
  originY: number,
  out: Record<string, { x: number; y: number }>,
  ctx: { nodes: Nodes; ring: number; start: number },
): void {
  if (depth === 0) {
    out[id] = { x: 0, y: 0 };
    placeChildren(id, 0, Math.PI * 2, 0, 0, 0, out, ctx);
    return;
  }

  const mid = (arcStart + arcEnd) / 2;
  const angle = ctx.start + mid;
  out[id] = {
    x: originX + Math.cos(angle) * ctx.ring,
    y: originY + Math.sin(angle) * ctx.ring,
  };
  placeChildren(id, arcStart, arcEnd, depth, out[id].x, out[id].y, out, ctx);
}

export function computeRadialPositions(
  opts: RadialOptions,
): Record<string, { x: number; y: number }> {
  const ring = opts.ringDistance ?? 220;
  const start = opts.startAngle ?? -Math.PI / 2;
  const out: Record<string, { x: number; y: number }> = {};
  if (!opts.nodes[opts.rootId]) return out;
  place(opts.rootId, 0, Math.PI * 2, 0, 0, 0, out, { nodes: opts.nodes, ring, start });
  return out;
}

export function applyRadialLayout(state: { nodes: Nodes }): Nodes {
  const positions = computeRadialPositions({ rootId: findRootId(state.nodes), nodes: state.nodes });
  const out: Nodes = {};
  for (const [id, n] of Object.entries(state.nodes)) {
    const p = positions[id];
    out[id] = p ? { ...n, x: p.x, y: p.y } : { ...n, x: 0, y: 0 };
  }
  return out;
}

function findRootId(nodes: Nodes): string {
  for (const n of Object.values(nodes)) if (n.isRoot) return n.id;
  return "root";
}
