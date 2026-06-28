# Event Grouping Design

**Date:** 2026-06-28
**Status:** Approved

## Summary

Add an optional `group` field to the `Event` type. When events are created via preset patterns (`mortgage`, `initial`, `invest`, `child`), a group name is auto-assigned. The GUI event list groups events by their group name with collapsible headers and group-level deletion.

## Motivation

- Preset-added events (e.g., mortgage generates 4 events) are hard to identify as a set after creation
- Deleting related events requires deleting each one individually
- Users want to understand which events came from which preset

## Design

### 1. Type change (`types.ts`)

```typescript
export interface Event {
  name: string;
  group?: string;       // NEW: optional group name
  startYear: number;
  endYear: number | null;
  ops: AssetOp[];
}
```

### 2. Pattern → group name mapping

Patterns in `AddEventModal.tsx` auto-assign group names:

| Pattern ID  | Group name     |
|-------------|----------------|
| `simple`    | (undefined)    |
| `mortgage`  | `住宅ローン`    |
| `initial`   | `初期設定`      |
| `invest`    | `投資`          |
| `child`     | `子供`          |

`simple` pattern produces no group name — events appear ungrouped in the list.

### 3. DSL format change

A new leading column is added for the group name:

```
groupName,eventName,startYear,endYear,asset+value,asset-value,...
```

Ungrouped events have an empty leading column:

```
,eventName,startYear,endYear,asset+value,...
```

**Backward compatibility:** When parsing, if the first column does not start with a known group pattern, treat the line as an ungrouped event (existing legacy format). The parser detects whether the first column looks like a group name by checking if columns[1] contains a recognizable event structure.

### 4. GUI editor group display (`GuiEditor.tsx`)

Events are partitioned: ungrouped events render as before (flat list), grouped events render under collapsible group headers.

**Collapsed group:**
```
[▶] 住宅ローン (4)                              [🗑️]
```

**Expanded group:**
```
[▼] 住宅ローン (4)                              [🗑️]
  ├── 借入実行  0年 →      借入 +3000
  ├── 借入返済  1年 → 35年  現金 -80
  ├── 借入金利  1年 → 35年  現金 -20
  └── 頭金      0年 →      現金 -500
```

Individual events within a group expand/collapse independently (same as current behavior). The group header shows a trash icon for group-level deletion.

### 5. Group deletion

Clicking the trash icon on a group header shows a confirmation dialog:
"「{groupName}」グループの全 {n} 件のイベントを削除しますか？"

On confirm, all events in that group are removed from the scenario.

### 6. Event form group editing

The `EventForm` component (used for editing individual events when expanded) gains a "グループ" field alongside name, years, and ops. Users can change or clear the group name on individual events.

### 7. Files affected

| File | Change |
|------|--------|
| `packages/saiflow/src/types.ts` | Add `group?: string` to `Event` |
| `packages/saiflow/src/parser.ts` | Parse group column from DSL |
| `packages/saiflow/src/dslgen.ts` | Emit group column in DSL output |
| `packages/saiflow/src/components/AddEventModal.tsx` | Auto-assign group in pattern forms; add group field to EventForm |
| `packages/saiflow/src/components/GuiEditor.tsx` | Group events by group name; collapsible headers; group delete |
| `packages/saiflow/src/data/sample.txt` | Update sample data to new DSL format |

### 8. Files NOT affected

| File | Reason |
|------|--------|
| `simulator.ts` | Group is metadata, doesn't affect simulation |
| `storage.ts` | Events are stored as DSL text, no schema change needed |
| `store.tsx` | No state management changes needed |
| `DslEditor.tsx` | Raw text editor, no grouping logic |

### 9. Edge cases

- **Multiple groups from same pattern:** If the user adds "住宅ローン" twice, both sets appear under one group header — that's intentional and desirable.
- **Empty group name:** Rendered without a group header (flat).
- **Single event in a group:** Still shows a group header. The user can clear the group field to ungroup it.
- **Legacy DSL (no group column):** Parser treats first column as event name — no group assigned.
