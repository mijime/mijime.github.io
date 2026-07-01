# Age-Based DSL Implementation Plan

> **Goal:** Convert DSL and internal data model from year-offset to absolute age representation, and change default age to 35.

**Architecture:** Rename `startYear`/`endYear` to `startAge`/`endAge` across all layers. Simulator computes offsets internally. DSL outputs ages directly. UI display/input conversion logic flips (ages are now the primary value, offsets are computed).

**Tech Stack:** TypeScript, React, Vitest

---

### Task 1: `types.ts` — Rename Event fields

**Files:**
- Modify: `packages/saiflow/src/types.ts`

- [ ] Step 1: Rename `startYear` → `startAge`, `endYear` → `endAge`

```typescript
export interface Event {
  name: string;
  group?: string;
  startAge: number;
  endAge: number | null;
  ops: AssetOp[];
}
```

- [ ] Step 2: Commit

```bash
git add packages/saiflow/src/types.ts
git commit -m "refactor: rename startYear/endYear to startAge/endAge in Event type"
```

---

### Task 2: `parser.ts` — Rename variables, use ages directly

**Files:**
- Modify: `packages/saiflow/src/parser.ts`

- [ ] Step 1: Rename local variables and event construction

```typescript
// line 41: rename destructure
const { name, group, startYear, endYear, opsStart } = parsed;
```
change to:
```typescript
const { name, group, startAge, endAge, opsStart } = parsed;
```

```typescript
// line 54: rename push
currentEvents.push({ name, group, startYear, endYear, ops });
```
change to:
```typescript
currentEvents.push({ name, group, startAge, endAge, ops });
```

- [ ] Step 2: Rename `startYear`/`endYear` inside `parseEventLine`

```typescript
function parseEventLine(parts: string[]): {
  group: string | undefined;
  name: string;
  startAge: number;
  endAge: number | null;
  opsStart: number;
} | null {
  // ...
  const startAge = Number((isOldFormat ? parts[1] : parts[2]).trim());
  const endAgeStr = (isOldFormat ? parts[2] : parts[3]).trim();
  const endAge: number | null = endAgeStr.length === 0 ? null : Number(endAgeStr);
  // ...
  if (isNaN(startAge) || (endAge !== null && isNaN(endAge))) {
    return null;
  }
  return { group, name, startAge, endAge, opsStart };
}
```

- [ ] Step 3: Commit

```bash
git add packages/saiflow/src/parser.ts
git commit -m "refactor: update parser for age-based fields"
```

---

### Task 3: `parser.test.ts` — Update test assertions

**Files:**
- Modify: `packages/saiflow/src/parser.test.ts`

- [ ] Step 1: Replace all `startYear`/`endYear` with `startAge`/`endAge` in test assertions

For example:
```typescript
// Line 27-32:
expect(result.scenarios[0].events[0]).toEqual({
  name: "年収(夫)",
  startAge: 6,
  endAge: 12,
  ops: [{ asset: "現金", op: "+", value: 500 }],
});
```

Do the same for all tests. Values stay the same (DSL values aren't changing in tests).

- [ ] Step 2: Run tests to confirm

```bash
pnpm run test 2>&1
```

- [ ] Step 3: Commit

```bash
git add packages/saiflow/src/parser.test.ts
git commit -m "test: update parser tests for age-based fields"
```

---

### Task 4: `simulator.ts` — Compute offset from age

**Files:**
- Modify: `packages/saiflow/src/simulator.ts`

- [ ] Step 1: Change filter to convert ages to offsets

```typescript
// line 15-16, change:
const active = scenario.events.filter(
  (e) => e.startYear <= year && (e.endYear === null || year <= e.endYear),
);
```
to:
```typescript
const active = scenario.events.filter(
  (e) => (e.startAge - currentAge) <= year && (e.endAge === null || year <= (e.endAge - currentAge)),
);
```

- [ ] Step 2: Commit

```bash
git add packages/saiflow/src/simulator.ts
git commit -m "refactor: compute simulation offset from event ages"
```

---

### Task 5: `dslgen.ts` — Output ages

**Files:**
- Modify: `packages/saiflow/src/dslgen.ts`

- [ ] Step 1: Change `startYear`/`endYear` → `startAge`/`endAge`

```typescript
// lines 9-12:
const endAge = e.endAge ?? "";
const parts = [groupCol, e.name, String(e.startAge), endAge];
```

- [ ] Step 2: Commit

```bash
git add packages/saiflow/src/dslgen.ts
git commit -m "refactor: output ages in DSL generator"
```

---

### Task 6: `store.tsx` + `App.tsx` — Default age 35 + age-based DEFAULT_DSL

**Files:**
- Modify: `packages/saiflow/src/store.tsx`
- Modify: `packages/saiflow/src/App.tsx`

- [ ] Step 1: Change default age in store.tsx

```typescript
// line 34:
currentAge: 39,
```
to:
```typescript
currentAge: 35,
```

- [ ] Step 2: Convert DEFAULT_DSL values from offsets to ages (adding 35)

All year values shift by +35:
```
"子供(子),生活費(子),35,50,現金-24"
"子供(子),教育費(子 小学校),39,44,現金-10"
"子供(子),教育費(子 中学校),45,47,現金-15"
"子供(子),教育費(子 高校),48,50,現金-80"
"子供(子),教育費(子 大学),51,54,現金-120"
"投資(投資),投資(積立),35,55,現金-120,投資+120"
"投資(投資),投資(運用),35,,投資*1.03"
"投資(投資),投資(切り崩し),65,,現金+180,投資-180"
"住宅ローン,住居費(頭金),35,35,現金-500"
"住宅ローン,住居費(実行),35,35,借入-3500"
"住宅ローン,住居費(返済),35,69,現金-158,借入+158"
"住宅ローン,借入金利,35,69,借入*1.03"
"初期設定,貯金,35,35,現金+1000"
"初期設定,年収,35,61,現金+600"
"初期設定,税金,35,61,現金-120"
"初期設定,生活費,35,,現金-180"
```

- [ ] Step 3: Commit

```bash
git add packages/saiflow/src/store.tsx packages/saiflow/src/App.tsx
git commit -m "change default age to 35, update DEFAULT_DSL to age-based values"
```

---

### Task 7: `AddEventModal.tsx` — Convert all forms to ages

**Files:**
- Modify: `packages/saiflow/src/components/AddEventModal.tsx`

Changes needed across all form components:

**EventForm** (line 788+):
- Rename `startYear`/`endYear` in onChange calls to `startAge`/`endAge`
- Rename `endYear` comparison to `endAge`
- Rename `event.startYear`/`event.endYear` to `event.startAge`/`event.endAge`

**YearInput** (line 333):
- Flip conversion: value is now an age, not offset

```typescript
function YearInput({
  value,
  onChange,
  currentAge,
}: {
  value: number;
  onChange: (v: number) => void;
  currentAge: number;
}) {
  const [mode, setMode] = useState<"offset" | "age">("offset");
  const display = mode === "age" ? value : value - currentAge;
  return (
    <div className="flex gap-1 items-center">
      <select ...>
        <option value="offset">年数</option>
        <option value="age">年齢</option>
      </select>
      <input
        className="w-16 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
        value={display}
        onChange={(e) =>
          onChange(mode === "age" ? Number(e.target.value) : Number(e.target.value) + currentAge)
        }
      />
    </div>
  );
}
```

**MortgageForm** (line 156):
- Rename `startYear` → `startAge`, default: `useState(0)` → `useState(currentAge)`
- Flip `toDisplay`/`fromDisplay`:
```typescript
const toDisplay = (v: number) => (yearMode === "age" ? v : v - currentAge);
const fromDisplay = (v: number) => (yearMode === "age" ? v : v + currentAge);
```
- Pass `startAge` to events instead of `startYear`

**InitialForm** (line 366):
- All `startYear: 0` → `startAge: currentAge`
- `retirementYear` → `retirementAge`: use `65` directly (it's already an age)
  - But in the current code, `retirementYear = Math.max(0, 65 - currentAge)` is used as endYear offset

Wait, let me think about this more carefully. Currently:
```typescript
const retirementYear = Math.max(0, 65 - currentAge);
// ...
endYear: incomeEndYear, // this is an offset
```

The `incomeEndYear` is retirementYear. If age is 35, retirementYear = 30. With ages, this should be 65 directly.

So:
```typescript
// Remove retirementYear calculation. Use 65 directly.
// incomeEndYear → incomeEndAge
const incomeEndAge = 65; // or null if already past 65? handle with startAge > 65
endYear: incomeEndAge, // this is now an age
```

Actually, more precisely:
```typescript
const retirementAge = 65;
if (annualIncome > 0) {
  const incomeEndAge = retirementAge > currentAge ? retirementAge : null;
  events.push({
    name: "年収",
    group: "初期設定",
    startAge: currentAge,
    endAge: incomeEndAge,
    ops: [{ asset: "現金", op: "+" as const, value: annualIncome }],
  });
  // same for 税金
}
```

**InvestForm** (line 495):
- Rename `startYear` → `startAge`, default `useState(0)` → `useState(currentAge)`
- `endYear` → `endAge`, default `useState<number | null>(20)` → `useState<number | null>(currentAge + 20)`
- Event construction: use `startAge`/`endAge`

**ChildForm** (line 617):
- `birthYear` → `birthAge`, default `useState(2)` → `useState(currentAge + 2)`
  - Actually, `birthYear = 2` means child born 2 years from now at age 37. So `birthAge = currentAge + 2 = 37`.
- YearInput for birthAge: flip conversion
```typescript
// display
value={yearMode === "age" ? Math.max(0, birthAge) : birthAge - currentAge}
onChange={(e) => {
  const v = Number(e.target.value) || 0;
  setBirthAge(yearMode === "age" ? v : v + currentAge);
}}
```

- Internal `add` function: `birthAge + start` (start is still relative offset from birth, e.g., 3 for kindergarten)
- Living end: `birthAge + 17`

- [ ] Step 1: Make all the above changes to AddEventModal.tsx

- [ ] Step 2: Commit

```bash
git add packages/saiflow/src/components/AddEventModal.tsx
git commit -m "refactor: convert all preset forms to age-based values"
```

---

### Task 8: `GuiEditor.tsx` — Update display and wire up ages

**Files:**
- Modify: `packages/saiflow/src/components/GuiEditor.tsx`

- [ ] Step 1: Event display line — change `年` to `歳` and use age fields

```typescript
// line 378:
{evt.startYear}年{evt.endYear === null ? " →" : ` → ${evt.endYear}年`}
```
to:
```typescript
{evt.startAge}歳{evt.endAge === null ? " →" : ` → ${evt.endAge}歳`}
```

- [ ] Step 2: EventForm usage — update prop names

```typescript
// The EventForm component is used in SimpleForm and GuiEditor
// All onChange handlers that reference startYear/endYear need renaming
```

Actually, looking at GuiEditor more carefully:
- The `SimpleForm` in AddEventModal creates a new event with `startYear: 0` → `startAge: currentAge`
- The `EventForm` in GuiEditor passes event prop changes directly — field names come from types.ts

- [ ] Step 3: Commit

```bash
git add packages/saiflow/src/components/GuiEditor.tsx
git commit -m "refactor: update GuiEditor display to ages"
```

---

### Task 9: Final verification

- [ ] Step 1: Run type check

```bash
pnpm run check
```

- [ ] Step 2: Run tests

```bash
pnpm run test
```

- [ ] Step 3: Fix any remaining type errors or test failures

- [ ] Step 4: Final commit (if needed)

```bash
git add -A
git commit -m "fix remaining age-based references"
```

---

### Summary of field renames

| File | Before | After |
|------|--------|-------|
| types.ts | `Event.startYear` | `Event.startAge` |
| types.ts | `Event.endYear` | `Event.endAge` |
| parser.ts | `parseEventLine` return `startYear` | `startAge` |
| parser.ts | `parseEventLine` return `endYear` | `endAge` |
| simulator.ts | `e.startYear` | `(e.startAge - currentAge)` |
| simulator.ts | `e.endYear` | `(e.endAge - currentAge)` |
| dslgen.ts | `e.startYear` | `e.startAge` |
| dslgen.ts | `e.endYear` | `e.endAge` |
| store.tsx | `currentAge: 39` | `currentAge: 35` |
| App.tsx | DEFAULT_DSL offsets | DEFAULT_DSL ages (+35) |
| AddEventModal.tsx | all `startYear`/`endYear` refs | `startAge`/`endAge` |
| AddEventModal.tsx | `toDisplay`/`fromDisplay` flip | age→offset conversion |
| GuiEditor.tsx | display `年` | `歳` |
