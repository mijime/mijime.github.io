# Mintodo: IndexedDB Reset & Header Layout Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing reset button to wipe all IndexedDB data and fix the root layout to not overlap the site header.

**Architecture:** Two isolated file changes: (1) Toolbar.tsx — change the `onReset` handler to call `db.delete()` + `location.reload()` with updated confirm text; (2) App.tsx — change the Shell root div from `h-screen` to `min-h-screen flex flex-col`.

**Tech Stack:** React, TypeScript, Dexie, Tailwind CSS

---

### Task 1: Upgrade reset button to full IndexedDB wipe

**Files:**
- Modify: `packages/mintodo/src/components/Toolbar.tsx:68-71`

- [ ] **Import `db` from storage module**

  Add this import at the top of Toolbar.tsx:

  ```typescript
  import { db } from "../db";
  ```

- [ ] **Replace the `onReset` handler**

  Change lines 68-71 from:

  ```typescript
  const onReset = () => {
    if (!confirm("すべてのタスクを初期化しますか？")) return;
    dispatch({ type: "RESET" });
  };
  ```

  to:

  ```typescript
  const onReset = () => {
    if (!confirm("すべてのデータを初期化しますか？（IndexedDBの全データが削除され、ページがリロードされます）")) return;
    db.delete();
    location.reload();
  };
  ```

- [ ] **Run type check to verify**

  ```bash
  pnpm run check
  ```

  Expected: no errors

- [ ] **Run tests**

  ```bash
  pnpm test
  ```

  Expected: all tests pass (the existing reset test may need updating — see check step)

### Task 2: Fix root layout for site header overlap

**Files:**
- Modify: `packages/mintodo/src/App.tsx:55`

- [ ] **Change the Shell root div classes**

  Change line 55 from:

  ```tsx
  <div className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 h-screen w-screen overflow-hidden select-none font-sans">
  ```

  to:

  ```tsx
  <div className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 min-h-screen w-screen flex flex-col overflow-hidden select-none font-sans">
  ```

- [ ] **Run type check to verify**

  ```bash
  pnpm run check
  ```

  Expected: no errors

- [ ] **Run tests**

  ```bash
  pnpm test
  ```

  Expected: all tests pass

### Task 3: Final verification

- [ ] **Run full check suite**

  ```bash
  pnpm run check && pnpm test
  ```

  Expected: type check passes, all tests pass
