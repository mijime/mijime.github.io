# mintodo DSL Editor Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four Toolbar buttons (JSON/DSL Import/Export) with a single "DSL編集" button that opens a modal containing a textarea showing the current state as DSL, with a SAVE button that applies the edited text back to the mindmap.

**Architecture:** New `DslEditorModal` component (controlled by existing `Modal` union state) renders a textarea pre-filled with `serializeDSL` output. On SAVE: parse → if `null` show inline error; if parse OK show `confirm()` → `renameBoard` + `SET_NODES` dispatch + close. Cmd/Ctrl+Enter triggers SAVE; Esc/background-click/×/cancel all close without saving. Existing `parseDSL`/`serializeDSL` (`src/dsl.ts`) are reused unchanged.

**Tech Stack:** React 19, TypeScript, vitest, @testing-library/react, Dexie (IndexedDB), Tailwind CSS tokens via CSS variables.

## Global Constraints

- Package: `packages/mintodo` — all paths relative to this directory unless noted.
- Branch: `feat/mintodo-dsl-io` (current).
- Test runner: `pnpm test` (runs `vitest run`).
- Type check + lint: `pnpm run check` (`tsgo --noEmit && oxlint --format=github --fix`).
- Format: `pnpm run format` (`oxfmt`).
- DSL format spec: `docs/superpowers/specs/2026-06-21-mintodo-dsl-io-design.md` (existing).
- Spec for this work: `docs/superpowers/specs/2026-06-22-mintodo-dsl-editor-design.md`.
- `parseDSL` returns `DslParseResult | null` (null on any parse error).
- `serializeDSL` signature: `(board: { name: string }, nodes: Record<string, MindNode>): string`.
- `useBoardActions().renameBoard(id, name)` is `async` and trims input.
- `useMindStore()` returns `{ state, dispatch }`. Dispatch action for closing modal: `{ type: "OPEN_MODAL", modal: null }`.
- Code style (from `~/.claude/CLAUDE.md`): no comments unless explaining non-obvious WHY; minimal implementation, no abstraction/error handling/future-proofing.
- Commit messages: `type(scope): subject` (matches existing `feat(mintodo):`, `fix(mintodo):`, `refactor(mintodo):`, `chore:`).
- Worktree: this plan runs in the current branch (`feat/mintodo-dsl-io`), not a fresh worktree.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/types.ts` | modify | Add `{ kind: "dsl-editor" }` to `Modal` union |
| `src/components/DslEditorModal.tsx` | create | Modal with textarea, SAVE/CANCEL, error display, keyboard handlers |
| `src/components/DslEditorModal.test.tsx` | create | vitest component tests |
| `src/components/Toolbar.tsx` | modify | Remove 4 import/export buttons + handlers + refs + hidden inputs; add 1 "DSL編集" button |
| `src/App.tsx` | modify | Mount `<DslEditorModal />` in `Shell` |
| `src/storage.ts` | modify | Remove `downloadJson`, `downloadText`, `parseImportedJson` (now unused) |

No new state, no new actions, no schema changes, no new dependencies.

---

## Task 1: Add `dsl-editor` Modal kind

**Files:**
- Modify: `src/types.ts:35-40`

**Context:** All modal kinds are centralized in the `Modal` union type. The new modal fits the existing pattern (no payload needed — it reads everything from `state.nodes` and `state.currentBoardId` at mount time).

- [ ] **Step 1: Add the new variant**

In `src/types.ts`, change the `Modal` union to include the new kind:

```ts
export type Modal =
  | { kind: "edit"; nodeId: string }
  | { kind: "help" }
  | { kind: "board-name"; mode: "create" | "rename"; boardId?: string; initialName?: string }
  | { kind: "board-delete"; boardId: string; boardName: string }
  | { kind: "dsl-editor" }
  | null;
```

- [ ] **Step 2: Verify type check passes**

Run: `pnpm run check:tsgo`
Expected: exit 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(mintodo): add dsl-editor modal kind"
```

---

## Task 2: Create DslEditorModal component (TDD)

**Files:**
- Create: `src/components/DslEditorModal.test.tsx`
- Create: `src/components/DslEditorModal.tsx`

**Interfaces (consumed by App.tsx in Task 4):**
- `DslEditorModal` is a named export with no props
- Reads `state` and `dispatch` from `useMindStore()`
- Uses `useBoardActions()` for `renameBoard`
- Renders nothing when `state.modal?.kind !== "dsl-editor"`

**Test strategy:** Mock the `useBoardActions` module with `vi.mock("../hooks/use-board-actions")` so the modal never touches IndexedDB. Seed the reducer with a known state (one board, one root, one child) by adding an `initialState` prop to `MindProvider` (Step 1 below). Tests for the SAVE flow that triggers `renameBoard` spy on the mock and assert it was called with the right args.

- [ ] **Step 1: Add `initialState` prop to `MindProvider`**

In `src/hooks/use-mind-store.tsx`, change the provider to accept the prop:

```tsx
import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { createInitialState, reducer, type Action, type State } from "../store";

const MindContext = createContext<{ dispatch: Dispatch<Action>; state: State } | null>(null);

export function MindProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: State;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState ?? createInitialState());
  return <MindContext.Provider value={{ dispatch, state }}>{children}</MindContext.Provider>;
}

export function useMindStore(): { dispatch: Dispatch<Action>; state: State } {
  const ctx = useContext(MindContext);
  if (!ctx) throw new Error("useMindStore must be used within MindProvider");
  return ctx;
}
```

- [ ] **Step 2: Verify type check still passes**

Run: `pnpm run check:tsgo`
Expected: exit 0.

- [ ] **Step 3: Write the failing test file**

Create `src/components/DslEditorModal.test.tsx`:

```tsx
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DslEditorModal } from "./DslEditorModal";
import { MindProvider, useMindStore } from "../hooks/use-mind-store";
import { useBoardActions } from "../hooks/use-board-actions";
import type { Board, MindNode } from "../types";
import { createInitialState, type State } from "../store";

vi.mock("../hooks/use-board-actions");

const SEED_BOARD: Board = { id: "b1", name: "Test Board", createdAt: 0, updatedAt: 0 };

const ROOT: MindNode = {
  id: "root", boardId: "b1", text: "Test Board", parentId: null, isRoot: true,
  completed: false, collapsed: false, priority: "medium", categoryColor: "slate",
  dueDate: "", children: ["n0"], x: 0, y: 0, vx: 0, vy: 0,
};
const CHILD: MindNode = {
  id: "n0", boardId: "b1", text: "牛乳 @priority:high", parentId: "root", isRoot: false,
  completed: false, collapsed: false, priority: "high", categoryColor: "slate",
  dueDate: "", children: [], x: 0, y: 0, vx: 0, vy: 0,
};

function makeState(): State {
  const s = createInitialState();
  s.boards = [SEED_BOARD];
  s.currentBoardId = "b1";
  s.nodes = { root: ROOT, n0: CHILD };
  s.modal = { kind: "dsl-editor" };
  return s;
}

function renderModal() {
  return render(
    <MindProvider initialState={makeState()}>
      <DslEditorModal />
    </MindProvider>,
  );
}

describe("DslEditorModal", () => {
  const mockedActions = vi.mocked(useBoardActions);

  beforeEach(() => {
    mockedActions.mockReturnValue({
      createBoard: vi.fn(),
      deleteBoard: vi.fn(),
      renameBoard: vi.fn().mockResolvedValue(undefined),
      switchBoard: vi.fn(),
      refreshBoards: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the modal with serialized DSL in the textarea", () => {
    renderModal();
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Test Board\n  牛乳 @priority:high\n");
  });

  it("SAVE dispatches SET_NODES and renames the board", async () => {
    const renameBoard = vi.fn().mockResolvedValue(undefined);
    mockedActions.mockReturnValue({
      createBoard: vi.fn(),
      deleteBoard: vi.fn(),
      renameBoard,
      switchBoard: vi.fn(),
      refreshBoards: vi.fn(),
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <MindProvider initialState={makeState()}>
        <ModalWithDispatch />
      </MindProvider>,
    );

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, {
        target: { value: "新しいボード\n  タスクA @done\n  タスクB\n" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByText("SAVE"));
    });

    await waitFor(() => {
      expect(renameBoard).toHaveBeenCalledWith("b1", "新しいボード");
    });
    expect(renameBoard).toHaveBeenCalledTimes(1);
  });

  it("shows an inline error and does not dispatch on parse failure", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderModal();

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Root\n  bad indent\n" } });
    });

    await act(async () => {
      fireEvent.click(screen.getByText("SAVE"));
    });

    expect(
      screen.getByText("DSL の形式が不正です。インデント・属性値を確認してください。"),
    ).toBeTruthy();
    expect(mockedActions().renameBoard).not.toHaveBeenCalled();
  });

  it("Cmd+Enter triggers SAVE", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderModal();
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "NewName\n  child\n" } });
    });

    await act(async () => {
      fireEvent.keyDown(textarea, { key: "Enter", metaKey: true });
    });

    await waitFor(() => {
      expect(mockedActions().renameBoard).toHaveBeenCalledWith("b1", "NewName");
    });
  });

  it("Esc closes the modal", async () => {
    renderModal();
    expect(screen.getByText("DSL 編集")).toBeTruthy();

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });

    expect(screen.queryByText("DSL 編集")).toBeNull();
  });

  it("background click closes the modal", async () => {
    renderModal();
    const overlay = screen.getByText("DSL 編集").closest(".fixed") as HTMLElement;
    await act(async () => {
      fireEvent.click(overlay);
    });
    expect(screen.queryByText("DSL 編集")).toBeNull();
  });
});

// Helper that gives the test access to dispatch for state inspection.
function ModalWithDispatch() {
  const { state } = useMindStore();
  return state.modal?.kind === "dsl-editor" ? <DslEditorModal /> : null;
}
```

Run: `pnpm test -- src/components/DslEditorModal.test.tsx`
Expected: FAIL — `DslEditorModal` module doesn't exist yet.

- [ ] **Step 4: Implement DslEditorModal**

Create `src/components/DslEditorModal.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useMindStore } from "../hooks/use-mind-store";
import { useBoardActions } from "../hooks/use-board-actions";
import { parseDSL, serializeDSL } from "../dsl";
import type { MindNode } from "../types";

export function DslEditorModal() {
  const { state, dispatch } = useMindStore();
  const actions = useBoardActions();
  const open = state.modal?.kind === "dsl-editor";
  const close = () => dispatch({ modal: null, type: "OPEN_MODAL" });

  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const board = state.boards.find((b) => b.id === state.currentBoardId);
    setText(serializeDSL({ name: board?.name ?? "" }, state.nodes));
    setError(null);
  }, [open, state.currentBoardId, state.boards, state.nodes]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  const onSave = async () => {
    setError(null);
    const parsed = parseDSL(text, state.currentBoardId ?? "");
    if (!parsed) {
      setError("DSL の形式が不正です。インデント・属性値を確認してください。");
      return;
    }
    const boardName = state.boards.find((b) => b.id === state.currentBoardId)?.name ?? "";
    const ok = window.confirm(
      `DSL を適用するとボード「${boardName}」のタスクがすべて置き換わり、ボード名も「${parsed.board.name}」に変更されます。続行しますか?`,
    );
    if (!ok) return;
    await actions.renameBoard(state.currentBoardId!, parsed.board.name);
    const rec: Record<string, MindNode> = {};
    for (const n of parsed.nodes) rec[n.id] = n;
    dispatch({ nodes: rec, type: "SET_NODES" });
    close();
  };

  const onTextareaKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void onSave();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="w-full max-w-[720px] rounded overflow-hidden"
        style={{ background: "var(--paper)", border: "1px solid var(--border)" }}
      >
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2
            className="text-lg"
            style={{ fontFamily: '"Crimson Pro", serif', fontWeight: 600, color: "var(--ink)" }}
          >
            DSL 編集
          </h2>
          <button
            type="button"
            aria-label="閉じる"
            onClick={close}
            className="p-1 rounded"
            style={{ color: "var(--mid)" }}
          >
            ×
          </button>
        </div>
        <div className="p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onTextareaKey}
            spellCheck={false}
            className="w-full rounded p-3 outline-none text-sm"
            style={{
              minHeight: "320px",
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
              background: "var(--toolbar-bg)",
              border: "1px solid var(--border)",
              color: "var(--ink)",
              resize: "vertical",
            }}
          />
          {error && (
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--terra)" }}
              role="alert"
            >
              ⚠ {error}
            </p>
          )}
          <p className="mt-2 text-xs" style={{ color: "var(--mid)" }}>
            Cmd/Ctrl+Enter で SAVE / Esc でキャンセル
          </p>
        </div>
        <div
          className="flex justify-end gap-2 p-4"
          style={{ background: "var(--toolbar-bg)", borderTop: "1px solid var(--border)" }}
        >
          <button
            type="button"
            onClick={close}
            className="px-4 py-2 rounded text-sm font-medium transition"
            style={{
              background: "var(--paper)",
              border: "1px solid var(--border)",
              color: "var(--ink)",
            }}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            className="px-5 py-2 rounded text-sm font-semibold transition"
            style={{ background: "var(--terra)", color: "var(--paper)" }}
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test -- src/components/DslEditorModal.test.tsx`
Expected: PASS (all 6 tests).

- [ ] **Step 6: Run type check and lint**

Run: `pnpm run check`
Expected: exit 0, no errors.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/use-mind-store.tsx src/components/DslEditorModal.tsx src/components/DslEditorModal.test.tsx
git commit -m "feat(mintodo): add DSL editor modal with textarea + SAVE"
```

---

## Task 3: Update Toolbar (remove 4 old buttons, add 1 new)

**Files:**
- Modify: `src/components/Toolbar.tsx`

- [ ] **Step 1: Remove old imports and refs**

In `src/components/Toolbar.tsx`, change the imports:

```tsx
import {
  Eye,
  FileText,
  Keyboard,
  Menu,
  Moon,
  Network,
  Search,
  Sun,
  Trash2,
} from "lucide-react";
import { useMindStore } from "../hooks/use-mind-store";
import { useBoardActions } from "../hooks/use-board-actions";
import { db } from "../db";
import type { MindNode } from "../types";
```

Remove these imports:
- lucide: `Download`, `FileUp`, `Upload`
- react: `useRef`
- storage: `downloadJson`, `downloadText`, `parseImportedJson`
- dsl: `parseDSL`, `serializeDSL`
- types: `MindNode` (no longer used in this file)

- [ ] **Step 2: Remove the 4 handlers and 2 refs**

In `Toolbar` component body, delete:
- `const fileRef = useRef<HTMLInputElement>(null);`
- `const dslFileRef = useRef<HTMLInputElement>(null);`
- The entire `onExportDsl` function
- The entire `onImportDslClick` function
- The entire `onDslFile` function
- The entire `onExport` function
- The entire `onImportClick` function
- The entire `onFile` function

- [ ] **Step 3: Replace the 4 buttons with 1 button**

Find the 4 buttons (currently at lines 226-261 of the original file). Replace them with:

```tsx
<button
  type="button"
  className="p-2 rounded transition"
  style={{ color: "var(--mid)" }}
  title="DSL編集"
  onClick={() => dispatch({ modal: { kind: "dsl-editor" }, type: "OPEN_MODAL" })}
>
  <FileText size={16} />
</button>
```

Also remove the 2 hidden `<input type="file">` elements (lines 262-269) and the `onToggleDrawer` reference (keep it — still used).

- [ ] **Step 4: Verify type check passes**

Run: `pnpm run check:tsgo`
Expected: exit 0, no errors. (The unused `useBoardActions` and `MindNode` imports are gone; `FileText` is now used.)

- [ ] **Step 5: Run all tests**

Run: `pnpm test`
Expected: All tests pass. The DslEditorModal tests still pass because the new button just dispatches a modal-open action and the modal component itself is unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/components/Toolbar.tsx
git commit -m "refactor(mintodo): replace import/export buttons with DSL editor trigger"
```

---

## Task 4: Mount DslEditorModal in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the import**

In `src/App.tsx`, add to the imports:

```tsx
import { DslEditorModal } from "./components/DslEditorModal";
```

(Place it alphabetically, between `EditModal` and `EmptyState`.)

- [ ] **Step 2: Mount the component**

In `Shell`, add `<DslEditorModal />` after `<EditModal />`:

```tsx
<EditModal />
<DslEditorModal />
<HelpModal />
<BoardNameDialog />
<BoardDeleteDialog />
```

- [ ] **Step 3: Run type check and tests**

Run: `pnpm run check && pnpm test`
Expected: exit 0, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(mintodo): mount DslEditorModal in app shell"
```

---

## Task 5: Remove dead code from storage.ts

**Files:**
- Modify: `src/storage.ts`

**Context:** `downloadJson`, `downloadText`, and `parseImportedJson` are no longer imported anywhere after Tasks 3-4 (Toolbar was their only consumer). Remove them to keep the module focused on persistence.

- [ ] **Step 1: Verify the functions are unused**

Run:
```bash
rg "downloadJson|downloadText|parseImportedJson" src/
```

Expected: no matches (other than possibly the function definitions themselves in `src/storage.ts`).

- [ ] **Step 2: Remove the three functions**

In `src/storage.ts`, delete these three function definitions and the `SaveData` import (no longer needed):

- `export function downloadJson(...)` (lines 104-115)
- `export function downloadText(...)` (lines 117-127)
- `export function parseImportedJson(...)` (lines 129-147)

Also update the import line from:

```ts
import type { Board, MindNode, SaveData } from "./types";
```

to:

```ts
import type { Board, MindNode } from "./types";
```

- [ ] **Step 3: Verify type check and tests**

Run: `pnpm run check && pnpm test`
Expected: exit 0, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/storage.ts
git commit -m "refactor(mintodo): remove unused download/parse JSON helpers"
```

---

## Acceptance Checklist

- [ ] `pnpm test` — all green
- [ ] `pnpm run check` — type check + lint clean
- [ ] `pnpm run format` — formatting clean
- [ ] Toolbar shows only one icon button (FileText) titled "DSL編集" — the 4 old buttons are gone
- [ ] Clicking the button opens a modal with the current DSL pre-filled in a textarea
- [ ] Editing the text and clicking SAVE (after `confirm()`) replaces all nodes and renames the board
- [ ] Invalid DSL shows an inline error and does not modify state
- [ ] Esc, × button, background click, and キャンセル all close the modal without saving
- [ ] Cmd+Enter (mac) / Ctrl+Enter (other) triggers SAVE
- [ ] Manual smoke test: existing board creation, EditModal, HelpModal, board rename, board delete still work

## Self-Review Notes

- **Spec coverage:** Modal kind → Task 1; DslEditorModal (textarea, SAVE, error, keyboard) → Task 2; Toolbar swap → Task 3; mounting → Task 4; storage cleanup → Task 5. All spec sections covered.
- **Type consistency:** `Modal` kind, `parseDSL(text, boardId)`, `serializeDSL({ name }, nodes)`, `useBoardActions().renameBoard(id, name)`, `dispatch({ modal, type: "OPEN_MODAL" })`, `dispatch({ nodes, type: "SET_NODES" })` — all signatures match between definition and use sites.
- **No placeholders:** every step has concrete code.
- **No spurious new abstractions:** only `MindProvider.initialState` prop added (a single optional param for testability).
- **No new dependencies.**
