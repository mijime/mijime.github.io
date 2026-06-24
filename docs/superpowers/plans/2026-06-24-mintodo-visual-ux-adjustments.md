# mintodo Visual/UX Adjustments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the header wordmark, follow apps/main's theme via a Tailwind v4 custom variant, align the canvas background with `--paper`, and render card text across multiple lines (including preserving newlines from the edit modal).

**Architecture:** Mechanical visual/UX changes isolated to mintodo (no data model change). The theme fix is the only one that touches multiple files (`Toolbar.tsx` + `index.css`) but is constrained to a single CSS directive plus a button removal. Multi-line card display depends on a `parseInlineDSL` fix to preserve `\n` characters — the existing parser collapses all whitespace, including newlines, into single spaces.

**Tech Stack:** React 19, TypeScript 6, Tailwind v4 (`@custom-variant`), vitest + @testing-library/react, oxfmt/oxlint, pnpm.

## Global Constraints

- All `pnpm` commands run with `workdir: /Users/kojima.takashi/src/github.com/mijime/mijime.github.io/packages/mintodo` unless noted.
- Git commands run with `git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io ...` from the monorepo root.
- Test command: `pnpm test` (vitest run; expect 17+ test files passing).
- Typecheck + lint: `pnpm run check`.
- Format: pre-commit hook (lefthook) runs `pnpm run format`. Do not run manually.
- Commit messages: `type(mintodo): ...` Conventional Commits with the `mintodo` scope. No body unless required.
- Branch: `feat/mintodo-layout-overlap`.
- No changes to `apps/main` or `@mijime/theme`. No new dependencies.
- `useDarkMode` from `@mijime/theme` is NOT imported; theme state is read purely via the `data-theme` attribute on `<html>`.
- The Tailwind v4 `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));` directive is the canonical pattern; Task 2 Step 1 verifies the exact form against the official Tailwind v4 docs before editing.
- Each task ends with: full `pnpm test` green, `pnpm run check` clean, one commit.

---

## File Structure

Files modified across this plan:

| File | Responsibility |
|---|---|
| `packages/mintodo/index.html` | Browser tab title |
| `packages/mintodo/src/index.css` | Tailwind v4 base import + custom-variant for `dark:` |
| `packages/mintodo/src/components/Toolbar.tsx` | Top header; wordmark and (removed) theme toggle |
| `packages/mintodo/src/components/Canvas.tsx` | Mindmap viewport; background color |
| `packages/mintodo/src/components/NodeCard.tsx` | Mindmap node card; text wrapping |
| `packages/mintodo/src/components/KanbanCard.tsx` | KANBAN card; text wrapping |
| `packages/mintodo/src/dsl.ts` | `parseInlineDSL` — preserve newlines |
| `packages/mintodo/src/components/Toolbar.test.tsx` (new) | Toolbar unit tests |
| `packages/mintodo/src/components/NodeCard.test.tsx` | Add multi-line test |
| `packages/mintodo/src/components/KanbanCard.test.tsx` | Add multi-line test |
| `packages/mintodo/src/dsl.test.ts` | Add multi-line parseInlineDSL test |
| `packages/mintodo/src/integration.test.tsx` | Add end-to-end multi-line test; assert canvas bg |

No new files outside `Toolbar.test.tsx`. No data model change. No reducer change.

---

## Task 1: Header wordmark → "mintodo"

**Files:**
- Modify: `packages/mintodo/src/components/Toolbar.tsx:65`
- Modify: `packages/mintodo/index.html:6`
- Create: `packages/mintodo/src/components/Toolbar.test.tsx`

**Interfaces:**
- Consumes: existing `<Toolbar />` component (no signature change)
- Produces: Toolbar renders an `<h1>` whose text content is `"mintodo"`; `index.html` `<title>` is `"mintodo"`.

- [ ] **Step 1: Create `Toolbar.test.tsx` with a failing test**

Create `packages/mintodo/src/components/Toolbar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Toolbar } from "./Toolbar";
import { MindProvider } from "../hooks/use-mind-store";

describe("Toolbar header", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the 'mintodo' wordmark in the h1", () => {
    render(
      <MindProvider>
        <Toolbar />
      </MindProvider>,
    );
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toBe("mintodo");
  });
});
```

- [ ] **Step 2: Run the new test to confirm it fails**

```bash
pnpm test -- Toolbar.test
```

Expected: FAIL — message includes `expected "MindTodo Pro" to be "mintodo"` (or similar diff on text).

- [ ] **Step 3: Update the Toolbar wordmark text**

In `packages/mintodo/src/components/Toolbar.tsx`, line 65, change:

```tsx
              MindTodo Pro
```

to:

```tsx
              mintodo
```

- [ ] **Step 4: Update the `index.html` `<title>`**

In `packages/mintodo/index.html`, line 6, change:

```html
    <title>MindTodo Pro</title>
```

to:

```html
    <title>mintodo</title>
```

- [ ] **Step 5: Re-run the test to confirm it passes**

```bash
pnpm test -- Toolbar.test
```

Expected: PASS.

- [ ] **Step 6: Run the full test suite and check**

```bash
pnpm test
pnpm run check
```

Expected: all tests pass, 0 type errors, 0 lint errors.

- [ ] **Step 7: Commit**

```bash
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io add packages/mintodo/src/components/Toolbar.tsx packages/mintodo/index.html packages/mintodo/src/components/Toolbar.test.tsx
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io commit -m "refactor(mintodo): rename wordmark to 'mintodo'"
```

---

## Task 2: Remove local theme toggle; add Tailwind v4 `@custom-variant` for `data-theme`

**Files:**
- Modify: `packages/mintodo/src/components/Toolbar.tsx` (lines 1-12 for imports; lines 17-20 for `onTheme`; lines 139-148 for the toggle button)
- Modify: `packages/mintodo/src/index.css` (insert `@custom-variant` after line 3)
- Modify: `packages/mintodo/src/components/Toolbar.test.tsx` (add assertion: no theme toggle button)

**Interfaces:**
- Consumes: existing `<Toolbar />` component (no signature change)
- Produces: Toolbar does not render a button with `title="テーマ切り替え"`; all `dark:` Tailwind classes in mintodo follow `<html data-theme="dark">`.

- [ ] **Step 1: Verify the Tailwind v4 `@custom-variant` syntax**

Before editing `index.css`, fetch the official Tailwind v4 docs to confirm the exact syntax. The expected canonical form is:

```css
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

If the docs document a different selector form (e.g. require `:is(...)`), use the documented form. Do not invent a custom syntax. Note the verified form in the commit message body if it differs from the canonical above.

- [ ] **Step 2: Add a failing test for "no theme toggle button"**

Append to `packages/mintodo/src/components/Toolbar.test.tsx`:

```tsx
  it("does not render a theme toggle button", () => {
    render(
      <MindProvider>
        <Toolbar />
      </MindProvider>,
    );
    expect(screen.queryByTitle("テーマ切り替え")).toBeNull();
  });
```

- [ ] **Step 3: Run the new test to confirm it fails**

```bash
pnpm test -- Toolbar.test
```

Expected: FAIL — `expected element to be null` (the button currently exists in the rendered tree).

- [ ] **Step 4: Remove `Moon` and `Sun` from the lucide-react import in `Toolbar.tsx`**

In `packages/mintodo/src/components/Toolbar.tsx`, change lines 1-12 from:

```tsx
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

to:

```tsx
import {
  Eye,
  FileText,
  Keyboard,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Trash2,
} from "lucide-react";
```

- [ ] **Step 5: Remove the `onTheme` function**

In `packages/mintodo/src/components/Toolbar.tsx`, delete lines 17-20:

```tsx
function onTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

```

(Include the trailing blank line so the file structure remains clean.)

- [ ] **Step 6: Remove the theme toggle button**

In `packages/mintodo/src/components/Toolbar.tsx`, delete lines 139-148:

```tsx
          <button
            type="button"
            className="p-2 rounded transition"
            style={{ color: "var(--mid)" }}
            title="テーマ切り替え"
            onClick={onTheme}
          >
            <Moon size={18} className="dark:hidden" />
            <Sun size={18} className="hidden dark:block" />
          </button>
```

(Leave the surrounding `<div className="flex items-center gap-1">` intact — the other buttons in that group remain.)

- [ ] **Step 7: Add the `@custom-variant` directive to `index.css`**

In `packages/mintodo/src/index.css`, after line 3 (`@source "./**/*.{ts,tsx}";`), insert a blank line and the directive:

```css
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

The full file becomes:

```css
@import "@mijime/theme/index.css";
@import "tailwindcss";
@source "./**/*.{ts,tsx}";

@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

html,
body,
#root {
  height: 100%;
  margin: 0;
  padding: 0;
}

.canvas-grid {
  background-image: radial-gradient(var(--grid) 1px, transparent 1px);
  background-size: 20px 20px;
}

.transform-container {
  transform-origin: 0 0;
  transition: transform 0.05s ease-out;
}

.node-selected {
  outline: 2px solid var(--terra);
  outline-offset: 1px;
}

.serif {
  font-family: "Crimson Pro", serif;
}
```

- [ ] **Step 8: Re-run the Toolbar test to confirm it passes**

```bash
pnpm test -- Toolbar.test
```

Expected: PASS for both tests.

- [ ] **Step 9: Run the full test suite and check**

```bash
pnpm test
pnpm run check
```

Expected: all tests pass, 0 type errors, 0 lint errors. If lint flags an unused import, re-check Step 4 (the import block must no longer list `Moon` or `Sun`).

- [ ] **Step 10: Commit**

```bash
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io add packages/mintodo/src/components/Toolbar.tsx packages/mintodo/src/index.css packages/mintodo/src/components/Toolbar.test.tsx
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io commit -m "refactor(mintodo): remove local theme toggle, follow apps/main data-theme"
```

---

## Task 3: Canvas background uses `--paper` (not `slate-50` / `slate-900`)

**Files:**
- Modify: `packages/mintodo/src/components/Canvas.tsx:106`
- Modify: `packages/mintodo/src/integration.test.tsx` (add a test inside a new `describe` block at the bottom)

**Interfaces:**
- Consumes: existing `<Canvas />` component
- Produces: The canvas container (`canvas-grid` element) has className containing `bg-[var(--paper)]` and NOT containing `bg-slate-50` or `dark:bg-slate-900`.

- [ ] **Step 1: Add a failing test in the integration test**

Read the last 30 lines of `packages/mintodo/src/integration.test.tsx` to see the current ending pattern. Append a new `describe` block:

```tsx
describe("canvas background uses --paper", () => {
  afterEach(async () => {
    await db.delete();
  });

  it("renders the canvas container with bg-[var(--paper)] (no slate-50)", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });

    if (screen.queryByText("+ 新規ボード作成")) {
      fireEvent.click(screen.getByText("+ 新規ボード作成"));
      const input = screen.getByPlaceholderText("例: メインプロジェクト") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "Bg" } });
      fireEvent.click(screen.getByText("作成"));
      await act(async () => {
        await flush(100);
      });
    }

    const canvasContainer = document.querySelector(".canvas-grid") as HTMLElement;
    expect(canvasContainer).toBeTruthy();
    expect(canvasContainer.className).toContain("bg-[var(--paper)]");
    expect(canvasContainer.className).not.toContain("bg-slate-50");
    expect(canvasContainer.className).not.toContain("dark:bg-slate-900");
  });
});
```

- [ ] **Step 2: Run the new test to confirm it fails**

```bash
pnpm test -- integration.test
```

Expected: FAIL — the canvas className still contains `bg-slate-50`, so the `.not.toContain("bg-slate-50")` assertion fails.

- [ ] **Step 3: Update the Canvas className**

In `packages/mintodo/src/components/Canvas.tsx`, line 106, change:

```tsx
        className="w-full h-full cursor-grab active:cursor-grabbing canvas-grid relative overflow-hidden bg-slate-50 dark:bg-slate-900"
```

to:

```tsx
        className="w-full h-full cursor-grab active:cursor-grabbing canvas-grid relative overflow-hidden bg-[var(--paper)]"
```

- [ ] **Step 4: Re-run the integration test to confirm it passes**

```bash
pnpm test -- integration.test
```

Expected: PASS.

- [ ] **Step 5: Run the full test suite and check**

```bash
pnpm test
pnpm run check
```

Expected: all tests pass, 0 type errors, 0 lint errors.

- [ ] **Step 6: Commit**

```bash
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io add packages/mintodo/src/components/Canvas.tsx packages/mintodo/src/integration.test.tsx
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io commit -m "refactor(mintodo): use --paper for canvas background"
```

---

## Task 4: `parseInlineDSL` preserves newlines

**Files:**
- Modify: `packages/mintodo/src/dsl.ts:195-269` (rewrite `parseInlineDSL` to be line-aware)
- Modify: `packages/mintodo/src/dsl.test.ts` (add multi-line tests)

**Interfaces:**
- Consumes: existing callers of `parseInlineDSL` (`EditModal.tsx`, `DslEditorModal.tsx`)
- Produces: `parseInlineDSL` returns a `text` field that preserves `\n` characters. `@key:value` attributes are extracted from any line.

- [ ] **Step 1: Add a failing multi-line test**

Append to `packages/mintodo/src/dsl.test.ts` (inside the existing `describe("parseInlineDSL", ...)` block at the end):

```ts
  it("preserves newlines in the returned text while extracting attributes", () => {
    const r = parseInlineDSL("line1\nline2 @priority:high\nline3");
    expect(r.text).toBe("line1\nline2\nline3");
    expect(r.priority).toBe("high");
    expect(r.hasAnyAttribute).toBe(true);
  });

  it("preserves multiple newlines and trims per-line whitespace", () => {
    const r = parseInlineDSL("  alpha  \n  beta  \n  gamma  ");
    expect(r.text).toBe("alpha\nbeta\ngamma");
    expect(r.hasAnyAttribute).toBe(false);
  });

  it("extracts attributes from any line, regardless of position", () => {
    const r = parseInlineDSL("foo\n@color:sky\nbar @done\nbaz");
    expect(r.text).toBe("foo\nbar\nbaz");
    expect(r.categoryColor).toBe("sky");
    expect(r.completed).toBe(true);
  });
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
pnpm test -- dsl.test
```

Expected: FAIL — the existing implementation collapses whitespace, so the first test's `text` assertion fails with `expected "line1 line2 line3" to be "line1\nline2\nline3"`.

- [ ] **Step 3: Rewrite `parseInlineDSL` to be line-aware**

In `packages/mintodo/src/dsl.ts`, replace the entire `parseInlineDSL` function (lines 195-269) with the following:

```ts
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

The change from the original: the outer loop now iterates over `lines` (the result of `raw.split("\n")`) instead of over `tokens` (the result of `raw.split(/\s+/u)`). Each line is independently tokenized on whitespace, attributes are extracted per line, and non-attribute tokens are joined with a single space and accumulated into `textLines`. The `if (textTokens.length > 0)` guard drops empty / whitespace-only lines and lines that contain only attributes — this is what keeps the existing test `parseInlineDSL("   ")` returning `text: ""` intact. The final `result.text` is `textLines.join("\n")`.

- [ ] **Step 4: Re-run the dsl tests to confirm they pass**

```bash
pnpm test -- dsl.test
```

Expected: PASS for all `parseInlineDSL` tests, including the three new multi-line cases. (The existing single-line tests must continue to pass — they exercise the unchanged switch logic.)

- [ ] **Step 5: Run the full test suite and check**

```bash
pnpm test
pnpm run check
```

Expected: all tests pass. The `EditModal.test.tsx` and `DslEditorModal.test.tsx` tests must continue to pass — they use single-line inputs and expect the old behavior on those, which is preserved (single-line text still works the same way, because `textLines.join("\n")` on a single-element array returns the element unchanged).

- [ ] **Step 6: Commit**

```bash
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io add packages/mintodo/src/dsl.ts packages/mintodo/src/dsl.test.ts
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io commit -m "fix(mintodo): preserve newlines in parseInlineDSL"
```

---

## Task 5: Multi-line card display (`NodeCard` + `KanbanCard`)

**Files:**
- Modify: `packages/mintodo/src/components/NodeCard.tsx:116-120` (text container in non-root branch)
- Modify: `packages/mintodo/src/components/KanbanCard.tsx:69-73` (text container)
- Modify: `packages/mintodo/src/components/NodeCard.test.tsx` (add multi-line test)
- Modify: `packages/mintodo/src/components/KanbanCard.test.tsx` (add multi-line test)

The root `NodeCard` text container (line 54, `className="flex-1 select-none pr-1 truncate"`) is intentionally left on a single line — the root is a fixed-position hub that should stay compact.

**Interfaces:**
- Consumes: existing `<NodeCard />` and `<KanbanCard />` components (no signature change)
- Produces: The `<span>` rendering `node.text` in non-root `NodeCard` and in `KanbanCard` has className `"whitespace-pre-wrap break-words max-w-[240px] flex-1 text-sm font-medium …"` and no longer has `"truncate"`.

- [ ] **Step 1: Add a failing test in `NodeCard.test.tsx`**

Append a new `describe` block to `packages/mintodo/src/components/NodeCard.test.tsx`:

```tsx
describe("NodeCard multi-line text", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders multi-line text with whitespace-pre-wrap and max-w-[240px]", () => {
    const multiline = "line1\nline2 line3 line4 line5 line6 line7 line8 line9 line10";
    const { container } = setup({
      nodes: {
        root: makeNode("root", null, { isRoot: true, children: ["a"] }),
        a: makeNode("a", "root", { x: 0, y: -340, text: multiline }),
      },
    });
    const a = container.querySelector('[data-node-id="a"]') as HTMLElement;
    const textSpan = a.querySelector("span.whitespace-pre-wrap") as HTMLElement;
    expect(textSpan).toBeTruthy();
    expect(textSpan.className).toContain("whitespace-pre-wrap");
    expect(textSpan.className).toContain("break-words");
    expect(textSpan.className).toContain("max-w-[240px]");
    expect(textSpan.className).not.toContain("truncate");
    expect(textSpan.textContent).toBe(multiline);
  });
});
```

- [ ] **Step 2: Add a failing test in `KanbanCard.test.tsx`**

Append a new `describe` block to `packages/mintodo/src/components/KanbanCard.test.tsx`:

```tsx
describe("KanbanCard multi-line text", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders multi-line text with whitespace-pre-wrap and max-w-[240px]", () => {
    const multiline = "first line\nsecond line wraps to a longer one";
    const n = node({
      id: "n1",
      boardId: "b",
      parentId: "root",
      text: multiline,
    });
    const root = node({
      id: "root",
      boardId: "b",
      parentId: null,
      isRoot: true,
    });
    renderCard(n, [root]);
    const card = screen.getByTestId("kanban-card-n1");
    const textSpan = card.querySelector("span.whitespace-pre-wrap") as HTMLElement;
    expect(textSpan).toBeTruthy();
    expect(textSpan.className).toContain("whitespace-pre-wrap");
    expect(textSpan.className).toContain("break-words");
    expect(textSpan.className).toContain("max-w-[240px]");
    expect(textSpan.className).not.toContain("truncate");
    expect(textSpan.textContent).toBe(multiline);
  });
});
```

- [ ] **Step 3: Run the new tests to confirm they fail**

```bash
pnpm test -- NodeCard.test KanbanCard.test
```

Expected: FAIL — the new test queries `span.whitespace-pre-wrap`, which does not yet exist in the rendered tree.

- [ ] **Step 4: Update the non-root `NodeCard` text className**

In `packages/mintodo/src/components/NodeCard.tsx`, lines 116-120, change:

```tsx
          <span
            className={`truncate flex-1 text-sm font-medium ${node.completed ? "line-through text-slate-400 dark:text-slate-500" : ""}`}
          >
            {node.text}
          </span>
```

to:

```tsx
          <span
            className={`whitespace-pre-wrap break-words max-w-[240px] flex-1 text-sm font-medium ${node.completed ? "line-through text-slate-400 dark:text-slate-500" : ""}`}
          >
            {node.text}
          </span>
```

- [ ] **Step 5: Update the `KanbanCard` text className**

In `packages/mintodo/src/components/KanbanCard.tsx`, lines 69-73, change:

```tsx
        <span
          className={`truncate text-sm font-medium flex-1 ${isDone ? "line-through text-slate-400 dark:text-slate-500" : ""}`}
        >
          {node.text}
        </span>
```

to:

```tsx
        <span
          className={`whitespace-pre-wrap break-words max-w-[240px] text-sm font-medium flex-1 ${isDone ? "line-through text-slate-400 dark:text-slate-500" : ""}`}
        >
          {node.text}
        </span>
```

- [ ] **Step 6: Check existing tests in `NodeCard.test.tsx` and `KanbanCard.test.tsx` for `truncate` references on the text element**

Search both files for `truncate`. If any existing assertion references `truncate` on a non-root `NodeCard` text element or on a `KanbanCard` text element, update to `whitespace-pre-wrap`. (Per the existing test file contents, neither file asserts on the text element's className today, so this step is expected to be a no-op — but the search is required for safety.)

- [ ] **Step 7: Re-run the multi-line tests to confirm they pass**

```bash
pnpm test -- NodeCard.test KanbanCard.test
```

Expected: PASS for the new multi-line tests, and the existing tests in both files continue to pass.

- [ ] **Step 8: Run the full test suite and check**

```bash
pnpm test
pnpm run check
```

Expected: all tests pass, 0 type errors, 0 lint errors.

- [ ] **Step 9: Commit**

```bash
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io add packages/mintodo/src/components/NodeCard.tsx packages/mintodo/src/components/KanbanCard.tsx packages/mintodo/src/components/NodeCard.test.tsx packages/mintodo/src/components/KanbanCard.test.tsx
git -C /Users/kojima.takashi/src/github.com/mijime.mijime.github.io 2>/dev/null
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io commit -m "feat(mintodo): render card text across multiple lines"
```

---

## Task 6: End-to-end integration test for the multi-line flow

**Files:**
- Modify: `packages/mintodo/src/integration.test.tsx` (add a new `describe` block)

**Interfaces:**
- Consumes: existing `App` + `db` + `flush` imports
- Produces: a passing end-to-end test that opens the edit modal for a node, types a multi-line text, saves, and asserts the resulting mindmap card has both the newlines preserved and the new className.

- [ ] **Step 1: Add the integration test**

Append to `packages/mintodo/src/integration.test.tsx`:

```tsx
describe("multi-line text end-to-end", () => {
  afterEach(async () => {
    await db.delete();
  });

  it("preserves newlines from the edit modal to the mindmap card", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });

    if (screen.queryByText("+ 新規ボード作成")) {
      fireEvent.click(screen.getByText("+ 新規ボード作成"));
      const input = screen.getByPlaceholderText("例: メインプロジェクト") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "Multi" } });
      fireEvent.click(screen.getByText("作成"));
      await act(async () => {
        await flush(100);
      });
    }

    fireEvent.click(screen.getByTestId("add-child-root"));
    await act(async () => {
      await flush(50);
    });

    const multiline = "first\nsecond\nthird line is a bit longer to force wrap";
    const textarea = screen.getByTestId("edit-modal-textarea") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: multiline } });
    fireEvent.click(screen.getByText("保存"));
    await act(async () => {
      await flush(200);
    });

    const textSpan = document.querySelector("span.whitespace-pre-wrap") as HTMLElement;
    expect(textSpan).toBeTruthy();
    expect(textSpan.textContent).toBe(multiline);
  });
});
```

- [ ] **Step 2: Run the integration test to confirm it passes**

Tasks 4 and 5 are required predecessors — by the time this task starts, `parseInlineDSL` preserves `\n` and the card className includes `whitespace-pre-wrap`. The test should pass on the first run:

```bash
pnpm test -- integration.test
```

Expected: PASS for the new `multi-line text end-to-end` test. If it fails, re-check that Tasks 4 and 5 have been committed and the changes are present on disk.

- [ ] **Step 3: Run the full test suite and check**

```bash
pnpm test
pnpm run check
```

Expected: all tests pass, 0 type errors, 0 lint errors.

- [ ] **Step 4: Commit**

```bash
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io add packages/mintodo/src/integration.test.tsx
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io commit -m "test(mintodo): cover multi-line text end-to-end"
```

---

## Smoke Test (manual)

After all six tasks land and the branch is green, perform a manual smoke test via:

```bash
pnpm --filter @mijime/mintodo dev
```

1. Open `http://localhost:5173/mintodo/` (or the port vite reports).
2. Confirm the toolbar shows "mintodo" as the wordmark; the browser tab title is also "mintodo".
3. Confirm there is no Sun/Moon button in the toolbar.
4. Click the `apps/main` site header's theme toggle. Confirm the mintodo canvas background flips (light `#fafaf8` ↔ dark `#1a1a18`).
5. Create a board, click on a child node, edit it, type `"first line\nsecond line"`, save. Confirm the node card wraps to two lines (text-align respects the newlines, and the second line is visible).
6. Confirm the edit modal still shows the text with the newlines when re-opened.
7. Reload the page; confirm the multi-line text and theme are preserved.

## Self-Review

The plan writer checked:

- **Spec coverage:**
  - Header wordmark → Task 1.
  - Theme follow `apps/main` (remove local toggle, add `@custom-variant`) → Task 2.
  - Light canvas background → Task 3.
  - Multi-line `MindNode.text` preservation (`parseInlineDSL`) → Task 4.
  - Multi-line card display (`NodeCard` + `KanbanCard` className) → Task 5.
  - End-to-end test for the full flow → Task 6.
  - `useDarkMode` not imported → enforced via Global Constraints and Task 2 Step 4.
  - No data model change → enforced (no reducer / type / DB changes in any task).
- **Placeholder scan:** No "TBD", "TODO", "implement later", or "fill in details" in any step. All code blocks are complete.
- **Type / name consistency:** All file paths match the spec's "Files affected" table and the explore report's findings. Function names (`parseInlineDSL`, `Toolbar`, `NodeCard`, `KanbanCard`, `Canvas`) match the existing source. Constants (`ALLOWED_PRIORITIES`, `ALLOWED_COLORS`, `ALLOWED_STATUSES`, `TASK_STATUSES`) match `dsl.ts`. The `MindNode` shape used in tests matches `types.ts`. `MindProvider` and `useMindStore` are used per the existing pattern in `NodeCard.test.tsx` and `KanbanCard.test.tsx`.
- **Risk callouts:** Task 2 Step 1 requires verifying the Tailwind v4 `@custom-variant` syntax against the official docs before editing. Task 4 Step 3 retains the existing `switch` logic inside the new line-aware loop; the only change is the outer loop variable (`tokens` → `lines`) and the final join (`textTokens.join(" ").trim()` → `textLines.join("\n")`).
- **No "similar to Task N" shortcuts:** Every code block in the plan is self-contained.
