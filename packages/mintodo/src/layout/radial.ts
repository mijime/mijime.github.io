import type { MindNode } from "../types";

type Nodes = Record<string, MindNode>;

export interface RadialOptions {
  rootId: string;
  nodes: Nodes;
  ringDistance?: number;
  startAngle?: number;
}

interface TreeNode {
  _: MindNode;
  parent: TreeNode | null;
  children: TreeNode[] | null;
  x: number;
  y: number;
  A: TreeNode | null;
  a: TreeNode;
  z: number;
  m: number;
  c: number;
  s: number;
  t: TreeNode | null;
  i: number;
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

function radialSeparation(a: TreeNode, b: TreeNode): number {
  return (a.parent === b.parent ? 1 : 2) / a.y;
}

function nextLeft(v: TreeNode): TreeNode | null {
  const { children } = v;
  return children ? children[0] : v.t;
}

function nextRight(v: TreeNode): TreeNode | null {
  const { children } = v;
  if (!children) return v.t;
  return children.at(-1)!;
}

function moveSubtree(wm: TreeNode, wp: TreeNode, shift: number): void {
  const change = shift / (wp.i - wm.i);
  wp.c -= change;
  wp.s += shift;
  wm.c += change;
  wp.z += shift;
  wp.m += shift;
}

function executeShifts(v: TreeNode): void {
  let shift = 0;
  let change = 0;
  const { children } = v;
  if (!children) return;
  for (let i = children.length - 1; i >= 0; i--) {
    const w = children[i];
    w.z += shift;
    w.m += shift;
    shift += w.s + (change += w.c);
  }
}

function nextAncestor(vim: TreeNode, v: TreeNode, ancestor: TreeNode): TreeNode {
  return vim.a.parent === v.parent ? vim.a : ancestor;
}

function apportion(v: TreeNode, w: TreeNode | null, ancestor: TreeNode): TreeNode {
  if (!w) return ancestor;
  let vip: TreeNode | null = v;
  let vop: TreeNode = v;
  let vim: TreeNode = w;
  let [vom] = vip.parent!.children!;
  let sip = vip.m;
  let sop = vop.m;
  let sim = vim.m;
  let som = vom.m;
  let ret = ancestor;
  while (true) {
    vim = nextRight(vim)!;
    if (!vim) break;
    vip = nextLeft(vip)!;
    if (!vip) break;
    vom = nextLeft(vom)!;
    vop = nextRight(vop)!;
    vop.a = v;
    const shift = vim.z + sim - vip.z - sip + radialSeparation(vim, vip);
    if (shift > 0) {
      moveSubtree(nextAncestor(vim, v, ancestor), v, shift);
      sip += shift;
      sop += shift;
    }
    sim += vim.m;
    sip += vip.m;
    som += vom.m;
    sop += vop.m;
  }
  if (vim && !nextRight(vop)) {
    vop.t = vim;
    vop.m += sim - sop;
  }
  if (vip && !nextLeft(vom)) {
    vom.t = vip;
    vom.m += sip - som;
    ret = v;
  }
  return ret;
}

function firstWalk(v: TreeNode): void {
  const { children } = v;
  const siblings = v.parent!.children!;
  const w: TreeNode | null = v.i ? siblings[v.i - 1] : null;
  if (children) {
    executeShifts(v);
    const midpoint = (children[0].z + children.at(-1)!.z) / 2;
    if (w) {
      v.z = w.z + radialSeparation(v, w);
      v.m = v.z - midpoint;
    } else {
      v.z = midpoint;
    }
  } else if (w) {
    v.z = w.z + radialSeparation(v, w);
  }
  v.parent!.A = apportion(v, w, v.parent!.A || siblings[0]);
}

function secondWalk(v: TreeNode): void {
  v.x = v.z + v.parent!.m;
  v.m += v.parent!.m;
}

function buildTree(rootId: string, nodes: Nodes): TreeNode | null {
  const root = nodes[rootId];
  if (!root) return null;

  const dummyParent: TreeNode = {
    _: root,
    parent: null,
    children: null,
    x: 0,
    y: 0,
    A: null,
    a: null as unknown as TreeNode,
    z: 0,
    m: 0,
    c: 0,
    s: 0,
    t: null,
    i: 0,
  };

  const tree: TreeNode = {
    _: root,
    parent: dummyParent,
    children: null,
    x: 0,
    y: 0,
    A: null,
    a: null as unknown as TreeNode,
    z: 0,
    m: 0,
    c: 0,
    s: 0,
    t: null,
    i: 0,
  };
  tree.a = tree;
  dummyParent.children = [tree];

  const stack: TreeNode[] = [tree];
  while (stack.length > 0) {
    const node = stack.pop()!;
    const kidIds = visibleChildren(nodes, node._.id);
    if (kidIds.length === 0) {
      node.children = null;
      continue;
    }
    const kids: TreeNode[] = kidIds.map((id, i) => {
      const mindNode = nodes[id];
      const tn: TreeNode = {
        _: mindNode,
        parent: node,
        children: null,
        x: 0,
        y: node.y + 1,
        A: null,
        a: null as unknown as TreeNode,
        z: 0,
        m: 0,
        c: 0,
        s: 0,
        t: null,
        i,
      };
      tn.a = tn;
      return tn;
    });
    node.children = kids;
    for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
  }

  return tree;
}

function postOrder(root: TreeNode, visit: (n: TreeNode) => void): void {
  const stack: { node: TreeNode; visited: boolean }[] = [{ node: root, visited: false }];
  while (stack.length > 0) {
    const top = stack.at(-1)!;
    if (!top.visited && top.node.children) {
      top.visited = true;
      for (let i = top.node.children.length - 1; i >= 0; i--) {
        stack.push({ node: top.node.children[i], visited: false });
      }
      continue;
    }
    stack.pop();
    visit(top.node);
  }
}

function preOrder(root: TreeNode, visit: (n: TreeNode) => void): void {
  const stack: TreeNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    visit(node);
    if (node.children) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push(node.children[i]);
      }
    }
  }
}

function d3Scale(tree: TreeNode, dx: number): void {
  let left = tree;
  let right = tree;
  const collect: TreeNode[] = [tree];
  while (collect.length > 0) {
    const n = collect.pop()!;
    if (n.x < left.x) left = n;
    if (n.x > right.x) right = n;
    if (n.children) for (const c of n.children) collect.push(c);
  }
  const s = left === right ? 1 : radialSeparation(left, right) / 2;
  const tx = s - left.x;
  const kx = dx / (right.x + s + tx);
  const visit = (n: TreeNode) => {
    n.x = (n.x + tx) * kx;
    if (n.children) for (const c of n.children) visit(c);
  };
  visit(tree);
}

function shiftSubtree(node: TreeNode, offset: number): void {
  node.x += offset;
  if (node.children) for (const c of node.children) shiftSubtree(c, offset);
}

function evenDistributeRootChildren(tree: TreeNode, startAngle: number): void {
  if (!tree.children || tree.children.length === 0) return;
  const n = tree.children.length;
  if (n === 1) {
    const offset = startAngle - tree.children[0].x;
    shiftSubtree(tree.children[0], offset);
    return;
  }
  for (let i = 0; i < n; i++) {
    const target = startAngle + (i * 2 * Math.PI) / n;
    const offset = target - tree.children[i].x;
    shiftSubtree(tree.children[i], offset);
  }
}

function toPolar(tree: TreeNode, ringDistance: number): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const visit = (n: TreeNode) => {
    const radius = n.y * ringDistance;
    out[n._.id] =
      radius === 0
        ? { x: 0, y: 0 }
        : {
            x: Math.cos(n.x) * radius,
            y: Math.sin(n.x) * radius,
          };
    if (n.children) for (const c of n.children) visit(c);
  };
  visit(tree);
  return out;
}

export function computeRadialPositions(
  opts: RadialOptions,
): Record<string, { x: number; y: number }> {
  const ringDistance = opts.ringDistance ?? 240;
  const startAngle = opts.startAngle ?? -Math.PI / 2;
  const tree = buildTree(opts.rootId, opts.nodes);
  if (!tree) return {};
  postOrder(tree, firstWalk);
  tree.parent!.m = -tree.z;
  preOrder(tree, secondWalk);
  d3Scale(tree, 2 * Math.PI);
  evenDistributeRootChildren(tree, startAngle);
  return toPolar(tree, ringDistance);
}

export function applyRadialLayout(
  state: { nodes: Nodes },
  opts?: Partial<Omit<RadialOptions, "rootId" | "nodes">>,
): Nodes {
  const rootId = findRootId(state.nodes);
  const positions = computeRadialPositions({ rootId, nodes: state.nodes, ...opts });
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
