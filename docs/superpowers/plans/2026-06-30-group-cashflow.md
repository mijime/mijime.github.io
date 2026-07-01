# Group-level cashflow views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-group income/expense breakdown to YearRow, a new CashflowTable view, and stacked-bar BarChart.

**Architecture:** Extend YearRow with `groupIncome`/`groupExpense` fields populated by the simulator. Add a 4th view mode (cashflow) with a horizontally-scrollable FP-oriented cashflow table. Modify BarChart to use stacked bars by group with linear scale.

**Tech Stack:** React 19, TypeScript, Vitest, @testing-library/react, hand-rolled SVG

**Spec:** `docs/superpowers/specs/2026-06-30-group-cashflow-design.md`

---

### Task 1: Add group breakdown fields to YearRow type

**Files:**
- Modify: `packages/saiflow/src/types.ts:38-45`

- [ ] **Step 1: Add fields to YearRow**

```typescript
export interface YearRow {
  age: number;
  operations: { eventName: string; op: AssetOp }[];
  balances: Record<AssetName, number>;
  totalIncome: number;
  totalExpense: number;
  totalAssets: number;
  groupIncome: Record<string, number>;
  groupExpense: Record<string, number>;
}
```

- [ ] **Step 2: Run typecheck to confirm no downstream breakage yet**

Run: `npx tsc --noEmit -p packages/saiflow/tsconfig.json`
Expected: Errors in simulator.ts and test files because `groupIncome`/`groupExpense` are missing from returned objects. This is expected — we fix in Task 2.

- [ ] **Step 3: Commit**

```bash
git add packages/saiflow/src/types.ts
git commit -m "feat: add groupIncome and groupExpense to YearRow type"
```

---

### Task 2: Update simulator to track per-group income/expense

**Files:**
- Modify: `packages/saiflow/src/simulator.ts:1-61`
- Modify: `packages/saiflow/src/simulator.test.ts:1-224`

- [ ] **Step 1: Write failing test for group aggregation**

Append to `packages/saiflow/src/simulator.test.ts`:

```typescript
  it("aggregates income and expense per group", () => {
    const cfg: SimulationConfig = {
      currentAge: 39,
      simulationYears: 2,
      scenario: {
        name: "test",
        events: [
          {
            name: "給料",
            group: "給与",
            startYear: 0,
            endYear: 1,
            ops: [{ asset: "現金", op: "+", value: 500 }],
          },
          {
            name: "ボーナス",
            group: "給与",
            startYear: 0,
            endYear: 0,
            ops: [{ asset: "現金", op: "+", value: 100 }],
          },
          {
            name: "家賃",
            group: "住宅",
            startYear: 0,
            endYear: null,
            ops: [{ asset: "現金", op: "-", value: 120 }],
          },
          {
            name: "その他",
            startYear: 0,
            endYear: null,
            ops: [{ asset: "現金", op: "-", value: 50 }],
          },
        ],
      },
    };
    const rows = simulate(cfg);
    // Year 0: income 給与=600, expense 住宅=120, (未分類)=50
    expect(rows[0].groupIncome["給与"]).toBe(600);
    expect(rows[0].groupExpense["住宅"]).toBe(120);
    expect(rows[0].groupExpense["(未分類)"]).toBe(50);
    // Year 1: income 給与=500, expense 住宅=120, (未分類)=50
    expect(rows[1].groupIncome["給与"]).toBe(500);
    expect(rows[1].groupExpense["住宅"]).toBe(120);
    expect(rows[1].groupExpense["(未分類)"]).toBe(50);
  });

  it("handles events without a group under (未分類)", () => {
    const cfg: SimulationConfig = {
      currentAge: 39,
      simulationYears: 1,
      scenario: {
        name: "test",
        events: [
          {
            name: "雑収入",
            startYear: 0,
            endYear: 0,
            ops: [{ asset: "現金", op: "+", value: 100 }],
          },
        ],
      },
    };
    const rows = simulate(cfg);
    expect(rows[0].groupIncome["(未分類)"]).toBe(100);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/saiflow/src/simulator.test.ts -t "aggregates income"`
Expected: FAIL — `groupIncome` is `undefined` or missing.

- [ ] **Step 3: Update simulator to populate groupIncome/groupExpense**

Replace `packages/saiflow/src/simulator.ts`:

```typescript
import type { SimulationConfig, YearRow } from "./types";

export function simulate(config: SimulationConfig): YearRow[] {
  const { currentAge, simulationYears, scenario } = config;
  const balances: Record<string, number> = {};

  const rows: YearRow[] = [];

  for (let year = 0; year < simulationYears; year++) {
    const active = scenario.events.filter(
      (e) => e.startYear <= year && (e.endYear === null || year <= e.endYear),
    );

    let totalIncome = 0;
    let totalExpense = 0;
    const groupIncome: Record<string, number> = {};
    const groupExpense: Record<string, number> = {};
    const operations: YearRow["operations"] = [];

    const gkey = (g?: string) => g ?? "(未分類)";

    for (const e of active) {
      for (const op of e.ops) {
        if (op.op !== "+") continue;
        balances[op.asset] = (balances[op.asset] ?? 0) + op.value;
        operations.push({ eventName: e.name, op });
        totalIncome += op.value;
        const g = gkey(e.group);
        groupIncome[g] = (groupIncome[g] ?? 0) + op.value;
      }
    }

    for (const e of active) {
      for (const op of e.ops) {
        if (op.op !== "-") continue;
        balances[op.asset] = (balances[op.asset] ?? 0) - op.value;
        operations.push({ eventName: e.name, op });
        totalExpense += op.value;
        const g = gkey(e.group);
        groupExpense[g] = (groupExpense[g] ?? 0) + op.value;
      }
    }

    for (const e of active) {
      for (const op of e.ops) {
        if (op.op !== "*") continue;
        const current = balances[op.asset] ?? 0;
        if (current !== 0) {
          const gain = current * (op.value - 1);
          balances[op.asset] = current + gain;
          operations.push({ eventName: e.name, op });
        }
      }
    }

    const totalAssets = Object.values(balances).reduce((a, b) => a + b, 0);

    rows.push({
      age: currentAge + year,
      operations,
      balances: { ...balances },
      totalIncome,
      totalExpense,
      totalAssets,
      groupIncome,
      groupExpense,
    });
  }

  return rows;
}
```

- [ ] **Step 4: Run simulator tests to verify they pass**

Run: `npx vitest run packages/saiflow/src/simulator.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Fix existing tests that create YearRow objects**

Three test files create `YearRow` objects inline and need `groupIncome: {}` / `groupExpense: {}` added.

In `packages/saiflow/src/types.test.ts`, change lines 51-58:

```typescript
    const row: YearRow = {
      age: 40,
      operations: [],
      balances: { 現金: 800 },
      totalIncome: 500,
      totalExpense: 250,
      totalAssets: 800,
      groupIncome: {},
      groupExpense: {},
    };
```

In `packages/saiflow/src/store.test.ts`, change line 41:

```typescript
      { age: 40, operations: [], balances: {}, totalIncome: 0, totalExpense: 0, totalAssets: 0, groupIncome: {}, groupExpense: {} },
```

In `packages/saiflow/src/components/ResultTable.test.tsx`, add `groupIncome: {}, groupExpense: {},` to each of the 4 YearRow objects (lines 20-28, 29-37, 52-61, 74-84).

- [ ] **Step 6: Run all tests to confirm no regressions**

Run: `npx vitest run packages/saiflow/`
Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/saiflow/src/simulator.ts packages/saiflow/src/simulator.test.ts packages/saiflow/src/types.test.ts packages/saiflow/src/store.test.ts packages/saiflow/src/components/ResultTable.test.tsx
git commit -m "feat: track group-level income and expense in simulator"
```

---

### Task 3: Create CashflowTable component

**Files:**
- Create: `packages/saiflow/src/components/CashflowTable.tsx`
- Create: `packages/saiflow/src/components/CashflowTable.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `packages/saiflow/src/components/CashflowTable.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CashflowTable } from "./CashflowTable";
import { SaiflowProvider } from "../store";

describe("CashflowTable", () => {
  it("renders nothing when rows is null", () => {
    const { container } = render(
      <SaiflowProvider>
        <CashflowTable />
      </SaiflowProvider>,
    );
    expect(container.textContent).toBe("");
  });

  it("renders group rows with income and expense sub-rows", () => {
    render(
      <SaiflowProvider
        state={{
          rows: [
            {
              age: 40,
              operations: [],
              balances: { 現金: 800 },
              totalIncome: 500,
              totalExpense: 200,
              totalAssets: 800,
              groupIncome: { "給与": 500 },
              groupExpense: { "生活費": 200 },
            },
          ],
        }}
      >
        <CashflowTable />
      </SaiflowProvider>,
    );
    expect(screen.getByText("給与")).toBeInTheDocument();
    expect(screen.getByText("生活費")).toBeInTheDocument();
    expect(screen.getByText("収入合計")).toBeInTheDocument();
    expect(screen.getByText("支出合計")).toBeInTheDocument();
    expect(screen.getByText("収支")).toBeInTheDocument();
    expect(screen.getByText("資産残高")).toBeInTheDocument();
  });

  it("shows year headers with age", () => {
    render(
      <SaiflowProvider
        state={{
          rows: [
            {
              age: 40,
              operations: [],
              balances: { 現金: 0 },
              totalIncome: 0,
              totalExpense: 0,
              totalAssets: 0,
              groupIncome: {},
              groupExpense: {},
            },
          ],
        }}
      >
        <CashflowTable />
      </SaiflowProvider>,
    );
    expect(screen.getByText("40歳")).toBeInTheDocument();
  });

  it("toggles group collapse on header click", () => {
    render(
      <SaiflowProvider
        state={{
          rows: [
            {
              age: 40,
              operations: [],
              balances: { 現金: 0 },
              totalIncome: 100,
              totalExpense: 0,
              totalAssets: 100,
              groupIncome: { "給与": 100 },
              groupExpense: {},
            },
          ],
        }}
      >
        <CashflowTable />
      </SaiflowProvider>,
    );
    // Initially expanded: ▼ icon visible
    expect(screen.getByText(/▼/)).toBeInTheDocument();
    // Click the group header
    fireEvent.click(screen.getByText(/給与/));
    // Now collapsed: ▶ icon visible
    expect(screen.getByText(/▶/)).toBeInTheDocument();
  });

  it("displays negative net in red", () => {
    render(
      <SaiflowProvider
        state={{
          rows: [
            {
              age: 40,
              operations: [],
              balances: { 現金: -200 },
              totalIncome: 100,
              totalExpense: 300,
              totalAssets: -200,
              groupIncome: { "給与": 100 },
              groupExpense: { "生活費": 300 },
            },
          ],
        }}
      >
        <CashflowTable />
      </SaiflowProvider>,
    );
    // The net cell should have red text class
    const netCell = screen.getByText("-200");
    expect(netCell.className).toContain("text-red-500");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/saiflow/src/components/CashflowTable.test.tsx`
Expected: FAIL — module not found or component not exported.

- [ ] **Step 3: Create CashflowTable component**

Create `packages/saiflow/src/components/CashflowTable.tsx`:

```typescript
import { useState } from "react";
import { useSaiflowState } from "../store";

function fmt(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}

export function CashflowTable() {
  const state = useSaiflowState();
  const { rows } = state;

  if (!rows || rows.length === 0) return null;

  const groupSet = new Set<string>();
  for (const row of rows) {
    for (const g of Object.keys(row.groupIncome)) groupSet.add(g);
    for (const g of Object.keys(row.groupExpense)) groupSet.add(g);
  }
  const groups = [...groupSet].sort();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(groups),
  );

  const toggleGroup = (g: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  const bodyRows: JSX.Element[] = [];

  for (const group of groups) {
    const expanded = expandedGroups.has(group);
    bodyRows.push(
      <tr
        key={`${group}-header`}
        className="cursor-pointer hover:bg-(--hover)"
        onClick={() => toggleGroup(group)}
      >
        <td className="sticky left-0 bg-(--toolbar-bg) px-2 py-0.5 border-b border-(--border) font-bold z-10 whitespace-nowrap">
          {expanded ? "▼" : "▶"} {group}
        </td>
        {rows.map((_, i) => (
          <td
            key={i}
            className="px-2 py-0.5 text-right border-b border-(--border)"
          />
        ))}
      </tr>,
    );
    if (expanded) {
      bodyRows.push(
        <tr key={`${group}-income`}>
          <td className="sticky left-0 px-2 py-0.5 border-b border-(--border) pl-6 z-10 bg-[rgba(72,187,120,0.08)] whitespace-nowrap">
            収入
          </td>
          {rows.map((row, i) => (
            <td
              key={i}
              className="px-2 py-0.5 text-right border-b border-(--border) bg-[rgba(72,187,120,0.08)]"
            >
              {fmt(row.groupIncome[group] ?? 0)}
            </td>
          ))}
        </tr>,
        <tr key={`${group}-expense`}>
          <td className="sticky left-0 px-2 py-0.5 border-b border-(--border) pl-6 z-10 bg-[rgba(252,129,129,0.08)] whitespace-nowrap">
            支出
          </td>
          {rows.map((row, i) => (
            <td
              key={i}
              className="px-2 py-0.5 text-right border-b border-(--border) bg-[rgba(252,129,129,0.08)]"
            >
              {fmt(row.groupExpense[group] ?? 0)}
            </td>
          ))}
        </tr>,
      );
    }
  }

  bodyRows.push(
    <tr key="income-total" className="border-t-2 border-(--border) font-bold">
      <td className="sticky left-0 bg-(--toolbar-bg) px-2 py-0.5 border-b border-(--border) z-10 whitespace-nowrap">
        収入合計
      </td>
      {rows.map((row, i) => (
        <td
          key={i}
          className="px-2 py-0.5 text-right border-b border-(--border)"
        >
          {fmt(row.totalIncome)}
        </td>
      ))}
    </tr>,
    <tr key="expense-total" className="font-bold">
      <td className="sticky left-0 bg-(--toolbar-bg) px-2 py-0.5 border-b border-(--border) z-10 whitespace-nowrap">
        支出合計
      </td>
      {rows.map((row, i) => (
        <td
          key={i}
          className="px-2 py-0.5 text-right border-b border-(--border)"
        >
          {fmt(row.totalExpense)}
        </td>
      ))}
    </tr>,
    <tr key="net" className="font-bold">
      <td className="sticky left-0 bg-(--toolbar-bg) px-2 py-0.5 border-b border-(--border) z-10 whitespace-nowrap">
        収支
      </td>
      {rows.map((row, i) => {
        const net = row.totalIncome - row.totalExpense;
        return (
          <td
            key={i}
            className={`px-2 py-0.5 text-right border-b border-(--border) ${net < 0 ? "text-red-500" : ""}`}
          >
            {fmt(net)}
          </td>
        );
      })}
    </tr>,
    <tr key="assets" className="font-bold">
      <td className="sticky left-0 bg-(--toolbar-bg) px-2 py-0.5 border-b border-(--border) z-10 whitespace-nowrap">
        資産残高
      </td>
      {rows.map((row, i) => (
        <td
          key={i}
          className={`px-2 py-0.5 text-right border-b border-(--border) ${row.totalAssets < 0 ? "text-red-500" : ""}`}
        >
          {fmt(row.totalAssets)}
        </td>
      ))}
    </tr>,
  );

  return (
    <div className="h-full overflow-auto">
      <table className="border-collapse text-sm">
        <thead className="sticky top-0 bg-(--toolbar-bg)">
          <tr>
            <th className="sticky left-0 bg-(--toolbar-bg) px-2 py-1 text-left border-b border-(--border) z-20 whitespace-nowrap">
              グループ
            </th>
            {rows.map((row, i) => (
              <th
                key={i}
                className="px-2 py-1 text-right border-b border-(--border) whitespace-nowrap"
              >
                {row.age}歳
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{bodyRows}</tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/saiflow/src/components/CashflowTable.test.tsx`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/saiflow/src/components/CashflowTable.tsx packages/saiflow/src/components/CashflowTable.test.tsx
git commit -m "feat: add CashflowTable component with per-group income/expense"
```

---

### Task 4: Update BarChart to stacked bars by group

**Files:**
- Modify: `packages/saiflow/src/components/BarChart.tsx`
- Modify: `packages/saiflow/src/components/BarChart.test.tsx`

- [ ] **Step 1: Update BarChart test — remove logTicks tests, add stacked bar tests**

Replace `packages/saiflow/src/components/BarChart.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BarChart } from "./BarChart";
import { SaiflowProvider } from "../store";

describe("BarChart", () => {
  it("renders nothing when rows is null", () => {
    const { container } = render(
      <SaiflowProvider>
        <BarChart />
      </SaiflowProvider>,
    );
    expect(container.textContent).toBe("");
  });

  it("renders legend with group names", () => {
    render(
      <SaiflowProvider
        state={{
          rows: [
            {
              age: 40,
              operations: [],
              balances: { 現金: 800 },
              totalIncome: 500,
              totalExpense: 200,
              totalAssets: 800,
              groupIncome: { "給与": 500 },
              groupExpense: { "生活費": 200 },
            },
          ],
        }}
      >
        <BarChart />
      </SaiflowProvider>,
    );
    expect(screen.getByText("給与")).toBeInTheDocument();
    expect(screen.getByText("生活費")).toBeInTheDocument();
  });

  it("renders SVG with rect elements for bar segments", () => {
    const { container } = render(
      <SaiflowProvider
        state={{
          rows: [
            {
              age: 40,
              operations: [],
              balances: { 現金: 800 },
              totalIncome: 500,
              totalExpense: 200,
              totalAssets: 800,
              groupIncome: { "給与": 300, "副業": 200 },
              groupExpense: { "生活費": 150, "光熱費": 50 },
            },
          ],
        }}
      >
        <BarChart />
      </SaiflowProvider>,
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    // Should have rects for bar segments (at least 4: 2 income + 2 expense)
    const rects = svg!.querySelectorAll("rect:not([fill='transparent'])");
    expect(rects.length).toBeGreaterThanOrEqual(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/saiflow/src/components/BarChart.test.tsx`
Expected: FAIL — `logTicks` export removed, or tests reference old behavior.

- [ ] **Step 3: Rewrite BarChart with stacked bars by group and linear scale**

Replace `packages/saiflow/src/components/BarChart.tsx`:

```typescript
import React from "react";
import { useSaiflowState } from "../store";
import { ChartTooltip } from "./ChartTooltip";

const GROUP_COLORS = [
  "rgba(99, 179, 237, 0.7)",
  "rgba(252, 129, 129, 0.7)",
  "rgba(72, 187, 120, 0.7)",
  "rgba(246, 173, 85, 0.7)",
  "rgba(159, 122, 234, 0.7)",
  "rgba(237, 100, 166, 0.7)",
  "rgba(128, 128, 128, 0.7)",
  "rgba(72, 199, 142, 0.7)",
  "rgba(249, 115, 22, 0.7)",
  "rgba(34, 211, 238, 0.7)",
];

const GROUP_STROKE_COLORS = [
  "rgba(99, 179, 237, 1)",
  "rgba(252, 129, 129, 1)",
  "rgba(72, 187, 120, 1)",
  "rgba(246, 173, 85, 1)",
  "rgba(159, 122, 234, 1)",
  "rgba(237, 100, 166, 1)",
  "rgba(128, 128, 128, 1)",
  "rgba(72, 199, 142, 1)",
  "rgba(249, 115, 22, 1)",
  "rgba(34, 211, 238, 1)",
];

export function BarChart() {
  const state = useSaiflowState();
  const { rows } = state;
  if (!rows || rows.length === 0) return null;

  const [hover, setHover] = React.useState<{
    i: number;
    mx: number;
    my: number;
  } | null>(null);

  // Collect all groups
  const groupSet = new Set<string>();
  for (const row of rows) {
    for (const g of Object.keys(row.groupIncome)) groupSet.add(g);
    for (const g of Object.keys(row.groupExpense)) groupSet.add(g);
  }
  const groups = [...groupSet].sort();

  const padding = { top: 24, right: 24, bottom: 40, left: 56 };
  const width = Math.max(
    600,
    rows.length * 14 + padding.left + padding.right,
  );
  const height = 340;
  const midY = height / 2;
  const plotH = (height - padding.top - padding.bottom) / 2;

  const maxVal =
    Math.max(
      Math.max(...rows.map((r) => r.totalIncome), 0),
      Math.max(...rows.map((r) => r.totalExpense), 0),
    ) * 1.05 || 1;

  const step = (width - padding.left - padding.right) / rows.length;
  const barW = Math.max(2, step * 0.65);
  const x = (i: number) => padding.left + i * step + step / 2;
  const scale = (v: number) => (v / maxVal) * plotH;

  // Linear ticks
  const tickCount = 5;
  const tickStep = maxVal / tickCount;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) =>
    Math.round(tickStep * i),
  ).filter((v) => v <= maxVal);

  const netPoints = rows
    .map((r, i) => {
      const net = r.totalIncome - r.totalExpense;
      const netScale = (v: number) => Math.max(-plotH, Math.min(plotH, (v / maxVal) * plotH));
      return `${x(i)},${midY - netScale(net)}`;
    })
    .join(" ");

  const xTickInterval = Math.max(1, Math.floor(rows.length / 10));

  return (
    <div className="h-full overflow-auto relative">
      <svg
        width={width}
        height={height}
        className="font-sans text-xs"
      >
        {/* 0 line */}
        <line
          x1={padding.left}
          y1={midY}
          x2={width - padding.right}
          y2={midY}
          stroke="rgba(128,128,128,0.3)"
        />

        {/* Y axis ticks */}
        {yTicks.map((v) => (
          <g key={`t${v}`}>
            <line
              x1={padding.left}
              y1={midY - scale(v)}
              x2={width - padding.right}
              y2={midY - scale(v)}
              stroke="rgba(128,128,128,0.08)"
            />
            <line
              x1={padding.left}
              y1={midY + scale(v)}
              x2={width - padding.right}
              y2={midY + scale(v)}
              stroke="rgba(128,128,128,0.08)"
            />
            <text
              x={padding.left - 6}
              y={midY - scale(v) + 4}
              textAnchor="end"
              fill="var(--ink)"
              opacity={0.5}
            >
              {v}
            </text>
            <text
              x={padding.left - 6}
              y={midY + scale(v) + 4}
              textAnchor="end"
              fill="var(--ink)"
              opacity={0.5}
            >
              {v}
            </text>
          </g>
        ))}

        {/* Stacked income bars */}
        {rows.map((r, i) => {
          let incomeOffset = 0;
          let expenseOffset = 0;
          const segments: JSX.Element[] = [];

          for (let gi = 0; gi < groups.length; gi++) {
            const g = groups[gi];
            const iv = r.groupIncome[g] ?? 0;
            if (iv > 0) {
              segments.push(
                <rect
                  key={`ib-${i}-${g}`}
                  x={x(i) - barW / 2}
                  y={midY - scale(incomeOffset + iv)}
                  width={barW}
                  height={scale(iv)}
                  fill={GROUP_COLORS[gi % GROUP_COLORS.length]}
                  stroke={GROUP_STROKE_COLORS[gi % GROUP_STROKE_COLORS.length]}
                  strokeWidth={0.5}
                />,
              );
              incomeOffset += iv;
            }
          }

          for (let gi = 0; gi < groups.length; gi++) {
            const g = groups[gi];
            const ev = r.groupExpense[g] ?? 0;
            if (ev > 0) {
              segments.push(
                <rect
                  key={`eb-${i}-${g}`}
                  x={x(i) - barW / 2}
                  y={midY + scale(expenseOffset)}
                  width={barW}
                  height={scale(ev)}
                  fill={GROUP_COLORS[gi % GROUP_COLORS.length]}
                  stroke={GROUP_STROKE_COLORS[gi % GROUP_STROKE_COLORS.length]}
                  strokeWidth={0.5}
                />,
              );
              expenseOffset += ev;
            }
          }

          return <g key={`bar-${i}`}>{segments}</g>;
        })}

        {/* Net trend line */}
        <polyline
          points={netPoints}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={1.5}
          strokeDasharray="4,3"
        />

        {/* Net data dots */}
        {rows.map((r, i) => {
          const net = r.totalIncome - r.totalExpense;
          const netScale = (v: number) => Math.max(-plotH, Math.min(plotH, (v / maxVal) * plotH));
          return (
            <circle
              key={`netdot-${i}`}
              cx={x(i)}
              cy={midY - netScale(net)}
              r={2.5}
              fill="#3b82f6"
            />
          );
        })}

        {/* Hover bands */}
        {rows.map((_, i) => (
          <rect
            key={`hb${i}`}
            x={x(i) - step / 2}
            y={padding.top}
            width={step}
            height={height - padding.top - padding.bottom}
            fill="transparent"
            onMouseEnter={(e) =>
              setHover({ i, mx: e.clientX, my: e.clientY })
            }
            onMouseMove={(e) =>
              setHover((h) =>
                h ? { ...h, mx: e.clientX, my: e.clientY } : null,
              )
            }
            onMouseLeave={() => setHover(null)}
          />
        ))}

        {/* X axis labels */}
        {rows.map((r, i) => {
          if (i % xTickInterval !== 0 && i !== rows.length - 1) return null;
          return (
            <text
              key={i}
              x={x(i)}
              y={height - padding.bottom + 16}
              textAnchor="middle"
              fill="var(--ink)"
              opacity={0.5}
            >
              {r.age}
            </text>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${padding.left}, 6)`}>
          {groups.map((g, gi) => {
            const lx = gi * 90;
            return (
              <g key={g} transform={`translate(${lx}, 0)`}>
                <rect
                  x={0}
                  y={-10}
                  width={14}
                  height={10}
                  fill={GROUP_COLORS[gi % GROUP_COLORS.length]}
                  stroke={GROUP_STROKE_COLORS[gi % GROUP_STROKE_COLORS.length]}
                  strokeWidth={0.5}
                />
                <text x={18} y={0} fill="var(--ink)" opacity={0.7} fontSize={11}>
                  {g}
                </text>
              </g>
            );
          })}
          {/* Net legend */}
          <g transform={`translate(${groups.length * 90}, 0)`}>
            <line
              x1={0}
              y1={-5}
              x2={14}
              y2={-5}
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeDasharray="3,2"
            />
            <text x={18} y={0} fill="var(--ink)" opacity={0.7} fontSize={11}>
              収支
            </text>
          </g>
        </g>
      </svg>
      <ChartTooltip
        data={
          hover
            ? {
                x: hover.mx,
                y: hover.my,
                lines: [
                  {
                    label: "年齢",
                    value: String(rows[hover.i].age),
                  },
                  ...groups
                    .map((g, gi) => [
                      {
                        label: `${g} 収入`,
                        value: (
                          rows[hover.i].groupIncome[g] ?? 0
                        ).toLocaleString(),
                        color: GROUP_STROKE_COLORS[gi % GROUP_STROKE_COLORS.length],
                      },
                      {
                        label: `${g} 支出`,
                        value: (
                          rows[hover.i].groupExpense[g] ?? 0
                        ).toLocaleString(),
                        color: GROUP_STROKE_COLORS[gi % GROUP_STROKE_COLORS.length],
                      },
                    ])
                    .flat(),
                  {
                    label: "収支",
                    value: (
                      rows[hover.i].totalIncome -
                      rows[hover.i].totalExpense
                    ).toLocaleString(),
                  },
                ],
              }
            : null
        }
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/saiflow/src/components/BarChart.test.tsx`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/saiflow/src/components/BarChart.tsx packages/saiflow/src/components/BarChart.test.tsx
git commit -m "feat: update BarChart to stacked bars by group with linear scale"
```

---

### Task 5: Add cashflow view mode to App.tsx

**Files:**
- Modify: `packages/saiflow/src/App.tsx`

- [ ] **Step 1: Update App.tsx to add cashflow view**

Make the following changes to `packages/saiflow/src/App.tsx`:

Add import (line 6):
```typescript
import { CashflowTable } from "./components/CashflowTable";
```

Change ViewMode type (line 11):
```typescript
type ViewMode = "table" | "cashflow" | "line" | "bar";
```

Update tab buttons (lines 19-27):
```typescript
{(["table", "cashflow", "line", "bar"] as ViewMode[]).map((v) => (
  <button
    key={v}
    className={`px-2 py-0.5 text-xs rounded ${view === v ? "bg-(--terra) text-white" : "text-(--ink) opacity-50"}`}
    onClick={() => setView(v)}
  >
    {v === "table" ? "収支表" : v === "cashflow" ? "CF表" : v === "line" ? "資産推移" : "収支比較"}
  </button>
))}
```

Update view rendering (line 30):
```typescript
{view === "table" ? <ResultTable /> : view === "cashflow" ? <CashflowTable /> : view === "line" ? <LineChart /> : <BarChart />}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit -p packages/saiflow/tsconfig.json`
Expected: No errors.

- [ ] **Step 3: Run all tests**

Run: `npx vitest run packages/saiflow/`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/saiflow/src/App.tsx
git commit -m "feat: add cashflow view mode with CashflowTable component"
```

---

### Post-implementation verification

- [ ] Run full test suite: `npx vitest run packages/saiflow/`
- [ ] Run typecheck: `npx tsc --noEmit -p packages/saiflow/tsconfig.json`
- [ ] Manually verify in browser: open `/saiflow/`, click "CF表" tab, verify group rows render with expandable income/expense sub-rows
- [ ] Verify 収支比較 tab shows stacked bars by group with linear scale
