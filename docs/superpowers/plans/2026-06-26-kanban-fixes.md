# Kanban Mode Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix kanban vertical scrolling and add intra-column card reordering via drag-and-drop.

**Architecture:** Add `min-h-0` to content area for proper flexbox overflow. For reordering, sort cards by DFS traversal order (matches text mode output), use `@dnd-kit/sortable` within columns, and persist order by updating the parent node's `children` array on drop. Reordering only works between same-parent sibling cards.

**Tech Stack:** React 19, TypeScript, @dnd-kit/core v6, @dnd-kit/sortable v10, Tailwind CSS v4, Vitest

---

### Task 1: Fix vertical scrolling

**Files:**
- Modify: `packages/mintodo/src/App.tsx:68`

- [ ] **Step 1: Add `min-h-0` to content area div**

In `App.tsx` line 68, the content div needs `min-h-0` so the flex item can shrink below its content height, allowing `h-full` children to properly fill the space and `overflow-y-auto` to work.

```tsx
<div className="flex-1 relative p-4 min-h-0">
```

- [ ] **Step 2: Run existing tests to verify no regressions**

Run: `pnpm test`
Expected: All existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/mintodo/src/App.tsx
git commit -m "fix(mintodo): add min-h-0 to content area for kanban vertical scrolling"
```

---

### Task 2: Install @dnd-kit/sortable

**Files:**
- Modify: `packages/mintodo/package.json`

- [ ] **Step 1: Install dependency**

Run: `pnpm add @dnd-kit/sortable --filter @mijime/mintodo`
Expected: Package installed, no errors.

- [ ] **Step 2: Commit**

```bash
git add packages/mintodo/package.json pnpm-lock.yaml
git commit -m "chore(mintodo): add @dnd-kit/sortable dependency"
```

---

### Task 3: Add DFS sort function to tree utilities

**Files:**
- Modify: `packages/mintodo/src/lib/tree.ts:1-31`
- Test: `packages/mintodo/src/lib/tree.test.ts`

- [ ] **Step 1: Write failing tests for `sortByDfs`**

Add to `tree.test.ts`:

```typescript
import { countDescendants, isKanbanVisible, sortByDfs } from "./tree";
```

```typescript
describe("sortByDfs", () => {
  it("returns empty array for empty nodes", () => {
    expect(sortByDfs({})).toEqual([]);
  });

  it("returns ids in DFS order following children arrays", () => {
    // root -> a -> c
    //      -> b
    const nodes: Record<string, MindNode> = {
      root: n("root", { children: ["a", "b"] }),
      a: n("a", { parentId: "root", children: ["c"] }),
      b: n("b", { parentId: "root" }),
      c: n("c", { parentId: "a" }),
    };
    expect(sortByDfs(nodes)).toEqual(["root", "a", "c", "b"]);
  });

  it("follows children order for siblings", () => {
    const nodes: Record<string, MindNode> = {
      root: n("root", { children: ["b", "a"] }),
      b: n("b", { parentId: "root" }),
      a: n("a", { parentId: "root" }),
    };
    expect(sortByDfs(nodes)).toEqual(["root", "b", "a"]);
  });

  it("handles nodes that reference missing parents (orphan)", () => {
    const nodes: Record<string, MindNode> = {
      orphan: n("orphan", { parentId: "nonexistent" }),
    };
    expect(sortByDfs(nodes)).toEqual(["orphan"]);
  });

  it("handles circular references gracefully", () => {
    const nodes: Record<string, MindNode> = {
      a: n("a", { children: ["b"] }),
      b: n("b", { parentId: "a", children: ["a"] }),
    };
    const result = sortByDfs(nodes);
    expect(result).toContain("a");
    expect(result).toContain("b");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/lib/tree.test.ts`
Expected: FAIL - `sortByDfs is not exported from './tree'`

- [ ] **Step 3: Implement `sortByDfs` in tree.ts**

Add to `tree.ts`:

```typescript
export function sortByDfs(nodes: Record<string, MindNode>): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  const roots = Object.values(nodes).filter(
    (n) => n.isRoot || !n.parentId || !nodes[n.parentId],
  );

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/lib/tree.test.ts`
Expected: All tests pass, including `sortByDfs`.

- [ ] **Step 5: Commit**

```bash
git add packages/mintodo/src/lib/tree.ts packages/mintodo/src/lib/tree.test.ts
git commit -m "feat(mintodo): add sortByDfs for kanban card ordering"
```

---

### Task 4: Add REORDER_CHILDREN action to store

**Files:**
- Modify: `packages/mintodo/src/store.ts`
- Test: `packages/mintodo/src/store.test.ts`

- [ ] **Step 1: Write failing test for REORDER_CHILDREN action**

First read the existing `store.test.ts` to understand the test pattern.

Then add to `store.test.ts`:

```typescript
describe("REORDER_CHILDREN", () => {
  it("reorders two siblings in a parent's children array", () => {
    const state = {
      ...createInitialState(),
      nodes: {
        root: {
          id: "root", boardId: "b", text: "root", parentId: null, isRoot: true,
          completed: false, collapsed: false, priority: "medium" as const,
          categoryColor: "slate" as const, dueDate: "", startDate: "",
          status: "inbox" as const, children: ["a", "b", "c"], estimate: null,
          workLogs: [], x: 0, y: 0,
        },
        a: { id: "a", boardId: "b", text: "a", parentId: "root", isRoot: false,
          completed: false, collapsed: false, priority: "medium" as const,
          categoryColor: "slate" as const, dueDate: "", startDate: "",
          status: "inbox" as const, children: [], estimate: null,
          workLogs: [], x: 0, y: 0 },
        b: { id: "b", boardId: "b", text: "b", parentId: "root", isRoot: false,
          completed: false, collapsed: false, priority: "medium" as const,
          categoryColor: "slate" as const, dueDate: "", startDate: "",
          status: "wip" as const, children: [], estimate: null,
          workLogs: [], x: 0, y: 0 },
        c: { id: "c", boardId: "b", text: "c", parentId: "root", isRoot: false,
          completed: false, collapsed: false, priority: "medium" as const,
          categoryColor: "slate" as const, dueDate: "", startDate: "",
          status: "wip" as const, children: [], estimate: null,
          workLogs: [], x: 0, y: 0 },
      },
    };
    const next = reducer(state, { type: "REORDER_CHILDREN", nodeId: "b", targetId: "a" });
    expect(next.nodes.root.children).toEqual(["b", "a", "c"]);
  });

  it("no-ops when node and target have different parents", () => {
    const parentA = {
      id: "pa", boardId: "b", text: "pa", parentId: null, isRoot: true,
      completed: false, collapsed: false, priority: "medium" as const,
      categoryColor: "slate" as const, dueDate: "", startDate: "",
      status: "inbox" as const, children: ["a"], estimate: null,
      workLogs: [], x: 0, y: 0,
    };
    const parentB = {
      id: "pb", boardId: "b", text: "pb", parentId: "pa", isRoot: false,
      completed: false, collapsed: false, priority: "medium" as const,
      categoryColor: "slate" as const, dueDate: "", startDate: "",
      status: "inbox" as const, children: ["b"], estimate: null,
      workLogs: [], x: 0, y: 0,
    };
    const state = {
      ...createInitialState(),
      nodes: {
        pa: parentA,
        pb: parentB,
        a: { id: "a", boardId: "b", text: "a", parentId: "pa", isRoot: false,
          completed: false, collapsed: false, priority: "medium" as const,
          categoryColor: "slate" as const, dueDate: "", startDate: "",
          status: "inbox" as const, children: [], estimate: null,
          workLogs: [], x: 0, y: 0 },
        b: { id: "b", boardId: "b", text: "b", parentId: "pb", isRoot: false,
          completed: false, collapsed: false, priority: "medium" as const,
          categoryColor: "slate" as const, dueDate: "", startDate: "",
          status: "wip" as const, children: [], estimate: null,
          workLogs: [], x: 0, y: 0 },
      },
    };
    const next = reducer(state, { type: "REORDER_CHILDREN", nodeId: "b", targetId: "a" });
    expect(next.nodes.pa.children).toEqual(["a"]);
    expect(next.nodes.pb.children).toEqual(["b"]);
  });

  it("no-ops when node or target is not found", () => {
    const state = createInitialState();
    const next = reducer(state, { type: "REORDER_CHILDREN", nodeId: "nope", targetId: "also" });
    expect(next).toBe(state);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/store.test.ts`
Expected: FAIL - TypeScript error: `REORDER_CHILDREN` not defined in Action type.

- [ ] **Step 3: Add REORDER_CHILDREN action type and implementation**

In `store.ts`, add to the `Action` union type (after the `REPARENT` action or at the end):

```typescript
  | { type: "REORDER_CHILDREN"; nodeId: string; targetId: string }
```

In the `reducer` function, add a new case before `default:`:

```typescript
    case "REORDER_CHILDREN": {
      const node = state.nodes[action.nodeId];
      const target = state.nodes[action.targetId];
      if (!node || !target) return state;
      if (node.id === target.id) return state;
      if (node.parentId !== target.parentId || !node.parentId) return state;
      const parent = state.nodes[node.parentId];
      if (!parent) return state;
      const oldIndex = parent.children.indexOf(node.id);
      const newIndex = parent.children.indexOf(target.id);
      if (oldIndex === -1 || newIndex === -1) return state;
      const newChildren = [...parent.children];
      const [item] = newChildren.splice(oldIndex, 1);
      newChildren.splice(newIndex, 0, item!);
      return {
        ...state,
        nodes: { ...state.nodes, [parent.id]: { ...parent, children: newChildren } },
      };
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/store.test.ts`
Expected: All tests pass, including REORDER_CHILDREN tests.

- [ ] **Step 5: Commit**

```bash
git add packages/mintodo/src/store.ts packages/mintodo/src/store.test.ts
git commit -m "feat(mintodo): add REORDER_CHILDREN action for kanban card reordering"
```

---

### Task 5: Update KanbanColumn with SortableContext

**Files:**
- Modify: `packages/mintodo/src/components/KanbanColumn.tsx`

- [ ] **Step 1: Add SortableContext and DFS sort to KanbanColumn**

Replace `packages/mintodo/src/components/KanbanColumn.tsx`:

The key changes:
1. Import `SortableContext`, `sortableKeyboardCoordinates`, `verticalListSortingStrategy` from `@dnd-kit/sortable`
2. Import `sortByDfs` from `../lib/tree`
3. Import `useMemo` from `react`
4. Compute DFS-sorted IDs and pass to `SortableContext`
5. Filter the sorted IDs to only cards in this column

```tsx
import { useMemo } from "react";
import { Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMindStore } from "../hooks/use-mind-store";
import { isKanbanVisible, sortByDfs } from "../lib/tree";
import { KanbanCard } from "./KanbanCard";
import type { MindNode, TaskStatus } from "../types";

const STATUS_LABELS: Record<TaskStatus, string> = {
  inbox: "受信箱",
  wip: "作業中",
  review: "レビュー",
  done: "完了",
};

interface Props {
  status: TaskStatus;
}

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

export function KanbanColumn({ status }: Props) {
  const { dispatch, state } = useMindStore();
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const dfsOrder = useMemo(() => sortByDfs(state.nodes), [state.nodes]);

  const q = state.searchQuery.toLowerCase();
  const cards: MindNode[] = [];
  for (const id of dfsOrder) {
    const n = state.nodes[id];
    if (!n) continue;
    if (
      n.boardId === state.currentBoardId &&
      n.status === status &&
      !isParentCollapsed(state, n.id) &&
      isKanbanVisible(state.nodes, n.id) &&
      !(state.hideCompleted && n.completed && !n.isRoot) &&
      (state.searchQuery === "" || n.text.toLowerCase().includes(q))
    ) {
      cards.push(n);
    }
  }

  const sortedIds = cards.map((n) => n.id);

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-column-${status}`}
      className={`w-72 shrink-0 flex flex-col gap-2 rounded p-3 h-full ${isOver ? "ring-2 ring-sky-400" : ""}`}
      style={{ background: "var(--toolbar-bg)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-1 shrink-0">
        <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          {STATUS_LABELS[status]}
        </h3>
        <span
          className="text-xs"
          style={{ color: "var(--mid)" }}
          data-testid={`kanban-column-count-${status}`}
        >
          {cards.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto">
        <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
          {cards.map((n: MindNode) => (
            <KanbanCard key={n.id} node={n} />
          ))}
        </SortableContext>
        <button
          type="button"
          data-testid={`kanban-column-add-${status}`}
          onClick={() =>
            dispatch({
              modal: { kind: "edit-new", parentId: "root", parentStatusSeed: status },
              type: "OPEN_MODAL",
            })
          }
          className="mt-1 py-2 rounded text-xs flex items-center justify-center gap-1 transition shrink-0"
          style={{
            background: "var(--paper)",
            border: "1px dashed var(--border)",
            color: "var(--mid)",
          }}
        >
          <Plus size={12} /> 追加
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run existing tests to verify no regressions**

Run: `pnpm test -- src/components/KanbanColumn.test.tsx`
Expected: Existing tests pass (may need adjustment for SortableContext; if tests fail due to missing DndContext wrapper, we handle in Task 8).

- [ ] **Step 3: Commit**

```bash
git add packages/mintodo/src/components/KanbanColumn.tsx
git commit -m "feat(mintodo): add SortableContext and DFS sort to KanbanColumn"
```

---

### Task 6: Update KanbanCard with useSortable

**Files:**
- Modify: `packages/mintodo/src/components/KanbanCard.tsx`

- [ ] **Step 1: Replace useDraggable with useSortable**

Replace `packages/mintodo/src/components/KanbanCard.tsx`:

```tsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ListOrdered, Pencil } from "lucide-react";
import { useMindStore } from "../hooks/use-mind-store";
import { parentBreadcrumb } from "../lib/breadcrumb";
import type { MindNode } from "../types";
import { TaskCard } from "./TaskCard";

interface Props {
  node: MindNode;
}

export function KanbanCard({ node }: Props) {
  const { dispatch, state } = useMindStore();
  const breadcrumb = parentBreadcrumb(state.nodes, node.id);

  const { setNodeRef, attributes, listeners, isDragging, transform, transition } = useSortable({
    id: node.id,
  });

  const style = {
    background: "var(--paper)",
    borderColor: "var(--border)",
    color: "var(--ink)",
    opacity: isDragging ? 0.4 : 1,
    touchAction: "none",
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-card-${node.id}`}
      data-node-id={node.id}
      {...attributes}
      {...listeners}
      className="rounded border p-3 flex flex-col gap-2 cursor-grab active:cursor-grabbing"
      style={style}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] overflow-hidden text-ellipsis whitespace-nowrap text-left [direction:rtl]"
          title={breadcrumb}
        >
          {breadcrumb}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            data-testid={`kanban-card-edit-${node.id}`}
            onClick={(e) => {
              e.stopPropagation();
              dispatch({
                modal: { kind: "edit", nodeId: node.id },
                type: "OPEN_MODAL",
              });
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            data-testid={`kanban-card-worklog-${node.id}`}
            onClick={(e) => {
              e.stopPropagation();
              dispatch({
                modal: { kind: "work-log", nodeId: node.id },
                type: "OPEN_MODAL",
              });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            title="作業履歴"
          >
            <ListOrdered size={12} />
          </button>
        </div>
      </div>
      <TaskCard node={node} />
    </div>
  );
}
```

- [ ] **Step 2: Run existing tests to verify no regressions**

Run: `pnpm test -- src/components/KanbanCard.test.tsx`
Expected: Existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/mintodo/src/components/KanbanCard.tsx
git commit -m "feat(mintodo): replace useDraggable with useSortable in KanbanCard"
```

---

### Task 7: Update KanbanBoard with reorder handling

**Files:**
- Modify: `packages/mintodo/src/components/KanbanBoard.tsx`

- [ ] **Step 1: Update KanbanBoard drag handlers for reordering**

Replace `packages/mintodo/src/components/KanbanBoard.tsx`:

```tsx
import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { TASK_STATUSES, type TaskStatus, type MindNode } from "../types";
import { useMindStore } from "../hooks/use-mind-store";
import { KanbanColumn } from "./KanbanColumn";

function KanbanCardPreview({ node }: { node: MindNode }) {
  return (
    <div
      className="rounded border p-3 cursor-grabbing"
      style={{
        background: "var(--paper)",
        borderColor: "var(--border)",
        color: "var(--ink)",
        boxShadow: "0 10px 25px rgba(0,0,0,0.2), 0 4px 10px rgba(0,0,0,0.1)",
        width: "288px",
      }}
    >
      <span className="truncate text-sm font-medium">{node.text}</span>
    </div>
  );
}

export function KanbanBoard() {
  const { dispatch, state } = useMindStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragStart(event: { active: { id: string | number } }) {
    const id = String(event.active.id);
    setActiveId(id);
    dispatch({ id, type: "SET_DRAGGING" });
  }

  function handleDragEnd(event: {
    active: { id: string | number };
    over?: { id: string | number } | null;
  }) {
    const { active, over } = event;
    const activeId = String(active.id);

    if (over) {
      const overId = String(over.id);
      const taskStatuses: readonly string[] = TASK_STATUSES;
      if (taskStatuses.includes(overId)) {
        dispatch({ id: activeId, status: overId as TaskStatus, type: "SET_STATUS" });
      } else {
        dispatch({ type: "REORDER_CHILDREN", nodeId: activeId, targetId: overId });
      }
    }
    dispatch({ id: null, type: "SET_DRAGGING" });
    setActiveId(null);
  }

  function handleDragCancel() {
    dispatch({ id: null, type: "SET_DRAGGING" });
    setActiveId(null);
  }

  const activeNode = activeId ? state.nodes[activeId] : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div data-testid="kanban-board" className="w-full h-full overflow-hidden flex flex-col">
        <div className="flex flex-row gap-4 p-4 min-h-full overflow-x-auto overflow-y-hidden flex-1">
          {TASK_STATUSES.map((status) => (
            <KanbanColumn key={status} status={status} />
          ))}
        </div>
      </div>
      <DragOverlay>{activeNode ? <KanbanCardPreview node={activeNode} /> : null}</DragOverlay>
    </DndContext>
  );
}
```

- [ ] **Step 2: Run existing tests to verify no regressions**

Run: `pnpm test -- src/components/KanbanBoard.test.tsx`
Expected: Existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/mintodo/src/components/KanbanBoard.tsx
git commit -m "feat(mintodo): add intra-column reorder handling to KanbanBoard"
```

---

### Task 8: Update tests for reordering and screening

**Files:**
- Modify: `packages/mintodo/src/components/KanbanBoard.test.tsx`
- Modify: `packages/mintodo/src/components/KanbanColumn.test.tsx`
- Modify: `packages/mintodo/src/integration.test.tsx`

- [ ] **Step 1: Add reorder test to KanbanBoard.test.tsx**

Add a test that verifies reordering works between sibling cards (same parent):

```typescript
  it("reorders two sibling cards within the same column when dragged", () => {
    const root = node({ id: "root", boardId: "b", parentId: null, isRoot: true, status: "inbox" });
    const a = node({ id: "a", boardId: "b", parentId: "root", status: "inbox" });
    const b = node({ id: "b", boardId: "b", parentId: "root", status: "inbox" });
    root.children = ["a", "b"];
    a.parentId = "root";
    b.parentId = "root";

    const { rerender } = renderBoard([root, a, b]);

    const inboxCol = screen.getByTestId("kanban-column-inbox");
    const cards = inboxCol.querySelectorAll("[data-node-id]");
    const cardIds = [...cards].map((c) => (c as HTMLElement).dataset.nodeId);
    expect(cardIds.indexOf("a")).toBeLessThan(cardIds.indexOf("b"));

    // We verify DFS order: root's children order determines card order in kanban
    // After REORDER_CHILDREN action, the children array should be updated
  });
```

- [ ] **Step 2: Add DFS order test to KanbanColumn.test.tsx**

Add a test that verifies cards are rendered in DFS order:

```typescript
  it("renders cards in DFS order (children array order)", () => {
    const root = node({ id: "root", boardId: "b", parentId: null, isRoot: true, status: "inbox" });
    const b = node({ id: "b", boardId: "b", parentId: "root", status: "inbox" });
    const a = node({ id: "a", boardId: "b", parentId: "root", status: "inbox" });
    root.children = ["b", "a"];
    a.parentId = "root";
    b.parentId = "root";

    render(
      <MindProvider
        initialState={{
          ...createInitialState(),
          currentBoardId: "b",
          boards: [{ id: "b", name: "B", createdAt: 0, updatedAt: 0 }],
          nodes: { root, a, b },
        }}
      >
        <KanbanColumn status="inbox" />
      </MindProvider>,
    );

    const column = screen.getByTestId("kanban-column-inbox");
    const cards = column.querySelectorAll("[data-node-id]");
    const cardIds = [...cards].map((c) => (c as HTMLElement).dataset.nodeId);
    expect(cardIds.indexOf("b")).toBeLessThan(cardIds.indexOf("a"));
  });
```

- [ ] **Step 3: Update integration test for closestCenter collision detection (optional)**

The integration test's `pointerRectCollision` custom collision detection may need adjustment since `closestCenter` is now used. Verify the existing drag-between-columns test still passes.

- [ ] **Step 4: Run all tests**

Run: `pnpm test`
Expected: All tests pass. Type check passes.

- [ ] **Step 5: Commit**

```bash
git add packages/mintodo/src/components/KanbanBoard.test.tsx packages/mintodo/src/components/KanbanColumn.test.tsx
git commit -m "test(mintodo): add tests for kanban DFS order and reordering"
```

---

### Task 9: Verification

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 2: Run type check**

Run: `pnpm run check`
Expected: No type errors, no lint errors.

- [ ] **Step 3: Run format**

Run: `pnpm run format`
Expected: Files formatted, no changes or only formatting changes.

- [ ] **Step 4: Final commit if needed**

```bash
git add -A
git commit -m "chore(mintodo): final formatting and cleanup for kanban fixes"
```
