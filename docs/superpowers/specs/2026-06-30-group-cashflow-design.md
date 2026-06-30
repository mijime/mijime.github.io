# Group-level cashflow views

## Purpose

Enable per-group income/expense breakdown in saiflow, targeted at presenting to a financial planner (FP).

## Approach

Approach B: Add a new cashflow table view + enhance BarChart with stacked bars by group. Existing views (収支表, 資産推移) remain unchanged.

---

## Data layer

### YearRow extension (`types.ts`)

```typescript
export interface YearRow {
  age: number;
  operations: { eventName: string; op: AssetOp }[];
  balances: Record<AssetName, number>;
  totalIncome: number;
  totalExpense: number;
  totalAssets: number;
  groupIncome: Record<string, number>;   // NEW
  groupExpense: Record<string, number>;  // NEW
}
```

### Simulator change (`simulator.ts`)

The simulator aggregates per-group income/expense alongside the existing global totals. Events with `group === undefined` are collected under the key `"(未分類)"`.

No other changes to simulation logic. Existing tests should continue to pass (update expected values to include empty per-group records, or make the assertion tolerant).

---

## Views

### New: CashflowTable (`components/CashflowTable.tsx`)

A horizontally-scrollable table showing per-group income/expense by year — structured like a household cashflow statement.

**Layout:**
- Leftmost column (group names) is sticky; year columns scroll horizontally.
- Rows are ordered by group name alphabetically, with `(未分類)` at the end.
- Each group has two sub-rows: 収入 (green-tinted background) and 支出 (red-tinted background).
- Sub-rows that are always 0 across all years are hidden.
- Groups are collapsible (▶/▼ toggle).
- Bottom summary rows: 収入合計, 支出合計, 収支, 資産残高.

**Styling:**
- Group header row: bold, slight background tint.
- 収入 sub-row: `rgba(72, 187, 120, 0.08)` background.
- 支出 sub-row: `rgba(252, 129, 129, 0.08)` background.
- Negative 収支 values: red text.
- Summary rows: top border, bold.

**State:**
- `expandedGroups: Set<string>` — which group rows are expanded (default: all expanded).

**Hover tooltip:** Same `ChartTooltip` pattern as other views, showing 年齢, グループ名, 収入/支出/収支 for that year.

### Changed: BarChart (`components/BarChart.tsx`)

Change from simple income/expense bars to stacked bars by group.

**Changes:**
- Income side: stacked bars colored by group (one segment per group with income).
- Expense side: stacked bars colored by group (one segment per group with expense).
- Net trend line (dashed blue) is preserved.
- Scale: switch from logarithmic to **linear**. Log scale doesn't work well with stacked bars.
- Hover tooltip shows per-group breakdown for that year.
- Legend: group names with color swatches.

**Group color palette:** Use a stable palette (e.g., the 6 colors from LineChart + extend).

### Existing views (no changes)

- **ResultTable (収支表):** Kept as-is — simple aggregate income/expense/balance table.
- **LineChart (資産推移):** Kept as-is — asset balance trend lines.

---

## App changes (`App.tsx`)

### View mode

Extend `ViewMode` from 3 to 4:

```typescript
type ViewMode = "table" | "cashflow" | "line" | "bar";
```

Tab buttons: `収支表 | キャッシュフロー | 資産推移 | 収支比較`

---

## Testing

- **Simulator test:** Verify `groupIncome` and `groupExpense` are correctly aggregated per group. Test grouped, ungrouped, and mixed scenarios.
- **CashflowTable test:** Render with mock `YearRow[]`, verify group rows, sub-rows, summary rows, toggle collapse.
- **BarChart test:** Verify stacked segments render, legend shows groups, linear scale.
