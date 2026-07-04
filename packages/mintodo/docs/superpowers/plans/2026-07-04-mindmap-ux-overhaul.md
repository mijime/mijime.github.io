# Mindmap UX Overhaul (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the radial mindmap layout with a left-to-right tree, add inline node editing, and fix pan/zoom/focus ergonomics.

**Architecture:** The store (`src/store.ts`) is a pure reducer; layout is applied inside the reducer via a layout function that assigns `x`/`y` to every node. We swap the radial layout module for a horizontal tidy-tree module with the same call signature, add inline-edit state + actions to the reducer, and rework the wheel/keyboard/focus behavior in hooks. Rendering stays DOM cards + SVG beziers.

**Tech Stack:** React 19, TypeScript, vitest + @testing-library/react, @dnd-kit/core, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-07-04-mindmap-ux-overhaul-design.md`

## Global Constraints

- Package manager/runner: `pnpm` (run from `packages/mintodo`).
- Verify with `pnpm test` and `pnpm run check`; format with `pnpm run format` before each commit.
- Comments: only non-obvious WHY. No error handling beyond what tasks specify. No backward-compat shims.
- Already implemented — do NOT re-implement: `collapsed` field, `TOGGLE_COLLAPSE` action, collapse chevron button in `NodeCard`, left-drag pan on blank canvas, drop-target ring highlight.
- The `Modal` kind `"edit-new"` stays (kanban uses it) but the mindmap no longer triggers it.
- All node cards are rendered center-anchored (`-translate-x-1/2 -translate-y-1/2`); `x`/`y` are card centers.

---

### Task 1: Horizontal tree layout module

**Files:**

- Create: `src/layout/tree.ts`
- Test: `src/layout/tree.test.ts`

**Interfaces:**

- Produces: `computeTreePositions(rootId: string, nodes: Record<string, MindNode>, opts?: { hSpacing?: number; vSpacing?: number }): Record<string, { x: number; y: number }>` and `applyTreeLayout(state: { nodes: Record<string, MindNode> }): Record<string, MindNode>` (same shape as `applyRadialLayout` so the store swap in Task 2 is a one-line import change).

Algorithm: depth-first tidy tree. Each visible leaf takes the next vertical slot (`vSpacing` apart); each parent centers on the midpoint of its first and last child; `x = depth * hSpacing`. Collapsed nodes contribute no children. Finally shift everything so the root sits at `(0, 0)`. Nodes not reachable from the root (defensive) get `(0, 0)`.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/layout/tree.test.ts
import { describe, expect, it } from "vitest";
import { computeTreePositions, applyTreeLayout } from "./tree";
import type { MindNode } from "../types";

function makeNode(id: string, parentId: string | null, children: string[]): MindNode {
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
    startDate: "",
    status: "inbox",
    children,
    estimate: null,
    workLogs: [],
    x: 0,
    y: 0,
  };
}

function makeTree(): Record<string, MindNode> {
  return {
    root: makeNode("root", null, ["a", "b"]),
    a: makeNode("a", "root", ["a1", "a2"]),
    a1: makeNode("a1", "a", []),
    a2: makeNode("a2", "a", []),
    b: makeNode("b", "root", []),
  };
}

describe("computeTreePositions", () => {
  it("places root at origin", () => {
    const pos = computeTreePositions("root", makeTree());
    expect(pos["root"]).toEqual({ x: 0, y: 0 });
  });

  it("places children one depth-step to the right", () => {
    const pos = computeTreePositions("root", makeTree(), { hSpacing: 360, vSpacing: 140 });
    expect(pos["a"].x).toBe(360);
    expect(pos["a1"].x).toBe(720);
  });

  it("gives every leaf a distinct vertical slot (no overlap)", () => {
    const pos = computeTreePositions("root", makeTree(), { vSpacing: 140 });
    const leafYs = [pos["a1"].y, pos["a2"].y, pos["b"].y];
    expect(new Set(leafYs).size).toBe(3);
    const sorted = [...leafYs].sort((p, q) => p - q);
    expect(sorted[1] - sorted[0]).toBeGreaterThanOrEqual(140);
    expect(sorted[2] - sorted[1]).toBeGreaterThanOrEqual(140);
  });

  it("centers a parent on the midpoint of its first and last child", () => {
    const pos = computeTreePositions("root", makeTree());
    expect(pos["a"].y).toBe((pos["a1"].y + pos["a2"].y) / 2);
  });

  it("excludes descendants of collapsed nodes", () => {
    const nodes = makeTree();
    nodes["a"] = { ...nodes["a"], collapsed: true };
    const pos = computeTreePositions("root", nodes);
    expect(pos["a1"]).toBeUndefined();
    expect(pos["a2"]).toBeUndefined();
    expect(pos["a"]).toBeDefined();
  });
});

describe("applyTreeLayout", () => {
  it("writes positions onto nodes and zeroes unreachable nodes", () => {
    const nodes = { ...makeTree(), orphan: makeNode("orphan", "missing", []) };
    nodes["orphan"] = { ...nodes["orphan"], isRoot: false };
    const out = applyTreeLayout({ nodes });
    expect(out["a"].x).toBeGreaterThan(0);
    expect(out["orphan"]).toMatchObject({ x: 0, y: 0 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/layout/tree.test.ts`
Expected: FAIL — cannot resolve `./tree`.

- [ ] **Step 3: Implement `src/layout/tree.ts`**

```typescript
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
    let y: number;
    if (kids.length === 0) {
      y = nextLeafY;
      nextLeafY += vSpacing;
    } else {
      const ys = kids.map((c) => visit(c, depth + 1));
      y = (ys[0]! + ys.at(-1)!) / 2;
    }
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/layout/tree.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/layout/tree.ts src/layout/tree.test.ts
git commit -m "feat(mintodo): add horizontal tidy-tree layout module"
```

---

### Task 2: Switch the store to tree layout, delete radial

**Files:**

- Modify: `src/store.ts:13` (import) and `src/store.ts:149-151` (`withRadialLayout`)
- Delete: `src/layout/radial.ts` and its test file (`src/layout/radial.test.ts` if present — check with `ls src/layout/`)
- Modify: any test in `src/store.test.ts` / `src/components/integration.test.tsx` that asserts radial `x`/`y` values

**Interfaces:**

- Consumes: `applyTreeLayout` from Task 1.
- Produces: unchanged reducer API; every layout-triggering action now yields tree positions (root at `x:0`, children at `x>0`).

- [ ] **Step 1: Swap the layout call in `src/store.ts`**

Replace line 13:

```typescript
import { applyTreeLayout } from "./layout/tree";
```

Rename the helper (and its 10 call sites via find-replace `withRadialLayout` → `withTreeLayout`):

```typescript
function withTreeLayout(state: State, nodes: Record<string, MindNode>): State {
  return { ...state, nodes: applyTreeLayout({ nodes }), layoutVersion: state.layoutVersion + 1 };
}
```

- [ ] **Step 2: Delete the radial module**

```bash
git rm src/layout/radial.ts
ls src/layout/  # if a radial test file exists, git rm it too
```

- [ ] **Step 3: Run the full suite and fix position assertions**

Run: `pnpm test`
Expected: layout/DSL/store tests that assert specific radial coordinates fail. Fix each failing assertion to match tree-layout semantics (root `{x:0,y:0}`, first child `{x:360}`), not by loosening to "anything". Do not change tests unrelated to positions.

- [ ] **Step 4: Verify all tests pass and types check**

Run: `pnpm test && pnpm run check`
Expected: PASS / no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(mintodo): switch mindmap to horizontal tree layout, drop radial"
```

---

### Task 3: Horizontal edge anchors (card edge → card edge)

**Files:**

- Modify: `src/components/ConnectionLines.tsx:54-64`
- Modify: `src/hooks/use-tween.ts:8-15`

**Interfaces:**

- Produces: shared constant `EDGE_INSET = 110` (half of the 220px min card width) exported from `src/components/ConnectionLines.tsx`; edges run from parent right edge to child left edge.

- [ ] **Step 1: Update `ConnectionLines.tsx`**

Add below `MIN_CURVE_SPREAD`:

```typescript
export const EDGE_INSET = 110;
```

In the path computation (lines 54-64), offset the endpoints horizontally (children are always to the right of parents now):

```typescript
const sx = cx + (parent.x + EDGE_INSET) * state.view.zoom + state.view.pan.x;
const sy = cy + parent.y * state.view.zoom + state.view.pan.y;
const ex = cx + (node.x - EDGE_INSET) * state.view.zoom + state.view.pan.x;
const ey = cy + node.y * state.view.zoom + state.view.pan.y;
```

Keep the existing bezier control-point code unchanged.

- [ ] **Step 2: Update the tween path helper in `use-tween.ts`**

Import the constant and apply the same inset inside `pathD` so animated edges match static ones:

```typescript
import { EDGE_INSET } from "../components/ConnectionLines";

function pathD(psx: number, psy: number, pex: number, pey: number): string {
  const sx = psx + EDGE_INSET;
  const ex = pex - EDGE_INSET;
  const horizontalDist = ex - sx;
  const halfDist = Math.max(Math.abs(horizontalDist) / 2, MIN_CURVE_SPREAD);
  const sign = horizontalDist >= 0 ? 1 : -1;
  const c1x = sx + sign * halfDist;
  const c2x = ex - sign * halfDist;
  return `M ${sx} ${psy} C ${c1x} ${psy}, ${c2x} ${pey}, ${ex} ${pey}`;
}
```

- [ ] **Step 3: Verify**

Run: `pnpm test && pnpm run check`
Expected: PASS. Then `pnpm run dev`, open the app, confirm edges leave the parent's right side and enter the child's left side, including during collapse/expand animation.

- [ ] **Step 4: Commit**

```bash
git add src/components/ConnectionLines.tsx src/hooks/use-tween.ts
git commit -m "feat(mintodo): anchor edges to card sides for horizontal tree"
```

---

### Task 4: Collapsed "+N" badge and `c` shortcut

**Files:**

- Modify: `src/components/NodeCard.tsx:113-125` (collapse button)
- Modify: `src/hooks/use-keyboard.ts` (add `c` case)
- Test: `src/components/integration.test.tsx`

**Interfaces:**

- Consumes: existing `TOGGLE_COLLAPSE` action.
- Produces: `countDescendants(nodes, id): number` in `src/lib/tree.ts` (check the file first — if an equivalent helper already exists there, use it instead of adding one).

- [ ] **Step 1: Write failing tests**

Add to `src/components/integration.test.tsx`, following the file's existing render/setup helpers:

```typescript
it("shows +N badge with hidden descendant count when collapsed", async () => {
  // build board: root -> parent -> (child1, child2); collapse "parent"
  // (use this file's existing helpers to seed nodes and render <App/>)
  const collapseBtn = await screen.findByTestId("collapse-parent");
  await userEvent.click(collapseBtn);
  expect(await screen.findByText("+2")).toBeInTheDocument();
});

it("toggles collapse on selected node with the c key", async () => {
  // select "parent", then:
  await userEvent.keyboard("c");
  expect(await screen.findByText("+2")).toBeInTheDocument();
  await userEvent.keyboard("c");
  expect(screen.queryByText("+2")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/components/integration.test.tsx`
Expected: FAIL — no `collapse-parent` testid / no badge.

- [ ] **Step 3: Implement**

`src/lib/tree.ts` — add (if not already present):

```typescript
export function countDescendants(nodes: Record<string, MindNode>, id: string): number {
  const n = nodes[id];
  if (!n) return 0;
  let count = 0;
  for (const c of n.children) count += 1 + countDescendants(nodes, c);
  return count;
}
```

`src/components/NodeCard.tsx` — give the collapse button `data-testid={\`collapse-${node.id}\`}` and render the count next to the chevron when collapsed:

```tsx
{
  node.collapsed ? (
    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-slate-500">
      <ChevronDown size={12} />+{countDescendants(state.nodes, node.id)}
    </span>
  ) : (
    <ChevronUp size={12} />
  );
}
```

`src/hooks/use-keyboard.ts` — add a case beside the other single-key shortcuts:

```typescript
case "c":
case "C": {
  if (active.children.length > 0) {
    e.preventDefault();
    dispatch({ id: state.selectedNodeId, type: "TOGGLE_COLLAPSE" });
  }
  break;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test && pnpm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(mintodo): collapsed +N badge and c-key collapse toggle"
```

---

### Task 5: Inline editing (store layer)

**Files:**

- Modify: `src/store.ts` (state field + 3 actions)
- Test: `src/store.test.ts`

**Interfaces:**

- Produces:
  - `State.inlineEdit: { nodeId: string; isNew: boolean } | null`
  - Actions: `{ type: "ADD_CHILD_INLINE"; newId: string; parentId: string }`, `{ type: "START_INLINE_EDIT"; nodeId: string }`, `{ type: "COMMIT_INLINE_EDIT"; text: string }`, `{ type: "CANCEL_INLINE_EDIT" }`
  - Semantics: `ADD_CHILD_INLINE` creates an empty-text child (like `ADD_CHILD` but `text: ""`, and expands a collapsed parent), selects it, and sets `inlineEdit = { nodeId: newId, isNew: true }`. `COMMIT_INLINE_EDIT` sets the node text (trimmed); if trimmed text is empty **and** `isNew`, deletes the node instead. `CANCEL_INLINE_EDIT` deletes the node if `isNew`, otherwise just clears `inlineEdit`.

- [ ] **Step 1: Write failing tests in `src/store.test.ts`**

Follow the file's existing setup helpers (it builds states via `createInitialState` + actions). Add:

```typescript
describe("inline editing", () => {
  it("ADD_CHILD_INLINE creates empty child and enters inline edit", () => {
    let s = seedRootState(); // use the file's existing helper for a state with a root node
    s = reducer(s, { type: "ADD_CHILD_INLINE", newId: "n1", parentId: "root" });
    expect(s.nodes["n1"].text).toBe("");
    expect(s.selectedNodeId).toBe("n1");
    expect(s.inlineEdit).toEqual({ nodeId: "n1", isNew: true });
  });

  it("ADD_CHILD_INLINE expands a collapsed parent", () => {
    let s = seedRootState();
    s = reducer(s, { type: "ADD_CHILD_INLINE", newId: "n1", parentId: "root" });
    s = reducer(s, { text: "a", type: "COMMIT_INLINE_EDIT" });
    s = reducer(s, { id: "n1", type: "TOGGLE_COLLAPSE" });
    s = reducer(s, { type: "ADD_CHILD_INLINE", newId: "n2", parentId: "n1" });
    expect(s.nodes["n1"].collapsed).toBe(false);
  });

  it("COMMIT_INLINE_EDIT sets trimmed text and clears inlineEdit", () => {
    let s = seedRootState();
    s = reducer(s, { type: "ADD_CHILD_INLINE", newId: "n1", parentId: "root" });
    s = reducer(s, { text: "  buy milk  ", type: "COMMIT_INLINE_EDIT" });
    expect(s.nodes["n1"].text).toBe("buy milk");
    expect(s.inlineEdit).toBeNull();
  });

  it("COMMIT_INLINE_EDIT with empty text deletes a new node", () => {
    let s = seedRootState();
    s = reducer(s, { type: "ADD_CHILD_INLINE", newId: "n1", parentId: "root" });
    s = reducer(s, { text: "   ", type: "COMMIT_INLINE_EDIT" });
    expect(s.nodes["n1"]).toBeUndefined();
    expect(s.selectedNodeId).toBe("root");
  });

  it("COMMIT_INLINE_EDIT with empty text keeps an existing node's text", () => {
    let s = seedRootState();
    s = reducer(s, { type: "ADD_CHILD_INLINE", newId: "n1", parentId: "root" });
    s = reducer(s, { text: "keep", type: "COMMIT_INLINE_EDIT" });
    s = reducer(s, { nodeId: "n1", type: "START_INLINE_EDIT" });
    s = reducer(s, { text: "", type: "COMMIT_INLINE_EDIT" });
    expect(s.nodes["n1"].text).toBe("keep");
    expect(s.inlineEdit).toBeNull();
  });

  it("CANCEL_INLINE_EDIT deletes a new node but keeps an existing one", () => {
    let s = seedRootState();
    s = reducer(s, { type: "ADD_CHILD_INLINE", newId: "n1", parentId: "root" });
    s = reducer(s, { type: "CANCEL_INLINE_EDIT" });
    expect(s.nodes["n1"]).toBeUndefined();

    s = reducer(s, { type: "ADD_CHILD_INLINE", newId: "n2", parentId: "root" });
    s = reducer(s, { text: "kept", type: "COMMIT_INLINE_EDIT" });
    s = reducer(s, { nodeId: "n2", type: "START_INLINE_EDIT" });
    s = reducer(s, { type: "CANCEL_INLINE_EDIT" });
    expect(s.nodes["n2"].text).toBe("kept");
    expect(s.inlineEdit).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/store.test.ts`
Expected: FAIL — unknown action types / `inlineEdit` undefined.

- [ ] **Step 3: Implement in `src/store.ts`**

Add to `State` and `createInitialState()` / `snapshotState()`:

```typescript
inlineEdit: { nodeId: string; isNew: boolean } | null;
// createInitialState: inlineEdit: null,
// snapshotState: inlineEdit: state.inlineEdit,
```

Add to the `Action` union:

```typescript
| { type: "ADD_CHILD_INLINE"; newId: string; parentId: string }
| { type: "START_INLINE_EDIT"; nodeId: string }
| { type: "COMMIT_INLINE_EDIT"; text: string }
| { type: "CANCEL_INLINE_EDIT" }
```

Add `"ADD_CHILD_INLINE"` and `"COMMIT_INLINE_EDIT"` to `UNDOABLE_ACTIONS` (start/cancel are not undo points; cancel of a new node just returns to the pre-add snapshot which the `ADD_CHILD_INLINE` undo entry already covers).

Cases in `applyAction` (reuse the shape of `ADD_CHILD` at `store.ts:281`):

```typescript
case "ADD_CHILD_INLINE": {
  const parent = state.nodes[action.parentId];
  if (!parent) return state;
  const newNode: MindNode = {
    id: action.newId,
    boardId: parent.boardId,
    categoryColor: parent.categoryColor,
    children: [],
    estimate: null,
    workLogs: [],
    collapsed: false,
    completed: false,
    dueDate: "",
    startDate: "",
    status: "inbox",
    isRoot: false,
    parentId: parent.id,
    priority: "medium",
    text: "",
    x: 0,
    y: 0,
  };
  const nextNodes: Record<string, MindNode> = {
    ...state.nodes,
    [action.newId]: newNode,
    [parent.id]: { ...parent, collapsed: false, children: [...parent.children, action.newId] },
  };
  return withTreeLayout(
    {
      ...state,
      nodes: nextNodes,
      selectedNodeId: action.newId,
      inlineEdit: { nodeId: action.newId, isNew: true },
    },
    nextNodes,
  );
}
case "START_INLINE_EDIT": {
  if (!state.nodes[action.nodeId]) return state;
  return { ...state, inlineEdit: { nodeId: action.nodeId, isNew: false }, selectedNodeId: action.nodeId };
}
case "COMMIT_INLINE_EDIT": {
  const edit = state.inlineEdit;
  if (!edit) return state;
  const node = state.nodes[edit.nodeId];
  if (!node) return { ...state, inlineEdit: null };
  const text = action.text.trim();
  if (text === "") {
    if (edit.isNew) {
      return applyAction({ ...state, inlineEdit: null }, { id: edit.nodeId, type: "DELETE_NODE" });
    }
    return { ...state, inlineEdit: null };
  }
  return {
    ...state,
    inlineEdit: null,
    nodes: { ...state.nodes, [edit.nodeId]: { ...node, text } },
  };
}
case "CANCEL_INLINE_EDIT": {
  const edit = state.inlineEdit;
  if (!edit) return state;
  if (edit.isNew) {
    return applyAction({ ...state, inlineEdit: null }, { id: edit.nodeId, type: "DELETE_NODE" });
  }
  return { ...state, inlineEdit: null };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test && pnpm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store.ts src/store.test.ts
git commit -m "feat(mintodo): inline-edit state and actions in store"
```

---

### Task 6: Inline editing (UI layer)

**Files:**

- Modify: `src/components/NodeCard.tsx` (render input when editing; dblclick; root + button)
- Modify: `src/hooks/use-keyboard.ts` (Tab/Enter create inline nodes; F2 renames; guard while editing)
- Test: `src/components/integration.test.tsx`

**Interfaces:**

- Consumes: Task 5 actions. `crypto.randomUUID()` for new ids (matches existing usage — grep to confirm; if the codebase uses another id helper, use that).

- [ ] **Step 1: Write failing integration tests**

```typescript
describe("inline editing UI", () => {
  it("Tab creates a child with an inline input; Enter commits", async () => {
    // render app with seeded root selected (existing helpers)
    await userEvent.keyboard("{Tab}");
    const input = await screen.findByTestId("inline-edit-input");
    await userEvent.type(input, "new task{Enter}");
    expect(screen.queryByTestId("inline-edit-input")).not.toBeInTheDocument();
    expect(await screen.findByText("new task")).toBeInTheDocument();
  });

  it("Escape cancels and removes the empty new node", async () => {
    await userEvent.keyboard("{Tab}");
    await screen.findByTestId("inline-edit-input");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByTestId("inline-edit-input")).not.toBeInTheDocument();
  });

  it("Enter on a selected child creates a sibling inline", async () => {
    // seed root -> childA, select childA
    await userEvent.keyboard("{Enter}");
    const input = await screen.findByTestId("inline-edit-input");
    await userEvent.type(input, "sibling{Enter}");
    // sibling shares parent with childA — assert via store or rendered position under root
    expect(await screen.findByText("sibling")).toBeInTheDocument();
  });

  it("F2 renames the selected node inline", async () => {
    // seed and select node with text "old"
    await userEvent.keyboard("{F2}");
    const input = await screen.findByTestId("inline-edit-input");
    await userEvent.clear(input);
    await userEvent.type(input, "renamed{Enter}");
    expect(await screen.findByText("renamed")).toBeInTheDocument();
  });

  it("does not trigger global shortcuts while editing", async () => {
    await userEvent.keyboard("{Tab}");
    const input = await screen.findByTestId("inline-edit-input");
    await userEvent.type(input, "a b"); // Space must type, not TOGGLE_COMPLETE
    expect(input).toHaveValue("a b");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/components/integration.test.tsx`
Expected: FAIL — Tab still opens the modal; no `inline-edit-input`.

- [ ] **Step 3: Implement `NodeCard.tsx` editing UI**

At the top of `NodeCard`, derive `const isEditing = state.inlineEdit?.nodeId === node.id;`. Extract a small inner component in the same file:

```tsx
function InlineEditInput({ initialText }: { initialText: string }) {
  const { dispatch } = useMindStore();
  const [value, setValue] = useState(initialText);
  return (
    <input
      data-testid="inline-edit-input"
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") dispatch({ text: value, type: "COMMIT_INLINE_EDIT" });
        if (e.key === "Escape") dispatch({ type: "CANCEL_INLINE_EDIT" });
      }}
      onBlur={() => dispatch({ text: value, type: "COMMIT_INLINE_EDIT" })}
      onPointerDown={(e) => e.stopPropagation()}
      className="w-full bg-transparent text-sm font-medium outline-none border-b border-[var(--terra)]"
    />
  );
}
```

Note: `onKeyDown` uses `stopPropagation` so the window-level keyboard handler never sees keys typed in the input (belt-and-braces on top of the `isEditableTarget` guard). `key={node.id}` when rendering so a new edit target remounts with fresh state.

In the non-root card, replace `<TaskCard node={node} />` with:

```tsx
{
  isEditing ? <InlineEditInput key={node.id} initialText={node.text} /> : <TaskCard node={node} />;
}
```

In the root card, replace the text `<div>` similarly (root rename via F2/dblclick):

```tsx
{
  isEditing ? (
    <InlineEditInput key={node.id} initialText={node.text} />
  ) : (
    <div className="flex-1 select-none pr-1 truncate">{node.text}</div>
  );
}
```

Add `onDoubleClick` to both card wrappers:

```tsx
onDoubleClick={(e) => {
  e.stopPropagation();
  dispatch({ nodeId: node.id, type: "START_INLINE_EDIT" });
}}
```

Change the root `+` button (`NodeCard.tsx:64-67`) to create inline instead of opening the modal:

```tsx
onClick={(e) => {
  e.stopPropagation();
  dispatch({ newId: crypto.randomUUID(), parentId: node.id, type: "ADD_CHILD_INLINE" });
}}
```

- [ ] **Step 4: Implement keyboard changes in `use-keyboard.ts`**

Immediately after the modal guard (`if (state.modal) return;`) add:

```typescript
if (state.inlineEdit) return;
```

Replace the `Tab` case body:

```typescript
case "Tab": {
  e.preventDefault();
  dispatch({ newId: crypto.randomUUID(), parentId: state.selectedNodeId, type: "ADD_CHILD_INLINE" });
  break;
}
```

Replace the `Enter` case body:

```typescript
case "Enter": {
  if (!active.isRoot && active.parentId) {
    e.preventDefault();
    dispatch({ newId: crypto.randomUUID(), parentId: active.parentId, type: "ADD_CHILD_INLINE" });
  }
  break;
}
```

Add an `F2` case:

```typescript
case "F2": {
  e.preventDefault();
  dispatch({ nodeId: state.selectedNodeId, type: "START_INLINE_EDIT" });
  break;
}
```

Keep `e`/`E` opening the detail modal unchanged.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test && pnpm run check`
Expected: PASS. Also fix any pre-existing integration tests that relied on Tab opening the modal.

- [ ] **Step 6: Manual check and commit**

`pnpm run dev`: Tab→type→Enter chains rapidly; Escape removes empty node; dblclick renames; root + button edits inline.

```bash
git add -A
git commit -m "feat(mintodo): inline node editing UI (Tab/Enter/F2/dblclick)"
```

---

### Task 7: Arrow-key navigation for horizontal tree

**Files:**

- Modify: `src/hooks/use-keyboard.ts:77-104`
- Test: `src/components/integration.test.tsx`

**Interfaces:**

- Produces: Left = parent, Right = first child (no-op when collapsed or leaf), Up/Down = previous/next sibling.

- [ ] **Step 1: Write failing tests**

```typescript
describe("arrow navigation (horizontal tree)", () => {
  // seed root -> [a -> [a1], b]; select "a" via click, then assert selection
  it("Right selects first child, Left selects parent", async () => {
    /* select a */
    await userEvent.keyboard("{ArrowRight}");
    /* expect selected a1 (node card has class node-selected) */
    await userEvent.keyboard("{ArrowLeft}");
    /* expect selected a */
  });
  it("Down/Up move between siblings", async () => {
    /* select a */
    await userEvent.keyboard("{ArrowDown}");
    /* expect selected b */
    await userEvent.keyboard("{ArrowUp}");
    /* expect selected a */
  });
});
```

Assert selection with the existing pattern in this test file (query the card `#node-dom-<id>` and check for the `node-selected` class); write real assertions, not comments, when implementing.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/components/integration.test.tsx`
Expected: FAIL — current mapping treats Down like Right.

- [ ] **Step 3: Replace the four arrow cases**

```typescript
case "ArrowLeft": {
  e.preventDefault();
  if (active.parentId) dispatch({ id: active.parentId, type: "SELECT" });
  break;
}
case "ArrowRight": {
  e.preventDefault();
  if (active.children.length > 0 && !active.collapsed) {
    dispatch({ id: active.children[0], type: "SELECT" });
  }
  break;
}
case "ArrowUp":
case "ArrowDown": {
  e.preventDefault();
  if (active.isRoot || !active.parentId) break;
  const parent = state.nodes[active.parentId];
  if (!parent) break;
  const idx = parent.children.indexOf(state.selectedNodeId);
  const nextIdx = e.key === "ArrowUp" ? idx - 1 : idx + 1;
  if (nextIdx >= 0 && nextIdx < parent.children.length) {
    dispatch({ id: parent.children[nextIdx], type: "SELECT" });
  }
  break;
}
```

- [ ] **Step 4: Run tests, fix pre-existing arrow tests, commit**

Run: `pnpm test && pnpm run check` — update any old arrow-key tests to the new semantics.

```bash
git add -A
git commit -m "feat(mintodo): arrow-key navigation matches horizontal tree"
```

---

### Task 8: Wheel behavior — scroll pans, Ctrl/pinch zooms at cursor

**Files:**

- Modify: `src/hooks/use-pan-zoom.ts:46-53` (`onWheel`)

**Interfaces:**

- Produces: wheel = vertical pan; Shift+wheel = horizontal pan; Ctrl/Cmd+wheel (browsers set `ctrlKey` for trackpad pinch) = zoom centered on the cursor. Zoom clamp stays `[0.2, 3]`.

- [ ] **Step 1: Replace `onWheel`**

```typescript
function onWheel(e: WheelEvent) {
  e.preventDefault();
  const view = viewRef.current;
  if (e.ctrlKey || e.metaKey) {
    const rect = el.getBoundingClientRect();
    // mouse position relative to the transform origin (container center)
    const mx = e.clientX - rect.left - rect.width / 2;
    const my = e.clientY - rect.top - rect.height / 2;
    const factor = Math.exp(-e.deltaY * 0.01);
    const zoom = Math.max(0.2, Math.min(3, view.zoom * factor));
    const scale = zoom / view.zoom;
    dispatch({
      type: "SET_VIEW",
      view: {
        pan: { x: mx - (mx - view.pan.x) * scale, y: my - (my - view.pan.y) * scale },
        zoom,
      },
    });
    return;
  }
  const dx = e.shiftKey ? e.deltaY + e.deltaX : e.deltaX;
  const dy = e.shiftKey ? 0 : e.deltaY;
  dispatch({
    type: "SET_VIEW",
    view: { pan: { x: view.pan.x - dx, y: view.pan.y - dy }, zoom: view.zoom },
  });
}
```

- [ ] **Step 2: Verify manually**

Run: `pnpm run check`, then `pnpm run dev`: two-finger scroll pans (both axes on trackpad), Shift+wheel pans horizontally with a mouse, pinch / Ctrl+wheel zooms toward the cursor (point under cursor stays fixed). Existing zoom buttons (`ZoomControls`) still work.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-pan-zoom.ts
git commit -m "feat(mintodo): wheel pans, ctrl+wheel/pinch zooms at cursor"
```

---

### Task 9: Auto-focus selected node into view

**Files:**

- Create: `src/hooks/use-focus-selected.ts`
- Modify: `src/components/Canvas.tsx` (call the hook)
- Modify: `src/index.css` — confirm `.transform-container` has a transform transition (it does per current styles); the pan change animates via that CSS, so no JS tweening needed.

**Interfaces:**

- Consumes: `state.selectedNodeId`, `state.layoutVersion`, `state.view`; dispatches `SET_VIEW`.
- Produces: `useFocusSelected({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }): void`

- [ ] **Step 1: Implement the hook**

```typescript
import { useEffect } from "react";
import { useMindStore } from "./use-mind-store";

const MARGIN = 40;

export function useFocusSelected({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}): void {
  const { state, dispatch } = useMindStore();
  const { selectedNodeId, layoutVersion } = state;

  useEffect(() => {
    const el = containerRef.current;
    const node = state.nodes[selectedNodeId];
    if (!el || !node) return;
    const rect = el.getBoundingClientRect();
    const view = state.view;
    // node center in container coordinates (transform origin = container center)
    const sx = rect.width / 2 + node.x * view.zoom + view.pan.x;
    const sy = rect.height / 2 + node.y * view.zoom + view.pan.y;
    let dx = 0;
    let dy = 0;
    if (sx < MARGIN) dx = MARGIN - sx;
    else if (sx > rect.width - MARGIN) dx = rect.width - MARGIN - sx;
    if (sy < MARGIN) dy = MARGIN - sy;
    else if (sy > rect.height - MARGIN) dy = rect.height - MARGIN - sy;
    if (dx !== 0 || dy !== 0) {
      dispatch({
        type: "SET_VIEW",
        view: { pan: { x: view.pan.x + dx, y: view.pan.y + dy }, zoom: view.zoom },
      });
    }
    // deliberately depends only on selection/layout changes, not view, to avoid feedback loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, layoutVersion]);
}
```

- [ ] **Step 2: Wire into `Canvas.tsx`**

```typescript
import { useFocusSelected } from "../hooks/use-focus-selected";
// inside Canvas(), after usePanZoom:
useFocusSelected({ containerRef });
```

- [ ] **Step 3: Verify**

Run: `pnpm test && pnpm run check` (existing integration tests must not break — jsdom rects are 0-sized, so the hook no-ops there; if a test starts failing on unexpected `SET_VIEW`, guard with `if (rect.width === 0) return;`).
Then `pnpm run dev`: arrow-navigate to an offscreen node → canvas pans it into view smoothly; Tab-adding at the right edge keeps the new node visible.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(mintodo): auto-pan selected node into view"
```

---

### Task 10: Drag feedback — dim invalid drop targets

**Files:**

- Modify: `src/components/NodeCard.tsx` (opacity logic, ~line 90-103)
- Test: `src/components/integration.test.tsx`

**Interfaces:**

- Consumes: `state.draggingNodeId`, `isDescendant` (already imported in `NodeCard.tsx`).

- [ ] **Step 1: Implement**

In the non-root `NodeCard`, add above the return:

```typescript
const isInvalidTarget =
  draggedId !== null && draggedId !== node.id && isDescendant(state.nodes, draggedId, node.id);
```

Change the style `opacity` line to:

```typescript
opacity: isDragging ? 0.4 : isInvalidTarget ? 0.3 : 1,
```

(The valid-target ring highlight already exists via `isRingVisible`; drop-commit animation already happens because `REPARENT` bumps `layoutVersion` and `useTween` animates it.)

- [ ] **Step 2: Verify and commit**

Run: `pnpm test && pnpm run check`; `pnpm run dev` — drag a node with children: its subtree dims, hovering valid targets shows the ring, drop animates to the new layout.

```bash
git add src/components/NodeCard.tsx
git commit -m "feat(mintodo): dim invalid drop targets while dragging"
```

---

### Task 11: Final sweep

**Files:**

- Modify: whatever the checks below surface (e.g. `HelpModal` shortcut list mentioning old Tab/Enter behavior — grep `components/` for shortcut descriptions and update them).

- [ ] **Step 1: Update the shortcut help**

Grep: `grep -rn "Tab\|Enter\|ショートカット" src/components/HelpModal.tsx` (or the help component found via `ls src/components/`). Update entries: Tab=子をインライン追加, Enter=兄弟をインライン追加, F2=名前変更, C=折りたたみ, E=詳細編集, ←→↑↓=ツリー移動.

- [ ] **Step 2: Full verification**

Run: `pnpm run format && pnpm test && pnpm run check`
Expected: all green, no formatting diffs left uncommitted.

- [ ] **Step 3: Manual end-to-end pass (`pnpm run dev`)**

Checklist: tree reads left→right with no overlaps; collapse shows +N; Tab/Enter/F2 inline editing; Escape cleanup; wheel pan / pinch zoom at cursor; arrow navigation + auto-pan; drag reparent with ring + dimming + animation; kanban/gantt/text views still function (they share the store).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs(mintodo): update shortcut help for new mindmap UX"
```
