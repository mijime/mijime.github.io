# mintodo Visual/UX Adjustments — Design

**Date**: 2026-06-24
**Branch**: `feat/mintodo-layout-overlap`
**Scope**: Header title, theme system, light-mode canvas background, multi-line card display
**Status**: Approved, pending implementation

## Background

mintodo currently has a hidden bug in its theme system: it manages dark/light mode by toggling a `dark` class on `document.documentElement`, while its host (`apps/main`) toggles a `data-theme="dark"|"light"` attribute on the same element. Both write to the same `localStorage` key `"theme"`, but they target different DOM attributes, so they fight each other: clicking mintodo's toolbar toggle flips the `dark` class (which Tailwind `dark:` variants pick up) but leaves `data-theme` (which `apps/main` CSS uses) untouched. The result is partial theme flips, depending on which toggle was last pressed.

This design also collects the other small visual/UX items from the brainstorm that are independent of larger refactors (card unification, KANBAN inline edit, DSL-as-view).

## Goals

- Replace the header wordmark `"MindTodo Pro"` with `"mintodo"`.
- Remove mintodo's local theme toggle and follow the `data-theme` attribute already provided by `apps/main`.
- Make the mindmap canvas background in light mode the same as the page background (`--paper`).
- Allow card text (mindmap nodes + KANBAN cards) to wrap to multiple lines, preserving user-entered newlines.

## Non-Goals

- Card component unification between mindmap and KANBAN (separate brainstorm item).
- Inline editing on KANBAN (separate brainstorm item).
- Status visualization on mindmap nodes (separate brainstorm item).
- DSL editor promoted to a view (separate brainstorm item).
- Any change to data model, persistence, reducer, or DSL format.
- Any change to `apps/main` or `@mijime/theme`.

## Design

### 1. Header title

`packages/mintodo/src/components/Toolbar.tsx`: replace the wordmark text `"MindTodo Pro"` with `"mintodo"`.

`packages/mintodo/index.html`: replace `<title>MindTodo Pro</title>` with `<title>mintodo</title>`.

### 2. Theme: follow `apps/main`, remove local toggle

**Current state.** `Toolbar.tsx` renders a Sun/Moon button. `onTheme()` toggles `document.documentElement.classList.toggle("dark")` and writes the localStorage key `"theme"`. Tailwind `dark:` variants in mintodo currently key off either the OS `prefers-color-scheme` (default Tailwind v4 behavior — no `tailwind.config` exists in mintodo) or the manually-toggled `dark` class. The result is inconsistent.

**New behavior.** The host `apps/main` mounts `<DarkModeToggle>` in the persistent site header (`apps/main/src/layouts/base-layout.astro`) and writes `document.documentElement.dataset.theme = "dark" | "light"` plus the `"theme"` localStorage key. The `packages/theme/src/index.css` rule `:root[data-theme="dark"] { ... }` defines the dark variant of every CSS variable mintodo consumes. This is the single source of truth.

**Changes.**

- `Toolbar.tsx`: delete the Sun/Moon icon button, the `onTheme` function, the unused `Moon`/`Sun` icon imports, and any state/effect related to the toggle.
- `Toolbar.tsx`: do not import or call `useDarkMode` from `@mijime/theme`. (A has no React-side need to read the current theme. Adding the hook is deferred until a concrete need appears.)
- `packages/mintodo/src/index.css`: add the Tailwind v4 custom-variant directive so that the existing `dark:` utility classes follow `data-theme`:

  ```css
  @custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
  ```

  The exact syntax is verified against the Tailwind v4 docs at implementation time; the form above is the canonical pattern. (Tailwind v4's `@custom-variant` accepts an arbitrary selector.)

- No other className changes for `dark:*` are required. All `dark:bg-slate-*`, `dark:text-slate-*`, `dark:border-*`, `dark:bg-rose-950/50`, etc. continue to work as-is — they now resolve against `[data-theme="dark"]` instead of OS preference.

**localStorage.** The `"theme"` key remains authoritative — it is now written exclusively by `apps/main`. Old mintodo users whose localStorage holds `"dark"` or `"light"` from the previous toolbar toggle will be migrated transparently: `apps/main`'s `useDarkMode` reads the same key on mount.

### 3. Light-mode canvas background

`packages/mintodo/src/components/Canvas.tsx`: replace the class `bg-slate-50 dark:bg-slate-900` on the canvas background element with `bg-[var(--paper)]`. The `--paper` CSS variable is defined in `packages/theme/src/index.css`:

- `:root { --paper: #fafaf8; }` (light)
- `:root[data-theme="dark"] { --paper: #1a1a18; }` (dark)

A single className with `bg-[var(--paper)]` automatically flips with the theme; no separate dark override is needed.

The existing `.canvas-grid` rule in `packages/mintodo/src/index.css` already uses `var(--grid)` for the dot pattern. No change.

The `connection-lines` SVG, `NodeCard`, and `KanbanCard` components already use `var(--ink)`, `var(--terra)`, `var(--border)`, etc. via Tailwind `dark:` variants or inline `style`. They continue to work.

### 4. Multi-line card display

**Edit side** (no change to behavior, just verify). `EditModal.tsx` already renders a `<textarea>` for the text input; the reducer stores `text` as the raw string, including newlines. **Verify during implementation**: the reducer's `UPDATE_NODE` and `CREATE_CHILD`/`ADD_CHILD` actions store `text` verbatim (no `.trim()` on the multi-line value). If any path strips newlines, fix the reducer to preserve them.

**Display side.**

`packages/mintodo/src/components/NodeCard.tsx` and `packages/mintodo/src/components/KanbanCard.tsx`: change the className on the text container element (the one currently holding `truncate` or `whitespace-nowrap` or just `text-sm`) to:

```
whitespace-pre-wrap break-words max-w-[240px]
```

- `whitespace-pre-wrap` preserves user-entered `\n` and wraps long lines automatically.
- `break-words` breaks words that exceed the max width (e.g., long URLs).
- `max-w-[240px]` matches the current NodeCard width. The test setup's `getBoundingClientRect` default is `240×80`, so this preserves existing test geometry.

No `line-clamp` is applied. Cards grow in height as text grows. The mindmap's radial layout (Buchheim) already allocates `x`/`y` per node; subsequent layout passes (driven by `layoutVersion` in the reducer) will reposition siblings to account for the new heights. **Verify during implementation**: the radial layout does not need to be re-tuned — variable node height is within the design tolerance.

KANBAN cards use the same wrapping rules. They are arranged in fixed-width columns; the column CSS already handles vertical stacking. No layout change.

### 5. Data model

No change. `MindNode.text: string` is a plain string. Newlines are valid characters. Display is what changes.

### 6. Tests

**Update / remove.**

- `Toolbar.test.tsx` (if present) or the relevant test file: delete any test that exercises the theme toggle button. Delete the test for `onTheme`'s effect on `localStorage` and `<html>` class.
- `integration.test.tsx`: remove any assertion about `document.documentElement.classList.contains("dark")` after a toggle action. Keep all other assertions (DSL round-trip, KANBAN view toggle, viewMode persistence, etc.).
- `KanbanCard.test.tsx`, `NodeCard.test.tsx`: no change to behavior under test, but update any snapshot/className assertion that depended on the old single-line or `truncate` class.

**Add.**

- `NodeCard.test.tsx`: assert that a node with text `"line1\nline2 line3 line4 line5 line6 line7 line8 line9 line10"` renders with `whiteSpace: "pre-wrap"` on the text element and that the element's `getBoundingClientRect().width` does not exceed 240px. (For jsdom, this requires the test setup's `getBoundingClientRect` polyfill to honor `max-w`; if it does not, assert against the className string instead.)
- `KanbanCard.test.tsx`: same as above, scoped to the kanban card.
- `integration.test.tsx`: add a flow — open edit modal for a node, type a multi-line text (including `\n`), save, switch to mindmap, assert the node text contains the newlines and the card element has the `whitespace-pre-wrap` class.

**`@custom-variant` verification.** Manual smoke test (or a vitest DOM assertion) confirming that when `<html data-theme="dark">` is set, an element with class `dark:bg-slate-900` resolves to `rgb(15 23 42 / ...)` (or whatever slate-900 evaluates to in the test environment) and to the light value when the attribute is removed. This is hard to test directly in jsdom; the practical verification is the dev server smoke test: set `localStorage.theme = "dark"`, reload, observe the canvas background.

### 7. Files affected (estimate)

| File | Change |
|---|---|
| `packages/mintodo/index.html` | `<title>` text |
| `packages/mintodo/src/index.css` | `@custom-variant dark (...)` line |
| `packages/mintodo/src/components/Toolbar.tsx` | Delete toggle button, `onTheme`, icon imports |
| `packages/mintodo/src/components/Canvas.tsx` | `bg-slate-50 dark:bg-slate-900` → `bg-[var(--paper)]` |
| `packages/mintodo/src/components/NodeCard.tsx` | Text container className (multi-line rules) |
| `packages/mintodo/src/components/KanbanCard.tsx` | Text container className (multi-line rules) |
| `packages/mintodo/src/store.ts` | Possible fix if any action trims `\n` from `text` (verify) |
| `packages/mintodo/src/components/Toolbar.test.tsx` (if exists) | Remove toggle tests |
| `packages/mintodo/src/components/NodeCard.test.tsx` | Update className assertion; add multi-line test |
| `packages/mintodo/src/components/KanbanCard.test.tsx` | Update className assertion; add multi-line test |
| `packages/mintodo/src/integration.test.tsx` | Drop `dark` class assertion; add multi-line flow test |

Net change: roughly +30 / -50 lines.

### 8. Out-of-scope follow-ups (recorded, not addressed here)

- Card component unification (mindmap + KANBAN share one component) — see brainstorm items.
- KANBAN inline editing.
- Status visualization on mindmap nodes.
- DSL editor promoted to a view mode.
- Reading `useDarkMode` from React in mintodo (deferred until needed).

## Risks

- **Tailwind v4 `@custom-variant` syntax** — the exact form of the directive must be verified against the official Tailwind v4 documentation at implementation time. If the syntax differs from the form above, the fallback is to inline a different selector. The `dark:` utilities in mintodo are stable; only the matcher changes.
- **Radial layout tolerance** — variable node height has not been visually verified with multi-line text. The implementation must include a quick `pnpm run dev` smoke test of a node with a 6+ line text. If the layout looks wrong (overlap, excessive whitespace), the design adds a per-node height hint to the reducer (out of scope for A, but the escape hatch is documented).
- **Test setup `getBoundingClientRect` polyfill** — currently returns `240×80` for every element. With `max-w-[240px]`, width assertions against `getBoundingClientRect().width` are valid (always 240), but the height changes with content. The integration test should assert on the rendered text content + className, not on layout measurements.

## Verification before completion

Per the project's `verification-before-completion` discipline:

- `pnpm test` — all tests pass, including the new multi-line cases.
- `pnpm run check` — typecheck and lint clean.
- Dev server smoke test (`pnpm run dev`):
  - Header shows "mintodo".
  - No theme toggle button in the toolbar.
  - Light canvas background matches page background (`--paper`).
  - A card with a 6+ line text wraps correctly; layout still readable.
  - Dark mode: opening the `apps/main` header theme toggle flips mintodo correctly (the canvas background, text colors, badges).
- Pre-commit format hook passes (oxfmt).
