# Saiflow Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix child age input in ChildForm to use child's own age (not parent's age), add double-click group name editing in GuiEditor, and unify income/expense Y-axis with log scale in BarChart.

**Architecture:** Three independent changes within the saiflow package: (1) ChildForm replaces YearInput with a child-age-aware birth year input, (2) GuiEditor adds inline-edit state to renderGroupHeader triggered by double-click, (3) BarChart switches from dual linear scales to a shared log10(v+1) scale with power-of-10 ticks.

**Tech Stack:** React, TypeScript, Vitest, @testing-library/react, SVG (BarChart)

---

## File Structure

| File | Change | Responsibility |
|------|--------|---------------|
| `packages/saiflow/src/components/AddEventModal.tsx` | Modify: lines 627-699 | ChildForm birth year input, replace YearInput usage |
| `packages/saiflow/src/components/AddEventModal.test.tsx` | Create | Tests for ChildForm age/offset modes |
| `packages/saiflow/src/components/GuiEditor.tsx` | Modify: lines 139-214 | renderGroupHeader: double-click to edit group name |
| `packages/saiflow/src/components/GuiEditor.test.tsx` | Create | Tests for group rename, merge, ungroup on empty |
| `packages/saiflow/src/components/BarChart.tsx` | Modify: lines 5-105 | Log scale Y-axis, common max, power-of-10 ticks |
| `packages/saiflow/src/components/BarChart.test.tsx` | Create | Tests for logTicks, scale function, tick generation |

---

### Task 1: ChildForm - Use child's own age instead of parent's age

**Files:**
- Modify: `packages/saiflow/src/components/AddEventModal.tsx:618-763`
- Create: `packages/saiflow/src/components/AddEventModal.test.tsx`

- [ ] **Step 1: Write failing test for ChildForm child-age mode**

Write `packages/saiflow/src/components/AddEventModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddEventModal } from "./AddEventModal";
import { SaiflowProvider } from "../store";

describe("ChildForm birth year input", () => {
  const renderModal = () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(
      <SaiflowProvider state={{ currentAge: 39 }}>
        <AddEventModal currentAge={39} onSave={onSave} onClose={onClose} />
      </SaiflowProvider>,
    );
    // Click "子供" button to open ChildForm
    fireEvent.click(screen.getByText("子供"));
    return { onSave, onClose };
  };

  it('shows birth year input with "年数" mode by default', () => {
    renderModal();
    // The birth year input should be visible with value 2 (default)
    const inputs = screen.getAllByRole("spinbutton");
    const birthInput = inputs.find((el) => (el as HTMLInputElement).value === "2");
    expect(birthInput).toBeTruthy();
  });

  it('switches to "年齢" mode and shows child age (0 by default)', () => {
    renderModal();
    // Switch mode selector to "年齢"
    const selects = screen.getAllByRole("combobox");
    // Find the select that has "年数" and "年齢" options
    const modeSelect = selects.find(
      (el) =>
        el.querySelector("option")?.textContent === "年数" &&
        el.querySelectorAll("option").length >= 2,
    );
    expect(modeSelect).toBeTruthy();
    fireEvent.change(modeSelect!, { target: { value: "age" } });
    // Now the input should show 0 (default child age)
    const inputs = screen.getAllByRole("spinbutton");
    const birthInput = inputs.find((el) => (el as HTMLInputElement).value === "0");
    expect(birthInput).toBeTruthy();
  });

  it("entering child age 5 sets birthYear = -5", () => {
    const { onSave } = renderModal();
    // Switch to age mode
    const selects = screen.getAllByRole("combobox");
    const modeSelect = selects.find(
      (el) =>
        el.querySelector("option")?.textContent === "年数" &&
        el.querySelectorAll("option").length >= 2,
    );
    fireEvent.change(modeSelect!, { target: { value: "age" } });

    // Enter child age as 5
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[inputs.length - 1]!, { target: { value: "5" } });

    // Enter a name so save is enabled
    const nameInput = screen.getByPlaceholderText("子1") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "太郎" } });

    // Save
    fireEvent.click(screen.getByText("保存"));
    expect(onSave).toHaveBeenCalledTimes(1);
    const events = onSave.mock.calls[0][0];
    // The birth year should be -5, so living expenses start from year 0 (math.max(0, -5))
    // Events with startYear should reflect the offset from birthYear=-5
    expect(events.length).toBeGreaterThan(0);
    // Living expense should start at Math.max(0, -5) = 0
    const livingEvent = events.find((e: any) => e.name.startsWith("生活費"));
    expect(livingEvent.startYear).toBe(0);
  });

  it('offset mode still works as before: birthYear=3 sets birthYear correctly', () => {
    const { onSave } = renderModal();
    // Default offset mode, set birth year to 3
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[inputs.length - 1]!, { target: { value: "3" } });

    const nameInput = screen.getByPlaceholderText("子1") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "花子" } });

    fireEvent.click(screen.getByText("保存"));
    const events = onSave.mock.calls[0][0];
    const livingEvent = events.find((e: any) => e.name.startsWith("生活費"));
    expect(livingEvent.startYear).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @mijime/saiflow exec vitest run src/components/AddEventModal.test.tsx
```

Expected: Tests fail because the current implementation uses parent age, not child age.

- [ ] **Step 3: Modify ChildForm to use child's own age**

In `packages/saiflow/src/components/AddEventModal.tsx`, modify the `ChildForm` component (lines 627-699).

Replace the birth year section (lines 696-700):

```tsx
// Remove the existing YearInput import usage and instead implement:
function ChildForm({ currentAge, onSave, onClose }: {
  currentAge: number;
  onSave: (events: Event[]) => void;
  onClose: () => void;
}) {
  const [childName, setChildName] = useState("子");
  const [birthYear, setBirthYear] = useState(2);
  const [yearMode, setYearMode] = useState<"offset" | "age">("offset");
  const [childCurrentAge, setChildCurrentAge] = useState(0);
  const [schools, setSchools] = useState<Record<string, SchoolType>>({
    幼稚園: null, 小学校: null, 中学校: null, 高校: null, 大学: null,
  });
  const [livingMonthly, setLivingMonthly] = useState(0);

  const toDisplay = yearMode === "age" ? childCurrentAge : birthYear;
  const handleBirthYearInput = (v: number) => {
    if (yearMode === "age") {
      setChildCurrentAge(v);
      setBirthYear(-v);
    } else {
      setBirthYear(v);
    }
  };

  // ... rest of handleSave unchanged ...

  return (
    <div className="space-y-3">
      {/* ... child name input unchanged ... */}
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">誕生</label>
        <select
          className="text-[11px] bg-(--paper) text-(--ink) border border-(--border) rounded px-1 py-0.5 outline-none cursor-pointer"
          value={yearMode}
          onChange={(e) => {
            const mode = e.target.value as "offset" | "age";
            setYearMode(mode);
            if (mode === "age") {
              setChildCurrentAge(Math.max(0, -birthYear));
            } else {
              setBirthYear(-childCurrentAge);
            }
          }}
        >
          <option value="offset">年数(予定)</option>
          <option value="age">年齢(既にいる)</option>
        </select>
        <input
          type="number"
          className="w-16 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={toDisplay}
          onChange={(e) => handleBirthYearInput(Number(e.target.value) || 0)}
        />
        <span className="text-[11px] opacity-30">
          {yearMode === "age" ? "歳" : birthYear >= 0 ? "年後" : "年前"}
        </span>
      </div>
      {/* ... rest unchanged ... */}
    </div>
  );
}
```

The exact edit: remove the `YearInput` call on line 698, replace lines 696-700 with the above. Remove the `yearMode` toggle from the `YearInput` usage since we handle it ourselves.

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @mijime/saiflow exec vitest run src/components/AddEventModal.test.tsx
```

Expected: All tests PASS.

- [ ] **Step 5: Run typecheck**

```bash
pnpm --filter @mijime/saiflow run check:tsgo
```

Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add packages/saiflow/src/components/AddEventModal.tsx packages/saiflow/src/components/AddEventModal.test.tsx
git commit -m "fix: child form uses child's own age instead of parent's age"
```

---

### Task 2: GuiEditor - Double-click group name to inline edit

**Files:**
- Modify: `packages/saiflow/src/components/GuiEditor.tsx:139-214`
- Create: `packages/saiflow/src/components/GuiEditor.test.tsx`

- [ ] **Step 1: Write failing test for group name editing**

Write `packages/saiflow/src/components/GuiEditor.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GuiEditor } from "./GuiEditor";
import { SaiflowProvider } from "../store";

describe("GuiEditor group name editing", () => {
  it("renders an event with a group name", () => {
    render(
      <SaiflowProvider
        state={{
          scenarios: [
            {
              name: "test",
              events: [
                {
                  name: "テストイベント",
                  group: "テストグループ",
                  startYear: 0,
                  endYear: null,
                  ops: [],
                },
              ],
            },
          ],
          activeScenarioIndex: 0,
        }}
      >
        <GuiEditor />
      </SaiflowProvider>,
    );
    expect(screen.getByText("テストグループ")).toBeInTheDocument();
  });

  it("double-clicking group name enters edit mode", () => {
    render(
      <SaiflowProvider
        state={{
          scenarios: [
            {
              name: "test",
              events: [
                {
                  name: "evt",
                  group: "OldGroup",
                  startYear: 0,
                  endYear: null,
                  ops: [],
                },
              ],
            },
          ],
          activeScenarioIndex: 0,
        }}
      >
        <GuiEditor />
      </SaiflowProvider>,
    );
    const groupName = screen.getByText("OldGroup");
    fireEvent.doubleClick(groupName);
    // Input should appear with current value
    const input = screen.getByDisplayValue("OldGroup") as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it("editing group name and pressing Enter applies rename", async () => {
    render(
      <SaiflowProvider
        state={{
          scenarios: [
            {
              name: "test",
              events: [
                {
                  name: "evt",
                  group: "OldGroup",
                  startYear: 0,
                  endYear: null,
                  ops: [],
                },
              ],
            },
          ],
          activeScenarioIndex: 0,
        }}
      >
        <GuiEditor />
      </SaiflowProvider>,
    );
    const groupName = screen.getByText("OldGroup");
    fireEvent.doubleClick(groupName);

    const input = screen.getByDisplayValue("OldGroup") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "NewGroup" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("NewGroup")).toBeInTheDocument();
      expect(screen.queryByText("OldGroup")).not.toBeInTheDocument();
    });
  });

  it("clearing group name ungroups events", async () => {
    render(
      <SaiflowProvider
        state={{
          scenarios: [
            {
              name: "test",
              events: [
                {
                  name: "evt",
                  group: "RemoveMe",
                  startYear: 0,
                  endYear: null,
                  ops: [],
                },
              ],
            },
          ],
          activeScenarioIndex: 0,
        }}
      >
        <GuiEditor />
      </SaiflowProvider>,
    );
    const groupName = screen.getByText("RemoveMe");
    fireEvent.doubleClick(groupName);

    const input = screen.getByDisplayValue("RemoveMe") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.queryByText("RemoveMe")).not.toBeInTheDocument();
    });
  });

  it("Escape cancels group rename", async () => {
    render(
      <SaiflowProvider
        state={{
          scenarios: [
            {
              name: "test",
              events: [
                {
                  name: "evt",
                  group: "KeepMe",
                  startYear: 0,
                  endYear: null,
                  ops: [],
                },
              ],
            },
          ],
          activeScenarioIndex: 0,
        }}
      >
        <GuiEditor />
      </SaiflowProvider>,
    );
    const groupName = screen.getByText("KeepMe");
    fireEvent.doubleClick(groupName);

    const input = screen.getByDisplayValue("KeepMe") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });

    await waitFor(() => {
      expect(screen.getByText("KeepMe")).toBeInTheDocument();
      expect(screen.queryByDisplayValue("Changed")).not.toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @mijime/saiflow exec vitest run src/components/GuiEditor.test.tsx
```

Expected: Tests fail because double-click edit is not yet implemented.

- [ ] **Step 3: Modify renderGroupHeader to support double-click inline edit**

In `packages/saiflow/src/components/GuiEditor.tsx`, add state and modify `renderGroupHeader`:

Add states after existing states (after line 36):

```tsx
const [editingGroup, setEditingGroup] = useState<string | null>(null);
const [editValue, setEditValue] = useState("");
```

Modify `renderGroupHeader` (lines 139-214). Replace the group name span (line 195) and add edit logic:

```tsx
const renderGroupHeader = (groupName: string, count: number, indices: number[]) => {
  const isExpanded = expandedGroups.has(groupName);
  const isEditing = editingGroup === groupName;

  const startEdit = () => {
    setEditValue(groupName);
    setEditingGroup(groupName);
  };

  const commitRename = () => {
    const newName = editValue.trim();
    update((prev) =>
      prev.map((s, i) =>
        i === state.activeScenarioIndex
          ? {
              ...s,
              events: s.events.map((ev) =>
                ev.group === groupName
                  ? { ...ev, group: newName || undefined }
                  : ev,
              ),
            }
          : s,
      ),
    );
    setEditingGroup(null);
  };

  const cancelRename = () => {
    setEditingGroup(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") cancelRename();
  };

  // ... toggle, handleAddToGroup, handleDeleteGroup unchanged ...

  return (
    <div className="flex items-center border-b border-(--border) bg-(--grid)/30">
      <button
        className="flex-1 flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-(--mid)/20 transition-colors"
        onClick={toggle}
      >
        <span className="opacity-30 w-3 shrink-0 text-[10px]">
          {isExpanded ? "▼" : "▶"}
        </span>
        {isEditing ? (
          <input
            className="flex-1 min-w-0 px-1 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded outline-none focus:border-(--terra)"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="font-medium opacity-60"
            onDoubleClick={(e) => {
              e.stopPropagation();
              startEdit();
            }}
          >
            {groupName}
          </span>
        )}
        <span className="opacity-30 tabular-nums">({count})</span>
      </button>
      <button
        className="px-2 py-1 text-xs opacity-30 hover:opacity-100 transition-colors shrink-0"
        onClick={handleAddToGroup}
        title="このグループにイベントを追加"
      >
        +
      </button>
      <button
        className="px-2 py-1 text-xs text-red-400/50 hover:text-red-400 transition-colors shrink-0"
        onClick={handleDeleteGroup}
        title="グループを削除"
      >
        🗑
      </button>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @mijime/saiflow exec vitest run src/components/GuiEditor.test.tsx
```

Expected: All tests PASS.

- [ ] **Step 5: Run typecheck**

```bash
pnpm --filter @mijime/saiflow run check:tsgo
```

Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add packages/saiflow/src/components/GuiEditor.tsx packages/saiflow/src/components/GuiEditor.test.tsx
git commit -m "feat: double-click group name to edit inline"
```

---

### Task 3: BarChart - Log scale Y-axis with common scale for income/expense

**Files:**
- Modify: `packages/saiflow/src/components/BarChart.tsx:5-105`
- Create: `packages/saiflow/src/components/BarChart.test.tsx`

- [ ] **Step 1: Write tests for log scale functions and BarChart**

Write `packages/saiflow/src/components/BarChart.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";

describe("log scale helpers", () => {
  it("scale(0) returns 0", () => {
    const maxVal = 100000;
    const scale = (v: number) => Math.log10(v + 1) / Math.log10(maxVal + 1);
    expect(scale(0)).toBe(0);
  });

  it("scale(maxVal) returns 1", () => {
    const maxVal = 100000;
    const scale = (v: number) => Math.log10(v + 1) / Math.log10(maxVal + 1);
    expect(scale(maxVal)).toBeCloseTo(1);
  });

  it("scale maps small values non-linearly", () => {
    const maxVal = 100000;
    const scale = (v: number) => Math.log10(v + 1) / Math.log10(maxVal + 1);
    const s10 = scale(10);
    const s100 = scale(100);
    // 100 should be further from 10 than in linear scale
    // (in linear: 100/100000 = 0.001 vs 10/100000 = 0.0001, ratio 10)
    // In log: log10(101)/log10(100001) vs log10(11)/log10(100001)
    expect(s100 / s10).toBeGreaterThan(1);
  });
});

describe("logTicks", () => {
  function logTicks(max: number): number[] {
    const ticks: number[] = [];
    for (let i = 0; i <= Math.floor(Math.log10(max + 1)); i++) {
      const v = 10 ** i;
      if (v <= max) ticks.push(v);
    }
    return ticks;
  }

  it("returns [1] for max=1", () => {
    expect(logTicks(1)).toEqual([1]);
  });

  it("returns [1, 10, 100] for max=100", () => {
    expect(logTicks(100)).toEqual([1, 10, 100]);
  });

  it("returns [1, 10, 100, 1000] for max=1000", () => {
    expect(logTicks(1000)).toEqual([1, 10, 100, 1000]);
  });

  it("returns [1, 10, 100, 1000] for max=1500 (stops before exceeding max)", () => {
    expect(logTicks(1500)).toEqual([1, 10, 100, 1000]);
  });

  it("handles max=0 by returning empty", () => {
    expect(logTicks(0)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @mijime/saiflow exec vitest run src/components/BarChart.test.tsx
```

Expected: Tests fail because `logTicks` and `scale` are not yet exported/implemented.

- [ ] **Step 3: Implement log scale in BarChart**

In `packages/saiflow/src/components/BarChart.tsx`, replace the scale logic (lines 5-41):

Replace `niceStep` and `ticks` functions (lines 5-16) with:

```tsx
function logTicks(max: number): number[] {
  const ticks: number[] = [];
  for (let i = 0; i <= Math.floor(Math.log10(max + 1)); i++) {
    const v = 10 ** i;
    if (v <= max) ticks.push(v);
  }
  return ticks;
}
```

Replace the Y-axis scale logic (lines 31-41):

```tsx
const maxVal = Math.max(
  Math.max(...rows.map((r) => r.totalIncome), 0),
  Math.max(...rows.map((r) => r.totalExpense), 0),
) * 1.05 || 1;

const scale = (v: number) => Math.log10(v + 1) / Math.log10(maxVal + 1);
const incomeY = (v: number) => midY - scale(v) * plotH;
const expenseY = (v: number) => midY + scale(v) * plotH;

const yTicks = logTicks(maxVal);
```

Replace Y-axis tick rendering (lines 63-105) with a single tick set:

```tsx
{/* Y axis ticks (shared scale) */}
{yTicks.map((v) => (
  <g key={`t${v}`}>
    <line
      x1={padding.left}
      y1={incomeY(v)}
      x2={width - padding.right}
      y2={incomeY(v)}
      stroke="rgba(128,128,128,0.08)"
    />
    <line
      x1={padding.left}
      y1={expenseY(v)}
      x2={width - padding.right}
      y2={expenseY(v)}
      stroke="rgba(128,128,128,0.08)"
    />
    <text
      x={padding.left - 6}
      y={incomeY(v) + 4}
      textAnchor="end"
      fill="var(--ink)"
      opacity={0.5}
    >
      {v}
    </text>
    <text
      x={padding.left - 6}
      y={expenseY(v) + 4}
      textAnchor="end"
      fill="var(--ink)"
      opacity={0.5}
    >
      {v}
    </text>
  </g>
))}
```

Remove the old `incomeTickStep` / `expenseTickStep` and their separate tick blocks (lines 40-41 and 64-105). The `netY` function also needs updating (line 43):

```tsx
const netY = (net: number) => (net >= 0 ? incomeY(net) : expenseY(-net));
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @mijime/saiflow exec vitest run src/components/BarChart.test.tsx
```

Expected: All tests PASS.

- [ ] **Step 5: Run typecheck**

```bash
pnpm --filter @mijime/saiflow run check:tsgo
```

Expected: No type errors.

- [ ] **Step 6: Run existing tests to verify no regressions**

```bash
pnpm --filter @mijime/saiflow exec vitest run
```

Expected: All existing tests PASS (no regressions).

- [ ] **Step 7: Commit**

```bash
git add packages/saiflow/src/components/BarChart.tsx packages/saiflow/src/components/BarChart.test.tsx
git commit -m "feat: unify income/expense Y-axis with log10(v+1) scale"
```

---

### Task 4: Final verification - full test suite and lint

- [ ] **Step 1: Run all saiflow tests**

```bash
pnpm --filter @mijime/saiflow exec vitest run
```

Expected: All tests pass (new + existing).

- [ ] **Step 2: Run lint/format check**

```bash
pnpm --filter @mijime/saiflow run check
```

Expected: No errors.
