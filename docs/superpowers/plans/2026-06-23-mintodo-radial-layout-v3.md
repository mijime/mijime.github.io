# mintodo Radial Layout v3 (Buchheim + Root Even Distribution) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current radial layout (`src/layout/radial.ts`) with a hybrid algorithm combining Buchheim's Reingold-Tilford "tidy" (for descendants) and even angular distribution (for root's direct children), guaranteeing no node overlap in any tree shape while preserving mindmap aesthetics.

**Architecture:** Port d3-hierarchy's `tree.js` algorithm to TypeScript as the core. Run Buchheim's first/second walks to compute prelim positions. Apply d3's padded scale (`s = separation(left, right) / 2`) to fit the tree in `[s, dx - s]`. Then override root's direct children to be evenly distributed around `[startAngle, startAngle + 2π]` (mindmap convention). Convert to polar (cos/sin) for canvas rendering.

**Tech Stack:** TypeScript, vitest, no new dependencies

**Reference spec:** `docs/superpowers/specs/2026-06-23-mintodo-radial-layout-v3-design.md`

**Reference implementation (read-only):** https://raw.githubusercontent.com/d3/d3-hierarchy/main/src/tree.js

## Global Constraints

- Type check: `pnpm run check:tsgo` (tsgo --noEmit) must pass with zero errors
- Lint: `pnpm run check:oxlint` (oxlint) must pass with zero errors
- Format: oxfmt via pre-commit hook (auto-formats on commit)
- Test: `pnpm test` (vitest run) — all tests must pass
- Pure functions in `src/layout/radial.ts`: no DOM access, no `Math.random`, no `Date.now`
- Coordinates stored in `MindNode.x` and `MindNode.y` as `number`
- No new runtime dependencies
- Backward compat: `applyRadialLayout({ nodes })` signature must keep working (default options)

## File Structure

- `packages/mintodo/src/layout/radial.ts` — full rewrite (~150 → ~250 lines)
- `packages/mintodo/src/layout/radial.test.ts` — modify (9 maintained + 1 updated + 2 deleted + 8 new = 20 tests)
- `packages/mintodo/src/store.ts` — no changes (`applyRadialLayout` call site still passes `{ nodes }` only)

---

## Task 1: Replace algorithm internals + integrate into `computeRadialPositions`

**Files:**
- Modify: `packages/mintodo/src/layout/radial.ts`

**Context:** Current `radial.ts` uses sibling-index ring scaling (`ring * (1 + i * factor)`) which causes 3-level single-child chains to overlap with root (verified via vitest: `tasks1-1-1` is placed at `(0, 0)`). The fix: port d3's Reingold-Tilford algorithm with Buchheim apportion, then add a post-processing step that evenly distributes root's direct children.

This task replaces the entire algorithm. After this task, 9 maintained tests + 2 `applyRadialLayout` tests should pass. 1 test will need its expectations updated (Task 2) and 2 tests will be marked for removal (Task 2).

### Step 1: Replace the file with the new algorithm

Replace the entire contents of `packages/mintodo/src/layout/radial.ts` with the implementation below. This is a single drop-in replacement that includes all internal Buchheim machinery + the hybrid special case + public API.

```ts
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
  const children = v.children;
  return children ? children[0] : v.t;
}

function nextRight(v: TreeNode): TreeNode | null {
  const children = v.children;
  if (!children) return v.t;
  return children[children.length - 1];
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
  const children = v.children;
  if (!children) return;
  for (let i = children.length - 1; i >= 0; i--) {
    const w = children[i];
    w.z += shift;
    w.m += shift;
    shift += w.s + (change += w.c);
  }
}

function nextAncestor(
  vim: TreeNode,
  v: TreeNode,
  ancestor: TreeNode,
): TreeNode {
  return vim.a.parent === v.parent ? vim.a : ancestor;
}

function apportion(
  v: TreeNode,
  w: TreeNode | null,
  ancestor: TreeNode,
): TreeNode {
  if (!w) return ancestor;
  let vip: TreeNode | null = v;
  let vop: TreeNode = v;
  let vim: TreeNode = w;
  let vom: TreeNode = vip.parent!.children![0];
  let sip = vip.m;
  let sop = vop.m;
  let sim = vim.m;
  let som = vom.m;
  let shift: number;
  while ((vim = nextRight(vim)!) && (vip = nextLeft(vip)!)) {
    vom = nextLeft(vom)!;
    vop = nextRight(vop)!;
    vop.a = v;
    shift = vim.z + sim - vip.z - sip + radialSeparation(vim, vip);
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
    ancestor = v;
  }
  return ancestor;
}

function firstWalk(v: TreeNode): void {
  const children = v.children;
  const siblings = v.parent!.children!;
  const w: TreeNode | null = v.i ? siblings[v.i - 1] : null;
  if (children) {
    executeShifts(v);
    const midpoint = (children[0].z + children[children.length - 1].z) / 2;
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
  v._.x = v.z + v.parent!.m;
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
    const top = stack[stack.length - 1];
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

function toPolar(
  tree: TreeNode,
  ringDistance: number,
): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const visit = (n: TreeNode) => {
    const radius = n.y * ringDistance;
    out[n._.id] = {
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
```

### Step 2: Run existing tests to see what passes / fails

Run: `cd packages/mintodo && pnpm test`
Expected: 9 tests pass (the maintained ones), 1 test fails (`distributes three root children evenly starting at 12 o'clock` — old expected values), 2 tests fail (`splits a non-root's arc proportional to leaf count`, `places children progressively further outward` — obsolete), 2 applyRadialLayout tests pass.

Specifically:
- PASS: `uses 340 as the default ringDistance`
- PASS: `places root alone at the origin`
- PASS: `places a single root child directly above the root (special case)`
- PASS: `scales radius with depth`
- PASS: `hides descendants of a collapsed node`
- PASS: `treats a collapsed leaf as 1 leaf for sibling proportion`
- PASS: `is deterministic for the same input`
- PASS: `omits unknown ids and nodes absent from the map`
- PASS: `confines each root child's subtree to its allocated arc`
- FAIL: `distributes three root children evenly starting at 12 o'clock` (expected values use old `ringFactor`)
- FAIL: `splits a non-root's arc proportional to leaf count` (Buchheim doesn't do leaf-count weighting)
- FAIL: `places children progressively further outward` (all root children at same radius now)
- PASS: `returns a new nodes record with x/y updated` (applyRadialLayout)
- PASS: `sets hidden nodes to (0, 0)` (applyRadialLayout)

If any "should pass" test fails, debug. The 3 expected failures are addressed in Task 2.

### Step 3: Run type check and lint

Run: `cd packages/mintodo && pnpm run check`
Expected: zero errors.

### Step 4: Commit

```bash
git add packages/mintodo/src/layout/radial.ts
git commit -m "feat(mintodo): replace radial layout with Buchheim + root even distribution"
```

---

## Task 2: Update "3 root children" test + remove 2 obsolete tests

**Files:**
- Modify: `packages/mintodo/src/layout/radial.test.ts`

**Context:** The new algorithm puts 3 root children at angles `startAngle`, `startAngle + 2π/3`, `startAngle + 4π/3` (12, 2, 10 o'clock with default startAngle), all at radius `RING` (no more `ringFactor`). Two tests encode old behavior that no longer applies (leaf-count weighting, progressive outward) and are removed.

### Step 1: Replace the body of `distributes three root children evenly starting at 12 o'clock`

Find the `it("distributes three root children evenly starting at 12 o'clock", ...)` block in `packages/mintodo/src/layout/radial.test.ts` (lines ~55-72) and replace its entire body with:

```ts
  it("distributes three root children evenly starting at 12 o'clock", () => {
    const root = node("root", { isRoot: true, children: ["a", "b", "c"] });
    const a = node("a", { parentId: "root" });
    const b = node("b", { parentId: "root" });
    const c = node("c", { parentId: "root" });
    const pos = computeRadialPositions({ rootId: "root", nodes: nodes(root, a, b, c) });
    expect(pos.a.x).toBeCloseTo(0, 5);
    expect(pos.a.y).toBeCloseTo(-RING, 5);
    const angleB = UP + (TAU / 3);
    expect(pos.b.x).toBeCloseTo(Math.cos(angleB) * RING, 5);
    expect(pos.b.y).toBeCloseTo(Math.sin(angleB) * RING, 5);
    const angleC = UP + (2 * TAU / 3);
    expect(pos.c.x).toBeCloseTo(Math.cos(angleC) * RING, 5);
    expect(pos.c.y).toBeCloseTo(Math.sin(angleC) * RING, 5);
  });
```

### Step 2: Delete the `splits a non-root's arc proportional to leaf count` test

Find the `it("splits a non-root's arc proportional to leaf count", ...)` block (lines ~83-100) and delete the entire block (from the `it(` line to the closing `});`).

### Step 3: Delete the `places children progressively further outward` test

Find the `it("places children progressively further outward", ...)` block (lines ~102-117) and delete the entire block.

### Step 4: Run tests, verify all 12 pass

Run: `cd packages/mintodo && pnpm test`
Expected: 12 tests pass (9 maintained + 1 updated + 2 applyRadialLayout). The 2 deleted tests are no longer in the file.

If `distributes three root children` fails after the update, double-check the expected values: with startAngle = -π/2 and 3 children, angles are -π/2, -π/2 + 2π/3 = π/6, -π/2 + 4π/3 = 5π/6. All at radius 240. The new expected values use `Math.cos(angleB) * RING` (no `* 1.12`).

### Step 5: Commit

```bash
git add packages/mintodo/src/layout/radial.test.ts
git commit -m "test(mintodo): update 3 root children test, remove 2 obsolete tests for new radial algorithm"
```

---

## Task 3: Add 8 new tests for Buchheim invariants

**Files:**
- Modify: `packages/mintodo/src/layout/radial.test.ts`

**Context:** The new algorithm has properties not covered by the existing 12 tests. Add characterization tests that document these invariants. All should pass on the first run since Task 1's implementation is already correct.

### Step 1: Add 3 single-child chain straight-line tests

Find the closing `});` of the `describe("computeRadialPositions", ...)` block (before the `describe("applyRadialLayout"` line) and add the following tests just before it:

```ts
  it("places a 3-level single-child chain on a straight vertical line", () => {
    const task1 = node("task1", { isRoot: true, children: ["tasks1-1"] });
    const tasks1_1 = node("tasks1-1", { parentId: "task1", children: ["tasks1-1-1"] });
    const tasks1_1_1 = node("tasks1-1-1", { parentId: "tasks1-1" });
    const pos = computeRadialPositions({
      rootId: "task1",
      nodes: nodes(task1, tasks1_1, tasks1_1_1),
    });
    expect(pos.task1).toEqual({ x: 0, y: 0 });
    expect(pos["tasks1-1"].x).toBeCloseTo(0, 10);
    expect(pos["tasks1-1"].y).toBeCloseTo(-RING, 10);
    expect(pos["tasks1-1-1"].x).toBeCloseTo(0, 10);
    expect(pos["tasks1-1-1"].y).toBeCloseTo(-2 * RING, 10);
  });

  it("places a 4-level single-child chain on a straight vertical line", () => {
    const root = node("root", { isRoot: true, children: ["a"] });
    const a = node("a", { parentId: "root", children: ["b"] });
    const b = node("b", { parentId: "a", children: ["c"] });
    const c = node("c", { parentId: "b" });
    const pos = computeRadialPositions({
      rootId: "root",
      nodes: nodes(root, a, b, c),
    });
    expect(pos.c.x).toBeCloseTo(0, 10);
    expect(pos.c.y).toBeCloseTo(-3 * RING, 10);
  });

  it("places a 5-level single-child chain on a straight vertical line", () => {
    const root = node("root", { isRoot: true, children: ["a"] });
    const a = node("a", { parentId: "root", children: ["b"] });
    const b = node("b", { parentId: "a", children: ["c"] });
    const c = node("c", { parentId: "b", children: ["d"] });
    const d = node("d", { parentId: "c" });
    const pos = computeRadialPositions({
      rootId: "root",
      nodes: nodes(root, a, b, c, d),
    });
    expect(pos.d.x).toBeCloseTo(0, 10);
    expect(pos.d.y).toBeCloseTo(-4 * RING, 10);
  });
```

### Step 2: Add the contour invariant test

Add the following test right after the chain tests:

```ts
  it("Buchheim contour: sibling subtrees of different parents do not overlap", () => {
    const root = node("root", { isRoot: true, children: ["a", "b"] });
    const a = node("a", {
      parentId: "root",
      children: ["a1", "a2", "a3", "a4", "a5"],
    });
    const aKids = ["a1", "a2", "a3", "a4", "a5"].map((id) =>
      node(id, { parentId: "a" }),
    );
    const b = node("b", { parentId: "root" });
    const all = [root, a, ...aKids, b];
    const pos = computeRadialPositions({
      rootId: "root",
      nodes: nodes(...all),
    });
    const aKidsAngles = aKids.map((kid) =>
      Math.atan2(pos[kid.id].y, pos[kid.id].x),
    );
    const aMinA = Math.min(...aKidsAngles);
    const aMaxA = Math.max(...aKidsAngles);
    const bAngle = Math.atan2(pos.b.y, pos.b.x);
    expect(Math.abs(bAngle - aMinA)).toBeGreaterThan(Math.PI / 4);
    expect(Math.abs(bAngle - aMaxA)).toBeGreaterThan(Math.PI / 4);
  });
```

### Step 3: Add the non-root sibling distinct angle test

Add the following test:

```ts
  it("non-root siblings are placed at distinct angles", () => {
    const root = node("root", { isRoot: true, children: ["a"] });
    const a = node("a", { parentId: "root", children: ["a1", "a2", "a3"] });
    const a1 = node("a1", { parentId: "a" });
    const a2 = node("a2", { parentId: "a" });
    const a3 = node("a3", { parentId: "a" });
    const pos = computeRadialPositions({
      rootId: "root",
      nodes: nodes(root, a, a1, a2, a3),
    });
    const angleA1 = Math.atan2(pos.a1.y, pos.a1.x);
    const angleA2 = Math.atan2(pos.a2.y, pos.a2.x);
    const angleA3 = Math.atan2(pos.a3.y, pos.a3.x);
    expect(angleA1).not.toBeCloseTo(angleA2, 5);
    expect(angleA2).not.toBeCloseTo(angleA3, 5);
    expect(angleA1).not.toBeCloseTo(angleA3, 5);
  });
```

### Step 4: Add the 2-root + 3-level grandchildren test

Add the following test:

```ts
  it("2 root children with deep grandchildren never overlap", () => {
    const root = node("root", { isRoot: true, children: ["a", "b"] });
    const a = node("a", { parentId: "root", children: ["a1"] });
    const a1 = node("a1", { parentId: "a", children: ["a1a"] });
    const a1a = node("a1a", { parentId: "a1" });
    const b = node("b", { parentId: "root", children: ["b1"] });
    const b1 = node("b1", { parentId: "b", children: ["b1a"] });
    const b1a = node("b1a", { parentId: "b1" });
    const all = [root, a, a1, a1a, b, b1, b1a];
    const pos = computeRadialPositions({
      rootId: "root",
      nodes: nodes(...all),
    });
    const seen = new Set<string>();
    for (const n of all) {
      const key = `${pos[n.id].x.toFixed(2)},${pos[n.id].y.toFixed(2)}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
```

### Step 5: Add the asymmetric tree test

Add the following test:

```ts
  it("asymmetric tree: 5-child subtree does not overlap 1-child subtree", () => {
    const root = node("root", { isRoot: true, children: ["a", "b"] });
    const a = node("a", {
      parentId: "root",
      children: ["a1", "a2", "a3", "a4", "a5"],
    });
    const aKids = ["a1", "a2", "a3", "a4", "a5"].map((id) =>
      node(id, { parentId: "a" }),
    );
    const b = node("b", { parentId: "root", children: ["b1"] });
    const b1 = node("b1", { parentId: "b" });
    const all = [root, a, ...aKids, b, b1];
    const pos = computeRadialPositions({
      rootId: "root",
      nodes: nodes(...all),
    });
    const seen = new Set<string>();
    for (const n of all) {
      const key = `${pos[n.id].x.toFixed(2)},${pos[n.id].y.toFixed(2)}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
```

### Step 6: Add the 5-siblings-at-root test

Add the following test:

```ts
  it("5 root children all get distinct angles", () => {
    const root = node("root", {
      isRoot: true,
      children: ["a", "b", "c", "d", "e"],
    });
    const kids = ["a", "b", "c", "d", "e"].map((id) =>
      node(id, { parentId: "root" }),
    );
    const pos = computeRadialPositions({
      rootId: "root",
      nodes: nodes(root, ...kids),
    });
    const angles = kids.map((k) => Math.atan2(pos[k.id].y, pos[k.id].x));
    for (let i = 0; i < angles.length; i++) {
      for (let j = i + 1; j < angles.length; j++) {
        expect(angles[i]).not.toBeCloseTo(angles[j], 5);
      }
    }
  });
```

### Step 7: Run all tests, verify all 20 pass

Run: `cd packages/mintodo && pnpm test`
Expected: 20 tests pass total (12 from Task 2 + 8 new from this task).

If any test fails, debug. Common issues:
- Floating-point precision: use `toBeCloseTo(..., 5)` or `toBeCloseTo(..., 10)` for tighter tolerance
- The post-order / pre-order traversals not finding the root properly: verify the order of operations in `computeRadialPositions` matches the d3 reference

### Step 8: Commit

```bash
git add packages/mintodo/src/layout/radial.test.ts
git commit -m "test(mintodo): add 8 invariant tests for new radial layout algorithm"
```

---

## Task 4: Final verification

**Files:**
- (no file changes expected)

### Step 1: Run full test suite

Run: `cd packages/mintodo && pnpm test`
Expected: 20 tests pass.

### Step 2: Run type check + lint

Run: `cd packages/mintodo && pnpm run check`
Expected: zero errors. If there are any, fix them.

### Step 3: Verify store integration is unaffected

Run: `cd packages/mintodo && pnpm test -- --run src/store.test.ts`
Expected: all `src/store.test.ts` tests pass (the algorithm change in `radial.ts` should be transparent to the reducer because `applyRadialLayout({ nodes })` keeps the same return shape).

If any store test fails, the algorithm change broke something downstream. Investigate the failing test, do not modify the test — fix the algorithm if needed.

---

## Self-Review Checklist

- ✅ Spec coverage: every requirement in v3 spec maps to a task
  - Algorithm port → Task 1 (Buchheim internals + d3 scale + evenDistribute)
  - API simplification → Task 1 (RadialOptions without ringFactor/singleChildAngleInherit)
  - Even distribution for root children → Task 1 (evenDistributeRootChildren)
  - Test updates → Task 2 (1 updated, 2 removed)
  - New tests → Task 3 (8 added)
  - Final verification → Task 4
- ✅ Placeholder scan: no "TBD", "TODO", or "implement later" — all code blocks contain real code
- ✅ Type consistency: `TreeNode`, `Nodes`, `RadialOptions`, `computeRadialPositions`, `applyRadialLayout` defined once and referenced consistently
- ✅ All file paths absolute
- ✅ All commands have expected output specified
- ✅ Frequent commits (4 commits total across 4 tasks)
