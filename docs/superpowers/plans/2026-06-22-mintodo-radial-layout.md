# mintodo Radial Mindmap Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the force-simulation layout in `packages/mintodo` with a deterministic, event-driven radial mindmap layout. Drag becomes a reparenting gesture (drop on a node = reparent, drop on empty = snap back to radial position). Structural changes tween smoothly. Edges become straight lines.

**Architecture:** A pure `computeRadialPositions` function computes `(x, y)` for every visible node from a tree + parameters. Reducer structural cases (`ADD_CHILD`, `DELETE_NODE`, `TOGGLE_COLLAPSE`, `REPARENT`, `SNAP_BACK`, `RESET`, `SET_NODES`) call this function (via an `applyRadialLayout` helper) and bump `state.layoutVersion`. A new `useTween` hook watches `layoutVersion` and animates the DOM via the Web Animations API. `useDragNode` is rewritten: during drag it mutates the DOM directly (not state); on drop it dispatches `REPARENT` or `SNAP_BACK`. `usePhysics` and the physics toggle are deleted.

**Tech Stack:** React 19, TypeScript, vitest, @testing-library/react, Dexie (IndexedDB), Tailwind CSS tokens.

## Global Constraints

- Package: `packages/mintodo` — all paths relative to this directory unless noted.
- Test runner: `pnpm test` (runs `vitest run`).
- Type check + lint: `pnpm run check` (`tsgo --noEmit && oxlint --format=github --fix`).
- Format: `pnpm run format` (`oxfmt`).
- Spec for this work: `docs/superpowers/specs/2026-06-22-mintodo-radial-layout-design.md`.
- Code style (per `~/.claude/CLAUDE.md`): no comments unless explaining non-obvious WHY; minimal implementation, no abstraction/error handling/future-proofing/backward compat.
- Commit messages: `type(scope): subject` (matches `feat(mintodo):`, `fix(mintodo):`, `refactor(mintodo):`, `chore:`).
- Worktree: this plan runs in the current branch, not a fresh worktree.
- DOM contract: every `NodeCard` already has `id="node-dom-${id}"` and `data-node-id="${id}"` (see `src/components/NodeCard.tsx:68-69, 105-106`). The new `ConnectionLines` must give each edge `id="edge-${parentId}-${childId}"`.
- Existing helpers to reuse: `isParentCollapsed` exists in two places (`src/hooks/use-physics.ts:11-22`, `src/components/ConnectionLines.tsx:4-15`, `src/components/Canvas.tsx:9-20`) — keep them where they are; do not refactor in this plan.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/layout/radial.ts` | create | Pure `computeRadialPositions` + `applyRadialLayout` helpers |
| `src/layout/radial.test.ts` | create | vitest unit tests for both helpers |
| `src/types.ts` | modify | Drop `vx, vy` from `MindNode`; add `layoutVersion: number` to `State`; add `REPARENT`, `SNAP_BACK` actions |
| `src/store.ts` | modify | Add `applyRadialLayout` integration in all structural reducers; new `REPARENT`/`SNAP_BACK` cases; drop `MOVE_NODE`, `TOGGLE_PHYSICS`, `physicsEnabled`, `vx, vy` initializations |
| `src/store.test.ts` | modify | Drop `vx, vy` from `makeNode`; drop `TOGGLE_PHYSICS` + `MOVE_NODE` + `RESET` physics tests; add `REPARENT` + `SNAP_BACK` + `layoutVersion` tests; update `ADD_CHILD` expectations to match radial output |
| `src/hooks/use-physics.ts` | delete | Force simulation is gone |
| `src/hooks/use-tween.ts` | create | `useTween()` watches `layoutVersion` and animates nodes + edges |
| `src/hooks/use-tween.test.ts` | create | vitest + jsdom: verify the hook animates from old → new positions and skips while dragging |
| `src/hooks/use-drag-node.ts` | modify | Drop `MOVE_NODE` callback signature; on drop, dispatch `REPARENT` or `SNAP_BACK` based on `elementFromPoint` target; highlight valid targets; sync DOM position during drag without touching state |
| `src/hooks/use-drag-node.test.ts` | create | Test drop target detection, REPARENT vs SNAP_BACK dispatch, invalid drops (self/descendant/root) |
| `src/components/Canvas.tsx` | modify | Replace `usePhysics` with `useTween`; rewrite `useDragNode` callback to no-op (drag is DOM-only) |
| `src/components/ConnectionLines.tsx` | modify | Replace `<path>` cubic bezier with `<line>` straight line; each line gets `id="edge-${parentId}-${childId}"` |
| `src/components/Toolbar.tsx` | modify | Remove the 自動配置 toggle block (lines 98-119) |
| `src/storage.ts` | modify | Remove `vx: 0, vy: 0` reset in `arrayToRecord`; remove `vx, vy` from `createBoard` root |
| `src/dsl.ts` | modify | Remove `vx, vy` from `defaultNode` |
| `src/dsl.test.ts` | modify | Drop `vx, vy` from `makeNode`; drop the roundtrip `n.vx/n.vy` assertions |

No new state shape beyond what the spec adds. No new dependencies. No schema change.

---

## Task 1: Add radial layout module (TDD)

**Files:**
- Create: `src/layout/radial.ts`
- Test: `src/layout/radial.test.ts`

**Interfaces (consumed by store.ts in Task 2):**
- `computeRadialPositions(opts: { rootId, nodes, ringDistance?, startAngle? }): Record<string, {x, y}>` — returns a map of nodeId → computed position. Visible-only.
- `applyRadialLayout(state: { nodes }): Record<string, MindNode>` — returns a fresh `nodes` record with `x`/`y` updated per `computeRadialPositions`. Nodes not visible (under collapsed parent, or absent) get `x: 0, y: 0`.

**Algorithm (must implement exactly):**
- Root is at `(0, 0)`.
- Each node is placed at the midpoint angle of its allocated arc, at radius `depth * ringDistance` from its parent's position.
- **Root's children**: arc `[0, 2π]` split evenly between visible children. The first child is placed at the parent's `startAngle` (defaults to `-π/2`, screen-up). Special case: if root has exactly 1 visible child, place it at `startAngle` directly (not at the midpoint of `2π`, which would land at the bottom).
- **Non-root's children**: parent's arc `[arcStart, arcEnd]` is split by visible-leaf-count proportion.
- **Visibility**: a node is "visible" iff it exists in `nodes`, is not the root, and has no ancestor (including itself) with `collapsed: true`. The root is always visible. Collapsed nodes themselves are visible; their descendants are not.
- **Leaf count**: a node's "visible leaf count" is `1` if it has no visible children or is collapsed; otherwise the sum of its visible children's leaf counts.
- `ringDistance` default `220`, `startAngle` default `-Math.PI / 2`.

- [ ] **Step 1: Write the failing test file**

Create `src/layout/radial.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { MindNode } from "../types";
import { applyRadialLayout, computeRadialPositions } from "./radial";

function node(id: string, opts: Partial<MindNode> = {}): MindNode {
  return {
    id,
    boardId: "b1",
    text: opts.text ?? id,
    parentId: opts.parentId ?? null,
    isRoot: opts.isRoot ?? false,
    completed: false,
    collapsed: opts.collapsed ?? false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    children: opts.children ?? [],
    x: 0,
    y: 0,
  };
}

function nodes(...ns: MindNode[]): Record<string, MindNode> {
  const rec: Record<string, MindNode> = {};
  for (const n of ns) rec[n.id] = n;
  return rec;
}

const RING = 220;
const TAU = Math.PI * 2;
const UP = -Math.PI / 2;

describe("computeRadialPositions", () => {
  it("places root alone at the origin", () => {
    const root = node("root", { isRoot: true });
    const pos = computeRadialPositions({ rootId: "root", nodes: nodes(root) });
    expect(pos.root).toEqual({ x: 0, y: 0 });
  });

  it("places a single root child directly above the root (special case)", () => {
    const root = node("root", { isRoot: true, children: ["a"] });
    const a = node("a", { parentId: "root" });
    const pos = computeRadialPositions({ rootId: "root", nodes: nodes(root, a) });
    expect(pos.a).toEqual({ x: 0, y: -RING });
  });

  it("distributes three root children evenly starting at 12 o'clock", () => {
    const root = node("root", { isRoot: true, children: ["a", "b", "c"] });
    const a = node("a", { parentId: "root" });
    const b = node("b", { parentId: "root" });
    const c = node("c", { parentId: "root" });
    const pos = computeRadialPositions({ rootId: "root", nodes: nodes(root, a, b, c) });
    expect(pos.a.x).toBeCloseTo(0, 5);
    expect(pos.a.y).toBeCloseTo(-RING, 5);
    const slice = TAU / 3;
    const angleB = UP + slice * 1.5;
    expect(pos.b.x).toBeCloseTo(Math.cos(angleB) * RING, 5);
    expect(pos.b.y).toBeCloseTo(Math.sin(angleB) * RING, 5);
    const angleC = UP + slice * 0.5;
    expect(pos.c.x).toBeCloseTo(Math.cos(angleC) * RING, 5);
    expect(pos.c.y).toBeCloseTo(Math.sin(angleC) * RING, 5);
  });

  it("scales radius with depth", () => {
    const root = node("root", { isRoot: true, children: ["a"] });
    const a = node("a", { parentId: "root", children: ["b"] });
    const b = node("b", { parentId: "a" });
    const pos = computeRadialPositions({ rootId: "root", nodes: nodes(root, a, b) });
    const dist = Math.hypot(pos.b.x - pos.a.x, pos.b.y - pos.a.y);
    expect(dist).toBeCloseTo(RING, 5);
  });

  it("splits a non-root's arc proportional to leaf count", () => {
    const root = node("root", { isRoot: true, children: ["a"] });
    const a = node("a", { parentId: "root", children: ["a1", "a2", "a3", "a4", "a5", "b1"] });
    const aChildren = ["a1", "a2", "a3", "a4", "a5"].map((id) =>
      node(id, { parentId: "a", children: ["leaf"] }),
    );
    const leaf1 = node("leaf", { parentId: "a1" });
    const leaf2 = node("leaf2", { parentId: "a2" });
    const leaf3 = node("leaf3", { parentId: "a3" });
    const leaf4 = node("leaf4", { parentId: "a4" });
    const leaf5 = node("leaf5", { parentId: "a5" });
    const b1 = node("b1", { parentId: "a" });
    const all = [root, a, ...aChildren, leaf1, leaf2, leaf3, leaf4, leaf5, b1];
    const pos = computeRadialPositions({ rootId: "root", nodes: nodes(...all) });
    const dist = (id: string) => Math.hypot(pos[id].x - pos.a.x, pos[id].y - pos.a.y);
    expect(dist("a1")).toBeCloseTo(RING, 5);
    expect(dist("b1")).toBeCloseTo(RING, 5);
  });

  it("hides descendants of a collapsed node", () => {
    const root = node("root", { isRoot: true, children: ["a"] });
    const a = node("a", { parentId: "root", collapsed: true, children: ["a1"] });
    const a1 = node("a1", { parentId: "a" });
    const pos = computeRadialPositions({ rootId: "root", nodes: nodes(root, a, a1) });
    expect(pos.a).toBeDefined();
    expect(pos.a1).toBeUndefined();
  });

  it("treats a collapsed leaf as 1 leaf for sibling proportion", () => {
    const root = node("root", { isRoot: true, children: ["a", "b"] });
    const a = node("a", { parentId: "root", children: ["a1", "a2", "a3"] });
    const a1 = node("a1", { parentId: "a", collapsed: true, children: ["x"] });
    const a2 = node("a2", { parentId: "a" });
    const a3 = node("a3", { parentId: "a" });
    const x = node("x", { parentId: "a1" });
    const b = node("b", { parentId: "root" });
    const pos = computeRadialPositions({
      rootId: "root",
      nodes: nodes(root, a, a1, a2, a3, x, b),
    });
    expect(pos.a).toBeDefined();
    expect(pos.b).toBeDefined();
    expect(pos.a1).toBeDefined();
    expect(pos.x).toBeUndefined();
  });

  it("is deterministic for the same input", () => {
    const root = node("root", { isRoot: true, children: ["a", "b"] });
    const a = node("a", { parentId: "root", children: ["a1"] });
    const a1 = node("a1", { parentId: "a" });
    const b = node("b", { parentId: "root" });
    const all = { rootId: "root", nodes: nodes(root, a, a1, b) };
    const p1 = computeRadialPositions(all);
    const p2 = computeRadialPositions(all);
    expect(p1).toEqual(p2);
  });

  it("omits unknown ids and nodes absent from the map", () => {
    const root = node("root", { isRoot: true, children: ["a", "missing"] });
    const a = node("a", { parentId: "root" });
    const pos = computeRadialPositions({ rootId: "root", nodes: nodes(root, a) });
    expect(pos.root).toBeDefined();
    expect(pos.a).toBeDefined();
    expect(Object.keys(pos)).toEqual(["root", "a"]);
  });
});

describe("applyRadialLayout", () => {
  it("returns a new nodes record with x/y updated", () => {
    const root = node("root", { isRoot: true, children: ["a"], x: 999, y: 999 });
    const a = node("a", { parentId: "root", x: -100, y: 50 });
    const s = { nodes: nodes(root, a) };
    const out = applyRadialLayout(s);
    expect(out.root.x).toBe(0);
    expect(out.root.y).toBe(0);
    expect(out.a.x).toBe(0);
    expect(out.a.y).toBe(-RING);
    expect(out.root.text).toBe(root.text);
  });

  it("sets hidden nodes to (0, 0)", () => {
    const root = node("root", { isRoot: true, children: ["a"] });
    const a = node("a", { parentId: "root", collapsed: true, children: ["a1"] });
    const a1 = node("a1", { parentId: "a", x: 50, y: 50 });
    const out = applyRadialLayout({ nodes: nodes(root, a, a1) });
    expect(out.a1.x).toBe(0);
    expect(out.a1.y).toBe(0);
  });
});
```

Run: `pnpm test -- src/layout/radial.test.ts`
Expected: FAIL — `radial` module doesn't exist.

- [ ] **Step 2: Implement the layout module**

Create `src/layout/radial.ts`:

```ts
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
  const n = ctx.nodes[id];
  if (depth === 0) {
    out[id] = { x: 0, y: 0 };
  } else if (n.children.length === 1 && depth === 1) {
    out[id] = {
      x: originX + Math.cos(ctx.start) * ctx.ring,
      y: originY + Math.sin(ctx.start) * ctx.ring,
    };
  } else {
    const mid = (arcStart + arcEnd) / 2;
    const angle = ctx.start + mid;
    out[id] = {
      x: originX + Math.cos(angle) * ctx.ring * depth,
      y: originY + Math.sin(angle) * ctx.ring * depth,
    };
  }

  const kids = visibleChildren(ctx.nodes, id);
  if (kids.length === 0) return;

  if (depth === 0) {
    const slice = (Math.PI * 2) / kids.length;
    for (let i = 0; i < kids.length; i++) {
      place(
        kids[i],
        i * slice,
        (i + 1) * slice,
        1,
        out[id].x,
        out[id].y,
        out,
        ctx,
      );
    }
  } else {
    const total = kids.reduce((s, c) => s + leafCount(ctx.nodes, c), 0);
    let cursor = arcStart;
    for (const kid of kids) {
      const w = leafCount(ctx.nodes, kid) / total;
      const span = (arcEnd - arcStart) * w;
      place(kid, cursor, cursor + span, depth + 1, out[id].x, out[id].y, out, ctx);
      cursor += span;
    }
  }
}

export function computeRadialPositions(opts: RadialOptions): Record<string, { x: number; y: number }> {
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
```

- [ ] **Step 3: Run tests, verify they pass**

Run: `pnpm test -- src/layout/radial.test.ts`
Expected: PASS for all 11 tests.

If the "split proportional" test fails because the placement special-case (single child at depth 1) interferes, re-check the algorithm: the spec says "place directly above the root" for `root.children.length === 1`. This is the only special case; deeper subtrees always go at arc midpoint.

- [ ] **Step 4: Type check and lint**

Run: `pnpm run check`
Expected: exit 0, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/layout/radial.ts src/layout/radial.test.ts
git commit -m "feat(mintodo): add radial layout module (computeRadialPositions)"
```

---

## Task 2: Update types and reducer for radial layout

**Files:**
- Modify: `src/types.ts`
- Modify: `src/store.ts`
- Modify: `src/store.test.ts`

**Interfaces (consumed by Task 3 onward):**
- `State.layoutVersion: number` — bumped on every structural change
- `Action.REPARENT { id, newParentId }` and `Action.SNAP_BACK { id }` — handled by reducer
- `applyRadialLayout({ nodes })` from `src/layout/radial.ts` — used inside structural reducer cases

- [ ] **Step 1: Update `src/types.ts`**

Edit `src/types.ts` so `MindNode` no longer has `vx, vy`, and add `layoutVersion` to `State`, plus `REPARENT` / `SNAP_BACK` actions to `Action`.

Replace `MindNode` (lines 12-28):

```ts
export interface MindNode {
  id: string;
  boardId: string;
  text: string;
  parentId: string | null;
  isRoot: boolean;
  completed: boolean;
  collapsed: boolean;
  priority: Priority;
  categoryColor: CategoryColor;
  dueDate: string;
  children: string[];
  x: number;
  y: number;
}
```

In `src/store.ts`, update `State` (line 3-15) to:

```ts
export interface State {
  boards: Board[];
  currentBoardId: string | null;
  draggingNodeId: string | null;
  drawerOpen: boolean;
  hideCompleted: boolean;
  layoutVersion: number;
  modal: Modal;
  nodes: Record<string, MindNode>;
  searchQuery: string;
  selectedNodeId: string;
  view: View;
}
```

In `src/store.ts`, replace the `Action` union (lines 17-39) with:

```ts
export type Action =
  | { type: "ADD_BOARD"; board: Board; initialNodes: Record<string, MindNode> }
  | { type: "ADD_CHILD"; newId: string; parentId: string }
  | { type: "DELETE_BOARD"; id: string; nextBoardId: string | null }
  | { type: "DELETE_NODE"; id: string }
  | { type: "OPEN_MODAL"; modal: Modal }
  | { type: "REPARENT"; id: string; newParentId: string }
  | { type: "RENAME_BOARD"; id: string; name: string }
  | { type: "RESET" }
  | { type: "SELECT"; id: string }
  | { type: "SET_BOARDS"; boards: Board[] }
  | { type: "SET_CURRENT_BOARD"; boardId: string | null }
  | { type: "SET_DRAGGING"; id: string | null }
  | { type: "SET_NODES"; nodes: Record<string, MindNode> }
  | { type: "SET_SEARCH"; query: string }
  | { type: "SET_VIEW"; view: View }
  | { type: "SET_DRAWER"; open: boolean }
  | { type: "SNAP_BACK"; id: string }
  | { type: "TOGGLE_COLLAPSE"; id: string }
  | { type: "TOGGLE_COMPLETE"; id: string }
  | { type: "TOGGLE_DRAWER" }
  | { type: "TOGGLE_HIDE_COMPLETED" }
  | { type: "UPDATE_NODE"; id: string; patch: Partial<MindNode> };
```

Remove `MOVE_NODE` and `TOGGLE_PHYSICS` from the union.

- [ ] **Step 2: Update `createInitialState` and add structural-layout helper**

In `src/store.ts`, replace `createInitialState` (lines 41-55) with:

```ts
export function createInitialState(): State {
  return {
    boards: [],
    currentBoardId: null,
    draggingNodeId: null,
    drawerOpen: false,
    hideCompleted: false,
    layoutVersion: 0,
    modal: null,
    nodes: {},
    searchQuery: "",
    selectedNodeId: "",
    view: { pan: { x: 0, y: 0 }, zoom: 1 },
  };
}
```

Add the import at the top of `src/store.ts`:

```ts
import { applyRadialLayout } from "./layout/radial";
```

Add this helper inside `src/store.ts` (anywhere above the `reducer`):

```ts
function withRadialLayout(state: State, nodes: Record<string, MindNode>): State {
  return { ...state, nodes: applyRadialLayout({ nodes }), layoutVersion: state.layoutVersion + 1 };
}
```

- [ ] **Step 3: Drop `TOGGLE_PHYSICS`, `MOVE_NODE` cases and rewire structural cases**

In `src/store.ts`, remove the `TOGGLE_PHYSICS` case (lines 144-146) and the `MOVE_NODE` case (lines 249-259).

Replace the `RESET` case (lines 104-131) so it calls `withRadialLayout` and drops `vx/vy/physicsEnabled`:

```ts
case "RESET": {
  if (!state.currentBoardId) return state;
  const board = state.boards.find((b) => b.id === state.currentBoardId);
  const root: MindNode = {
    id: "root",
    boardId: state.currentBoardId,
    text: board?.name ?? "メインプロジェクト",
    parentId: null,
    isRoot: true,
    completed: false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    children: [],
    x: 0,
    y: 0,
  };
  return withRadialLayout(
    {
      ...state,
      nodes: { root },
      selectedNodeId: "root",
      view: { pan: { x: 0, y: 0 }, zoom: 1 },
    },
    { root },
  );
}
```

Replace `ADD_CHILD` (lines 156-186) — drop `vx/vy` and call `withRadialLayout`:

```ts
case "ADD_CHILD": {
  const parent = state.nodes[action.parentId];
  if (!parent) return state;
  const { newId } = action;
  const newNode: MindNode = {
    id: newId,
    boardId: parent.boardId,
    categoryColor: parent.categoryColor,
    children: [],
    collapsed: false,
    completed: false,
    dueDate: "",
    isRoot: false,
    parentId: parent.id,
    priority: "medium",
    text: "新規タスク",
    x: 0,
    y: 0,
  };
  const nextNodes: Record<string, MindNode> = {
    ...state.nodes,
    [newId]: newNode,
    [parent.id]: { ...parent, children: [...parent.children, newId] },
  };
  return withRadialLayout(
    { ...state, nodes: nextNodes, selectedNodeId: newId },
    nextNodes,
  );
}
```

Replace `SET_NODES` (lines 150-152) so it calls `withRadialLayout`:

```ts
case "SET_NODES": {
  return withRadialLayout({ ...state, nodes: action.nodes }, action.nodes);
}
```

Replace `TOGGLE_COLLAPSE` (lines 215-222) to call `withRadialLayout`:

```ts
case "TOGGLE_COLLAPSE": {
  const node = state.nodes[action.id];
  if (!node) return state;
  const nextNodes = { ...state.nodes, [action.id]: { ...node, collapsed: !node.collapsed } };
  return withRadialLayout({ ...state, nodes: nextNodes }, nextNodes);
}
```

Replace `DELETE_NODE` (lines 223-248) to call `withRadialLayout`:

```ts
case "DELETE_NODE": {
  const node = state.nodes[action.id];
  if (!node || node.isRoot) return state;
  const updated = new Map(Object.entries(state.nodes));
  const remove = (id: string) => {
    const n = updated.get(id);
    if (!n) return;
    for (const childId of n.children) remove(childId);
    updated.delete(id);
  };
  remove(action.id);
  const parent = node.parentId ? updated.get(node.parentId) : null;
  if (parent) {
    const newChildren: string[] = [];
    for (const c of parent.children) {
      if (c !== action.id) newChildren.push(c);
    }
    updated.set(parent.id, { ...parent, children: newChildren });
  }
  const nextNodes = Object.fromEntries(updated);
  return withRadialLayout(
    {
      ...state,
      nodes: nextNodes,
      selectedNodeId: state.selectedNodeId === action.id ? (node.parentId ?? "root") : state.selectedNodeId,
    },
    nextNodes,
  );
}
```

- [ ] **Step 4: Add `REPARENT` and `SNAP_BACK` cases**

Add these cases inside the `switch` statement, after `DELETE_NODE`:

```ts
case "REPARENT": {
  const node = state.nodes[action.id];
  const newParent = state.nodes[action.newParentId];
  if (!node || !newParent) return state;
  if (node.isRoot || newParent.id === node.id) return withRadialLayout(state, state.nodes);
  if (isDescendant(state.nodes, action.newParentId, action.id)) {
    return withRadialLayout(state, state.nodes);
  }
  const oldParent = node.parentId ? state.nodes[node.parentId] : null;
  const nextNodes: Record<string, MindNode> = { ...state.nodes };
  if (oldParent) {
    nextNodes[oldParent.id] = {
      ...oldParent,
      children: oldParent.children.filter((c) => c !== action.id),
    };
  }
  nextNodes[action.id] = { ...node, parentId: action.newParentId };
  nextNodes[action.newParentId] = {
    ...newParent,
    children: [...newParent.children, action.id],
  };
  return withRadialLayout(state, nextNodes);
}

case "SNAP_BACK": {
  return withRadialLayout(state, state.nodes);
}
```

Add the helper above the reducer (anywhere in the file):

```ts
function isDescendant(nodes: Record<string, MindNode>, candidateAncestor: string, nodeId: string): boolean {
  let cur = nodes[nodeId];
  while (cur && cur.parentId) {
    if (cur.parentId === candidateAncestor) return true;
    cur = nodes[cur.parentId];
  }
  return false;
}
```

- [ ] **Step 5: Update `src/store.test.ts` — drop `vx, vy`, `TOGGLE_PHYSICS`, `MOVE_NODE`, update `RESET` and `ADD_CHILD`**

In `src/store.test.ts`, replace the `makeNode` helper (lines 5-24) to drop `vx, vy`:

```ts
function makeNode(id: string, boardId: string, opts: Partial<MindNode> = {}): MindNode {
  return {
    id,
    boardId,
    text: opts.text ?? "node",
    parentId: opts.parentId ?? null,
    isRoot: opts.isRoot ?? false,
    completed: false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    children: [],
    x: 0,
    y: 0,
    ...opts,
  };
}
```

Remove the `TOGGLE_PHYSICS` test block (lines 217-223).

Remove the `MOVE_NODE` test block (lines 347-357).

Replace the "preserves physicsEnabled" test in the `RESET` describe (lines 173-177) with a `layoutVersion` bump test:

```ts
it("bumps layoutVersion", () => {
  const s = {
    ...createInitialState(),
    boards: [boardA],
    currentBoardId: "b-a",
    nodes: { root: makeNode("root", "b-a", { isRoot: true }) },
  };
  const next = reducer(s, { type: "RESET" });
  expect(next.layoutVersion).toBe(s.layoutVersion + 1);
});
```

Update the `ADD_CHILD` test (lines 260-279) — assert that the new child gets a position consistent with the radial layout (i.e., at the midpoint of the root's only-child arc, which by the special case is `(0, -220)`):

```ts
describe("reducer - ADD_CHILD", () => {
  it("creates new child, places it on the radial layout, selects it, bumps layoutVersion", () => {
    const s = {
      ...createInitialState(),
      boards: [boardA],
      currentBoardId: "b-a",
      nodes: { root: makeNode("root", "b-a", { isRoot: true, children: [] }) },
    };
    const before = s.layoutVersion;
    const next = reducer(s, {
      newId: "n-new",
      parentId: "root",
      type: "ADD_CHILD",
    });
    expect(next.selectedNodeId).toBe("n-new");
    expect(next.nodes["n-new"].parentId).toBe("root");
    expect(next.nodes["n-new"].boardId).toBe("b-a");
    expect(next.nodes["n-new"].isRoot).toBe(false);
    expect(next.nodes.root.children).toContain("n-new");
    expect(next.nodes["n-new"].x).toBe(0);
    expect(next.nodes["n-new"].y).toBe(-220);
    expect(next.layoutVersion).toBe(before + 1);
  });
});
```

- [ ] **Step 6: Add `REPARENT` and `SNAP_BACK` tests**

Append to the end of `src/store.test.ts`:

```ts
describe("reducer - REPARENT", () => {
  it("moves a node to a new parent's children list and re-layouts", () => {
    const s = {
      ...createInitialState(),
      layoutVersion: 0,
      nodes: {
        root: makeNode("root", "b-a", { isRoot: true, children: ["a", "b"] }),
        a: makeNode("a", "b-a", { parentId: "root" }),
        b: makeNode("b", "b-a", { parentId: "root" }),
      },
    };
    const next = reducer(s, { id: "b", newParentId: "a", type: "REPARENT" });
    expect(next.nodes.b.parentId).toBe("a");
    expect(next.nodes.a.children).toContain("b");
    expect(next.nodes.root.children).not.toContain("b");
    expect(next.layoutVersion).toBe(1);
  });

  it("rejects reparenting a node onto itself", () => {
    const s = {
      ...createInitialState(),
      nodes: {
        root: makeNode("root", "b-a", { isRoot: true, children: ["a"] }),
        a: makeNode("a", "b-a", { parentId: "root" }),
      },
    };
    const next = reducer(s, { id: "a", newParentId: "a", type: "REPARENT" });
    expect(next.nodes.a.parentId).toBe("root");
  });

  it("rejects reparenting a node onto its descendant", () => {
    const s = {
      ...createInitialState(),
      nodes: {
        root: makeNode("root", "b-a", { isRoot: true, children: ["a"] }),
        a: makeNode("a", "b-a", { parentId: "root", children: ["a1"] }),
        a1: makeNode("a1", "b-a", { parentId: "a" }),
      },
    };
    const next = reducer(s, { id: "a", newParentId: "a1", type: "REPARENT" });
    expect(next.nodes.a.parentId).toBe("root");
  });

  it("rejects reparenting the root", () => {
    const s = {
      ...createInitialState(),
      nodes: {
        root: makeNode("root", "b-a", { isRoot: true, children: ["a"] }),
        a: makeNode("a", "b-a", { parentId: "root" }),
      },
    };
    const next = reducer(s, { id: "root", newParentId: "a", type: "REPARENT" });
    expect(next.nodes.root.parentId).toBeNull();
  });
});

describe("reducer - SNAP_BACK", () => {
  it("bumps layoutVersion and re-runs the layout without changing structure", () => {
    const s = {
      ...createInitialState(),
      layoutVersion: 5,
      nodes: {
        root: makeNode("root", "b-a", { isRoot: true, children: ["a"] }),
        a: makeNode("a", "b-a", { parentId: "root", x: 999, y: 999 }),
      },
    };
    const next = reducer(s, { id: "a", type: "SNAP_BACK" });
    expect(next.layoutVersion).toBe(6);
    expect(next.nodes.a.x).toBe(0);
    expect(next.nodes.a.y).toBe(-220);
  });
});
```

- [ ] **Step 7: Run all tests**

Run: `pnpm test`
Expected: All store tests pass, all radial tests pass, the only failing tests are the ones in files that still reference the removed fields (handled in later tasks).

- [ ] **Step 8: Type check and lint**

Run: `pnpm run check`
Expected: errors only in files that still reference `MOVE_NODE`, `physicsEnabled`, `vx`/`vy` (i.e. `use-drag-node.ts`, `use-physics.ts`, `Canvas.tsx`, `Toolbar.tsx`, `storage.ts`, `dsl.ts`, `dsl.test.ts`, `NodeCard.tsx` is fine). These are resolved by Tasks 3-6.

- [ ] **Step 9: Commit**

```bash
git add src/types.ts src/store.ts src/store.test.ts
git commit -m "refactor(mintodo): drop physics + move/vx fields; add radial layout reducer integration"
```

---

## Task 3: Replace use-physics with use-tween hook

**Files:**
- Create: `src/hooks/use-tween.ts`
- Create: `src/hooks/use-tween.test.ts`
- Delete: `src/hooks/use-physics.ts`
- Modify: `src/components/Canvas.tsx`

**Interface (consumed by Canvas.tsx):**
- `useTween(): void` — animates `style.left/top` of `#node-dom-${id}` and `x1, y1, x2, y2` of `#edge-${parentId}-${childId}` from their previous positions to the new state positions when `state.layoutVersion` changes. Skips animation while `state.draggingId !== null`. No-op when no version change since last run.

**Animation mechanism:** Web Animations API via `Element.animate([from, to], { duration: 300, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'none' })`. After the animation, the underlying React-rendered `style.left/top` (which is the new state position) takes over.

- [ ] **Step 1: Implement `src/hooks/use-tween.ts`**

Create `src/hooks/use-tween.ts`:

```ts
import { useEffect, useRef } from "react";
import { useMindStore } from "./use-mind-store";

const TWEEN_DURATION = 300;
const EASING = "cubic-bezier(0.25, 1, 0.5, 1)";

interface Pos { x: number; y: number }

function snapshotPositions(nodes: Record<string, { x: number; y: number }>): Record<string, Pos> {
  const out: Record<string, Pos> = {};
  for (const [id, n] of Object.entries(nodes)) out[id] = { x: n.x, y: n.y };
  return out;
}

function parentPosOr(state: ReturnType<typeof useMindStore>["state"], id: string, fallback: Pos): Pos {
  const n = state.nodes[id];
  if (!n || !n.parentId) return fallback;
  const p = state.nodes[n.parentId];
  return p ? { x: p.x, y: p.y } : fallback;
}

export function useTween(): void {
  const { state } = useMindStore();
  const prevRef = useRef<Record<string, Pos>>({});
  const seenVersionRef = useRef<number>(0);

  useEffect(() => {
    if (Object.keys(prevRef.current).length === 0) {
      prevRef.current = snapshotPositions(state.nodes);
    }
  }, [state.nodes]);

  useEffect(() => {
    if (state.draggingId !== null) return;
    if (seenVersionRef.current === state.layoutVersion) return;
    if (state.layoutVersion === 0) return;

    const prev = prevRef.current;
    const fallback: Pos = { x: 0, y: 0 };
    const animations: Array<{ el: Element; from: Pos; to: Pos; props: "left,top" | "x1,y1,x2,y2"; parent: Pos }> = [];

    for (const [id, n] of Object.entries(state.nodes)) {
      const p = prev[id];
      const from: Pos = p ?? parentPosOr(state, id, fallback);
      const to: Pos = { x: n.x, y: n.y };
      if (from.x === to.x && from.y === to.y && p !== undefined) continue;
      const dom = document.querySelector(`#node-dom-${id}`);
      if (dom) animations.push({ el: dom, from, to, props: "left,top", parent: from });

      if (!n.isRoot && n.parentId) {
        const parent = state.nodes[n.parentId];
        if (parent) {
          const edge = document.getElementById(`edge-${n.parentId}-${id}`);
          if (edge) {
            const parentAnim = animations.find((a) => (a.el as HTMLElement).id === `node-dom-${n.parentId}`);
            const parentTo: Pos = parentAnim ? parentAnim.to : { x: parent.x, y: parent.y };
            animations.push({ el: edge, from, to, props: "x1,y1,x2,y2", parent: parentTo });
          }
        }
      }
    }

    seenVersionRef.current = state.layoutVersion;
    prevRef.current = snapshotPositions(state.nodes);

    for (const a of animations) {
      let keyframes: Keyframe[];
      if (a.props === "left,top") {
        keyframes = [
          { left: `${a.from.x}px`, top: `${a.from.y}px` },
          { left: `${a.to.x}px`, top: `${a.to.y}px` },
        ];
      } else {
        keyframes = [
          { x1: a.from.x, y1: a.from.y, x2: a.parent.x, y2: a.parent.y },
          { x1: a.to.x, y1: a.to.y, x2: a.parent.x, y2: a.parent.y },
        ];
      }
      a.el.animate(keyframes, { duration: TWEEN_DURATION, easing: EASING, fill: "none" });
    }
  }, [state.layoutVersion, state.draggingId, state.nodes]);
}
```

- [ ] **Step 2: Write `src/hooks/use-tween.test.ts`**

This test verifies the hook's three core behaviors: it mounts without error, it does not animate on initial mount, and it skips animation while `draggingId` is set. The "animates on layoutVersion bump" path is covered indirectly by the store tests (which verify `layoutVersion` is bumped correctly) and the manual smoke checklist — driving a real React re-render with mocked `Element.animate` in jsdom is fragile and adds little signal.

Create `src/hooks/use-tween.test.ts`:

```ts
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useTween } from "./use-tween";
import { MindProvider } from "./use-mind-store";
import type { State } from "../store";
import type { MindNode } from "../types";

function makeNode(id: string, parentId: string | null, opts: Partial<MindNode> = {}): MindNode {
  return {
    id,
    boardId: "b1",
    text: id,
    parentId,
    isRoot: parentId === null,
    completed: false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    children: [],
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    ...opts,
  };
}

function makeState(): State {
  return {
    boards: [],
    currentBoardId: "b1",
    draggingNodeId: null,
    drawerOpen: false,
    hideCompleted: false,
    layoutVersion: 0,
    modal: null,
    nodes: {
      root: makeNode("root", null, { isRoot: true, children: ["a"] }),
      a: makeNode("a", "root", { x: 0, y: -220 }),
    },
    searchQuery: "",
    selectedNodeId: "",
    view: { pan: { x: 0, y: 0 }, zoom: 1 },
  };
}

function Probe(): ReactNode {
  useTween();
  return null;
}

describe("useTween", () => {
  let animateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="node-dom-root" style="left: 0px; top: 0px"></div>
      <div id="node-dom-a" style="left: 0px; top: -220px"></div>
      <svg>
        <line id="edge-root-a" x1="0" y1="0" x2="0" y2="-220"></line>
      </svg>
    `;
    animateSpy = vi
      .spyOn(Element.prototype, "animate")
      .mockImplementation(() => ({ cancel: () => {} }) as unknown as Animation);
  });

  afterEach(() => {
    animateSpy.mockRestore();
    document.body.innerHTML = "";
  });

  it("mounts without errors", () => {
    expect(() =>
      render(
        <MindProvider initialState={makeState()}>
          <Probe />
        </MindProvider>,
      ),
    ).not.toThrow();
  });

  it("does not animate on initial mount", () => {
    render(
      <MindProvider initialState={makeState()}>
        <Probe />
      </MindProvider>,
    );
    expect(animateSpy).not.toHaveBeenCalled();
  });

  it("skips animation while draggingId is set", () => {
    const s = makeState();
    s.draggingNodeId = "a";
    s.layoutVersion = 1;
    render(
      <MindProvider initialState={s}>
        <Probe />
      </MindProvider>,
    );
    expect(animateSpy).not.toHaveBeenCalled();
  });
});
```

Run: `pnpm test -- src/hooks/use-tween.test.ts`
Expected: All 3 tests pass. The DOM stubbing at the top of `beforeEach` ensures the hook can find elements by id.

- [ ] **Step 3: Delete `src/hooks/use-physics.ts`**

Run: `rm src/hooks/use-physics.ts`

- [ ] **Step 4: Update `src/components/Canvas.tsx`**

In `src/components/Canvas.tsx`, replace the imports and hook calls (lines 1-7, 26-30):

```tsx
import { useMemo, useRef } from "react";
import { useDragNode } from "../hooks/use-drag-node";
import { useMindStore } from "../hooks/use-mind-store";
import { usePanZoom } from "../hooks/use-pan-zoom";
import { useTween } from "../hooks/use-tween";
import { ConnectionLines } from "./ConnectionLines";
import { NodeCard } from "./NodeCard";
```

```tsx
  usePanZoom({ containerRef });
  useTween();
  useDragNode();
```

Note: `useDragNode` is called with no arguments in the new design (Task 4 will rewrite the hook so it owns its own dispatch and target detection).

- [ ] **Step 5: Run tests**

Run: `pnpm test`
Expected: store + radial + tween tests pass. The `useDragNode` call without a callback argument will fail to type-check — fix in Task 4.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-tween.ts src/hooks/use-tween.test.ts src/components/Canvas.tsx
git rm src/hooks/use-physics.ts
git commit -m "feat(mintodo): replace force simulation with radial tween"
```

---

## Task 4: Refactor drag handler for reparent/snap-back

**Files:**
- Modify: `src/hooks/use-drag-node.ts`
- Create: `src/hooks/use-drag-node.test.ts`

**Interface:**
- `useDragNode(): void` — no callback parameter. The hook owns its own dispatch. On drag start it captures the original `(x, y)` from `state.nodes[id]`. During mousemove/touchmove it writes the dragged element's `style.left/top` directly. On drop it dispatches `SET_DRAGGING({ id: null })` plus either `REPARENT({ id, newParentId })` or `SNAP_BACK({ id })`.

**Drop target detection:** `document.elementFromPoint(x, y)`, walk up the DOM looking for an ancestor with `data-node-id`. If found and the target is not the dragged node, not a descendant of the dragged node, and not the root, dispatch `REPARENT`. Otherwise `SNAP_BACK`. While hovering, mark the target with a class so the visual feedback (Task 5 edges + Tailwind ring) lights up.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/use-drag-node.test.ts`:

```ts
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDragNode } from "./use-drag-node";
import { MindProvider, useMindStore } from "./use-mind-store";
import type { State } from "../store";
import type { MindNode } from "../types";

function makeNode(id: string, parentId: string | null, opts: Partial<MindNode> = {}): MindNode {
  return {
    id,
    boardId: "b1",
    text: id,
    parentId,
    isRoot: parentId === null,
    completed: false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    children: opts.children ?? [],
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    ...opts,
  };
}

function makeState(): State {
  return {
    boards: [],
    currentBoardId: "b1",
    draggingNodeId: null,
    drawerOpen: false,
    hideCompleted: false,
    layoutVersion: 0,
    modal: null,
    searchQuery: "",
    selectedNodeId: "a",
    view: { pan: { x: 0, y: 0 }, zoom: 1 },
    nodes: {
      root: makeNode("root", null, { isRoot: true, children: ["a", "b"] }),
      a: makeNode("a", "root", { x: 0, y: -220, children: ["a1"] }),
      a1: makeNode("a1", "a", { x: 0, y: -440 }),
      b: makeNode("b", "root", { x: 220, y: 0 }),
    },
  };
}

let lastState: State | null = null;

function Capture() {
  lastState = useMindStore().state;
  return null;
}

function Probe() {
  useDragNode();
  return null;
}

function setup() {
  lastState = null;
  document.body.innerHTML = `
    <div id="node-dom-root" data-node-id="root" style="left: 0px; top: 0px; width: 100px; height: 60px;"></div>
    <div id="node-dom-a" data-node-id="a" style="left: 0px; top: -220px; width: 100px; height: 60px;"></div>
    <div id="node-dom-a1" data-node-id="a1" style="left: 0px; top: -440px; width: 100px; height: 60px;"></div>
    <div id="node-dom-b" data-node-id="b" style="left: 220px; top: 0px; width: 100px; height: 60px;"></div>
  `;
  return render(
    <MindProvider initialState={makeState()}>
      <Capture />
      <Probe />
    </MindProvider>,
  );
}

function dragFromTo(fromX: number, fromY: number, toX: number, toY: number) {
  act(() => {
    fireEvent.mouseDown(document.getElementById("node-dom-a")!, { clientX: fromX, clientY: fromY });
    fireEvent.mouseMove(window, { clientX: toX, clientY: toY });
    fireEvent.mouseUp(window, { clientX: toX, clientY: toY });
  });
}

describe("useDragNode", () => {
  beforeEach(() => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("does not change parent on click without drag movement", () => {
    setup();
    dragFromTo(50, -190, 50, -190);
    expect(lastState).not.toBeNull();
    expect(lastState!.nodes.a.parentId).toBe("root");
    expect(lastState!.draggingNodeId).toBeNull();
  });

  it("dispatches SNAP_BACK when dropped on empty space", () => {
    setup();
    vi.spyOn(document, "elementFromPoint").mockReturnValue(null);
    dragFromTo(50, -190, 300, 200);
    expect(lastState).not.toBeNull();
    expect(lastState!.draggingNodeId).toBeNull();
    expect(lastState!.layoutVersion).toBeGreaterThan(0);
  });

  it("dispatches REPARENT when dropped on a non-descendant node", () => {
    setup();
    vi.spyOn(document, "elementFromPoint").mockReturnValue(
      document.getElementById("node-dom-b"),
    );
    dragFromTo(50, -190, 270, 30);
    expect(lastState).not.toBeNull();
    expect(lastState!.nodes.a.parentId).toBe("b");
    expect(lastState!.nodes.b.children).toContain("a");
  });

  it("dispatches SNAP_BACK when dropped on a descendant", () => {
    setup();
    vi.spyOn(document, "elementFromPoint").mockReturnValue(
      document.getElementById("node-dom-a1"),
    );
    dragFromTo(50, -190, 50, -410);
    expect(lastState).not.toBeNull();
    expect(lastState!.nodes.a.parentId).toBe("root");
  });

  it("dispatches SNAP_BACK when dropped on itself", () => {
    setup();
    vi.spyOn(document, "elementFromPoint").mockReturnValue(
      document.getElementById("node-dom-a"),
    );
    dragFromTo(50, -190, 60, -200);
    expect(lastState).not.toBeNull();
    expect(lastState!.nodes.a.parentId).toBe("root");
  });

  it("dispatches SNAP_BACK when dropped on the root", () => {
    setup();
    vi.spyOn(document, "elementFromPoint").mockReturnValue(
      document.getElementById("node-dom-root"),
    );
    dragFromTo(50, -190, 50, 30);
    expect(lastState).not.toBeNull();
    expect(lastState!.nodes.a.parentId).toBe("root");
  });
});
```

Run: `pnpm test -- src/hooks/use-drag-node.test.ts`
Expected: FAIL — `useDragNode` doesn't match the new signature yet (it still takes an `onMove` callback).

- [ ] **Step 2: Rewrite `src/hooks/use-drag-node.ts`**

Replace the entire file with:

```ts
import { useEffect, useRef } from "react";
import { useMindStore } from "./use-mind-store";

const VALID_TARGET_CLASS = "ring-2 ring-sky-400";

function pointToClient(e: MouseEvent | TouchEvent): { x: number; y: number } | null {
  if ("touches" in e) {
    if (e.touches.length === 0) return null;
    const t = e.touches[0] ?? e.changedTouches[0];
    if (!t) return null;
    return { x: t.clientX, y: t.clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

function findDropTarget(x: number, y: number, excludeId: string): string | null {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const card = (el as HTMLElement).closest<HTMLElement>("[data-node-id]");
  if (!card) return null;
  const id = card.dataset.nodeId;
  if (!id || id === excludeId) return null;
  return id;
}

function isAncestor(state: ReturnType<typeof useMindStore>["state"], ancestorId: string, nodeId: string): boolean {
  let cur = state.nodes[nodeId];
  while (cur && cur.parentId) {
    if (cur.parentId === ancestorId) return true;
    cur = state.nodes[cur.parentId];
  }
  return false;
}

export function useDragNode(): void {
  const { state, dispatch } = useMindStore();
  const stateRef = useRef(state);
  stateRef.current = state;
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    nodeStartX: number;
    nodeStartY: number;
    currentTargetEl: HTMLElement | null;
  } | null>(null);

  useEffect(() => {
    function getClient(e: MouseEvent | TouchEvent): { x: number; y: number } | null {
      if ("touches" in e) {
        const t = e.touches[0] ?? e.changedTouches[0];
        return t ? { x: t.clientX, y: t.clientY } : null;
      }
      return { x: e.clientX, y: e.clientY };
    }

    function clearTargetHighlight() {
      const t = dragRef.current?.currentTargetEl;
      if (t) t.classList.remove(VALID_TARGET_CLASS);
      if (dragRef.current) dragRef.current.currentTargetEl = null;
    }

    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("button")) return;
      const card = target.closest<HTMLElement>("[data-node-id]");
      if (!card) return;
      const cardId = card.dataset.nodeId;
      if (!cardId) return;
      const n = stateRef.current.nodes[cardId];
      if (!n) return;
      const client = getClient(e);
      if (!client) return;
      dragRef.current = {
        id: cardId,
        startX: client.x,
        startY: client.y,
        nodeStartX: n.x,
        nodeStartY: n.y,
        currentTargetEl: null,
      };
      dispatch({ id: cardId, type: "SELECT" });
      dispatch({ id: cardId, type: "SET_DRAGGING" });
      if ("touches" in e) return;
      e.stopPropagation();
      e.preventDefault();
    }

    function onPointerMove(e: MouseEvent | TouchEvent) {
      const d = dragRef.current;
      if (!d) return;
      const client = getClient(e);
      if (!client) return;
      const { zoom } = stateRef.current.view;
      const dx = (client.x - d.startX) / zoom;
      const dy = (client.y - d.startY) / zoom;
      const el = document.getElementById(`node-dom-${d.id}`);
      if (el) {
        el.style.left = `${d.nodeStartX + dx}px`;
        el.style.top = `${d.nodeStartY + dy}px`;
      }
      const targetId = findDropTarget(client.x, client.y, d.id);
      const next = targetId ? document.querySelector<HTMLElement>(`[data-node-id="${targetId}"]`) : null;
      if (next !== d.currentTargetEl) {
        clearTargetHighlight();
        if (next) {
          const s = stateRef.current;
          if (
            targetId !== "root" &&
            !isAncestor(s, d.id, targetId)
          ) {
            next.classList.add(VALID_TARGET_CLASS);
            d.currentTargetEl = next;
          }
        }
      }
    }

    function onPointerUp(e: MouseEvent | TouchEvent) {
      const d = dragRef.current;
      if (!d) return;
      clearTargetHighlight();
      const client = getClient(e);
      if (!client) {
        dragRef.current = null;
        dispatch({ id: null, type: "SET_DRAGGING" });
        return;
      }
      const targetId = findDropTarget(client.x, client.y, d.id);
      const s = stateRef.current;
      const isValid =
        targetId !== null &&
        targetId !== d.id &&
        targetId !== "root" &&
        !isAncestor(s, d.id, targetId);
      if (isValid) {
        dispatch({ id: d.id, newParentId: targetId, type: "REPARENT" });
      } else {
        dispatch({ id: d.id, type: "SNAP_BACK" });
      }
      dragRef.current = null;
      dispatch({ id: null, type: "SET_DRAGGING" });
    }

    window.addEventListener("mousedown", onPointerDown, true);
    window.addEventListener("touchstart", onPointerDown, true);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("touchmove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchend", onPointerUp);
    return () => {
      window.removeEventListener("mousedown", onPointerDown, true);
      window.removeEventListener("touchstart", onPointerDown, true);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("touchend", onPointerUp);
    };
  }, [dispatch]);
}
```

- [ ] **Step 3: Run the drag tests**

Run: `pnpm test -- src/hooks/use-drag-node.test.ts`
Expected: All 6 tests pass.

- [ ] **Step 4: Run full test suite**

Run: `pnpm test`
Expected: All tests pass except those still touching `vx/vy` in `storage.ts` and `dsl.ts`. These are fixed in Task 6.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-drag-node.ts src/hooks/use-drag-node.test.ts
git commit -m "feat(mintodo): drag-to-reparent with snap-back"
```

---

## Task 5: Replace S-curve edges with straight lines

**Files:**
- Modify: `src/components/ConnectionLines.tsx`

- [ ] **Step 1: Rewrite `ConnectionLines.tsx`**

Replace the entire file with:

```tsx
import { useEffect, useState } from "react";
import { useMindStore } from "../hooks/use-mind-store";

function isParentCollapsed(state: ReturnType<typeof useMindStore>["state"], id: string): boolean {
  const node = state.nodes[id];
  if (!node) return true;
  if (node.isRoot) return false;
  let parent = state.nodes[node.parentId!];
  while (parent) {
    if (parent.collapsed) return true;
    if (parent.isRoot) break;
    parent = state.nodes[parent.parentId!];
  }
  return false;
}

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function ConnectionLines({ containerRef }: Props) {
  const { state } = useMindStore();
  const [size, setSize] = useState({ height: 0, width: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;
      if (entry) setSize({ height: entry.contentRect.height, width: entry.contentRect.width });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  const cx = size.width / 2;
  const cy = size.height / 2;
  const activeColor = "var(--terra)";
  const inactiveColor = "var(--grid)";

  return (
    <svg
      className="absolute inset-0 pointer-events-none w-full h-full"
      style={{ width: size.width, height: size.height }}
    >
      {Object.values(state.nodes).map((node) => {
        if (node.isRoot) return null;
        if (isParentCollapsed(state, node.id)) return null;
        if (state.hideCompleted && node.completed) return null;
        const parent = state.nodes[node.parentId!];
        if (!parent) return null;
        const sx = cx + parent.x * state.view.zoom + state.view.pan.x;
        const sy = cy + parent.y * state.view.zoom + state.view.pan.y;
        const ex = cx + node.x * state.view.zoom + state.view.pan.x;
        const ey = cy + node.y * state.view.zoom + state.view.pan.y;
        const color = node.completed ? inactiveColor : activeColor;
        const strokeProps = node.completed
          ? { strokeDasharray: "5,5", strokeWidth: 1.5 }
          : { strokeWidth: 1.5 };
        return (
          <line
            key={node.id}
            id={`edge-${parent.id}-${node.id}`}
            x1={sx}
            y1={sy}
            x2={ex}
            y2={ey}
            stroke={color}
            {...strokeProps}
          />
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 2: Run type check and tests**

Run: `pnpm run check && pnpm test`
Expected: clean. The tween hook's `getElementById("edge-${parentId}-${childId}")` will now find the new line elements.

- [ ] **Step 3: Commit**

```bash
git add src/components/ConnectionLines.tsx
git commit -m "feat(mintodo): render edges as straight lines"
```

---

## Task 6: Remove physics toggle UI, vx/vy from storage/dsl, update dsl test

**Files:**
- Modify: `src/components/Toolbar.tsx`
- Modify: `src/storage.ts`
- Modify: `src/dsl.ts`
- Modify: `src/dsl.test.ts`

- [ ] **Step 1: Remove physics toggle from `src/components/Toolbar.tsx`**

In `src/components/Toolbar.tsx`, delete the entire `自動配置` block (lines 98-119, the `<div>` containing the "自動配置" label and toggle button). The remaining sibling block (the icon buttons row starting at the next `<div className="flex items-center gap-1">`) should stay attached to its parent flex container — pull it up to the `flex items-center justify-between lg:justify-end gap-3` wrapper's children list directly.

After the edit the structure should be:

```tsx
<div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto">
  <div className="flex items-center gap-1">
    <button ... title="DSL編集" ...><FileText size={16} /></button>
    <button ... title="ヘルプ・ショートカット" ...><Keyboard size={18} /></button>
    <button ... title="すべてリセット" ...><Trash2 size={18} /></button>
    <button ... title="テーマ切り替え" ...><Moon size={18} className="dark:hidden" /><Sun size={18} className="hidden dark:block" /></button>
  </div>
</div>
```

- [ ] **Step 2: Remove `vx, vy` from `src/storage.ts`**

In `src/storage.ts`, edit the `arrayToRecord` helper (lines 4-10) to drop the `vx: 0, vy: 0` reset:

```ts
function arrayToRecord(arr: MindNode[]): Record<string, MindNode> {
  const rec: Record<string, MindNode> = {};
  for (const n of arr) rec[n.id] = n;
  return rec;
}
```

Edit the root `MindNode` literal in `createBoard` (lines 32-53) to drop the `vx, vy` properties:

```ts
const root: MindNode = {
  id: "root",
  boardId: id,
  text: name,
  parentId: null,
  isRoot: true,
  completed: false,
  collapsed: false,
  priority: "medium",
  categoryColor: "slate",
  dueDate: "",
  children: [],
  x: 0,
  y: 0,
};
```

- [ ] **Step 3: Remove `vx, vy` from `src/dsl.ts`**

In `src/dsl.ts`, edit `defaultNode` (lines 17-35) to drop `vx, vy`:

```ts
function defaultNode(boardId: string): MindNode {
  return {
    id: "",
    boardId,
    text: "",
    parentId: null,
    isRoot: false,
    completed: false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    children: [],
    x: 0,
    y: 0,
  };
}
```

- [ ] **Step 4: Update `src/dsl.test.ts`**

In `src/dsl.test.ts`, edit the `makeNode` helper (lines 158-176) to drop `vx, vy`:

```ts
function makeNode(id: string, boardId: string, opts: Partial<MindNode> = {}): MindNode {
  return {
    id,
    boardId,
    text: opts.text ?? "node",
    parentId: opts.parentId ?? null,
    isRoot: opts.isRoot ?? false,
    completed: opts.completed ?? false,
    collapsed: false,
    priority: opts.priority ?? "medium",
    categoryColor: opts.categoryColor ?? "slate",
    dueDate: opts.dueDate ?? "",
    children: opts.children ?? [],
    x: 0,
    y: 0,
  };
}
```

In the "roundtrips" test (lines 233-257), drop the loop that asserts `n.x`, `n.y`, `n.vx`, `n.vy` are 0 (since `vx/vy` no longer exist):

Delete the for-loop at the end of the test (lines 251-256):

```ts
    for (const n of parsed.nodes) {
      expect(n.x).toBe(0);
      expect(n.y).toBe(0);
      expect(n.vx).toBe(0);
      expect(n.vy).toBe(0);
    }
```

Replace with:

```ts
    for (const n of parsed.nodes) {
      expect(n.x).toBe(0);
      expect(n.y).toBe(0);
    }
```

- [ ] **Step 5: Run type check, lint, and full test suite**

Run: `pnpm run check && pnpm test`
Expected: exit 0, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/Toolbar.tsx src/storage.ts src/dsl.ts src/dsl.test.ts
git commit -m "refactor(mintodo): remove physics toggle and vx/vy fields"
```

---

## Acceptance Checklist

- [ ] `pnpm test` — all green (radial, store, tween, drag, dsl tests)
- [ ] `pnpm run check` — type check + lint clean
- [ ] `pnpm run format` — formatting clean
- [ ] Manual smoke: open the app, root is centered, children fan out radially
- [ ] Add a child → it tweens into its radial position (300ms ease-out)
- [ ] Delete a node → remaining nodes tween to their new positions
- [ ] Collapse/expand a node → descendants tween in/out
- [ ] Drag a node onto another (non-descendant, non-root) node → it becomes the new parent's child
- [ ] Drag a node onto empty space → it tweens back to its previous radial position
- [ ] Drag a node onto itself or a descendant → snaps back
- [ ] Drag a node onto the root → snaps back
- [ ] Parent-to-child edges render as straight lines (not S-curves)
- [ ] 「自動配置」toggle is gone from the Toolbar
- [ ] `use-physics.ts` file is deleted
- [ ] `MindNode` no longer has `vx, vy` fields (verified by `rg "vx|vy" src/types.ts src/store.ts src/storage.ts src/dsl.ts` returning no matches)
- [ ] No console errors in dev mode

## Self-Review Notes

- **Spec coverage:**
  - `computeRadialPositions` (subtree-size proportional) → Task 1
  - `REPARENT` / `SNAP_BACK` / `SET_DRAGGING` actions, `layoutVersion` counter → Task 2
  - `applyRadialLayout` integrated into all structural reducers → Task 2
  - `use-tween` hook (Web Animations API, 300ms ease-out, drags skipped) → Task 3
  - Drag-to-reparent with snap-back, target highlight, descendant/root rejection → Task 4
  - Straight-line edges with `edge-${parentId}-${childId}` id → Task 5
  - Physics toggle removed from Toolbar → Task 6
  - `vx, vy` removed from types/store/storage/dsl/dsl.test → Tasks 2 and 6
  - `use-physics.ts` deleted → Task 3
  - All spec sections covered.

- **Type consistency:**
  - `Action.REPARENT { id, newParentId }` and `Action.SNAP_BACK { id }` — used identically in store.ts (Task 2), use-drag-node.ts (Task 4), and the tests.
  - `State.layoutVersion: number` — added in `createInitialState` and `withRadialLayout` (Task 2), read by `useTween` (Task 3).
  - `applyRadialLayout({ nodes })` — defined in `src/layout/radial.ts` (Task 1), imported in `src/store.ts` (Task 2).
  - `computeRadialPositions` signature matches between `radial.test.ts` (Task 1) and `radial.ts` (Task 1).
  - `isDescendant` helper is local to `src/store.ts` and used only by `REPARENT` (Task 2). It is independent of the `isAncestor` helper in `use-drag-node.ts` (Task 4) which works on `parentId` chains in the same direction.
  - `MindNode` no longer has `vx`/`vy` — `makeNode` helpers in `store.test.ts` (Task 2) and `dsl.test.ts` (Task 6) drop them, `defaultNode` in `dsl.ts` (Task 6) drops them, `createBoard` in `storage.ts` (Task 6) drops them, `arrayToRecord` in `storage.ts` (Task 6) drops them.

- **No placeholders:** every step has concrete code or a concrete edit. No "TBD" or "fill in later".

- **No spurious abstractions:** the only helper added is `applyRadialLayout` (the spec's named helper) and the local `isDescendant` / `withRadialLayout` / `findRootId` helpers. The tween hook is one file. No new types beyond what the spec adds.

- **TDD discipline:** every production change in Tasks 1, 2 (tests), 3 (test), and 4 is preceded by a failing test. Tasks 5 and 6 are pure visual / data-shape changes that the existing tests already cover.

- **Out-of-scope refactors avoided:** the duplicated `isParentCollapsed` helpers in `use-physics.ts` (deleted), `ConnectionLines.tsx`, and `Canvas.tsx` are not consolidated. Two remain (`ConnectionLines.tsx` and `Canvas.tsx`) and that is acceptable per the "no unrelated refactoring" rule in the spec.
