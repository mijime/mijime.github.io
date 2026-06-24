# mintodo Toolbar in-flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `absolute` from the Toolbar and place it in-flow at the top of the main column, so the toolbar's left/right edges align with the main column and no longer float over the sidebar. Hide ZoomControls in Kanban mode.

**Architecture:** Change `App.tsx` main column from `flex-1 relative overflow-hidden` to `flex-1 flex flex-col min-h-0 overflow-hidden` with the Toolbar as the first (in-flow) row and a new content area (`flex-1 relative p-4`) as the second row holding Canvas/Kanban/EmptyState and the floating UI. Gate `<ZoomControls />` on `state.viewMode === "mindmap"`. In `Toolbar.tsx`, drop `absolute top-4 left-4 right-4 z-10 rounded` and add `border-b`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4 (utility classes), CSS custom properties for theming, lucide-react icons.

**Reference spec:** `docs/superpowers/specs/2026-06-24-mintodo-toolbar-inflow-design.md`

**Working directory for all commands:** `/Users/kojima.takashi/src/github.com/mijime/mijime.github.io/packages/mintodo`

## Global Constraints

- Type check: `pnpm run check:tsgo` (tsgo --noEmit) must pass with zero errors
- Lint: `pnpm run check:oxlint` (oxlint) must pass with zero errors
- Format: lefthook pre-commit hook auto-formats via oxfmt on every commit
- Test: `pnpm test` (vitest run) — all tests must pass
- Code style (from `~/.claude/CLAUDE.md`): no comments unless explaining non-obvious WHY; minimal implementation, no abstraction/error handling/future-proofing
- Commit messages: `type(scope): subject` (matches existing `feat(mintodo):`, `fix(mintodo):`, `refactor(mintodo):`)

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/App.tsx` | modify | Restructure main column to `flex flex-col`; Toolbar in-flow at top; content area `flex-1 relative p-4`; move floating UI into content area; gate ZoomControls on `viewMode === "mindmap"` |
| `src/components/Toolbar.tsx` | modify | Drop `absolute top-4 left-4 right-4 z-10 rounded`; add `border-b`; set `borderColor: "var(--border)"` inline |

No new files. No new dependencies. No state / reducer / action / hook changes. No changes to KanbanBoard, Canvas, EmptyState, BoardSidebar, ZoomControls, StatsPanel, ShortcutHint.

---

## Task 1: Restructure App.tsx main column + gate ZoomControls

**Files:**
- Modify: `src/App.tsx:58-79` (`Shell` return JSX)

**Context:** The current main column is `flex-1 relative overflow-hidden` with the Toolbar absolutely positioned at the top, the content in an `absolute inset-0` wrapper, and floating UI as siblings. We change to a flex column: Toolbar at the top in-flow, content area (`flex-1 relative p-4`) below holding the main canvas/kanban + floating UI. We also hide ZoomControls in Kanban mode (mindmap only).

- [ ] **Step 1: Replace the `Shell` return JSX in `src/App.tsx`**

Find the return block (lines 58-79):

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
          {showCanvas ? state.viewMode === "kanban" ? <KanbanBoard /> : <Canvas /> : <EmptyState />}
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

Replace with:

```tsx
  return (
    <div
      className="flex h-full w-full overflow-hidden select-none"
      style={{ background: "var(--paper)", color: "var(--ink)" }}
    >
      <BoardSidebar />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Toolbar />
        <div className="flex-1 relative p-4">
          {showCanvas ? state.viewMode === "kanban" ? <KanbanBoard /> : <Canvas /> : <EmptyState />}
          {state.viewMode === "mindmap" && <ZoomControls />}
          <StatsPanel />
          <ShortcutHint />
        </div>
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

Expected: all green. 237/237 tests pass; no type or lint errors. (Layout-only change; the integration test renders Canvas and KanbanBoard, both unaffected by the parent structure since they use `h-full`.)

- [ ] **Step 3: Commit**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io && git add packages/mintodo/src/App.tsx && git -c user.name=opencode -c user.email=opencode@local commit -m "refactor(mintodo): move Toolbar in-flow, hide ZoomControls in Kanban"
```

---

## Task 2: Update Toolbar.tsx (drop absolute, add border-b)

**Files:**
- Modify: `src/components/Toolbar.tsx:39-42` (the `<header>` element)

**Context:** With the Toolbar now in-flow at the top of the main column, it no longer needs `absolute top-4 left-4 right-4 z-10` and `rounded` (it's a flat bar, not a card). Add a `border-b` so the toolbar has a clean separator from the content area below. Reuse the existing `--border` CSS variable.

- [ ] **Step 1: Replace the `<header>` element in `src/components/Toolbar.tsx`**

Find the `<header>` (lines 39-42):

```tsx
    <header
      className="absolute top-4 left-4 right-4 z-10 flex flex-col lg:flex-row gap-3 lg:items-center justify-between p-4 rounded transition-all"
      style={{ background: "var(--toolbar-bg)", border: "1px solid var(--border)" }}
    >
```

Replace with:

```tsx
    <header
      className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between p-4 border-b"
      style={{ background: "var(--toolbar-bg)", borderColor: "var(--border)" }}
    >
```

Note: removed `absolute top-4 left-4 right-4 z-10 rounded` and the `1px solid` shorthand from `border` (replaced by `border-b` + `borderColor`). The `transition-all` is already removed in commit `1e08709` from the previous review.

- [ ] **Step 2: Run type check, lint, and test**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io/packages/mintodo && pnpm run check:tsgo && pnpm run check:oxlint && pnpm test
```

Expected: all green. 237/237 tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io && git add packages/mintodo/src/components/Toolbar.tsx && git -c user.name=opencode -c user.email=opencode@local commit -m "refactor(mintodo): remove Toolbar absolute, add border-b separator"
```

---

## Task 3: Visual smoke test

**Files:** none (manual verification)

**Context:** No automated visual test exists. This task starts the dev server briefly, confirms it serves, and runs the full check suite. The spec's manual visual checklist (toolbar aligned with main column left/right, no overlap with sidebar, Kanban shows no ZoomControls, etc.) is verified by the human in a real browser session after the plan completes.

- [ ] **Step 1: Start the dev server in the background**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io/packages/mintodo && pnpm run dev > /tmp/mintodo-dev.log 2>&1 &
DEV_PID=$!
sleep 5
cat /tmp/mintodo-dev.log
```

Expected: `VITE vX.X.X  ready in <N> ms` with a `Local: http://localhost:5173/` line. No compile errors.

- [ ] **Step 2: Verify dev server is serving**

```bash
curl -sI http://localhost:5173/ | head -1
```

Expected: `HTTP/1.1 200 OK`.

- [ ] **Step 3: Stop the dev server**

```bash
kill $DEV_PID 2>/dev/null || true
```

- [ ] **Step 4: Final full-suite verification**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io/packages/mintodo && pnpm run check && pnpm test
```

Expected: all green. 0 tsgo errors, 0 oxlint errors, 237/237 tests pass.

- [ ] **Step 5: No commit (verification only)**

If the dev server output shows compile errors, fix them and amend the relevant task's commit before proceeding.
