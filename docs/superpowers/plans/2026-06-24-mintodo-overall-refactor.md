# mintodo 全体改修 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** mintodo の mindmap / KANBAN カード共通化、ステータス可視化、3つ目の view mode としてのテキストエディタ、Mermaid `mindmap` 形式 DSL、ShortcutHint 撤去を 1 サイクルで実装する。

**Architecture:**
- 共通カード `TaskCard` を切り出し、`NodeCard` / `KanbanCard` は薄いラッパに
- DSL を Mermaid `mindmap` 構文 (行頭 `*` + インデント) に統一
- `ViewMode` に `"text"` を追加し、左エディタ + 右プレビューの `<TextEditor>` を提供
- 旧 `DslEditorModal` と `ShortcutHint` は削除

**Tech Stack:** React 18, TypeScript, Tailwind CSS, lucide-react, dnd-kit, Dexie (IndexedDB), vitest + @testing-library/react, fake-indexeddb

**Spec:** `docs/superpowers/specs/2026-06-24-mintodo-overall-refactor-design.md`

## Global Constraints

- pnpm を使用 (npm / yarn 不可)
- TypeScript strict mode
- テストランナ: vitest。`pnpm test` で全件通ること
- タイプチェック: `tsgo --noEmit` (mintodo の `pnpm run check` から呼ばれる)
- リンタ: oxlint
- フォーマッタ: oxfmt (pre-commit lefthook が走る)
- IndexedDB: スキーマは `db.version(1).stores({ nodes: "id", boards: "id", meta: "key" })` を維持
- 色トークン: 既存の CSS 変数 (`var(--paper)`, `var(--ink)`, `var(--border)`, `var(--terra)` 等) をそのまま使用
- コミット粒度: タスクごとに 1 コミット、メッセージは Conventional Commits (`feat:` / `refactor:` / `test:` / `chore:` / `docs:`)
- コミット前に lefthook pre-commit (format) が走る。失敗したら直して `git commit --amend` せず新規コミット

---

## File Structure

### 新規
- `src/components/TaskCard.tsx` — 共通カード UI (text / check / add-child / status dot / category dot / badge)
- `src/components/TaskCard.test.tsx` — TaskCard 単体テスト
- `src/components/TextEditor.tsx` — 3 つ目の view mode 本体
- `src/components/TextEditor.test.tsx` — TextEditor 単体テスト

### 変更
- `src/types.ts` — `ViewMode` に `"text"` 追加、`Modal` から `dsl-editor` 削除
- `src/lib/badges.ts` — `statusDotClass` 追加
- `src/components/ViewModeToggle.tsx` — 3 ボタン化
- `src/components/NodeCard.tsx` — TaskCard のラッパへ書き換え
- `src/components/KanbanCard.tsx` — TaskCard のラッパ + breadcrumb + onClick
- `src/components/KanbanColumn.tsx` — flex-1 / min-h-0 / overflow-y-auto
- `src/components/KanbanBoard.tsx` — 高さ制約
- `src/components/Toolbar.tsx` — FileText ボタンと import 削除
- `src/App.tsx` — ShortcutHint 削除、viewMode === "text" で TextEditor
- `src/dsl.ts` — Mermaid `mindmap` 形式に書き換え
- `src/dsl.test.ts` — Mermaid 形式テストに全面差し替え
- `src/components/NodeCard.test.tsx` — TaskCard 利用に伴うアサーション更新
- `src/components/KanbanCard.test.tsx` — onClick テスト追加

### 削除
- `src/components/ShortcutHint.tsx`
- `src/components/DslEditorModal.tsx`
- `src/components/DslEditorModal.test.tsx`

---

## Task 1: `statusDotClass` ヘルパ追加

**Files:**
- Modify: `packages/mintodo/src/lib/badges.ts:34-49`
- Create: `packages/mintodo/src/lib/badges.test.ts`

**Interfaces:**
- Consumes: `TaskStatus` from `../types`
- Produces: `statusDotClass(status: TaskStatus): string` — Tailwind クラス名

- [ ] **Step 1: 失敗テストを書く**

`packages/mintodo/src/lib/badges.test.ts` を新規作成:

```ts
import { describe, expect, it } from "vitest";
import { statusDotClass } from "./badges";

describe("statusDotClass", () => {
  it("returns slate for inbox", () => {
    expect(statusDotClass("inbox")).toBe("bg-slate-400");
  });
  it("returns sky for wip", () => {
    expect(statusDotClass("wip")).toBe("bg-sky-500");
  });
  it("returns amber for review", () => {
    expect(statusDotClass("review")).toBe("bg-amber-500");
  });
  it("returns emerald for done", () => {
    expect(statusDotClass("done")).toBe("bg-emerald-500");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd packages/mintodo && pnpm vitest run src/lib/badges.test.ts
```

Expected: FAIL with `statusDotClass is not a function` (または import 解決失敗)

- [ ] **Step 3: 実装を追加**

`packages/mintodo/src/lib/badges.ts` の末尾 (66 行目以降) に追加:

```ts
export function statusDotClass(s: MindNode["status"]): string {
  switch (s) {
    case "wip": {
      return "bg-sky-500";
    }
    case "review": {
      return "bg-amber-500";
    }
    case "done": {
      return "bg-emerald-500";
    }
    default: {
      return "bg-slate-400";
    }
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
cd packages/mintodo && pnpm vitest run src/lib/badges.test.ts
```

Expected: PASS, 4 tests

- [ ] **Step 5: コミット**

```bash
cd packages/mintodo
git add src/lib/badges.ts src/lib/badges.test.ts
git commit -m "feat(mintodo): add statusDotClass helper for status badge"
```

---

## Task 2: `TaskCard` コンポーネント新規作成

**Files:**
- Create: `packages/mintodo/src/components/TaskCard.tsx`
- Create: `packages/mintodo/src/components/TaskCard.test.tsx`

**Interfaces:**
- Consumes: `MindNode`, `MindStore` (read state, dispatch)
- Produces: `<TaskCard node={node} />` — 共通カード UI。ラッパは `<NodeCard>` / `<KanbanCard>` が担当するので `TaskCard` 自体の DOM 位置は持たない (ラッパ側で `className` / `style` を上書き可能)

- [ ] **Step 1: 失敗テストを書く**

`packages/mintodo/src/components/TaskCard.test.tsx` を新規作成:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskCard } from "./TaskCard";
import { MindProvider, useMindStore } from "../hooks/use-mind-store";
import type { MindNode } from "../types";
import type { State } from "../store";

function makeNode(over: Partial<MindNode> = {}): MindNode {
  return {
    id: "n1",
    boardId: "b1",
    text: "牛乳",
    parentId: "root",
    isRoot: false,
    completed: false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    status: "inbox",
    children: [],
    x: 0,
    y: 0,
    ...over,
  };
}

function makeState(over: Partial<State> = {}): State {
  return {
    boards: [],
    currentBoardId: "b1",
    draggingNodeId: null,
    drawerOpen: false,
    hideCompleted: false,
    layoutVersion: 0,
    modal: null,
    viewMode: "mindmap",
    searchQuery: "",
    selectedNodeId: null,
    view: { pan: { x: 0, y: 0 }, zoom: 1 },
    nodes: { root: makeNode({ id: "root", isRoot: true }), n1: makeNode() },
    ...over,
  };
}

let captured: State | null = null;
function Capture() {
  captured = useMindStore().state;
  return null;
}

describe("TaskCard", () => {
  it("renders text, add-child button, and status dot", () => {
    render(
      <MindProvider initialState={makeState()}>
        <Capture />
        <TaskCard node={makeNode({ status: "wip" })} />
      </MindProvider>,
    );
    expect(screen.getByText("牛乳")).toBeTruthy();
    expect(screen.getByTestId("add-child-n1")).toBeTruthy();
    expect(screen.getByTestId("status-dot-n1").className).toContain("bg-sky-500");
  });

  it("opens edit-new modal when add-child is clicked", () => {
    render(
      <MindProvider initialState={makeState()}>
        <Capture />
        <TaskCard node={makeNode()} />
      </MindProvider>,
    );
    fireEvent.click(screen.getByTestId("add-child-n1"));
    expect(captured!.modal).toEqual({ kind: "edit-new", parentId: "n1" });
  });

  it("toggles complete when checkbox is clicked", () => {
    render(
      <MindProvider initialState={makeState()}>
        <Capture />
        <TaskCard node={makeNode()} />
      </MindProvider>,
    );
    fireEvent.click(screen.getByTestId("task-check-n1"));
    expect(captured!.nodes.n1.completed).toBe(true);
  });

  it("renders categoryColor dot alongside status dot", () => {
    render(
      <MindProvider initialState={makeState()}>
        <TaskCard node={makeNode({ categoryColor: "rose", status: "done" })} />
      </MindProvider>,
    );
    expect(screen.getByTestId("category-dot-n1").className).toContain("bg-rose-400");
    expect(screen.getByTestId("status-dot-n1").className).toContain("bg-emerald-500");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd packages/mintodo && pnpm vitest run src/components/TaskCard.test.tsx
```

Expected: FAIL with import 解決失敗

- [ ] **Step 3: `TaskCard` を実装**

`packages/mintodo/src/components/TaskCard.tsx` を新規作成:

```tsx
import { Check, GitBranch, XCircle } from "lucide-react";
import { useMindStore } from "../hooks/use-mind-store";
import { categoryDotClass, formatBadges, statusDotClass } from "../lib/badges";
import type { MindNode } from "../types";

interface Props {
  node: MindNode;
}

export function TaskCard({ node }: Props) {
  const { dispatch } = useMindStore();
  const isDone = node.status === "done" || node.completed;
  const { dueHtml, showHigh, showBadgeRow } = formatBadges(node);

  return (
    <div
      data-testid={`task-card-${node.id}`}
      data-node-id={node.id}
      className="flex flex-col gap-1.5 min-w-0"
    >
      <div className="flex items-start gap-2 min-w-0">
        <button
          type="button"
          data-testid={`task-check-${node.id}`}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ id: node.id, type: "TOGGLE_COMPLETE" });
          }}
          className="shrink-0"
        >
          {isDone ? (
            <Check className="text-indigo-500" size={18} />
          ) : (
            <XCircle
              className="text-slate-300 dark:text-slate-600 hover:text-indigo-500"
              size={18}
            />
          )}
        </button>
        <span
          className={`whitespace-pre-wrap break-words max-w-[240px] flex-1 text-sm font-medium ${isDone ? "line-through text-slate-400 dark:text-slate-500" : ""}`}
        >
          {node.text}
        </span>
        <button
          type="button"
          data-testid={`add-child-${node.id}`}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ modal: { kind: "edit-new", parentId: node.id }, type: "OPEN_MODAL" });
          }}
          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 w-6 h-6 rounded-md flex items-center justify-center transition shrink-0"
          title="子タスクを追加"
        >
          <GitBranch size={12} />
        </button>
      </div>
      {showBadgeRow && (
        <div className="flex items-center justify-between w-full pt-1.5 border-t border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-1.5">
            <span dangerouslySetInnerHTML={{ __html: dueHtml }} />
            {showHigh && (
              <span className="bg-rose-50 text-rose-500 dark:bg-rose-950/20 text-[10px] font-bold px-1.5 py-0.5 rounded">
                重要
              </span>
            )}
            <span
              data-testid={`status-dot-${node.id}`}
              className={`w-2 h-2 rounded-full ${statusDotClass(node.status)}`}
              title={`status: ${node.status}`}
            />
          </div>
          <span
            data-testid={`category-dot-${node.id}`}
            className={`w-2 h-2 rounded-full ${categoryDotClass(node.categoryColor)}`}
            title={`category: ${node.categoryColor}`}
          />
        </div>
      )}
      {!showBadgeRow && (
        <div className="flex items-center justify-end w-full pt-1">
          <span
            data-testid={`status-dot-${node.id}`}
            className={`w-2 h-2 rounded-full ${statusDotClass(node.status)}`}
            title={`status: ${node.status}`}
          />
          <span
            data-testid={`category-dot-${node.id}`}
            className={`w-2 h-2 rounded-full ${categoryDotClass(node.categoryColor)} ml-1`}
            title={`category: ${node.categoryColor}`}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
cd packages/mintodo && pnpm vitest run src/components/TaskCard.test.tsx
```

Expected: PASS, 4 tests

- [ ] **Step 5: 既存テストへの影響を確認**

`NodeCard` と `KanbanCard` はまだ旧実装なので、TaskCard は新規追加分のみ。`pnpm test` 全体実行して回帰がないこと:

```bash
cd packages/mintodo && pnpm test --run
```

Expected: 既存テストが全て PASS

- [ ] **Step 6: コミット**

```bash
cd packages/mintodo
git add src/components/TaskCard.tsx src/components/TaskCard.test.tsx
git commit -m "feat(mintodo): add shared TaskCard component"
```

---

## Task 3: `NodeCard` を `TaskCard` ラッパに書き換え

**Files:**
- Modify: `packages/mintodo/src/components/NodeCard.tsx`
- Modify: `packages/mintodo/src/components/NodeCard.test.tsx`

**Interfaces:**
- Consumes: `TaskCard` from `./TaskCard`
- Produces: `<NodeCard node={node} />` — 絶対配置 + 親 transform 内 + dnd-kit drag/drop + collapse/ellipsis

- [ ] **Step 1: 既存 `NodeCard.test.tsx` を読み影響範囲を確認**

`packages/mintodo/src/components/NodeCard.test.tsx` のアサーションを確認。`data-testid="add-child-root"` / `data-testid="ellipsis"` / 完了トグル / ドネードラッグは維持。`data-testid="add-child-n1"` は新 `TaskCard` 由来になる (root 以外)。

- [ ] **Step 2: `NodeCard` を全面書き換え**

`packages/mintodo/src/components/NodeCard.tsx` を以下に置換:

```tsx
import { ChevronDown, ChevronUp, EllipsisVertical, Plus } from "lucide-react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useMindStore } from "../hooks/use-mind-store";
import { isDescendant } from "../store";
import type { MindNode } from "../types";
import { categoryBorderColor } from "../lib/badges";
import { TaskCard } from "./TaskCard";

interface Props {
  node: MindNode;
}

export function NodeCard({ node }: Props) {
  const { dispatch, state } = useMindStore();
  const isSelected = state.selectedNodeId === node.id;
  const isMatch = state.searchQuery === "" || node.text.toLowerCase().includes(state.searchQuery);

  const {
    setNodeRef: dragRef,
    attributes,
    listeners,
    isDragging,
  } = useDraggable({ id: node.id, disabled: node.isRoot });
  const { setNodeRef: dropRef, isOver } = useDroppable({ id: node.id });

  const setNodeRef = (el: HTMLElement | null) => {
    dragRef(el);
    dropRef(el);
  };

  const draggedId = state.draggingNodeId;
  const isRingVisible =
    isOver &&
    draggedId !== null &&
    draggedId !== node.id &&
    !isDescendant(state.nodes, draggedId, node.id);

  if (node.isRoot) {
    return (
      <div
        ref={setNodeRef}
        id={`node-dom-${node.id}`}
        data-node-id={node.id}
        className={`absolute -translate-x-1/2 -translate-y-1/2 p-4 rounded flex items-center justify-between gap-3 min-w-[200px] min-h-[60px] max-w-[280px] ${isSelected ? "node-selected" : ""} ${isMatch ? "" : "opacity-30"} ${isRingVisible ? "ring-2 ring-sky-400" : ""}`}
        style={{
          left: node.x,
          top: node.y,
          background: "var(--terra)",
          color: "var(--paper)",
          border: "2px solid var(--terra)",
          fontFamily: '"Crimson Pro", serif',
          fontWeight: 600,
        }}
      >
        <div className="flex-1 select-none pr-1 truncate">{node.text}</div>
        <button
          type="button"
          data-testid="add-child-root"
          className="w-7 h-7 rounded flex items-center justify-center transition"
          style={{ background: "rgba(255,255,255,0.2)" }}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ modal: { kind: "edit-new", parentId: node.id }, type: "OPEN_MODAL" });
          }}
        >
          <Plus size={12} />
        </button>
      </div>
    );
  }

  const borderColor = categoryBorderColor(node.categoryColor);
  const priBorder = node.priority === "high";

  return (
    <div
      ref={setNodeRef}
      id={`node-dom-${node.id}`}
      data-node-id={node.id}
      {...attributes}
      {...listeners}
      onClick={() => dispatch({ id: node.id, type: "SELECT" })}
      className={`absolute -translate-x-1/2 -translate-y-1/2 px-4 py-3 rounded border-l-4 flex flex-col gap-1.5 min-w-[220px] max-w-[320px] ${isSelected ? "node-selected" : ""} ${isMatch ? "" : "opacity-30"} ${isRingVisible ? "ring-2 ring-sky-400" : ""}`}
      style={{
        left: node.x,
        top: node.y,
        background: "var(--paper)",
        color: "var(--ink)",
        borderTop: "1px solid var(--border)",
        borderRight: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        borderLeft: `4px solid ${borderColor}`,
        boxShadow: priBorder ? "0 0 0 1px var(--terra)" : undefined,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div className="flex items-start justify-between w-full gap-2">
        <div className="flex-1 min-w-0">
          <TaskCard node={node} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {node.children.length > 0 && (
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition"
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ id: node.id, type: "TOGGLE_COLLAPSE" });
              }}
            >
              {node.collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </button>
          )}
          <button
            type="button"
            data-testid="ellipsis"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ modal: { kind: "edit", nodeId: node.id }, type: "OPEN_MODAL" });
            }}
          >
            <EllipsisVertical size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 既存 `NodeCard.test.tsx` のうち壊れるアサーションを修正**

`packages/mintodo/src/components/NodeCard.test.tsx` を読み、影響を受けるテストケースを修正する。具体的には:

- `+ ルートへの子追加ボタン click → edit-new modal`: 動作維持 (`data-testid="add-child-root"` 使用のため影響なし)
- `+ ルート以外の子追加ボタン click → edit-new modal`: 既存テストが `getByRole("button")` などで AddChild を取っていた場合、TaskCard 内の `data-testid="add-child-{id}"` を使うように書き換え
- `完了トグル`: 既存テストのセレクタを `data-testid="task-check-{id}"` に書き換え
- その他 データテスト ID が変わるものは機械的に置換

修正後ファイル全体を実行:

```bash
cd packages/mintodo && pnpm vitest run src/components/NodeCard.test.tsx
```

Expected: PASS

- [ ] **Step 4: 全体回帰**

```bash
cd packages/mintodo && pnpm test --run
```

Expected: 既存テスト PASS + TaskCard テスト PASS

- [ ] **Step 5: コミット**

```bash
cd packages/mintodo
git add src/components/NodeCard.tsx src/components/NodeCard.test.tsx
git commit -m "refactor(mintodo): make NodeCard a thin wrapper around TaskCard"
```

---

## Task 4: `KanbanCard` を `TaskCard` ラッパに書き換え + onClick

**Files:**
- Modify: `packages/mintodo/src/components/KanbanCard.tsx`
- Modify: `packages/mintodo/src/components/KanbanCard.test.tsx`

**Interfaces:**
- Consumes: `TaskCard` from `./TaskCard`
- Produces: `<KanbanCard node={node} />` — flex 配置 + breadcrumb 上部 + dnd-kit drag + カード本体クリックで `edit` モーダル

- [ ] **Step 1: 失敗テストを 1 件追加 (onClick → edit modal)**

`packages/mintodo/src/components/KanbanCard.test.tsx` の末尾に追記:

```tsx
import { fireEvent, screen } from "@testing-library/react";

it("clicking the card body opens the edit modal", () => {
  const state = makeState({ nodes: { root: makeNode({ id: "root", isRoot: true }), n1: makeNode() } });
  render(
    <MindProvider initialState={state}>
      <Capture />
      <KanbanCard node={state.nodes.n1} />
    </MindProvider>,
  );
  fireEvent.click(screen.getByTestId("kanban-card-n1"));
  expect(captured!.modal).toEqual({ kind: "edit", nodeId: "n1" });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd packages/mintodo && pnpm vitest run src/components/KanbanCard.test.tsx
```

Expected: FAIL (新しい testid `kanban-card-n1` がまだ存在しない、もしくは onClick がない)

- [ ] **Step 3: `KanbanCard` を全面書き換え**

`packages/mintodo/src/components/KanbanCard.tsx` を以下に置換:

```tsx
import { useDraggable } from "@dnd-kit/core";
import { useMindStore } from "../hooks/use-mind-store";
import type { MindNode } from "../types";
import { TaskCard } from "./TaskCard";

function buildBreadcrumb(nodes: Record<string, MindNode>, targetId: string): string {
  const path: string[] = [];
  let cur = nodes[targetId];
  while (cur) {
    path.unshift(cur.text);
    if (!cur.parentId) break;
    cur = nodes[cur.parentId];
    if (!cur) break;
  }
  if (path.length <= 3) return path.join(" / ");
  return `… / ${path.slice(-2).join(" / ")}`;
}

interface Props {
  node: MindNode;
}

export function KanbanCard({ node }: Props) {
  const { dispatch, state } = useMindStore();
  const breadcrumb = buildBreadcrumb(state.nodes, node.id);

  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: node.id });

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-card-${node.id}`}
      data-node-id={node.id}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (isDragging) return;
        dispatch({ modal: { kind: "edit", nodeId: node.id }, type: "OPEN_MODAL" });
      }}
      className="rounded border p-3 flex flex-col gap-2 cursor-grab active:cursor-grabbing"
      style={{
        background: "var(--paper)",
        borderColor: "var(--border)",
        color: "var(--ink)",
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div className="text-[10px] truncate" style={{ color: "var(--mid)" }} title={breadcrumb}>
        {breadcrumb}
      </div>
      <TaskCard node={node} />
    </div>
  );
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
cd packages/mintodo && pnpm vitest run src/components/KanbanCard.test.tsx
```

Expected: PASS

- [ ] **Step 5: 全体回帰**

```bash
cd packages/mintodo && pnpm test --run
```

Expected: PASS

- [ ] **Step 6: コミット**

```bash
cd packages/mintodo
git add src/components/KanbanCard.tsx src/components/KanbanCard.test.tsx
git commit -m "refactor(mintodo): make KanbanCard a TaskCard wrapper with click-to-edit"
```

---

## Task 5: KANBAN カラムの縦スクロール対応

**Files:**
- Modify: `packages/mintodo/src/components/KanbanColumn.tsx`
- Modify: `packages/mintodo/src/components/KanbanBoard.tsx`

**Interfaces:**
- Consumes: 既存 KanbanColumn / KanbanBoard API
- Produces: ビューポートに連動した縦スクロール

- [ ] **Step 1: `KanbanColumn` の高さを flex-1 ベースに変更**

`packages/mintodo/src/components/KanbanColumn.tsx` の `<div className="w-72 shrink-0 flex flex-col gap-2 rounded p-3 ...">` を以下に置換:

```tsx
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
    {cards.map((n: MindNode) => (
      <KanbanCard key={n.id} node={n} />
    ))}
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
```

`import { Plus } from "lucide-react";` はそのまま。

- [ ] **Step 2: `KanbanBoard` の高さを flex column に**

`packages/mintodo/src/components/KanbanBoard.tsx` の `<div data-testid="kanban-board" className="w-full h-full overflow-x-auto">` を以下に置換:

```tsx
<div data-testid="kanban-board" className="w-full h-full overflow-hidden flex flex-col">
  <div className="flex flex-row gap-4 p-4 min-h-full overflow-x-auto overflow-y-hidden flex-1">
    {TASK_STATUSES.map((status) => (
      <KanbanColumn key={status} status={status} />
    ))}
  </div>
</div>
```

- [ ] **Step 3: 既存 KANBAN テストを実行**

```bash
cd packages/mintodo && pnpm vitest run src/components/KanbanColumn.test.tsx src/components/KanbanBoard.test.tsx src/integration.test.tsx
```

Expected: PASS

- [ ] **Step 4: 手動確認 (任意)**

`pnpm --filter mintodo dev` でブラウザを開き、kanban モードで cards を多数作って、列内でスクロールが発生することを確認。

- [ ] **Step 5: コミット**

```bash
cd packages/mintodo
git add src/components/KanbanColumn.tsx src/components/KanbanBoard.tsx
git commit -m "fix(mintodo): make kanban column scroll vertically within viewport"
```

---

## Task 6: `ShortcutHint` 削除

**Files:**
- Delete: `packages/mintodo/src/components/ShortcutHint.tsx`
- Modify: `packages/mintodo/src/App.tsx:11,70`

- [ ] **Step 1: `App.tsx` から `ShortcutHint` の import と使用を削除**

`packages/mintodo/src/App.tsx` を編集:
- 11行目 `import { ShortcutHint } from "./components/ShortcutHint";` を削除
- 70行目 `{state.viewMode === "mindmap" && <ZoomControls />}` の直後の `<ShortcutHint />` (70行目) を削除

- [ ] **Step 2: `ShortcutHint.tsx` をファイルごと削除**

```bash
rm packages/mintodo/src/components/ShortcutHint.tsx
```

- [ ] **Step 3: テスト実行 + 全体確認**

```bash
cd packages/mintodo && pnpm test --run && pnpm run check
```

Expected: PASS

- [ ] **Step 4: コミット**

```bash
cd packages/mintodo
git add -A src/components/ShortcutHint.tsx src/App.tsx
git commit -m "chore(mintodo): remove ShortcutHint overlay (access only via HelpModal)"
```

---

## Task 7: Mermaid `mindmap` 形式 DSL に書き換え

**Files:**
- Modify: `packages/mintodo/src/dsl.ts`
- Modify: `packages/mintodo/src/dsl.test.ts`

**Interfaces:**
- Consumes: `MindNode`, `TaskStatus`, `Priority`, `CategoryColor`
- Produces:
  - `parseDSL(text: string, boardId: string): DslParseResult | null` — 1 行目 `mindmap` ヘッダ、2 行目以降 `*` 行 + インデント深さ。旧 2 スペースのみ DSL はサポートしない
  - `serializeDSL(board, nodes): string` — Mermaid 形式で出力
  - `parseInlineDSL(raw: string): InlineDslResult` — 既存無改変 (別タスク `dsl-stack-parser` で触れていない)

- [ ] **Step 1: 既存テストを削除し新形式のテストを書く**

`packages/mintodo/src/dsl.test.ts` を以下に置換:

```ts
import { describe, expect, it } from "vitest";
import { parseDSL, parseInlineDSL, serializeDSL } from "./dsl";
import type { MindNode } from "./types";

describe("parseDSL — Mermaid mindmap", () => {
  it("parses a single root", () => {
    const r = parseDSL("mindmap\n  * Root\n", "b1");
    expect(r).not.toBeNull();
    expect(r!.board.name).toBe("Root");
    expect(r!.nodes).toHaveLength(1);
    expect(r!.nodes[0].isRoot).toBe(true);
    expect(r!.nodes[0].text).toBe("Root");
  });

  it("parses child and grandchild via indentation", () => {
    const text = "mindmap\n  * Root\n    * Child\n      * Grand\n";
    const r = parseDSL(text, "b1")!;
    expect(r.nodes).toHaveLength(3);
    expect(r.nodes[1].parentId).toBe(r.nodes[0].id);
    expect(r.nodes[2].parentId).toBe(r.nodes[1].id);
  });

  it("parses multiple children at the same depth", () => {
    const text = "mindmap\n  * Root\n    * A\n    * B\n    * C\n";
    const r = parseDSL(text, "b1")!;
    expect(r.nodes.filter((n) => !n.isRoot)).toHaveLength(3);
  });

  it("parses attributes (@priority, @color, @due, @done, @status)", () => {
    const r = parseDSL(
      "mindmap\n  * X @priority:high @color:rose @due:2026-06-25 @status:wip\n",
      "b1",
    )!;
    const n = r.nodes[0];
    expect(n.priority).toBe("high");
    expect(n.categoryColor).toBe("rose");
    expect(n.dueDate).toBe("2026-06-25");
    expect(n.status).toBe("wip");
  });

  it("returns null when header is missing", () => {
    expect(parseDSL("  * Root\n", "b1")).toBeNull();
  });

  it("returns null when indent is invalid (tab or odd)", () => {
    expect(parseDSL("mindmap\n\t* Root\n", "b1")).toBeNull();
    expect(parseDSL("mindmap\n   * Root\n", "b1")).toBeNull();
  });

  it("returns null when no root exists", () => {
    expect(parseDSL("mindmap\n", "b1")).toBeNull();
  });

  it("returns null when multiple roots exist", () => {
    expect(parseDSL("mindmap\n  * A\n  * B\n", "b1")).toBeNull();
  });

  it("returns null on unknown attribute value", () => {
    expect(parseDSL("mindmap\n  * X @priority:urgent\n", "b1")).toBeNull();
    expect(parseDSL("mindmap\n  * X @color:purple\n", "b1")).toBeNull();
  });

  it("returns null on invalid due date", () => {
    expect(parseDSL("mindmap\n  * X @due:not-a-date\n", "b1")).toBeNull();
  });

  it("treats @done as status:done and completed:true", () => {
    const r = parseDSL("mindmap\n  * X @done\n", "b1")!;
    expect(r.nodes[0].status).toBe("done");
    expect(r.nodes[0].completed).toBe(true);
  });

  it("round-trips through serializeDSL", () => {
    const original: Record<string, MindNode> = {
      root: {
        id: "root",
        boardId: "b1",
        text: "Root",
        parentId: null,
        isRoot: true,
        completed: false,
        collapsed: false,
        priority: "medium",
        categoryColor: "slate",
        dueDate: "",
        status: "inbox",
        children: ["a", "b"],
        x: 0,
        y: 0,
      },
      a: {
        id: "a",
        boardId: "b1",
        text: "A",
        parentId: "root",
        isRoot: false,
        completed: false,
        collapsed: false,
        priority: "high",
        categoryColor: "rose",
        dueDate: "2026-06-25",
        status: "wip",
        children: [],
        x: 0,
        y: 0,
      },
      b: {
        id: "b",
        boardId: "b1",
        text: "B",
        parentId: "root",
        isRoot: false,
        completed: true,
        collapsed: false,
        priority: "medium",
        categoryColor: "slate",
        dueDate: "",
        status: "done",
        children: [],
        x: 0,
        y: 0,
      },
    };
    const out = serializeDSL({ name: "Root" }, original);
    const parsed = parseDSL(out, "b1")!;
    expect(parsed.nodes).toHaveLength(3);
    const a = parsed.nodes.find((n) => n.text === "A")!;
    expect(a.priority).toBe("high");
    expect(a.categoryColor).toBe("rose");
    expect(a.dueDate).toBe("2026-06-25");
    expect(a.status).toBe("wip");
    const b = parsed.nodes.find((n) => n.text === "B")!;
    expect(b.status).toBe("done");
    expect(b.completed).toBe(true);
  });
});

describe("parseInlineDSL (unchanged)", () => {
  it("parses inline attributes", () => {
    expect(parseInlineDSL("task @priority:high @done")).toEqual({
      text: "task",
      hasAnyAttribute: true,
      priority: "high",
      categoryColor: null,
      dueDate: null,
      completed: true,
      status: "done",
    });
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd packages/mintodo && pnpm vitest run src/dsl.test.ts
```

Expected: FAIL (新形式で parseDSL が動くか未確認)

- [ ] **Step 3: `dsl.ts` の `parseDSL` と `serializeDSL` を Mermaid 形式に書き換え**

`packages/mintodo/src/dsl.ts` を以下に置換:

```ts
import type { CategoryColor, MindNode, Priority, TaskStatus } from "./types";

export interface DslParseResult {
  board: { id: string; name: string };
  nodes: MindNode[];
}

const ALLOWED_PRIORITIES: ReadonlySet<Priority> = new Set(["low", "medium", "high"]);
const ALLOWED_COLORS: ReadonlySet<CategoryColor> = new Set(["slate", "sky", "emerald", "rose"]);
const ALLOWED_STATUSES: ReadonlySet<TaskStatus> = new Set(["inbox", "wip", "review", "done"]);

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

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
    status: "inbox",
    children: [],
    x: 0,
    y: 0,
  };
}

function parseAttributes(tokens: string[]): {
  text: string;
  priority: Priority;
  categoryColor: CategoryColor;
  dueDate: string;
  completed: boolean;
  status: TaskStatus;
} | null {
  const textTokens: string[] = [];
  const attrTokens: string[] = [];
  for (const tok of tokens) {
    if (tok.startsWith("@")) attrTokens.push(tok);
    else textTokens.push(tok);
  }
  const text = textTokens.join(" ").trim();
  if (!text) return null;

  let priority: Priority = "medium";
  let categoryColor: CategoryColor = "slate";
  let dueDate = "";
  let completed = false;
  let status: TaskStatus = "inbox";

  for (const tok of attrTokens) {
    const colon = tok.indexOf(":");
    const key = colon === -1 ? tok.slice(1) : tok.slice(1, colon);
    const value = colon === -1 ? "" : tok.slice(colon + 1);
    switch (key) {
      case "priority": {
        if (!ALLOWED_PRIORITIES.has(value as Priority)) return null;
        priority = value as Priority;
        break;
      }
      case "color": {
        if (!ALLOWED_COLORS.has(value as CategoryColor)) return null;
        categoryColor = value as CategoryColor;
        break;
      }
      case "due": {
        if (!isValidDate(value)) return null;
        dueDate = value;
        break;
      }
      case "done": {
        completed = true;
        status = "done";
        break;
      }
      case "status": {
        if (!ALLOWED_STATUSES.has(value as TaskStatus)) return null;
        status = value as TaskStatus;
        if (status === "done") completed = true;
        break;
      }
      default: {
        break;
      }
    }
  }

  return { text, priority, categoryColor, dueDate, completed, status };
}

export function parseDSL(text: string, boardId: string): DslParseResult | null {
  const lines = text.replaceAll(/\r\n?/gu, "\n").split("\n");
  if (lines.length === 0) return null;
  const header = lines[0].trim().toLowerCase();
  if (header !== "mindmap") return null;

  const nodes: MindNode[] = [];
  let counter = 0;
  let rootText = "";
  let hasRoot = false;
  const stack: { depth: number; node: MindNode }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === "" || /^\s*#/u.test(raw)) continue;

    const m = /^(?<indent>\s*)(?<rest>.*)$/u.exec(raw);
    if (!m) continue;
    const { indent } = m.groups!;
    const { rest } = m.groups!;

    if (rest === "") return null;
    if (/\t/u.test(indent)) return null;
    if (indent.length % 2 !== 0) return null;
    const depth = indent.length / 2;

    const match = /^[*]\s+(?<body>.*)$/u.exec(rest);
    if (!match) return null;
    const body = match.groups!.body;

    const tokens = body.split(/\s+/u).filter((t) => t.length > 0);
    const parsed = parseAttributes(tokens);
    if (!parsed) return null;

    while (stack.length > 0 && stack.at(-1)!.depth >= depth) {
      stack.pop();
    }

    const parent = stack.length > 0 ? stack.at(-1)!.node : null;
    if (parent === null) {
      if (hasRoot) return null;
      hasRoot = true;
    }

    const node: MindNode = {
      ...defaultNode(boardId),
      text: parsed.text,
      priority: parsed.priority,
      categoryColor: parsed.categoryColor,
      dueDate: parsed.dueDate,
      completed: parsed.completed,
      status: parsed.status,
    };

    if (parent === null) {
      node.id = "root";
      node.isRoot = true;
      rootText = parsed.text;
    } else {
      node.id = `n${counter++}`;
      node.parentId = parent.id;
      parent.children.push(node.id);
    }

    nodes.push(node);
    stack.push({ depth, node });
  }

  if (!hasRoot) return null;

  return {
    board: { id: boardId, name: rootText },
    nodes,
  };
}

export function serializeDSL(
  board: { name: string },
  nodes: Record<string, MindNode>,
): string {
  const rootNode = Object.values(nodes).find((n) => n.isRoot);
  if (!rootNode) return `mindmap\n  * ${board.name}\n`;

  const out: string[] = ["mindmap"];
  const walk = (node: MindNode, depth: number): void => {
    const indent = "  ".repeat(depth + 1);
    const attrs: string[] = [];
    if (node.priority !== "medium") attrs.push(`@priority:${node.priority}`);
    if (node.categoryColor !== "slate") attrs.push(`@color:${node.categoryColor}`);
    if (node.dueDate) attrs.push(`@due:${node.dueDate}`);
    if (node.status !== "inbox") attrs.push(`@status:${node.status}`);
    const attrStr = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
    out.push(`${indent}* ${node.text}${attrStr}`);
    for (const cid of node.children) {
      const child = nodes[cid];
      if (child) walk(child, depth + 1);
    }
  };
  walk(rootNode, 0);
  return out.join("\n") + "\n";
}

export interface InlineDslResult {
  text: string;
  hasAnyAttribute: boolean;
  priority: Priority | null;
  categoryColor: CategoryColor | null;
  dueDate: string | null;
  completed: boolean | null;
  status: TaskStatus | null;
}

export function parseInlineDSL(raw: string): InlineDslResult {
  const result: InlineDslResult = {
    text: "",
    hasAnyAttribute: false,
    priority: null,
    categoryColor: null,
    dueDate: null,
    completed: null,
    status: null,
  };
  if (!raw) return result;

  const lines = raw.split("\n");
  const textLines: string[] = [];

  for (const line of lines) {
    const tokens = line.split(/\s+/u).filter((t) => t.length > 0);
    const textTokens: string[] = [];

    for (const tok of tokens) {
      if (!tok.startsWith("@")) {
        textTokens.push(tok);
        continue;
      }
      const colon = tok.indexOf(":");
      const key = colon === -1 ? tok.slice(1) : tok.slice(1, colon);
      const value = colon === -1 ? "" : tok.slice(colon + 1);
      switch (key) {
        case "priority": {
          if (ALLOWED_PRIORITIES.has(value as Priority)) {
            result.priority = value as Priority;
            result.hasAnyAttribute = true;
          } else {
            textTokens.push(tok);
          }
          break;
        }
        case "color": {
          if (ALLOWED_COLORS.has(value as CategoryColor)) {
            result.categoryColor = value as CategoryColor;
            result.hasAnyAttribute = true;
          } else {
            textTokens.push(tok);
          }
          break;
        }
        case "due": {
          if (isValidDate(value)) {
            result.dueDate = value;
            result.hasAnyAttribute = true;
          } else {
            textTokens.push(tok);
          }
          break;
        }
        case "status": {
          if (ALLOWED_STATUSES.has(value as TaskStatus)) {
            result.status = value as TaskStatus;
            result.hasAnyAttribute = true;
          } else {
            textTokens.push(tok);
          }
          break;
        }
        case "done": {
          result.completed = true;
          result.status = "done";
          result.hasAnyAttribute = true;
          break;
        }
        default: {
          textTokens.push(tok);
          break;
        }
      }
    }

    if (textTokens.length > 0) {
      textLines.push(textTokens.join(" "));
    }
  }

  result.text = textLines.join("\n");
  return result;
}
```

- [ ] **Step 4: テスト実行**

```bash
cd packages/mintodo && pnpm vitest run src/dsl.test.ts
```

Expected: PASS

- [ ] **Step 5: 全体回帰 (`EditModal` が壊れていないか)**

```bash
cd packages/mintodo && pnpm test --run
```

Expected: 既存テスト (`EditModal.test.tsx` の DSL 関連、`integration.test.tsx` の DSL 関連) が PASS

- [ ] **Step 6: コミット**

```bash
cd packages/mintodo
git add src/dsl.ts src/dsl.test.ts
git commit -m "feat(mintodo): rewrite DSL to Mermaid mindmap format"
```

---

## Task 8: `ViewMode` に `"text"` 追加 + `ViewModeToggle` 3 ボタン化

**Files:**
- Modify: `packages/mintodo/src/types.ts:9`
- Modify: `packages/mintodo/src/components/ViewModeToggle.tsx`

**Interfaces:**
- Consumes: `ViewMode` from `../types`
- Produces: `<ViewModeToggle />` — `mindmap` / `kanban` / `text` 3 ボタン

- [ ] **Step 1: `ViewMode` 型を拡張**

`packages/mintodo/src/types.ts` の 9 行目:

```ts
export type ViewMode = "mindmap" | "kanban" | "text";
```

- [ ] **Step 2: 既存 `ViewModeToggle.test.tsx` を確認**

`packages/mintodo/src/components/ViewModeToggle.test.tsx` を読み、影響を受けるテストを確認。`view-mode-mindmap` / `view-mode-kanban` / `view-mode-text` の testid を使うように。

- [ ] **Step 3: `ViewModeToggle` を 3 ボタン化**

`packages/mintodo/src/components/ViewModeToggle.tsx` を以下に置換:

```tsx
import { FileText, LayoutGrid, Network } from "lucide-react";
import { useMindStore } from "../hooks/use-mind-store";
import type { ViewMode } from "../types";

const OPTIONS: { value: ViewMode; label: string; Icon: typeof Network }[] = [
  { value: "mindmap", label: "mindmap", Icon: Network },
  { value: "kanban", label: "kanban", Icon: LayoutGrid },
  { value: "text", label: "text", Icon: FileText },
];

export function ViewModeToggle() {
  const { state, dispatch } = useMindStore();
  return (
    <div
      className="flex items-center rounded overflow-hidden"
      style={{ border: "1px solid var(--border)" }}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = state.viewMode === value;
        return (
          <button
            key={value}
            type="button"
            data-testid={`view-mode-${value}`}
            aria-pressed={active}
            title={label}
            onClick={() => dispatch({ type: "SET_VIEW_MODE", viewMode: value })}
            className="p-2 transition"
            style={
              active
                ? { background: "var(--terra)", color: "var(--paper)" }
                : { background: "var(--paper)", color: "var(--ink)" }
            }
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: テスト**

```bash
cd packages/mintodo && pnpm vitest run src/components/ViewModeToggle.test.tsx
```

Expected: PASS (testid が変わるのでテストデータに `view-mode-text` 系の assertion を追加)

- [ ] **Step 5: コミット**

```bash
cd packages/mintodo
git add src/types.ts src/components/ViewModeToggle.tsx src/components/ViewModeToggle.test.tsx
git commit -m "feat(mintodo): add 'text' as third view mode"
```

---

## Task 9: `TextEditor` コンポーネント新規作成

**Files:**
- Create: `packages/mintodo/src/components/TextEditor.tsx`
- Create: `packages/mintodo/src/components/TextEditor.test.tsx`

**Interfaces:**
- Consumes: `MindStore` (read state.nodes, dispatch SET_NODES / RENAME_BOARD)
- Produces: `<TextEditor />` — 左 textarea + 右プレビュー + 適用/リセットボタン

- [ ] **Step 1: 失敗テストを書く**

`packages/mintodo/src/components/TextEditor.test.tsx` を新規作成:

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextEditor } from "./TextEditor";
import { MindProvider, useMindStore } from "../hooks/use-mind-store";
import type { MindNode } from "../types";
import type { State } from "../store";

function makeNode(over: Partial<MindNode> = {}): MindNode {
  return {
    id: "n1",
    boardId: "b1",
    text: "Child",
    parentId: "root",
    isRoot: false,
    completed: false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    status: "inbox",
    children: [],
    x: 0,
    y: 0,
    ...over,
  };
}

function makeState(over: Partial<State> = {}): State {
  return {
    boards: [{ id: "b1", name: "Root", createdAt: 0, updatedAt: 0 }],
    currentBoardId: "b1",
    draggingNodeId: null,
    drawerOpen: false,
    hideCompleted: false,
    layoutVersion: 0,
    modal: null,
    viewMode: "text",
    searchQuery: "",
    selectedNodeId: null,
    view: { pan: { x: 0, y: 0 }, zoom: 1 },
    nodes: { root: makeNode({ id: "root", isRoot: true, text: "Root", children: ["n1"] }), n1: makeNode() },
    ...over,
  };
}

let captured: State | null = null;
function Capture() {
  captured = useMindStore().state;
  return null;
}

describe("TextEditor", () => {
  it("renders the serialized DSL on mount", () => {
    render(
      <MindProvider initialState={makeState()}>
        <TextEditor />
      </MindProvider>,
    );
    const ta = screen.getByTestId("text-editor-textarea") as HTMLTextAreaElement;
    expect(ta.value).toContain("mindmap");
    expect(ta.value).toContain("* Root");
    expect(ta.value).toContain("* Child");
  });

  it("shows preview when DSL is valid", () => {
    render(
      <MindProvider initialState={makeState()}>
        <TextEditor />
      </MindProvider>,
    );
    expect(screen.getByTestId("text-editor-preview")).toBeTruthy();
    expect(screen.queryByTestId("text-editor-error")).toBeNull();
  });

  it("shows error when DSL is invalid", () => {
    render(
      <MindProvider initialState={makeState()}>
        <TextEditor />
      </MindProvider>,
    );
    const ta = screen.getByTestId("text-editor-textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "no header" } });
    });
    expect(screen.getByTestId("text-editor-error")).toBeTruthy();
  });

  it("applies parsed DSL on apply click and confirms", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <MindProvider initialState={makeState()}>
        <Capture />
        <TextEditor />
      </MindProvider>,
    );
    const ta = screen.getByTestId("text-editor-textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, {
        target: { value: "mindmap\n  * NewRoot\n    * NewChild\n" },
      });
    });
    act(() => {
      fireEvent.click(screen.getByTestId("text-editor-apply"));
    });
    expect(captured!.nodes.root.text).toBe("NewRoot");
    expect(captured!.boards[0].name).toBe("NewRoot");
  });

  it("does not apply when confirm is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <MindProvider initialState={makeState()}>
        <Capture />
        <TextEditor />
      </MindProvider>,
    );
    const ta = screen.getByTestId("text-editor-textarea") as HTMLTextAreaElement;
    const before = ta.value;
    act(() => {
      fireEvent.change(ta, {
        target: { value: "mindmap\n  * Replaced\n" },
      });
    });
    act(() => {
      fireEvent.click(screen.getByTestId("text-editor-apply"));
    });
    expect(captured!.nodes.root.text).toBe("Root");
  });

  it("resets textarea to current DSL on reset click", () => {
    render(
      <MindProvider initialState={makeState()}>
        <TextEditor />
      </MindProvider>,
    );
    const ta = screen.getByTestId("text-editor-textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "garbage" } });
    });
    act(() => {
      fireEvent.click(screen.getByTestId("text-editor-reset"));
    });
    expect(ta.value).toContain("* Root");
  });
});
```

注: `vi` の import を忘れずに:

```tsx
import { describe, expect, it, vi } from "vitest";
```

- [ ] **Step 2: テスト失敗確認**

```bash
cd packages/mintodo && pnpm vitest run src/components/TextEditor.test.tsx
```

Expected: FAIL (import 解決失敗)

- [ ] **Step 3: `TextEditor` を実装**

`packages/mintodo/src/components/TextEditor.tsx` を新規作成:

```tsx
import { useEffect, useMemo, useState } from "react";
import { parseDSL, serializeDSL } from "../dsl";
import { useMindStore } from "../hooks/use-mind-store";
import { useBoardActions } from "../hooks/use-board-actions";
import type { MindNode } from "../types";

interface PreviewProps {
  nodes: MindNode[];
  error: string | null;
}

function Preview({ nodes, error }: PreviewProps) {
  if (error) {
    return (
      <div
        data-testid="text-editor-error"
        className="text-sm text-rose-500 dark:text-rose-400"
      >
        {error}
      </div>
    );
  }
  if (nodes.length === 0) {
    return <div className="text-sm" style={{ color: "var(--mid)" }}>(ノードなし)</div>;
  }
  return (
    <ul data-testid="text-editor-preview" className="text-sm flex flex-col gap-1">
      {nodes.map((n) => (
        <li key={n.id} style={{ paddingLeft: `${0}px` }}>
          <span style={{ color: "var(--ink)" }}>{n.text}</span>
          <span className="ml-2 text-[10px]" style={{ color: "var(--mid)" }}>
            {[
              n.priority !== "medium" && `priority:${n.priority}`,
              n.categoryColor !== "slate" && `color:${n.categoryColor}`,
              n.dueDate && `due:${n.dueDate}`,
              n.status !== "inbox" && `status:${n.status}`,
              n.completed && "done",
            ]
              .filter(Boolean)
              .join(" ")}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TextEditor() {
  const { state, dispatch } = useMindStore();
  const actions = useBoardActions();
  const board = state.boards.find((b) => b.id === state.currentBoardId);

  const initial = useMemo(
    () => serializeDSL({ name: board?.name ?? "" }, state.nodes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [text, setText] = useState(initial);

  useEffect(() => {
    setText(initial);
  }, [initial]);

  const parsed = useMemo(() => {
    if (!text.trim()) return { error: "DSL が空です" as string | null, nodes: [] as MindNode[] };
    const r = parseDSL(text, state.currentBoardId ?? "");
    if (!r) return { error: "DSL の形式が不正です。ヘッダ `mindmap`・インデント・属性値を確認してください。", nodes: [] };
    return { error: null, nodes: r.nodes };
  }, [text, state.currentBoardId]);

  const canApply = parsed.error === null && parsed.nodes.length > 0;

  async function onApply() {
    if (!parsed.error || !state.currentBoardId) return;
    if (
      !window.confirm(
        `DSL を適用するとボード「${board?.name ?? ""}」のタスクがすべて置き換わり、ボード名も「${parsed.nodes.find((n) => n.isRoot)?.text ?? ""}」に変更されます。続行しますか?`,
      )
    ) {
      return;
    }
    const record: Record<string, MindNode> = {};
    for (const n of parsed.nodes) record[n.id] = n;
    const newRootName = parsed.nodes.find((n) => n.isRoot)?.text ?? "";
    if (newRootName && board && newRootName !== board.name) {
      await actions.renameBoard(state.currentBoardId, newRootName);
    }
    dispatch({ type: "SET_NODES", nodes: record });
  }

  return (
    <div
      data-testid="text-editor"
      className="w-full h-full flex flex-col gap-3 p-4 overflow-hidden"
    >
      <div className="flex flex-1 gap-3 min-h-0">
        <textarea
          data-testid="text-editor-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="flex-1 min-w-0 p-3 text-sm font-mono rounded resize-none outline-none"
          style={{
            background: "var(--paper)",
            border: "1px solid var(--border)",
            color: "var(--ink)",
            minHeight: "320px",
          }}
        />
        <div
          className="flex-1 min-w-0 p-3 rounded overflow-y-auto"
          style={{
            background: "var(--toolbar-bg)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--mid)" }}>
            プレビュー ({parsed.nodes.length} ノード)
          </div>
          <Preview nodes={parsed.nodes} error={parsed.error} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 shrink-0">
        <button
          type="button"
          data-testid="text-editor-reset"
          onClick={() => setText(serializeDSL({ name: board?.name ?? "" }, state.nodes))}
          className="px-3 py-1.5 text-sm rounded transition"
          style={{
            background: "var(--paper)",
            border: "1px solid var(--border)",
            color: "var(--ink)",
          }}
        >
          リセット
        </button>
        <button
          type="button"
          data-testid="text-editor-apply"
          onClick={onApply}
          disabled={!canApply}
          className="px-3 py-1.5 text-sm rounded transition disabled:opacity-50"
          style={{
            background: "var(--terra)",
            color: "var(--paper)",
          }}
        >
          適用
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: テスト実行**

```bash
cd packages/mintodo && pnpm vitest run src/components/TextEditor.test.tsx
```

Expected: PASS

注: テスト失敗時は以下を確認:
- `state` の型に `boards` の `createdAt` / `updatedAt` フィールドが必要な場合は `Board` 型を確認
- `renameBoard` action が `useBoardActions` に存在することを確認
- `confirm` のモック化が vitest 標準で動作することを確認 (必要なら `vi.stubGlobal` を使う)

- [ ] **Step 5: コミット**

```bash
cd packages/mintodo
git add src/components/TextEditor.tsx src/components/TextEditor.test.tsx
git commit -m "feat(mintodo): add TextEditor view (left editor + right preview)"
```

---

## Task 10: `App.tsx` ルーティング + `DslEditorModal` 削除

**Files:**
- Modify: `packages/mintodo/src/App.tsx`
- Modify: `packages/mintodo/src/components/Toolbar.tsx`
- Modify: `packages/mintodo/src/types.ts`
- Delete: `packages/mintodo/src/components/DslEditorModal.tsx`
- Delete: `packages/mintodo/src/components/DslEditorModal.test.tsx`

- [ ] **Step 1: `App.tsx` を更新**

`packages/mintodo/src/App.tsx` の 7 行目 `import { DslEditorModal }` を削除。74 行目 `<DslEditorModal />` を削除。67 行目を以下に置換:

```tsx
{showCanvas ? (
  state.viewMode === "kanban" ? (
    <KanbanBoard />
  ) : state.viewMode === "text" ? (
    <TextEditor />
  ) : (
    <Canvas />
  )
) : (
  <EmptyState />
)}
```

`TextEditor` の import を追加:

```tsx
import { TextEditor } from "./components/TextEditor";
```

- [ ] **Step 2: `Toolbar.tsx` から `FileText` import とボタンを削除**

`packages/mintodo/src/components/Toolbar.tsx` の 3 行目 `FileText,` を import から削除。105-113 行目 (FileText ボタンのブロック) を削除。

- [ ] **Step 3: `types.ts` から `dsl-editor` を削除**

`packages/mintodo/src/types.ts` の `Modal` union から:

```ts
| { kind: "dsl-editor" }
```

を削除。

- [ ] **Step 4: `DslEditorModal` ファイル削除**

```bash
rm packages/mintodo/src/components/DslEditorModal.tsx
rm packages/mintodo/src/components/DslEditorModal.test.tsx
```

- [ ] **Step 5: 全体テスト + 型チェック + lint**

```bash
cd packages/mintodo && pnpm test --run && pnpm run check
```

Expected: PASS

- [ ] **Step 6: コミット**

```bash
cd packages/mintodo
git add -A src/App.tsx src/components/Toolbar.tsx src/types.ts src/components/DslEditorModal.tsx src/components/DslEditorModal.test.tsx
git commit -m "refactor(mintodo): route text view mode to TextEditor, remove DslEditorModal"
```

---

## Task 11: 最終確認

**Files:** (なし — 検証のみ)

- [ ] **Step 1: 全体テスト**

```bash
cd packages/mintodo && pnpm test --run
```

Expected: 全件 PASS

- [ ] **Step 2: 型チェック + lint**

```bash
cd packages/mintodo && pnpm run check
```

Expected: エラーなし

- [ ] **Step 3: format**

```bash
cd packages/mintodo && pnpm run format
```

Expected: 差分なし (lefthook 適用済みなら noop)

- [ ] **Step 4: ブラウザ手動確認 (任意)**

`pnpm --filter mintodo dev` で:
- mindmap モード: カードに status ドット、GitBranch ボタン、collapse / ellipsis 編集がある
- kanban モード: カード本体クリックで edit モーダルが開く、列内で縦スクロールする
- text モード: 左 textarea + 右プレビュー、適用で mindmap / kanban が更新される
- toolbar の Keyboard ボタンで help が開く (mindmap 上に Overlay はない)
- ダーク/ライト切替なし (ライト背景 = `--paper`)

- [ ] **Step 5: 完了報告**

ユーザーへ「mintodo 全体改修タスク 11 件すべて完了」と報告。

---

## Self-Review Notes

- Spec coverage: Task 1-10 が spec の 5 項目 (TaskCard共通化、status、KANBAN編集/スクロール、ShortcutHint削除、text mode、Mermaid) を全てカバー
- Placeholder scan: 各タスクに具体的なコードスニペットあり、TBD なし
- Type consistency: `MindNode` / `TaskStatus` / `Priority` / `CategoryColor` / `ViewMode` 全て spec 通り
- File structure: 新規 4、変更 12、削除 3 (spec 通り)
- コミット粒度: 11 コミット (タスク単位)
