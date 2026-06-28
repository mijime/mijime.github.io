# Event Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional `group` field to `Event` type, auto-assign group names from preset patterns, group events in the GUI editor with collapsible headers, and support group-level deletion.

**Architecture:** Extend `Event` type with `group?: string`. Update parser/dslgen for a leading group column in DSL. Pattern forms in `AddEventModal` auto-assign group names. `GuiEditor` partitions events by group and renders collapsible group headers. `EventForm` gains a group name edit field.

**Tech Stack:** TypeScript, React, Vitest

---

### Task 1: Add `group` field to Event type

**Files:**
- Modify: `packages/saiflow/src/types.ts`

- [ ] **Step 1: Add `group?: string` to Event interface**

```typescript
export interface Event {
  name: string;
  group?: string;
  startYear: number;
  endYear: number | null;
  ops: AssetOp[];
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit -p packages/saiflow/tsconfig.json`
Expected: No new errors related to the Event type.

- [ ] **Step 3: Commit**

```bash
git add packages/saiflow/src/types.ts
git commit -m "feat: add optional group field to Event type"
```

---

### Task 2: Update DSL parser for group column

**Files:**
- Modify: `packages/saiflow/src/parser.ts`

New DSL format: `group,eventName,startYear,endYear,ops...`
Old DSL format (backward compat): `eventName,startYear,endYear,ops...`

Detection: If `parts[1]` is numeric, it's old format (parts[0] is event name). Otherwise new format (parts[0] is group).

- [ ] **Step 1: Update parser to handle group column**

In `parseDSL`, replace the event parsing block (lines 26-57) with:

```typescript
    const lineNum = i + 1;
    const parts = line.split(",");
    if (parts.length < 4) {
      errors.push({
        line: lineNum,
        message: `"イベント名,開始年,終了年,操作..." 形式である必要があります`,
      });
      continue;
    }

    const isOldFormat = !isNaN(Number(parts[1].trim()));
    let group: string | undefined;
    let name: string;
    let startYear: number;
    let endYear: number | null;
    let opsStart: number;

    if (isOldFormat) {
      group = undefined;
      name = parts[0].trim();
      startYear = Number(parts[1].trim());
      endYearStr = parts[2].trim();
      endYear = endYearStr.length === 0 ? null : Number(endYearStr);
      opsStart = 3;
    } else {
      const groupStr = parts[0].trim();
      group = groupStr.length > 0 ? groupStr : undefined;
      name = parts[1].trim();
      startYear = Number(parts[2].trim());
      endYearStr = parts[3].trim();
      endYear = endYearStr.length === 0 ? null : Number(endYearStr);
      opsStart = 4;
    }

    if (isNaN(startYear) || (endYear !== null && isNaN(endYear))) {
      errors.push({ line: lineNum, message: "年は数値である必要があります" });
      continue;
    }

    const ops: AssetOp[] = [];
    for (let j = opsStart; j < parts.length; j++) {
      const opStr = parts[j].trim();
      const parsed = parseOp(opStr);
      if (!parsed) {
        errors.push({ line: lineNum, message: `"${opStr}" を解析できません` });
        continue;
      }
      ops.push(parsed);
    }

    currentEvents.push({ name, group, startYear, endYear, ops });
```

Also remove the existing `endYearStr` variable declaration on line 37 since we're moving `const` inside the branches. Update lines 35-36 (remove the old declarations):

```typescript
    // REMOVE these lines (35-36):
    const name = parts[0].trim();
    const startYear = Number(parts[1].trim());
    // REMOVE line 37:
    const endYearStr = parts[2].trim();
    // REMOVE lines 38 (endYear), 40-43 (NaN checks), 45-54 (ops parsing), 56 (push)
```

Replace lines 26-57 entirely with the new block above.

- [ ] **Step 2: Verify parser still works for old format**

Run: `npx vitest run packages/saiflow/src/parser.test.ts`
Expected: All existing tests pass (old format detection).

- [ ] **Step 3: Commit**

```bash
git add packages/saiflow/src/parser.ts
git commit -m "feat: parse group column in DSL with backward compat"
```

---

### Task 3: Add parser tests for group support

**Files:**
- Modify: `packages/saiflow/src/parser.test.ts`

- [ ] **Step 1: Add tests for new group format and backward compat**

Add the following test cases at the end of the file (before the last closing `});`):

```typescript
  it("parses new format with group column", () => {
    const text = "# 現状維持\n住宅ローン,借入,0,35,現金-100\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarios[0].events[0]).toEqual({
      name: "借入",
      group: "住宅ローン",
      startYear: 0,
      endYear: 35,
      ops: [{ asset: "現金", op: "-", value: 100 }],
    });
  });

  it("parses new format with empty group", () => {
    const text = "# 現状維持\n,初期現金,0,0,現金+1000\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarios[0].events[0]).toEqual({
      name: "初期現金",
      group: undefined,
      startYear: 0,
      endYear: 0,
      ops: [{ asset: "現金", op: "+", value: 1000 }],
    });
  });

  it("parses old format (no group column) as backward compat", () => {
    const text = "# 現状維持\n年収,0,25,現金+500\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarios[0].events[0].group).toBeUndefined();
    expect(result.scenarios[0].events[0].name).toBe("年収");
  });

  it("parses new format with null endYear", () => {
    const text = "# テスト\n初期設定,生活費,0,,現金-250\n";
    const result = parseDSL(text);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarios[0].events[0].endYear).toBeNull();
  });
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run packages/saiflow/src/parser.test.ts`
Expected: All tests pass (existing + new).

- [ ] **Step 3: Commit**

```bash
git add packages/saiflow/src/parser.test.ts
git commit -m "test: add parser tests for group column"
```

---

### Task 4: Update DSL generator for group column

**Files:**
- Modify: `packages/saiflow/src/dslgen.ts`

- [ ] **Step 1: Emit group as leading column**

Replace the `scenariosToDsl` function:

```typescript
export function scenariosToDsl(scenarios: Scenario[]): string {
  return scenarios
    .map((s) => {
      const lines = s.events.map((e) => {
        const opsStr = e.ops.map((op) => `${op.asset}${op.op}${op.value}`).join(",");
        const groupCol = e.group ?? "";
        const endYear = e.endYear ?? "";
        const parts = [groupCol, e.name, String(e.startYear), endYear];
        if (opsStr) parts.push(opsStr);
        return parts.join(",");
      });
      return `# ${s.name}\n${lines.join("\n")}`;
    })
    .join("\n\n");
}
```

- [ ] **Step 2: Verify with a quick roundtrip test**

Run a quick sanity check with Node:

```bash
node -e "
const { scenariosToDsl } = require('./packages/saiflow/dist/dslgen.js');
console.log(scenariosToDsl([{ name: 'テスト', events: [{ name: '生活費', group: '初期設定', startYear: 0, endYear: null, ops: [{ asset: '現金', op: '-', value: 250 }] }] }]));
" 2>/dev/null || echo "dist not available, check with tsc"
```

Check that the output is: `# テスト\n初期設定,生活費,0,,現金-250`

- [ ] **Step 3: Commit**

```bash
git add packages/saiflow/src/dslgen.ts
git commit -m "feat: emit group column in DSL output"
```

---

### Task 5: Auto-assign group in pattern forms, add group field to EventForm

**Files:**
- Modify: `packages/saiflow/src/components/AddEventModal.tsx`

- [ ] **Step 1: Add group field to EventForm**

After the "名称" input (line 767), add a "グループ" input. Insert this block after the name field div:

```tsx
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0">グループ</label>
        <input
          className="flex-1 min-w-0 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded outline-none focus:border-(--terra)"
          placeholder="(なし)"
          value={event.group ?? ""}
          onChange={(e) => onChange({ ...event, group: e.target.value || undefined })}
        />
      </div>
```

- [ ] **Step 2: Assign group in MortgageForm handleSave**

In `MortgageForm.handleSave` (lines 178-215), add `group: "住宅ローン"` to each event object. Replace each `events.push({...})` call — add `group: "住宅ローン"` to each:

```typescript
    if (downPayment > 0) {
      events.push({
        name: "頭金",
        group: "住宅ローン",
        startYear,
        endYear: startYear,
        ops: [{ asset: "現金", op: "-" as const, value: downPayment }],
      });
    }
    if (loanAmount > 0) {
      events.push({
        name: "借入実行",
        group: "住宅ローン",
        startYear,
        endYear: startYear,
        ops: [{ asset: "借入", op: "-" as const, value: loanAmount }],
      });
      events.push({
        name: "借入返済",
        group: "住宅ローン",
        startYear,
        endYear: startYear + years - 1,
        ops: [
          { asset: "現金", op: "-" as const, value: annualPayment },
          { asset: "借入", op: "+" as const, value: annualPayment },
        ],
      });
      events.push({
        name: "借入金利",
        group: "住宅ローン",
        startYear,
        endYear: startYear + years - 1,
        ops: [{ asset: "借入", op: "*" as const, value: multiplier }],
      });
    }
```

- [ ] **Step 3: Assign group in InitialForm handleSave**

In `InitialForm.handleSave` (lines 378-414), add `group: "初期設定"` to each event:

```typescript
    if (initialCash > 0) {
      events.push({
        name: "初期現金",
        group: "初期設定",
        startYear: 0,
        endYear: 0,
        ops: [{ asset: "現金", op: "+" as const, value: initialCash }],
      });
    }
    if (annualIncome > 0) {
      events.push({
        name: "年収",
        group: "初期設定",
        startYear: 0,
        endYear: retirementYear > 0 ? retirementYear : null,
        ops: [{ asset: "現金", op: "+" as const, value: annualIncome }],
      });
    }
    if (livingMonthly > 0) {
      events.push({
        name: "生活費",
        group: "初期設定",
        startYear: 0,
        endYear: null,
        ops: [{ asset: "現金", op: "-" as const, value: livingMonthly * 12 }],
      });
    }
    if (housingMonthly > 0) {
      events.push({
        name: "住居費",
        group: "初期設定",
        startYear: 0,
        endYear: null,
        ops: [{ asset: "現金", op: "-" as const, value: housingMonthly * 12 }],
      });
    }
```

- [ ] **Step 4: Assign group in InvestForm handleSave**

In `InvestForm.handleSave` (lines 495-515), add `group: "投資"` to both events:

```typescript
    const events: Event[] = [
      {
        name: `${name}積立`,
        group: "投資",
        startYear,
        endYear,
        ops: [
          { asset: "現金", op: "-" as const, value: annualAmount },
          { asset: name, op: "+" as const, value: annualAmount },
        ],
      },
      {
        name: `${name}運用`,
        group: "投資",
        startYear,
        endYear: null,
        ops: [{ asset: name, op: "*" as const, value: multiplier }],
      },
    ];
```

- [ ] **Step 5: Assign group in ChildForm handleSave**

In `ChildForm.handleSave` (lines 620-657), add `group: "子供"` to each event. Update the `add` helper to include group, and the living expenses event:

```typescript
    const add = (label: string, start: number, end: number | null, cost: number) => {
      if (cost > 0) {
        events.push({
          name: `教育費${label}(${childName})`,
          group: "子供",
          startYear: birthYear + start,
          endYear: end === null ? null : birthYear + end,
          ops: [{ asset: "現金", op: "-" as const, value: cost }],
        });
      }
    };
    if (livingMonthly > 0) {
      events.push({
        name: `生活費(${childName})`,
        group: "子供",
        startYear: birthYear,
        endYear: birthYear + 17,
        ops: [{ asset: "現金", op: "-" as const, value: livingMonthly * 12 }],
      });
    }
```

- [ ] **Step 6: Update EventForm onDelete prop type for hideDelete usage in SimpleForm**

In `SimpleForm` (line 131-137), update the `EventForm` call to pass `event={event}` which now has a `group` field (no code change needed — `event` state already has `group` potentially). Same for the `SimpleForm` default `Event` — it doesn't need a group since simple pattern has no group.

- [ ] **Step 7: Commit**

```bash
git add packages/saiflow/src/components/AddEventModal.tsx
git commit -m "feat: auto-assign group names from presets, add group field to EventForm"
```

---

### Task 6: Group display and deletion in GuiEditor

**Files:**
- Modify: `packages/saiflow/src/components/GuiEditor.tsx`

- [ ] **Step 1: Add expandedGroups state**

Add a new state variable `expandedGroups` (a `Set<string>`) alongside `expandedIdx`. Import `useCallback` and `useRef` are already imported. Add near line 34:

```typescript
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
```

- [ ] **Step 2: Add group header component**

Inside `GuiEditor`, add a helper component for group headers. Above the return statement (around line 138), add:

```tsx
  const renderGroupHeader = (groupName: string, count: number, indices: number[]) => {
    const isExpanded = expandedGroups.has(groupName);
    const toggle = () => {
      setExpandedGroups((prev) => {
        const next = new Set(prev);
        if (next.has(groupName)) next.delete(groupName);
        else next.add(groupName);
        return next;
      });
    };
    const handleDeleteGroup = () => {
      if (confirm(`「${groupName}」グループの全 ${count} 件のイベントを削除しますか？`)) {
        // Sort indices descending so splicing doesn't shift positions
        const sorted = [...indices].sort((a, b) => b - a);
        update((prev) =>
          prev.map((s, i) =>
            i === state.activeScenarioIndex
              ? {
                  ...s,
                  events: s.events.filter((_, j) => !sorted.includes(j)),
                }
              : s,
          ),
        );
        setExpandedIdx(null);
      }
    };
    return (
      <div className="flex items-center border-b border-(--border) bg-(--grid)/30">
        <button
          className="flex-1 flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-(--mid)/20 transition-colors"
          onClick={toggle}
        >
          <span className="opacity-30 w-3 shrink-0 text-[10px]">
            {isExpanded ? "▼" : "▶"}
          </span>
          <span className="font-medium opacity-60">{groupName}</span>
          <span className="opacity-30 tabular-nums">({count})</span>
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

- [ ] **Step 3: Partition events and render grouped/non-grouped**

Replace the event list rendering block (lines 195-268, the `events.map(...)` block) with group-aware rendering:

```tsx
        ) : (
          (() => {
            // Partition events: grouped by group name, ungrouped separate
            const groups = new Map<string, number[]>();
            const groupOrder: string[] = [];
            const ungroupedIndices: number[] = [];

            events.forEach((event, idx) => {
              if (event.group) {
                if (!groups.has(event.group)) {
                  groups.set(event.group, []);
                  groupOrder.push(event.group);
                }
                groups.get(event.group)!.push(idx);
              } else {
                ungroupedIndices.push(idx);
              }
            });

            const renderEvent = (evt: Event, idx: number) => {
              const prim = primaryOp(evt.ops);
              const borderClass = prim ? OP_BORDER[prim.op] : "border-l-transparent";
              const isExpanded = expandedIdx === idx;

              return (
                <div
                  key={idx}
                  className={`border-l-2 ${borderClass} border-b border-(--border) ${
                    isExpanded ? "bg-(--grid)/50" : ""
                  }`}
                >
                  <button
                    className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-(--mid)/20 transition-colors"
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  >
                    <span className="opacity-30 w-3 shrink-0 text-[10px]">
                      {isExpanded ? "▼" : "▶"}
                    </span>
                    <span className="flex-1 min-w-0 truncate font-medium">
                      {evt.name || <span className="opacity-25 italic">名称なし</span>}
                    </span>
                    <span className="opacity-50 shrink-0 tabular-nums text-[11px]">
                      {evt.startYear}年{evt.endYear === null ? " →" : ` → ${evt.endYear}年`}
                    </span>
                    {evt.ops.length > 0 && (
                      <span className="flex gap-0.5 shrink-0 max-w-[120px] overflow-hidden">
                        {evt.ops.slice(0, 3).map((op, i) => (
                          <span
                            key={i}
                            className={`px-1 py-px rounded text-[10px] tabular-nums leading-snug truncate ${OP_COLORS[op.op]}`}
                          >
                            {op.asset}&nbsp;{op.op}&nbsp;{fmt(op.value)}
                          </span>
                        ))}
                        {evt.ops.length > 3 && (
                          <span className="text-[10px] opacity-30 shrink-0 self-center">
                            +{evt.ops.length - 3}
                          </span>
                        )}
                      </span>
                    )}
                  </button>

                  {isExpanded && (
                    <EventForm
                      event={evt}
                      currentAge={state.currentAge}
                      onChange={(e) =>
                        update((prev) =>
                          prev.map((s, i) =>
                            i === state.activeScenarioIndex
                              ? { ...s, events: s.events.map((ev, j) => (j === idx ? e : ev)) }
                              : s,
                          ),
                        )
                      }
                      onDelete={() => {
                        update((prev) =>
                          prev.map((s, i) =>
                            i === state.activeScenarioIndex
                              ? { ...s, events: s.events.filter((_, j) => j !== idx) }
                              : s,
                          ),
                        );
                        setExpandedIdx(null);
                      }}
                    />
                  )}
                </div>
              );
            };

            return (
              <>
                {groupOrder.map((groupName) => {
                  const indices = groups.get(groupName)!;
                  return (
                    <div key={groupName}>
                      {renderGroupHeader(groupName, indices.length, indices)}
                      {expandedGroups.has(groupName) &&
                        indices.map((idx) => renderEvent(events[idx], idx))}
                    </div>
                  );
                })}
                {ungroupedIndices.map((idx) => renderEvent(events[idx], idx))}
              </>
            );
          })()
        )}
```

- [ ] **Step 4: Commit**

```bash
git add packages/saiflow/src/components/GuiEditor.tsx
git commit -m "feat: group events by group name with collapsible headers and group delete"
```

---

### Task 7: Update sample data to new DSL format

**Files:**
- Modify: `packages/saiflow/src/data/sample.txt`

- [ ] **Step 1: Add empty group column to all event lines**

Prepend `,` to the start of each event line (non-comment, non-empty lines). The format becomes:

```
# 現状維持
,初期現金,0,0,現金+1000
,年収(夫),0,20,現金+500
,年収(妻),0,21,現金+300
,生活費,0,,現金-168
...
```

- [ ] **Step 2: Commit**

```bash
git add packages/saiflow/src/data/sample.txt
git commit -m "feat: update sample data to new DSL format with group column"
```

---

### Task 8: Integration verification

**Files:**
- (none, verification only)

- [ ] **Step 1: Run all tests**

```bash
npx vitest run packages/saiflow/
```
Expected: All tests pass.

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit -p packages/saiflow/tsconfig.json
```
Expected: No type errors.

- [ ] **Step 3: Run linter if available**

```bash
npx eslint packages/saiflow/src/ 2>/dev/null || echo "No eslint configured"
```

- [ ] **Step 4: Commit final fixes if any**

```bash
git add -A && git commit -m "chore: fix lint/type issues from event grouping" || echo "No fixes needed"
```
