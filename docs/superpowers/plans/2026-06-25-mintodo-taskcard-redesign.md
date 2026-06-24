# mintodo TaskCard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the TaskCard visual treatment to an editorial / sophisticated style, eliminate `dangerouslySetInnerHTML` from the badge pipeline, and split the component into focused subcomponents (`StatusDot`, `DueBadge`, `TaskCheckbox`, `priorityClass`).

**Architecture:** Pure data layer first (`formatBadges` returns a `DueBadgeInfo` and a `statusLabel`, no HTML strings), then a pure helper (`priorityClass`), then three presentational subcomponents that consume that data, then a TaskCard rewrite that composes them. Every task follows TDD: failing test → minimal implementation → green test → commit. No new dependencies, no store changes, no changes to `NodeCard.tsx` or `KanbanCard.tsx`.

**Tech Stack:** React 19, TypeScript 6, Tailwind v4, vitest + @testing-library/react, oxfmt/oxlint, pnpm.

## Global Constraints

- All `pnpm` commands run with `workdir: /Users/kojima.takashi/src/github.com/mijime/mijime.github.io/packages/mintodo` unless noted.
- Git commands run with `git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io ...` from the monorepo root.
- Test command: `pnpm test` (vitest run; expect all existing tests passing).
- Typecheck + lint: `pnpm run check`.
- Format: pre-commit hook (lefthook) runs `pnpm run format`. Do not run manually.
- Commit messages: `type(mintodo): ...` Conventional Commits with the `mintodo` scope. No body unless required.
- Branch: `feat/mintodo-taskcard-redesign`.
- No changes to `apps/main`, `@mijime/theme`, `NodeCard.tsx`, or `KanbanCard.tsx`. No new dependencies.
- All existing TaskCard test IDs (`task-card-*`, `task-check-*`, `add-child-*`, `status-dot-*`) are preserved. Tests must pass without renaming them.
- Theme colors come from CSS variables (`var(--paper)`, `var(--ink)`, `var(--mid)`, `var(--terra)`); no `dark:` Tailwind variants inside TaskCard or its subcomponents.
- `categoryBorderColor` and `statusDotClass` exports in `lib/badges.ts` are preserved; `categoryDotClass` is removed.
- Status indicator cycling click (`DONE → REVIEW → WIP → INBOX`) is OUT OF SCOPE. `StatusDot` is a presentational `<span>`, not a `<button>`.
- Each task ends with: full `pnpm test` green, `pnpm run check` clean, one commit.

---

## File Structure

Files created or modified across this plan:

| File | Responsibility |
|---|---|
| `packages/mintodo/src/components/priority.ts` (new) | Pure `priorityClass` helper |
| `packages/mintodo/src/components/priority.test.ts` (new) | Tests for `priorityClass` |
| `packages/mintodo/src/lib/badges.ts` (modify) | `formatBadges` returns pure data; add `statusLabel`; drop `categoryDotClass` |
| `packages/mintodo/src/lib/badges.test.ts` (modify) | Tests for new `formatBadges` shape and `statusLabel` |
| `packages/mintodo/src/components/StatusDot.tsx` (new) | Colored dot with paper/mid ring |
| `packages/mintodo/src/components/StatusDot.test.tsx` (new) | Tests for `StatusDot` |
| `packages/mintodo/src/components/DueBadge.tsx` (new) | Renders overdue / today / future / none pill |
| `packages/mintodo/src/components/DueBadge.test.tsx` (new) | Tests for `DueBadge` |
| `packages/mintodo/src/components/TaskCheckbox.tsx` (new) | 14px square checkbox button |
| `packages/mintodo/src/components/TaskCheckbox.test.tsx` (new) | Tests for `TaskCheckbox` |
| `packages/mintodo/src/components/TaskCard.tsx` (modify) | Rewrite using the new subcomponents |
| `packages/mintodo/src/components/TaskCard.test.tsx` (modify) | Update the rose+done child-index assertion |

No other files change. `NodeCard.tsx` and `KanbanCard.tsx` continue to import `TaskCard` from the same path.

---

## Task 1: `priorityClass` helper

**Files:**
- Create: `packages/mintodo/src/components/priority.ts`
- Create: `packages/mintodo/src/components/priority.test.ts`

**Interfaces:**
- Consumes: `Priority` type from `../types`
- Produces: `export function priorityClass(priority: Priority): string` — `""` for medium, `"font-bold tracking-wide uppercase"` for high, `"italic"` for low. Returns Tailwind class fragments; consumers concatenate.

- [ ] **Step 1: Create the failing test**

Create `packages/mintodo/src/components/priority.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { priorityClass } from "./priority";

describe("priorityClass", () => {
  it("returns empty string for medium", () => {
    expect(priorityClass("medium")).toBe("");
  });

  it("returns bold + uppercase classes for high", () => {
    const out = priorityClass("high");
    expect(out).toContain("font-bold");
    expect(out).toContain("uppercase");
  });

  it("returns italic for low", () => {
    expect(priorityClass("low")).toBe("italic");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm test -- priority.test
```

Expected: FAIL — `Cannot find module './priority'` (or similar "module not found" error).

- [ ] **Step 3: Implement the helper**

Create `packages/mintodo/src/components/priority.ts`:

```ts
import type { Priority } from "../types";

export function priorityClass(priority: Priority): string {
  switch (priority) {
    case "high": {
      return "font-bold tracking-wide uppercase";
    }
    case "low": {
      return "italic";
    }
    default: {
      return "";
    }
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm test -- priority.test
```

Expected: PASS — 3 tests pass.

- [ ] **Step 5: Run full test + check**

```bash
pnpm test
pnpm run check
```

Expected: all tests pass, 0 type errors, 0 lint errors.

- [ ] **Step 6: Commit**

```bash
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io add packages/mintodo/src/components/priority.ts packages/mintodo/src/components/priority.test.ts
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io commit -m "feat(mintodo): add priorityClass helper"
```

---

## Task 2: Refactor `formatBadges` to pure data

**Files:**
- Modify: `packages/mintodo/src/lib/badges.ts` (replace `BadgeInfo`, add `DueBadgeInfo`, replace `formatBadges` body, drop `categoryDotClass`)
- Modify: `packages/mintodo/src/lib/badges.test.ts` (rewrite `formatBadges` describe; delete `categoryDotClass` describe; add `statusLabel` cases)

**Interfaces:**
- Consumes: `MindNode` from `../types`
- Produces:
  ```ts
  export type DueKind = "none" | "overdue" | "today" | "future";
  export interface DueBadgeInfo { kind: DueKind; daysFromNow: number }
  export interface BadgeInfo {
    due: DueBadgeInfo;
    showPriority: boolean;
    statusLabel: "INBOX" | "WIP" | "REVIEW" | "DONE";
  }
  export function formatBadges(node: MindNode): BadgeInfo;
  ```
- `categoryBorderColor` and `statusDotClass` exports are unchanged.
- `categoryDotClass` export is removed.

- [ ] **Step 1: Rewrite `badges.test.ts` to the new contract (it will fail to import)**

Replace the entire content of `packages/mintodo/src/lib/badges.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { formatBadges, categoryBorderColor, statusDotClass } from "./badges";
import type { MindNode } from "../types";

function makeNode(opts: Partial<MindNode> = {}): MindNode {
  return {
    id: "n",
    boardId: "b",
    text: "t",
    parentId: null,
    isRoot: false,
    completed: opts.completed ?? false,
    collapsed: false,
    priority: opts.priority ?? "medium",
    categoryColor: "slate",
    dueDate: opts.dueDate ?? "",
    status: opts.status ?? "inbox",
    children: [],
    x: 0,
    y: 0,
    ...opts,
  };
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("formatBadges", () => {
  it("empty dueDate -> kind none, showPriority false, statusLabel INBOX", () => {
    const r = formatBadges(makeNode());
    expect(r.due.kind).toBe("none");
    expect(r.due.daysFromNow).toBe(0);
    expect(r.showPriority).toBe(false);
    expect(r.statusLabel).toBe("INBOX");
  });

  it("past dueDate -> kind overdue, negative daysFromNow", () => {
    const r = formatBadges(makeNode({ dueDate: "2000-01-01" }));
    expect(r.due.kind).toBe("overdue");
    expect(r.due.daysFromNow).toBeLessThan(0);
  });

  it("due today -> kind today, daysFromNow 0", () => {
    const r = formatBadges(makeNode({ dueDate: todayString() }));
    expect(r.due.kind).toBe("today");
    expect(r.due.daysFromNow).toBe(0);
  });

  it("future dueDate -> kind future, positive daysFromNow", () => {
    const r = formatBadges(makeNode({ dueDate: "2099-12-31" }));
    expect(r.due.kind).toBe("future");
    expect(r.due.daysFromNow).toBeGreaterThan(0);
  });

  it("done status suppresses due to kind none", () => {
    const r = formatBadges(makeNode({ dueDate: "2000-01-01", status: "done", completed: true }));
    expect(r.due.kind).toBe("none");
  });

  it("done status but not completed also suppresses due", () => {
    const r = formatBadges(makeNode({ dueDate: "2000-01-01", status: "done", completed: false }));
    expect(r.due.kind).toBe("none");
  });

  it("showPriority is true only for high", () => {
    expect(formatBadges(makeNode({ priority: "low" })).showPriority).toBe(false);
    expect(formatBadges(makeNode({ priority: "medium" })).showPriority).toBe(false);
    expect(formatBadges(makeNode({ priority: "high" })).showPriority).toBe(true);
  });

  it("statusLabel maps each TaskStatus", () => {
    expect(formatBadges(makeNode({ status: "inbox" })).statusLabel).toBe("INBOX");
    expect(formatBadges(makeNode({ status: "wip" })).statusLabel).toBe("WIP");
    expect(formatBadges(makeNode({ status: "review" })).statusLabel).toBe("REVIEW");
    expect(formatBadges(makeNode({ status: "done" })).statusLabel).toBe("DONE");
  });
});

describe("categoryBorderColor", () => {
  it("maps colors to hex/var values", () => {
    expect(categoryBorderColor("sky")).toBe("#0ea5e9");
    expect(categoryBorderColor("emerald")).toBe("#10b981");
    expect(categoryBorderColor("rose")).toBe("#f43f5e");
    expect(categoryBorderColor("slate")).toBe("var(--mid)");
  });
});

describe("statusDotClass", () => {
  it("returns the right class per status", () => {
    expect(statusDotClass("inbox")).toBe("bg-slate-400");
    expect(statusDotClass("wip")).toBe("bg-sky-500");
    expect(statusDotClass("review")).toBe("bg-amber-500");
    expect(statusDotClass("done")).toBe("bg-emerald-500");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm test -- badges.test
```

Expected: FAIL — `TypeError: r.dueHtml is undefined` (or similar; the new `r.due` shape does not exist yet, and `categoryDotClass` import will fail).

- [ ] **Step 3: Rewrite `badges.ts`**

Replace the entire content of `packages/mintodo/src/lib/badges.ts` with:

```ts
import type { MindNode, TaskStatus } from "../types";

export type DueKind = "none" | "overdue" | "today" | "future";

export interface DueBadgeInfo {
  kind: DueKind;
  daysFromNow: number;
}

export interface BadgeInfo {
  due: DueBadgeInfo;
  showPriority: boolean;
  statusLabel: "INBOX" | "WIP" | "REVIEW" | "DONE";
}

const STATUS_LABEL: Record<TaskStatus, BadgeInfo["statusLabel"]> = {
  inbox: "INBOX",
  wip: "WIP",
  review: "REVIEW",
  done: "DONE",
};

function dueBadgeInfo(dueDate: string, isCompleted: boolean): DueBadgeInfo {
  if (!dueDate || isCompleted) {
    return { kind: "none", daysFromNow: 0 };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = due.getTime() - today.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) {
    return { kind: "overdue", daysFromNow: days };
  }
  if (days === 0) {
    return { kind: "today", daysFromNow: 0 };
  }
  return { kind: "future", daysFromNow: days };
}

export function formatBadges(node: MindNode): BadgeInfo {
  const isDone = node.status === "done" || node.completed;
  return {
    due: dueBadgeInfo(node.dueDate, isDone),
    showPriority: node.priority === "high",
    statusLabel: STATUS_LABEL[node.status],
  };
}

export function categoryBorderColor(c: MindNode["categoryColor"]): string {
  switch (c) {
    case "sky": {
      return "#0ea5e9";
    }
    case "emerald": {
      return "#10b981";
    }
    case "rose": {
      return "#f43f5e";
    }
    default: {
      return "var(--mid)";
    }
  }
}

export function statusDotClass(s: TaskStatus): string {
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

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm test -- badges.test
```

Expected: PASS — all 11 tests in `badges.test.ts` pass.

- [ ] **Step 5: Run full test + check (expect TaskCard failures)**

```bash
pnpm test
pnpm run check
```

Expected: `pnpm test` reports failures in `TaskCard.test.tsx` and `integration.test.tsx` (TaskCard still imports the old `dueHtml`/`showHigh`/`showBadgeRow` shape). `pnpm run check` reports type errors in `TaskCard.tsx` and any consumer. **These failures are expected.** They will be fixed in Task 6. Do NOT fix them here. Confirm only that:
- `badges.test.ts` passes.
- The failures are limited to `TaskCard` consumers (not other components).

- [ ] **Step 6: Commit**

```bash
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io add packages/mintodo/src/lib/badges.ts packages/mintodo/src/lib/badges.test.ts
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io commit -m "refactor(mintodo): formatBadges returns pure data, drop categoryDotClass"
```

---

## Task 3: `StatusDot` component

**Files:**
- Create: `packages/mintodo/src/components/StatusDot.tsx`
- Create: `packages/mintodo/src/components/StatusDot.test.tsx`

**Interfaces:**
- Consumes: `statusDotClass` from `../lib/badges`
- Produces: `<StatusDot status={TaskStatus} dimmed?={boolean} testId?={string} />` — a `<span>` with the correct color, a 2px paper / 1px mid ring via `box-shadow`, and `data-testid="status-dot-…"` if `testId` is provided.

- [ ] **Step 1: Create the failing test**

Create `packages/mintodo/src/components/StatusDot.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusDot } from "./StatusDot";

describe("StatusDot", () => {
  it("renders wip with bg-sky-500", () => {
    render(<StatusDot status="wip" testId="dot" />);
    const el = screen.getByTestId("dot");
    expect(el.className).toContain("bg-sky-500");
    expect(el.className).toContain("rounded-full");
  });

  it("renders review with bg-amber-500", () => {
    render(<StatusDot status="review" testId="dot" />);
    expect(screen.getByTestId("dot").className).toContain("bg-amber-500");
  });

  it("renders done with bg-emerald-500", () => {
    render(<StatusDot status="done" testId="dot" />);
    expect(screen.getByTestId("dot").className).toContain("bg-emerald-500");
  });

  it("renders inbox with bg-slate-400", () => {
    render(<StatusDot status="inbox" testId="dot" />);
    expect(screen.getByTestId("dot").className).toContain("bg-slate-400");
  });

  it("uses box-shadow ring", () => {
    const { container } = render(<StatusDot status="wip" />);
    const el = container.querySelector("span") as HTMLElement;
    expect(el.style.boxShadow).toContain("var(--paper)");
    expect(el.style.boxShadow).toContain("var(--mid)");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm test -- StatusDot.test
```

Expected: FAIL — `Cannot find module './StatusDot'`.

- [ ] **Step 3: Implement `StatusDot`**

Create `packages/mintodo/src/components/StatusDot.tsx`:

```tsx
import { statusDotClass } from "../lib/badges";
import type { TaskStatus } from "../types";

interface Props {
  status: TaskStatus;
  dimmed?: boolean;
  testId?: string;
}

export function StatusDot({ status, dimmed = false, testId }: Props) {
  return (
    <span
      data-testid={testId}
      className={`inline-block w-2.5 h-2.5 rounded-full ${statusDotClass(status)} ${dimmed ? "opacity-40" : ""}`}
      style={{
        boxShadow: "0 0 0 2px var(--paper), 0 0 0 3px var(--mid)",
      }}
      aria-label={`status: ${status}`}
      title={`status: ${status}`}
    />
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm test -- StatusDot.test
```

Expected: PASS — 5 tests pass.

- [ ] **Step 5: Run full test + check**

```bash
pnpm test
pnpm run check
```

Expected: same TaskCard-related failures as Task 2 Step 5 (the new component is not yet wired in). No new failures.

- [ ] **Step 6: Commit**

```bash
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io add packages/mintodo/src/components/StatusDot.tsx packages/mintodo/src/components/StatusDot.test.tsx
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io commit -m "feat(mintodo): add StatusDot component"
```

---

## Task 4: `DueBadge` component

**Files:**
- Create: `packages/mintodo/src/components/DueBadge.tsx`
- Create: `packages/mintodo/src/components/DueBadge.test.tsx`

**Interfaces:**
- Consumes: `DueBadgeInfo` from `../lib/badges`
- Produces: `<DueBadge due={DueBadgeInfo} />` — renders nothing when `due.kind === "none"`. Otherwise renders a pill with the documented text and color class:
  - `overdue` → `⚠ 超過` (rose, `bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400`)
  - `today` → `🔔 今日` (amber, plus `animate-pulse`)
  - `future` → `あと N 日` (slate)

- [ ] **Step 1: Create the failing test**

Create `packages/mintodo/src/components/DueBadge.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DueBadge } from "./DueBadge";
import type { DueBadgeInfo } from "../lib/badges";

describe("DueBadge", () => {
  it("renders nothing for kind none", () => {
    const { container } = render(<DueBadge due={{ kind: "none", daysFromNow: 0 }} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders 超過 for overdue", () => {
    const { container } = render(<DueBadge due={{ kind: "overdue", daysFromNow: -3 }} />);
    expect(container.textContent).toContain("超過");
  });

  it("renders 今日 for today with pulse animation class", () => {
    const { container } = render(<DueBadge due={{ kind: "today", daysFromNow: 0 }} />);
    expect(container.textContent).toContain("今日");
    expect(container.firstChild as HTMLElement).toHaveClass("animate-pulse");
  });

  it("renders あと N 日 for future", () => {
    const { container } = render(<DueBadge due={{ kind: "future", daysFromNow: 5 }} />);
    expect(container.textContent).toBe("あと 5 日");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm test -- DueBadge.test
```

Expected: FAIL — `Cannot find module './DueBadge'`.

- [ ] **Step 3: Implement `DueBadge`**

Create `packages/mintodo/src/components/DueBadge.tsx`:

```tsx
import type { DueBadgeInfo } from "../lib/badges";

interface Props {
  due: DueBadgeInfo;
}

export function DueBadge({ due }: Props) {
  if (due.kind === "none") return null;
  if (due.kind === "overdue") {
    return (
      <span className="bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 shrink-0 border border-rose-200 dark:border-rose-900/30">
        <span>⚠</span>
        超過
      </span>
    );
  }
  if (due.kind === "today") {
    return (
      <span className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 shrink-0 border border-amber-200 dark:border-amber-900/30 animate-pulse">
        <span>🔔</span>
        今日
      </span>
    );
  }
  return (
    <span className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0">
      あと {due.daysFromNow} 日
    </span>
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm test -- DueBadge.test
```

Expected: PASS — 4 tests pass.

- [ ] **Step 5: Run full test + check**

```bash
pnpm test
pnpm run check
```

Expected: same TaskCard-related failures as before. No new failures from DueBadge.

- [ ] **Step 6: Commit**

```bash
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io add packages/mintodo/src/components/DueBadge.tsx packages/mintodo/src/components/DueBadge.test.tsx
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io commit -m "feat(mintodo): add DueBadge component"
```

---

## Task 5: `TaskCheckbox` component

**Files:**
- Create: `packages/mintodo/src/components/TaskCheckbox.tsx`
- Create: `packages/mintodo/src/components/TaskCheckbox.test.tsx`

**Interfaces:**
- Produces: `<TaskCheckbox isDone={boolean} onToggle={() => void} testId={string} />` — a `<button type="button">` 14px square, 3px radius. When `!isDone`: 1.5px `var(--mid)` border, transparent fill. When `isDone`: filled with the status color (passed as `doneClass` default `bg-emerald-500`), white `✓` glyph 10px.

Update the prop set per the implementation below if a simpler shape is preferred; the prop list is part of the spec.

- [ ] **Step 1: Create the failing test**

Create `packages/mintodo/src/components/TaskCheckbox.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskCheckbox } from "./TaskCheckbox";

describe("TaskCheckbox", () => {
  it("renders an empty square when not done", () => {
    render(<TaskCheckbox isDone={false} onToggle={() => {}} testId="cb" />);
    const btn = screen.getByTestId("cb");
    expect(btn.className).toContain("border-[1.5px]");
    expect(btn.textContent).toBe("");
  });

  it("renders a check mark and filled background when done", () => {
    render(<TaskCheckbox isDone={true} onToggle={() => {}} testId="cb" />);
    const btn = screen.getByTestId("cb");
    expect(btn.textContent).toBe("✓");
    expect(btn.className).toContain("bg-emerald-500");
  });

  it("calls onToggle when clicked and stops propagation", () => {
    const onToggle = vi.fn();
    const stop = vi.fn();
    render(
      <div onClick={stop}>
        <TaskCheckbox isDone={false} onToggle={onToggle} testId="cb" />
      </div>,
    );
    fireEvent.click(screen.getByTestId("cb"));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(stop).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm test -- TaskCheckbox.test
```

Expected: FAIL — `Cannot find module './TaskCheckbox'`.

- [ ] **Step 3: Implement `TaskCheckbox`**

Create `packages/mintodo/src/components/TaskCheckbox.tsx`:

```tsx
interface Props {
  isDone: boolean;
  onToggle: () => void;
  testId: string;
}

export function TaskCheckbox({ isDone, onToggle, testId }: Props) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={isDone}
      aria-label={isDone ? "Mark as not done" : "Mark as done"}
      className={
        isDone
          ? "w-3.5 h-3.5 rounded-[3px] bg-emerald-500 flex items-center justify-center text-white text-[10px] leading-none shrink-0"
          : "w-3.5 h-3.5 rounded-[3px] border-[1.5px] shrink-0"
      }
      style={isDone ? undefined : { borderColor: "var(--mid)" }}
    >
      {isDone ? "✓" : ""}
    </button>
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm test -- TaskCheckbox.test
```

Expected: PASS — 3 tests pass.

- [ ] **Step 5: Run full test + check**

```bash
pnpm test
pnpm run check
```

Expected: same TaskCard-related failures. No new failures.

- [ ] **Step 6: Commit**

```bash
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io add packages/mintodo/src/components/TaskCheckbox.tsx packages/mintodo/src/components/TaskCheckbox.test.tsx
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io commit -m "feat(mintodo): add TaskCheckbox component"
```

---

## Task 6: Rewrite `TaskCard` and update its test

**Files:**
- Modify: `packages/mintodo/src/components/TaskCard.tsx` (full rewrite)
- Modify: `packages/mintodo/src/components/TaskCard.test.tsx` (update the rose+done assertion: `card.children[2]` → `card.children[1]`; switch the status-dot check on the done case to the collapsed-dot element)

**Interfaces (rewired TaskCard):**
- Same public prop: `{ node: MindNode }`.
- Composes `StatusDot`, `DueBadge`, `TaskCheckbox`, and the `priorityClass` helper.
- DOM order in not-done case: `[MetaRow, Hairline, BodyRow]` (children indices 0, 1, 2).
- DOM order in done case: `[BodyRow, Hairline]` (children indices 0, 1).
- The hairline is the LAST visible element in both cases (so the rose+done test can assert `children[1].style.borderTop`).
- The hairline color is `categoryBorderColor(node.categoryColor)`; opacity is 0.35 when `isDone`, otherwise 1.
- Test IDs preserved: `task-card-${id}` on the wrapper, `task-check-${id}` inside `TaskCheckbox`, `add-child-${id}` on the add-child button, `status-dot-${id}` on the `StatusDot`. The collapsed-done 8px dot has no testid (the test only checks it is present and is emerald via className, per the updated assertion below).

- [ ] **Step 1: Update `TaskCard.test.tsx` (it will fail against the new TaskCard)**

Replace the entire content of `packages/mintodo/src/components/TaskCard.test.tsx` with:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
    selectedNodeId: "",
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

  it("uses categoryColor for the hairline and renders the collapsed done dot", () => {
    const { container } = render(
      <MindProvider initialState={makeState()}>
        <TaskCard node={makeNode({ categoryColor: "rose", status: "done", completed: true })} />
      </MindProvider>,
    );
    const card = screen.getByTestId("task-card-n1");
    // done: DOM is [BodyRow, Hairline]; hairline is at index 1
    const hairline = card.children[1] as HTMLElement;
    expect(hairline.style.borderTop).toBe("1px solid rgb(244, 63, 94)");
    expect(hairline.style.opacity).toBe("0.35");
    // collapsed done: an 8px emerald dot inside BodyRow
    const bodyRow = card.children[0] as HTMLElement;
    const dot = bodyRow.querySelector("span.rounded-full.bg-emerald-500") as HTMLElement | null;
    expect(dot).not.toBeNull();
    // Meta row (and its StatusDot) is absent
    expect(screen.queryByTestId("status-dot-n1")).toBeNull();
    // The body uses Crimson Pro for the title
    const title = container.querySelector("span.whitespace-pre-wrap") as HTMLElement;
    expect(title.style.fontFamily).toContain("Crimson Pro");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm test -- TaskCard.test
```

Expected: FAIL — multiple assertions, including `card.children[1]` mismatch and `status-dot-n1` not present.

- [ ] **Step 3: Rewrite `TaskCard.tsx`**

Replace the entire content of `packages/mintodo/src/components/TaskCard.tsx` with:

```tsx
import { useMindStore } from "../hooks/use-mind-store";
import { categoryBorderColor, formatBadges } from "../lib/badges";
import { DueBadge } from "./DueBadge";
import { StatusDot } from "./StatusDot";
import { TaskCheckbox } from "./TaskCheckbox";
import { priorityClass } from "./priority";
import type { MindNode } from "../types";

interface Props {
  node: MindNode;
}

export function TaskCard({ node }: Props) {
  const { dispatch } = useMindStore();
  const isDone = node.status === "done" || node.completed;
  const { due, statusLabel } = formatBadges(node);
  const hairlineColor = categoryBorderColor(node.categoryColor);

  const metaRow = !isDone ? (
    <div className="flex items-center gap-1.5 min-w-0" style={{ minHeight: "18px" }}>
      <DueBadge due={due} />
      <span className="text-[9px] tracking-widest" style={{ color: "var(--mid)" }}>
        {statusLabel}
      </span>
      <span className="ml-auto">
        <StatusDot status={node.status} testId={`status-dot-${node.id}`} />
      </span>
    </div>
  ) : null;

  const bodyRow = (
    <div className="flex items-start gap-2 min-w-0">
      {isDone ? null : (
        <TaskCheckbox
          isDone={isDone}
          onToggle={() => dispatch({ id: node.id, type: "TOGGLE_COMPLETE" })}
          testId={`task-check-${node.id}`}
        />
      )}
      <span
        className={`whitespace-pre-wrap break-words max-w-[240px] flex-1 text-[15px] leading-[1.3] ${
          isDone ? "line-through" : ""
        } ${priorityClass(node.priority)}`}
        style={{
          fontFamily: '"Crimson Pro", serif',
          fontWeight: isDone ? 400 : undefined,
          color: isDone ? "var(--mid)" : "var(--ink)",
        }}
      >
        {node.text}
      </span>
      {isDone ? (
        <span
          className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-[5px]"
          aria-label="completed"
          title="completed"
        />
      ) : (
        <button
          type="button"
          data-testid={`add-child-${node.id}`}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ modal: { kind: "edit-new", parentId: node.id }, type: "OPEN_MODAL" });
          }}
          className="w-[18px] h-[18px] rounded text-[11px] font-semibold flex items-center justify-center shrink-0"
          style={{
            background: "color-mix(in srgb, var(--mid) 12%, transparent)",
            color: "var(--mid)",
          }}
          title="子タスクを追加"
        >
          +
        </button>
      )}
    </div>
  );

  return (
    <div
      data-testid={`task-card-${node.id}`}
      data-node-id={node.id}
      className="flex flex-col gap-1.5 min-w-0"
    >
      {isDone ? null : metaRow}
      {bodyRow}
      <div
        className="w-full"
        style={{
          borderTop: `1px solid ${hairlineColor}`,
          opacity: isDone ? 0.35 : 1,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm test -- TaskCard.test
```

Expected: PASS — 4 tests pass.

- [ ] **Step 5: Run full test + check**

```bash
pnpm test
pnpm run check
```

Expected: all tests pass, 0 type errors, 0 lint errors.

- [ ] **Step 6: Commit**

```bash
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io add packages/mintodo/src/components/TaskCard.tsx packages/mintodo/src/components/TaskCard.test.tsx
git -C /Users/kojima.takashi/src/github.com/mijime/mijime.github.io commit -m "refactor(mintodo): rewrite TaskCard with subcomponents and editorial layout"
```

---

## Self-Review (run after writing the plan)

**Spec coverage:**

| Spec section | Task |
|---|---|
| Component split (StatusDot / DueBadge / TaskCheckbox / priority) | Tasks 1, 3, 4, 5, 6 |
| `formatBadges` → pure data, drop `categoryDotClass`, add `statusLabel` | Task 2 |
| Subcomponent shapes | Tasks 3, 4, 5 |
| Visual spec (hairline color, meta row, body row, completed state, dark mode) | Task 6 |
| Interaction spec (checkbox / add-child / status-dot non-interactive) | Task 6 |
| Data flow (no new selectors, no new state) | Tasks 2, 6 |
| File changes table | Tasks 1-6 |
| Existing test IDs preserved | Task 6 |
| `lib/badges.test.ts` updated | Task 2 |
| `TaskCard.test.tsx` rose+done assertion updated | Task 6 |
| New tests (priority, badges updated, DueBadge, StatusDot) | Tasks 1, 2, 3, 4 |
| Risks acknowledged | (Plan-level; the implementation matches the mitigations.) |

**Placeholder scan:** No `TBD`, `TODO`, "implement later", "fill in details", "add appropriate error handling", or "similar to Task N". Every code block is complete and runnable.

**Type consistency:** `DueBadgeInfo.kind` and `DueKind` are defined in Task 2 and used in Tasks 4 and 6. `formatBadges` return shape `{ due, showPriority, statusLabel }` is defined in Task 2 and consumed in Task 6. `priorityClass` signature `(Priority) => string` defined in Task 1 and used in Task 6. `StatusDot` props `(status, dimmed?, testId?)` defined in Task 3 and used in Task 6. `TaskCheckbox` props `(isDone, onToggle, testId)` defined in Task 5 and used in Task 6. All match.
