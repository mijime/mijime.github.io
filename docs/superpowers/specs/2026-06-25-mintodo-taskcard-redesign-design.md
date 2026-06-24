# mintodo TaskCard Redesign — Design

**Date**: 2026-06-25
**Branch**: `feat/mintodo-taskcard-redesign`
**Scope**: TaskCard visual refresh and internal component split
**Status**: Approved, pending implementation

## Background

`packages/mintodo/src/components/TaskCard.tsx` is the shared task body used by both mindmap nodes (`NodeCard.tsx`) and KANBAN cards (`KanbanCard.tsx`). A visual review revealed several structural issues:

- The metadata row is `flex items-center justify-between` with content only on the left, leaving the right half empty.
- The category color appears twice for mindmap nodes: NodeCard already paints a 4px left border from `categoryBorderColor`, then TaskCard paints a 1px bottom border from the same value.
- Priority is binary-visibility: only `high` renders a "重要" rose pill; `low` and `medium` are visually identical.
- The due-date badge is rendered via `dangerouslySetInnerHTML` with a hard-coded HTML string in `lib/badges.ts`. The string is not user input so it is not a security issue, but it is structurally wrong: it bypasses React, cannot be tested as JSX, and locks badge styling into string concatenation.
- The add-child button uses a 12px `GitBranch` glyph in a 24px square, while the checkbox uses an 18px icon — inconsistent scale.
- The title font is system sans across all task text, while the root node uses `Crimson Pro` serif. The two halves of the mindmap do not share a typographic identity.
- Completed state always shows line-through + grey text + the full metadata row, which wastes vertical space in long lists.

The redesign consolidates these into a single editorial-style layout and splits TaskCard into focused subcomponents that can be tested and styled independently.

## Goals

- Editorial / sophisticated visual treatment: serif title (Crimson Pro), hairline rules, restrained color.
- Metadata above the body, separated by a 1px hairline whose color is the node's category color.
- Priority expressed purely through typography (weight + small-caps), no extra badge chrome.
- Status expressed as a colored dot with a 1px ring, plus a small-caps abbreviation (WIP / REVIEW / DONE / INBOX).
- Completed state collapses the metadata row to a single line, so finished tasks take ~40% less vertical space.
- Eliminate `dangerouslySetInnerHTML` from the badge pipeline. `lib/badges.ts` returns plain data; React renders JSX.
- Split TaskCard into `StatusDot`, `DueBadge`, `TaskCheckbox`, plus a pure `priorityClass` helper. Each is testable on its own.

## Non-Goals

- New store actions, selectors, or data model changes. The dispatch surface (`TOGGLE_COMPLETE`, `OPEN_MODAL`) is unchanged.
- A clickable status indicator that cycles status (`DONE → REVIEW → WIP → INBOX`). That is a separate wishlist item and is out of scope here. `StatusDot` is structured so that wrapping it in a `<button>` later is a one-line change.
- Touching `NodeCard` / `KanbanCard` layouts beyond what is required to consume the new TaskCard shape. NodeCard's left border and KanbanCard's breadcrumb bar remain as-is.
- Removing the existing `TaskCard.test.tsx` test IDs (`task-card-*`, `task-check-*`, `add-child-*`, `status-dot-*`). Tests must keep passing without modification.
- Any new dependency. Lucide is dropped for the affected icons but no new icon library is added.

## Design

### 1. Component split

```
TaskCard
├── MetaRow (omitted when isDone)
│   ├── DueBadge
│   ├── StatusLabel       (small-caps abbreviation, always rendered)
│   └── StatusDot         (right-aligned)
├── Hairline              (1px solid, color = category color; dimmed when isDone)
└── BodyRow
    ├── TaskCheckbox
    ├── Title             (Crimson Pro; priorityClass applied)
    └── AddChildButton    (replaces GitBranch with `+`)
```

`TaskCard.test.tsx` continues to find elements by the existing `data-testid` values. The wrapper element stays `data-testid="task-card-${node.id}"` and its first child is the metadata row (or body row when collapsed). The third child remains the hairline in the not-done case so the existing assertion `card.children[2].style.borderTop === "1px solid rgb(244, 63, 94)"` in the rose+done test can be updated in the test to look at the new position (see Test Plan).

### 2. `formatBadges` → pure data

`packages/mintodo/src/lib/badges.ts` no longer returns `dueHtml: string`. It returns:

```ts
export interface DueBadgeInfo {
  kind: "none" | "overdue" | "today" | "future";
  daysFromNow: number; // negative for overdue, 0 for today
}
export interface BadgeInfo {
  due: DueBadgeInfo;
  showPriority: boolean; // true only for high
  statusLabel: "INBOX" | "WIP" | "REVIEW" | "DONE";
}
export function formatBadges(node: MindNode): BadgeInfo;
```

`categoryBorderColor` and `statusDotClass` remain as exports (they are pure mappings used by both TaskCard and NodeCard / KanbanCard).

The `categoryDotClass` export is unused outside the lib and is removed.

### 3. Subcomponent shapes

```tsx
// StatusDot — presentational only
interface StatusDotProps {
  status: TaskStatus;
  dimmed?: boolean; // true in the completed-collapsed state
}

// DueBadge — presentational only
interface DueBadgeProps {
  due: DueBadgeInfo;
}

// TaskCheckbox — interactive; calls onToggle
interface TaskCheckboxProps {
  isDone: boolean;
  onToggle: () => void;
  testId: string;
}

// priorityClass — pure helper
export function priorityClass(priority: Priority): string;
// returns "" | "font-bold tracking-wide uppercase" (high) | "italic" (low) | "" (medium)
```

`TaskCard` composes these and does not export any new symbols beyond what is needed by NodeCard and KanbanCard (which already import only `TaskCard`).

### 4. Visual specification

**Hairline.** 1px tall. Color is `categoryBorderColor(node.categoryColor)` (slate / sky / emerald / rose). When `isDone`, the hairline stays in place but its opacity drops to 0.35 so the card recedes.

**Metadata row.** Height ~18px. From left:
- `DueBadge` if `due.kind !== "none"`. Renders one of three pill styles (overdue red, today amber-pulsing, future slate). Always hides when `isDone` because the row itself is hidden.
- `StatusLabel` as small-caps text (`tracking-widest text-[9px]`), color `var(--mid)`. Always present.
- `StatusDot` 10px circle with 2px outer-paper + 1px outer-mid ring (the `box-shadow: 0 0 0 2px var(--paper), 0 0 0 3px var(--mid)` pattern). Color via `statusDotClass(status)`. Right-aligned via `ml-auto`.

**Body row.** 14px checkbox (square, 1.5px `var(--mid)` border, 3px corner radius, transparent fill; when done, fills with `var(--mid)` and shows a 10px white `✓` glyph). Title: `font-family: "Crimson Pro"`, `font-weight: 500` (medium) or `700` (high) or `400 italic` (low), `text-size: 15px`, `line-height: 1.3`, color `var(--ink)` (or `var(--mid)` when done). AddChildButton: 18px square, 4px radius, background `var(--mid)` at ~10% alpha, glyph `+` 11px 600-weight, color `var(--mid)`.

**Completed state.** Meta row omitted. Body row carries a single 8px green dot on the right (no ring) to signal completion. Title color is `var(--mid)`, `line-through`, `font-weight: 400`. Hairline at 0.35 opacity.

**Dark mode.** All colors are defined as CSS variables on `:root[data-theme="dark"]` via `@mijime/theme`. No `dark:*` Tailwind variants are needed inside TaskCard; using variables keeps the rules theme-agnostic. The lone exception is the DueBadge pulse animation, which keys off the `kind === "today"` value and not a color class, so it is theme-agnostic.

### 5. Interaction specification

| Element | Click | Keyboard |
|---|---|---|
| Checkbox | `dispatch({ id, type: "TOGGLE_COMPLETE" })` | `Enter` / `Space` (native button) |
| AddChild | `dispatch({ modal: { kind: "edit-new", parentId }, type: "OPEN_MODAL" })` | native |
| StatusDot | none (out of scope) | none |

Both buttons call `e.stopPropagation()` to prevent the click from bubbling to NodeCard's `onClick={() => dispatch({ id, type: "SELECT" })}`.

### 6. Data flow

Unchanged from the current implementation. The store exposes `state.nodes` and `dispatch`; TaskCard reads the node and the dispatch, derives `isDone` and badge info, and renders. No new selectors, no new effects, no new context.

## File Changes

| File | Change |
|---|---|
| `packages/mintodo/src/components/TaskCard.tsx` | Rewrite: compose subcomponents, drop `dangerouslySetInnerHTML`, drop `GitBranch` import |
| `packages/mintodo/src/components/StatusDot.tsx` | New |
| `packages/mintodo/src/components/DueBadge.tsx` | New |
| `packages/mintodo/src/components/TaskCheckbox.tsx` | New |
| `packages/mintodo/src/components/priority.ts` | New — exports `priorityClass` |
| `packages/mintodo/src/lib/badges.ts` | Replace `dueHtml` with `DueBadgeInfo`; drop unused `categoryDotClass`; add `statusLabel` mapping |
| `packages/mintodo/src/lib/badges.test.ts` | Update assertions: drop `dueHtml` checks, add `kind`/`statusLabel` checks; drop `categoryDotClass` block |
| `packages/mintodo/src/components/TaskCard.test.tsx` | Adjust the rose+done assertion (see Test Plan) |

`NodeCard.tsx` and `KanbanCard.tsx` are not modified.

## Test Plan

`packages/mintodo/src/components/TaskCard.test.tsx` keeps the existing four tests with minor adjustments:

1. **"renders text, add-child button, and status dot"** — unchanged. The `task-card-n1` testid still wraps the card; the `add-child-n1` and `status-dot-n1` testids remain. The `bg-sky-500` check on the status dot still passes because `statusDotClass("wip")` returns `"bg-sky-500"`.
2. **"opens edit-new modal when add-child is clicked"** — unchanged.
3. **"toggles complete when checkbox is clicked"** — testid `task-check-n1` remains. `TaskCheckbox` is a `<button>` so `fireEvent.click` still dispatches.
4. **"uses categoryColor for bottom border and keeps status dot"** — the rose+done test. The hairline is still in TaskCard but the structure is now: row0 (body row, since done collapses meta), row1 (hairline). The assertion `card.children[2].style.borderTop` becomes `card.children[1].style.borderTop` and the expected color stays `rgb(244, 63, 94)`. The done status assertion switches to the new "collapsed dot" element (8px, `bg-emerald-500`, no ring). `queryByTestId("category-dot-n1")` stays null because no separate category dot exists.

New tests are added in this commit:

- `priority.test.ts`: parametrized over `["low","medium","high"]`; asserts `priorityClass` returns the documented substrings.
- `badges.test.ts`: `formatBadges` returns `due.kind === "today"` for `dueDate === today`; `statusLabel` cycles the four values; `showPriority` is `true` only for `high`.
- `DueBadge.test.tsx`: renders the three pill variants by stubbing `Date` (not strictly required — the existing integration test in `integration.test.tsx` exercises DueBadge through the full flow).
- `StatusDot.test.tsx`: renders each of the four `statusDotClass` colors as a class on the outer span.

`pnpm test` and `pnpm run check` must pass. The integration test file `integration.test.tsx` exercises TaskCard indirectly through NodeCard and KanbanCard; it should keep passing without modification because the externally visible testids and dispatch actions are unchanged.

## Risk and Mitigations

- **Hairline + NodeCard left border double-strokes.** NodeCard already draws a 4px left border. TaskCard's 1px hairline is horizontal and crosses the full card width, so the two do not overlap visually. The hairline becomes the only visible category cue in KANBAN (where NodeCard's left border does not exist), which is desirable: KANBAN gets color from the TaskCard hairline, mindmap keeps the strong left rail from NodeCard.
- **Dark mode regressions.** The redesign uses CSS variables instead of `dark:` Tailwind variants for the parts that change (background, ink, mid). A visual check in both themes is required before merge. The `StatusDot` ring is `2px var(--paper), 3px var(--mid)` so it stays clean in both themes.
- **Long titles.** `whitespace-pre-wrap break-words max-w-[240px]` is preserved on the title span. NodeCard's `min-w-[220px] max-w-[320px]` continues to cap the outer card.
- **Click target size on the add-child button.** It shrinks from 24px to 18px. That is below the 24px recommended touch target, but TaskCard is desktop-first and the add-child action is duplicated by `NodeCard`'s collapse/ellipsis area. Acceptable.

## Out of Scope (Future Work)

- Status indicator click → cycle status (`DONE → REVIEW → WIP → INBOX`). `StatusDot` is a presentational span today; promoting it to a button is a one-line change once the cycling action lands in the store.
- Inline editing of title from TaskCard.
- Animation on completion (fade-in/out, strike-through draw).
