# Mintodo: IndexedDB Reset & Header Layout Fix

## Summary

Two small fixes for the mintodo app: (1) upgrade the existing reset button to wipe all IndexedDB data, (2) fix the root layout so the common site header doesn't overlap mintodo content.

## Changes

### 1. Reset button upgrade

**File:** `packages/mintodo/src/components/Toolbar.tsx`

Replace the existing `onReset` handler — which only clears the current board's nodes in memory — with a full IndexedDB database wipe:

```
confirm("すべてのデータを初期化しますか？") → db.delete() → location.reload()
```

- `db` is the singleton `MindDB` instance from `db.ts`
- After `db.delete()`, the page reloads so Dexie recreates the database with the current schema
- The confirm dialog text changes to reflect that **all** data (not just current board) will be destroyed

### 2. Root layout fix

**File:** `packages/mintodo/src/App.tsx`

Change the Shell root `<div>` from `h-screen` to `min-h-screen flex flex-col` so the layout accounts for the common site header (~53px sticky header in `base-layout.astro`):

| Before | After |
|---|---|
| `h-screen w-screen overflow-hidden` | `min-h-screen w-screen flex flex-col overflow-hidden` |

- `min-h-screen` allows the container to be at least viewport height but extend if needed
- `flex flex-col` makes children stack vertically in normal document flow
- The Canvas's internal `h-full` will work correctly within the flex column
- Children using `absolute` positioning (Canvas, Toolbar, BoardSidebar, etc.) are unaffected by `flex` layout

No other components need changes — the existing `absolute`-positioned children (Toolbar, BoardSidebar, Canvas, ZoomControls, etc.) continue working as before.
