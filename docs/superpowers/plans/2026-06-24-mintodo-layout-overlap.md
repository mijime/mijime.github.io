# mintodo layout overlap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the layout overlap between Toolbar, BoardSidebar, and Kanban/Canvas content; make the board list toggleable on both desktop and mobile.

**Architecture:** Restructure `App.tsx` shell from `flex flex-col` with absolute children to `flex flex-row` with the sidebar as an in-flow flex column. Add a content wrapper in the main column that reserves `pt-20` for the floating Toolbar. Repurpose the existing `drawerOpen` state to control both the desktop in-flow sidebar visibility and the mobile overlay drawer. Make the Toolbar's hamburger always visible and reflect the open/closed state with an icon swap. Remove the now-unneeded `paddingTop: 80px` from `KanbanBoard`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4 (utility classes), CSS custom properties for theming, lucide-react icons.

**Reference spec:** `docs/superpowers/specs/2026-06-24-mintodo-layout-overlap-design.md`

**Working directory for all commands:** `/Users/kojima.takashi/src/github.com/mijime/mijime.github.io/packages/mintodo`

## Global Constraints

- Type check: `pnpm run check:tsgo` (tsgo --noEmit) must pass with zero errors
- Lint: `pnpm run check:oxlint` (oxlint) must pass with zero errors
- Format: lefthook pre-commit hook auto-formats via oxfmt on every commit
- Test: `pnpm test` (vitest run) — all tests must pass
- Code style (from `~/.claude/CLAUDE.md`): no comments unless explaining non-obvious WHY; minimal implementation, no abstraction/error handling/future-proofing
- Commit messages: `type(scope): subject` (matches existing `feat(mintodo):`, `fix(mintodo):`, `refactor(mintodo):`, `chore:`)

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/store.ts` | modify | `createInitialState`: set `drawerOpen: true` |
| `src/store.test.ts` | modify | Update `createInitialState` test to expect `drawerOpen: true` |
| `src/components/Toolbar.tsx` | modify | Hamburger button: drop `md:hidden`, swap `Menu` icon for `PanelLeftClose`/`PanelLeftOpen` based on `state.drawerOpen` |
| `src/components/BoardSidebar.tsx` | modify | Replace outer desktop `aside` with a wrapper `div` that toggles `md:hidden` based on `state.drawerOpen`; keep inner `sidebar` JSX as-is |
| `src/components/KanbanBoard.tsx` | modify | Remove `paddingTop: 80px` from the inner flex row (parent wrapper now provides toolbar clearance) |
| `src/App.tsx` | modify | Restructure shell: outer `flex flex-row`, child `flex-1 relative overflow-hidden` for main column, content wrapper with `absolute inset-0 pt-20 px-4 pb-4` |

No new files. No new dependencies. No db.ts / types.ts / store action changes. No Canvas, EmptyState, ZoomControls, StatsPanel, ShortcutHint changes.

---

## Task 1: Set drawerOpen default to true

**Files:**
- Modify: `src/store.ts:65-80` (`createInitialState`)
- Modify: `src/store.test.ts:28-35` (existing `createInitialState` test)

**Context:** `drawerOpen` is currently `false` because the original design only used it for the mobile drawer. With the new design, the same flag controls the desktop in-flow sidebar, so a default of `true` makes the sidebar visible on desktop on first load.

- [ ] **Step 1: Update `createInitialState` in `src/store.ts`**

Change line 70 from:

```ts
drawerOpen: false,
```

to:

```ts
drawerOpen: true,
```

- [ ] **Step 2: Update the `createInitialState` test in `src/store.test.ts`**

Find the existing test (around line 28-35):

```ts
describe("createInitialState", () => {
  it("starts with no boards, no current board, no nodes", () => {
    const s = createInitialState();
    expect(s.boards).toEqual([]);
    expect(s.currentBoardId).toBeNull();
    expect(s.nodes).toEqual({});
  });
});
```

Add an `expect` for `drawerOpen`:

```ts
describe("createInitialState", () => {
  it("starts with no boards, no current board, no nodes, and sidebar open", () => {
    const s = createInitialState();
    expect(s.boards).toEqual([]);
    expect(s.currentBoardId).toBeNull();
    expect(s.nodes).toEqual({});
    expect(s.drawerOpen).toBe(true);
  });
});
```

- [ ] **Step 3: Run type check, lint, and test**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io/packages/mintodo && pnpm run check:tsgo && pnpm run check:oxlint && pnpm test
```

Expected: all green. The new test should pass; no other tests should break.

- [ ] **Step 4: Commit**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io && git add packages/mintodo/src/store.ts packages/mintodo/src/store.test.ts && git -c user.name=opencode -c user.email=opencode@local commit -m "feat(mintodo): default drawerOpen to true for desktop sidebar visibility"
```

---

## Task 2: Always show Toolbar hamburger, swap icon by state

**Files:**
- Modify: `src/components/Toolbar.tsx:1` (lucide-react import)
- Modify: `src/components/Toolbar.tsx:34-42` (hamburger button)

**Context:** The hamburger button currently has `md:hidden` so it's only visible on mobile. With the new layout the same hamburger must toggle the sidebar on desktop too. The icon should reflect the current state: `PanelLeftOpen` when closed, `PanelLeftClose` when open. `Menu` is replaced because `PanelLeft*` is more semantically correct for a sidebar toggle.

- [ ] **Step 1: Update the lucide-react import in `src/components/Toolbar.tsx`**

Change line 1 from:

```ts
import { Eye, FileText, Keyboard, Menu, Moon, Network, Search, Sun, Trash2 } from "lucide-react";
```

to:

```ts
import {
  Eye,
  FileText,
  Keyboard,
  Moon,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  Trash2,
} from "lucide-react";
```

- [ ] **Step 2: Update the hamburger button in `src/components/Toolbar.tsx`**

Replace the button (lines 34-42):

```tsx
<button
  type="button"
  onClick={onToggleDrawer}
  title="ボード一覧"
  className="p-2 rounded transition md:hidden"
  style={{ color: "var(--mid)" }}
>
  <Menu size={18} />
</button>
```

with:

```tsx
<button
  type="button"
  onClick={onToggleDrawer}
  title="ボード一覧"
  className="p-2 rounded transition"
  style={{ color: "var(--mid)" }}
>
  {state.drawerOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
</button>
```

- [ ] **Step 3: Run type check, lint, and test**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io/packages/mintodo && pnpm run check:tsgo && pnpm run check:oxlint && pnpm test
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io && git add packages/mintodo/src/components/Toolbar.tsx && git -c user.name=opencode -c user.email=opencode@local commit -m "feat(mintodo): always show sidebar toggle, swap icon by state"
```

---

## Task 3: Make BoardSidebar a flex column on desktop, toggleable

**Files:**
- Modify: `src/components/BoardSidebar.tsx:86-98` (return JSX — outer wrapper)

**Context:** Today the desktop sidebar is `hidden md:flex absolute left-4 top-20 bottom-4 w-60 z-10` — an absolute-positioned card that floats over content. We change it to an in-flow flex column that lives in the layout's main row. When `state.drawerOpen === false` we add `md:hidden` so the sidebar collapses and the main column takes the full width.

The inner `sidebar` JSX variable (the actual card with the board list) is unchanged — it already has `flex flex-col h-full` and the existing `--toolbar-bg` look. The mobile overlay drawer block stays exactly as-is.

- [ ] **Step 1: Replace the outer desktop wrapper in `src/components/BoardSidebar.tsx`**

Find lines 86-98:

```tsx
  return (
    <>
      <aside className="hidden md:flex absolute left-4 top-20 bottom-4 w-60 z-10">{sidebar}</aside>
      {state.drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
          <div className="absolute left-0 top-0 bottom-0 w-72 pt-4 pl-4 pb-4">
            {sidebar}
          </div>
        </div>
      )}
    </>
  );
```

Replace with:

```tsx
  return (
    <>
      <div
        className={
          "hidden md:flex w-60 shrink-0" + (state.drawerOpen ? "" : " md:hidden")
        }
      >
        {sidebar}
      </div>
      {state.drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
          <div className="absolute left-0 top-0 bottom-0 w-72 pt-4 pl-4 pb-4">
            {sidebar}
          </div>
        </div>
      )}
    </>
  );
```

- [ ] **Step 2: Run type check, lint, and test**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io/packages/mintodo && pnpm run check:tsgo && pnpm run check:oxlint && pnpm test
```

Expected: all green. The mobile drawer behavior is unchanged (still rendered when `drawerOpen === true`).

- [ ] **Step 3: Commit**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io && git add packages/mintodo/src/components/BoardSidebar.tsx && git -c user.name=opencode -c user.email=opencode@local commit -m "refactor(mintodo): make BoardSidebar a flex column, toggleable on desktop"
```

---

## Task 4: Remove paddingTop from KanbanBoard

**Files:**
- Modify: `src/components/KanbanBoard.tsx:6-13`

**Context:** The inner flex row in `KanbanBoard` carries `style={{ paddingTop: 80 }}` to clear the floating Toolbar. With the new layout (Task 5), the parent content wrapper provides `pt-20 px-4 pb-4` for the same purpose. Keeping the inner padding would double-clear and push columns down unnecessarily.

- [ ] **Step 1: Update `src/components/KanbanBoard.tsx`**

Replace the entire file:

```tsx
import { TASK_STATUSES } from "../types";
import { KanbanColumn } from "./KanbanColumn";

export function KanbanBoard() {
  return (
    <div data-testid="kanban-board" className="w-full flex-1 overflow-x-auto">
      <div className="flex flex-row gap-4 p-4 min-h-full" style={{ paddingTop: 80 }}>
        {TASK_STATUSES.map((status) => (
          <KanbanColumn key={status} status={status} />
        ))}
      </div>
    </div>
  );
}
```

with:

```tsx
import { TASK_STATUSES } from "../types";
import { KanbanColumn } from "./KanbanColumn";

export function KanbanBoard() {
  return (
    <div data-testid="kanban-board" className="w-full h-full overflow-x-auto">
      <div className="flex flex-row gap-4 p-4 min-h-full">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn key={status} status={status} />
        ))}
      </div>
    </div>
  );
}
```

Note: `flex-1` → `h-full` so the board fills the parent wrapper when the parent isn't a flex column. The `style={{ paddingTop: 80 }}` is removed.

- [ ] **Step 2: Run type check, lint, and test**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io/packages/mintodo && pnpm run check:tsgo && pnpm run check:oxlint && pnpm test
```

Expected: all green. The `data-testid="kanban-board"` stays for existing tests.

- [ ] **Step 3: Commit**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io && git add packages/mintodo/src/components/KanbanBoard.tsx && git -c user.name=opencode -c user.email=opencode@local commit -m "refactor(mintodo): remove paddingTop from KanbanBoard, rely on parent wrapper"
```

---

## Task 5: Restructure App.tsx shell with sidebar in flow

**Files:**
- Modify: `src/App.tsx:58-75` (`Shell` return JSX)

**Context:** Today the shell is a single `flex flex-col` with Toolbar, BoardSidebar, main content, and floating UI all as absolute-positioned siblings. We change to a row layout: BoardSidebar on the left (already a flex column from Task 3), main column on the right with `flex-1`. Inside the main column the Toolbar stays absolutely positioned, the content is wrapped in `absolute inset-0 pt-20 px-4 pb-4` to clear the floating Toolbar and provide outer padding, and the other floating elements (ZoomControls, StatsPanel, ShortcutHint) keep their existing absolute positions.

- [ ] **Step 1: Replace the `Shell` return JSX in `src/App.tsx`**

Find the return (lines 58-75):

```tsx
  return (
    <div
      className="flex flex-col overflow-hidden select-none relative h-full w-full"
      style={{ background: "var(--paper)", color: "var(--ink)" }}
    >
      <Toolbar />
      <BoardSidebar />
      {showCanvas ? state.viewMode === "kanban" ? <KanbanBoard /> : <Canvas /> : <EmptyState />}
      <ZoomControls />
      <StatsPanel />
      <ShortcutHint />
      <EditModal />
      <DslEditorModal />
      <HelpModal />
      <BoardNameDialog />
      <BoardDeleteDialog />
    </div>
  );
```

Replace with:

```tsx
  return (
    <div
      className="flex h-full w-full overflow-hidden select-none"
      style={{ background: "var(--paper)", color: "var(--ink)" }}
    >
      <BoardSidebar />
      <div className="flex-1 relative overflow-hidden">
        <Toolbar />
        <div className="absolute inset-0 pt-20 px-4 pb-4">
          {showCanvas ? (state.viewMode === "kanban" ? <KanbanBoard /> : <Canvas />) : <EmptyState />}
        </div>
        <ZoomControls />
        <StatsPanel />
        <ShortcutHint />
      </div>
      <EditModal />
      <DslEditorModal />
      <HelpModal />
      <BoardNameDialog />
      <BoardDeleteDialog />
    </div>
  );
```

- [ ] **Step 2: Run type check, lint, and test**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io/packages/mintodo && pnpm run check:tsgo && pnpm run check:oxlint && pnpm test
```

Expected: all green. The `flex-1` on Canvas (an existing class) becomes a no-op under the new absolute-positioned wrapper, but the wrapper's `inset-0` gives Canvas full size, so visual behavior is unchanged. Kanban's outer `flex-1` was already changed to `h-full` in Task 4 so it fills the absolute wrapper.

- [ ] **Step 3: Commit**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io && git add packages/mintodo/src/App.tsx && git -c user.name=opencode -c user.email=opencode@local commit -m "refactor(mintodo): restructure shell to flex row with in-flow sidebar"
```

---

## Task 6: Visual smoke test

**Files:** none (manual verification)

**Context:** No automated visual test exists. This task runs the dev server briefly and the human (or a screenshot-style verification) confirms the layout matches the spec acceptance conditions. `pnpm test` and `pnpm run check` already passed in Tasks 1-5.

- [ ] **Step 1: Start the dev server in the background**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io/packages/mintodo && pnpm run dev &
DEV_PID=$!
sleep 5
echo "dev server pid: $DEV_PID"
```

- [ ] **Step 2: Verify dev server is serving without compile errors**

```bash
curl -sI http://localhost:5173/ | head -1
```

Expected: `HTTP/1.1 200 OK`. If the port is different, read it from the dev server output and adjust the URL.

- [ ] **Step 3: Stop the dev server**

```bash
kill $DEV_PID 2>/dev/null || true
```

- [ ] **Step 4: Final verification — run full check suite once more**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io/packages/mintodo && pnpm run check && pnpm test
```

Expected: all green. The spec's manual checklist (sidebar visible on desktop, toggle works, no overlap with Kanban cards, mobile drawer unchanged, Canvas pan/zoom intact) is verified by the human against the running app in a real browser session.

- [ ] **Step 5: No commit (verification only)**

If everything passes, the implementation is complete. If the dev server output shows compile errors, fix them and amend the relevant task's commit before proceeding.
