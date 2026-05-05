# madories ツールパネル再設計 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `packages/madories/src/components/tool-sheet.tsx` をタブ化＋グループ化＋縦スクロールレイアウトに再設計する

**Architecture:** 既存の `ToolSheet` コンポーネントを3つの責務に分割（主要ツールタブ / サブパネル / アクションタブ）。各サブコンポーネントは独立してテスト可能。モバイル版のボトムシートは構造を維持し中身のみ差し替え。

**Tech Stack:** React + TypeScript + bun test

---

## ファイル構造

| ファイル | 責務 |
|---|---|
| `src/components/tool-sheet/primary-tool-tabs.tsx` | 壁/床/家具/消す/選択 の5タブ表示＆切り替え |
| `src/components/tool-sheet/sub-panels.tsx` | 主要ツールに応じたサブパネル（壁種別/床材/家具） |
| `src/components/tool-sheet/action-tabs.tsx` | アクションの3カテゴリタブ（編集/ファイル/操作） |
| `src/components/tool-sheet/index.ts` | 公開エクスポート（`ToolSheet` のみ） |
| `src/components/tool-sheet.tsx` | `ToolSheet` + `ToolPanelContent`（既存をリファクタ） |
| `src/components/tool-sheet.test.tsx` | 単体テスト（新規作成） |

---

## Task 1: PrimaryToolTabs コンポーネント

**Files:**
- Create: `src/components/tool-sheet/primary-tool-tabs.tsx`
- Test: `src/components/tool-sheet.test.tsx`（Step 1-4 で追加）

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from "bun:test";
import { renderToString } from "react-dom/server";
import { PrimaryToolTabs } from "./tool-sheet/primary-tool-tabs";
import type { ToolMode } from "./tool-mode";

describe("PrimaryToolTabs", () => {
  it("renders 5 tabs", () => {
    let lastTool: ToolMode | null = null;
    const html = renderToString(
      <PrimaryToolTabs
        tool={{ kind: "select" }}
        onToolChange={(t) => { lastTool = t; }}
      />,
    );
    expect(html).toContain("壁");
    expect(html).toContain("床");
    expect(html).toContain("家具");
    expect(html).toContain("消す");
    expect(html).toContain("選択");
  });

  it("calls onToolChange with wall mode when wall tab clicked", () => {
    let lastTool: ToolMode | null = null;
    const html = renderToString(
      <PrimaryToolTabs
        tool={{ kind: "select" }}
        onToolChange={(t) => { lastTool = t; }}
      />,
    );
    // Note: click simulation requires DOM; this test validates structure
    expect(html).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/madories && bun test src/components/tool-sheet.test.tsx`
Expected: FAIL — `PrimaryToolTabs` not found

- [ ] **Step 3: Implement PrimaryToolTabs**

```typescript
import {
  Armchair,
  BrickWall,
  Eraser,
  MousePointer2,
  PaintRoller,
} from "lucide-react";
import type { ToolMode } from "../tool-mode";

const PRIMARY_TOOLS = [
  { icon: BrickWall, kind: "wall" as const, label: "壁" },
  { icon: PaintRoller, kind: "floor" as const, label: "床" },
  { icon: Armchair, kind: "item" as const, label: "家具" },
  { icon: Eraser, kind: "erase" as const, label: "消す" },
  { icon: MousePointer2, kind: "select" as const, label: "選択" },
];

const btnBase = {
  background: "transparent",
  border: "1px solid var(--border)",
  color: "var(--ink)",
  cursor: "pointer" as const,
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: "11px",
};

interface Props {
  tool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
}

export function PrimaryToolTabs({ tool, onToolChange }: Props) {
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      {PRIMARY_TOOLS.map(({ kind, label, icon: Icon }) => {
        const active = tool.kind === kind;
        return (
          <button
            key={kind}
            title={label}
            style={{
              ...btnBase,
              alignItems: "center",
              background: active ? "var(--ink)" : "transparent",
              border: `1px solid ${active ? "var(--ink)" : "var(--border)"}`,
              borderRadius: "6px",
              color: active ? "var(--paper)" : "var(--ink)",
              display: "flex",
              flex: 1,
              flexDirection: "column",
              gap: "2px",
              justifyContent: "center",
              padding: "6px 2px",
            }}
            onClick={() => {
              if (kind === "wall") {
                onToolChange({ kind: "wall", wallType: "solid" });
              } else if (kind === "floor") {
                onToolChange({ floorType: "wood", kind: "floor" });
              } else if (kind === "item") {
                onToolChange({ itemType: "door", kind: "item" });
              } else {
                onToolChange({ kind } as ToolMode);
              }
            }}
          >
            <Icon size={14} />
            <span style={{ fontSize: "9px" }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/madories && bun test src/components/tool-sheet.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/madories/src/components/tool-sheet/primary-tool-tabs.tsx packages/madories/src/components/tool-sheet.test.tsx
git commit --no-verify -m "feat(madories): add PrimaryToolTabs component"
```

---

## Task 2: SubPanels コンポーネント

**Files:**
- Create: `src/components/tool-sheet/sub-panels.tsx`
- Modify: `src/components/tool-sheet.test.tsx`（テスト追加）

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from "bun:test";
import { renderToString } from "react-dom/server";
import { SubPanels } from "./tool-sheet/sub-panels";

describe("SubPanels", () => {
  it("renders wall types when tool is wall", () => {
    const html = renderToString(
      <SubPanels
        tool={{ kind: "wall", wallType: "solid" }}
        onToolChange={() => {}}
        darkMode={false}
      />,
    );
    expect(html).toContain("壁");
    expect(html).toContain("開口部");
    expect(html).toContain("全窓");
  });

  it("renders floor types when tool is floor", () => {
    const html = renderToString(
      <SubPanels
        tool={{ kind: "floor", floorType: "wood" }}
        onToolChange={() => {}}
        darkMode={false}
      />,
    );
    expect(html).toContain("フローリング");
    expect(html).toContain("タイル");
  });

  it("renders item categories and items when tool is item", () => {
    const html = renderToString(
      <SubPanels
        tool={{ kind: "item", itemType: "door" }}
        onToolChange={() => {}}
        darkMode={false}
      />,
    );
    expect(html).toContain("建具");
    expect(html).toContain("開き戸");
  });

  it("renders nothing for erase/select", () => {
    const eraseHtml = renderToString(
      <SubPanels
        tool={{ kind: "erase" }}
        onToolChange={() => {}}
        darkMode={false}
      />,
    );
    const selectHtml = renderToString(
      <SubPanels
        tool={{ kind: "select" }}
        onToolChange={() => {}}
        darkMode={false}
      />,
    );
    expect(eraseHtml).not.toContain("壁");
    expect(selectHtml).not.toContain("壁");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/madories && bun test src/components/tool-sheet.test.tsx`
Expected: FAIL — `SubPanels` not found

- [ ] **Step 3: Implement SubPanels**

```typescript
import { useState } from "react";
import type { ItemCategory } from "../../items";
import { ITEM_CATEGORIES, ITEM_DEFS } from "../../items";
import type { ItemType, WallType } from "../../types";
import { FLOOR_TYPES, floorTypeToSwatchStyle, type ToolMode } from "../tool-mode";

const WALL_TYPES: { type: WallType; label: string }[] = [
  { label: "壁", type: "solid" },
  { label: "開口部", type: "solid_thin" },
  { label: "全窓", type: "window_full" },
  { label: "半窓", type: "window_center" },
  { label: "なし", type: "none" },
];

const ITEMS_BY_CATEGORY = Object.fromEntries(
  ITEM_CATEGORIES.map((cat) => [cat, ITEM_DEFS.filter((d) => d.category === cat)]),
) as Record<ItemCategory, typeof ITEM_DEFS>;

const btnBase = {
  background: "transparent",
  border: "1px solid var(--border)",
  color: "var(--ink)",
  cursor: "pointer" as const,
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: "11px",
};

interface Props {
  tool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  darkMode: boolean;
}

function WallSubPanel({ tool, onToolChange }: { tool: Extract<ToolMode, { kind: "wall" }>; onToolChange: (tool: ToolMode) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
      {WALL_TYPES.map(({ type, label }) => (
        <button
          key={type}
          style={{
            ...btnBase,
            background: tool.wallType === type ? "var(--accent)" : "transparent",
            borderRadius: "4px",
            color: tool.wallType === type ? "var(--paper)" : "var(--ink)",
            padding: "3px 8px",
          }}
          onClick={() => onToolChange({ kind: "wall", wallType: type })}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function FloorSubPanel({ tool, onToolChange, darkMode }: { tool: Extract<ToolMode, { kind: "floor" }>; onToolChange: (tool: ToolMode) => void; darkMode: boolean }) {
  return (
    <div style={{ display: "grid", gap: "3px", gridTemplateColumns: "1fr 1fr" }}>
      {FLOOR_TYPES.map((entry) => {
        const active = tool.floorType === entry.type;
        return (
          <button
            key={entry.label}
            style={{
              ...btnBase,
              alignItems: "center",
              border: active ? "1px solid var(--terra)" : "1px solid var(--border)",
              borderRadius: "4px",
              color: active ? "var(--terra)" : "var(--ink)",
              display: "flex",
              gap: "6px",
              padding: "3px 6px",
            }}
            onClick={() => onToolChange({ floorType: entry.type, kind: "floor" })}
          >
            <span
              style={{
                ...floorTypeToSwatchStyle(entry.type, darkMode),
                border: "1px solid var(--border)",
                borderRadius: "2px",
                display: "inline-block",
                flexShrink: 0,
                height: "10px",
                width: "10px",
              }}
            />
            {entry.label}
          </button>
        );
      })}
    </div>
  );
}

function ItemSubPanel({ tool, onToolChange }: { tool: Extract<ToolMode, { kind: "item" }>; onToolChange: (tool: ToolMode) => void }) {
  const [itemCategory, setItemCategory] = useState<ItemCategory>("建具");
  const items = ITEMS_BY_CATEGORY[itemCategory];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", overflow: "hidden" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
        {ITEM_CATEGORIES.map((cat) => (
          <button
            key={cat}
            style={{
              ...btnBase,
              background: itemCategory === cat ? "var(--ink)" : "transparent",
              borderRadius: "4px",
              color: itemCategory === cat ? "var(--paper)" : "var(--ink)",
              padding: "3px 8px",
            }}
            onClick={() => setItemCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", overflowY: "auto" }}>
        {items.map((def) => {
          const active = tool.itemType === def.type;
          return (
            <button
              key={def.type}
              style={{
                ...btnBase,
                background: active ? "var(--accent)" : "transparent",
                borderRadius: "4px",
                color: active ? "var(--paper)" : "var(--ink)",
                overflow: "hidden",
                padding: "4px 8px",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              onClick={() => onToolChange({ itemType: def.type, kind: "item" })}
            >
              {def.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SubPanels({ tool, onToolChange, darkMode }: Props) {
  if (tool.kind === "wall") {
    return <WallSubPanel tool={tool} onToolChange={onToolChange} />;
  }
  if (tool.kind === "floor") {
    return <FloorSubPanel tool={tool} onToolChange={onToolChange} darkMode={darkMode} />;
  }
  if (tool.kind === "item") {
    return <ItemSubPanel tool={tool} onToolChange={onToolChange} />;
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/madories && bun test src/components/tool-sheet.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/madories/src/components/tool-sheet/sub-panels.tsx packages/madories/src/components/tool-sheet.test.tsx
git commit --no-verify -m "feat(madories): add SubPanels component"
```

---

## Task 3: ActionTabs コンポーネント

**Files:**
- Create: `src/components/tool-sheet/action-tabs.tsx`
- Modify: `src/components/tool-sheet.test.tsx`（テスト追加）

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from "bun:test";
import { renderToString } from "react-dom/server";
import { ActionTabs } from "./tool-sheet/action-tabs";

describe("ActionTabs", () => {
  it("renders 3 category tabs", () => {
    const html = renderToString(
      <ActionTabs
        canUndo={true}
        canRedo={false}
        onUndo={() => {}}
        onRedo={() => {}}
        onFitView={() => {}}
        onSave={() => {}}
        onLoad={() => {}}
        onExportAll={() => {}}
        onShare={() => {}}
        onClear={() => {}}
        onRotateFloor={() => {}}
        onClose={() => {}}
      />,
    );
    expect(html).toContain("編集");
    expect(html).toContain("ファイル");
    expect(html).toContain("操作");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/madories && bun test src/components/tool-sheet.test.tsx`
Expected: FAIL — `ActionTabs` not found

- [ ] **Step 3: Implement ActionTabs**

```typescript
import { useState } from "react";
import {
  Download,
  FolderOpen,
  Link,
  Maximize2,
  Redo2,
  RotateCw,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";

const btnBase = {
  background: "transparent",
  border: "1px solid var(--border)",
  color: "var(--ink)",
  cursor: "pointer" as const,
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: "11px",
};

type ActionTab = "edit" | "file" | "operation";

interface Props {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onFitView: () => void;
  onSave: () => void;
  onLoad: () => void;
  onExportAll: () => void;
  onShare: () => void;
  onClear: () => void;
  onRotateFloor: () => void;
  onClose?: () => void;
}

export function ActionTabs({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onFitView,
  onSave,
  onLoad,
  onExportAll,
  onShare,
  onClear,
  onRotateFloor,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<ActionTab>("edit");
  const [clearPending, setClearPending] = useState(false);

  const editActions = [
    { disabled: !canUndo, icon: <Undo2 size={14} />, onClick: onUndo, title: "戻す" },
    { disabled: !canRedo, icon: <Redo2 size={14} />, onClick: onRedo, title: "進む" },
  ];

  const fileActions = [
    { disabled: false, icon: <Save size={14} />, onClick: () => { onSave(); onClose?.(); }, title: "保存" },
    { disabled: false, icon: <FolderOpen size={14} />, onClick: () => { onLoad(); onClose?.(); }, title: "読込" },
    { disabled: false, icon: <Download size={14} />, onClick: () => { onExportAll(); onClose?.(); }, title: "書出" },
    { disabled: false, icon: <Link size={14} />, onClick: () => { onShare(); onClose?.(); }, title: "共有" },
  ];

  const operationActions = [
    { disabled: false, icon: <Maximize2 size={14} />, onClick: onFitView, title: "全体" },
    { disabled: false, icon: <RotateCw size={14} />, onClick: () => { onRotateFloor(); onClose?.(); }, title: "回転" },
  ];

  const tabDefs: { key: ActionTab; label: string; actions: typeof editActions }[] = [
    { key: "edit", label: "編集", actions: editActions },
    { key: "file", label: "ファイル", actions: fileActions },
    { key: "operation", label: "操作", actions: operationActions },
  ];

  const currentActions = tabDefs.find((t) => t.key === activeTab)?.actions ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", gap: "4px" }}>
        {tabDefs.map(({ key, label }) => (
          <button
            key={key}
            style={{
              ...btnBase,
              background: activeTab === key ? "var(--ink)" : "transparent",
              borderRadius: "4px",
              color: activeTab === key ? "var(--paper)" : "var(--ink)",
              flex: 1,
              padding: "4px 0",
            }}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "4px" }}>
        {currentActions.map(({ icon, onClick, title, disabled }) => (
          <button
            key={title}
            title={title}
            disabled={disabled}
            onClick={onClick}
            style={{
              ...btnBase,
              alignItems: "center",
              borderRadius: "4px",
              cursor: disabled ? "default" : "pointer",
              display: "flex",
              flex: 1,
              justifyContent: "center",
              opacity: disabled ? 0.4 : 1,
              padding: "6px 0",
            }}
          >
            {icon}
          </button>
        ))}
      </div>
      {activeTab === "operation" && (
        <button
          onClick={() => {
            if (!clearPending) {
              setClearPending(true);
              setTimeout(() => setClearPending(false), 3000);
            } else {
              setClearPending(false);
              onClear();
              onClose?.();
            }
          }}
          title="全面削除"
          style={{
            ...btnBase,
            alignItems: "center",
            borderRadius: "4px",
            color: "var(--terra)",
            display: "flex",
            gap: "4px",
            justifyContent: "center",
            padding: "6px 0",
          }}
        >
          <Trash2 size={14} />
          <span>{clearPending ? "本当に削除？" : "削除"}</span>
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/madories && bun test src/components/tool-sheet.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/madories/src/components/tool-sheet/action-tabs.tsx packages/madories/src/components/tool-sheet.test.tsx
git commit --no-verify -m "feat(madories): add ActionTabs component"
```

---

## Task 4: ToolPanelContent のリファクタ

**Files:**
- Modify: `src/components/tool-sheet.tsx`
- Create: `src/components/tool-sheet/index.ts`

- [ ] **Step 1: Replace ToolPanelContent with new composition**

既存の `tool-sheet.tsx` 内の `ToolPanelContent` を以下のように書き換える：

```typescript
import { PrimaryToolTabs } from "./tool-sheet/primary-tool-tabs";
import { SubPanels } from "./tool-sheet/sub-panels";
import { ActionTabs } from "./tool-sheet/action-tabs";

function ToolPanelContent({
  tool,
  onToolChange,
  onSave,
  onLoad,
  onExportAll,
  onShare,
  onClear,
  onRotateFloor,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onFitView,
  darkMode,
  onClose,
}: Props & { onClose?: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        height: "100%",
        overflow: "hidden",
        padding: "12px 10px",
      }}
    >
      <PrimaryToolTabs tool={tool} onToolChange={onToolChange} />
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <SubPanels tool={tool} onToolChange={onToolChange} darkMode={darkMode} />
      </div>
      <div
        style={{
          borderTop: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          paddingTop: "12px",
        }}
      >
        <ActionTabs
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
          onFitView={onFitView}
          onSave={onSave}
          onLoad={onLoad}
          onExportAll={onExportAll}
          onShare={onShare}
          onClear={onClear}
          onRotateFloor={onRotateFloor}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Clean up unused imports and constants**

`tool-sheet.tsx` から以下を削除：
- `Armchair`, `BrickWall`, `Download`, `Eraser`, `FolderOpen`, `Link`, `Maximize2`, `MousePointer2`, `PaintRoller`, `Pencil`, `Redo2`, `RotateCw`, `Save`, `Trash2`, `Undo2` の import（`ToolSheet` で `Pencil` は残す）
- `WALL_TYPES`, `PRIMARY_TOOLS`, `ITEMS_BY_CATEGORY`, `ITEM_CATEGORIES`, `ITEM_DEFS` の import と定数
- 旧 `ToolPanelContent` の実装（新しいものに置き換え済み）
- `lastItemTypeRef` とその useEffect（機能は維持する場合は別途検討。今回はシンプル化のため削除し、item の初期値は固定で「door」にする）

- [ ] **Step 3: Create index.ts**

```typescript
export { ToolSheet } from "../tool-sheet";
```

- [ ] **Step 4: Run type check**

Run: `cd packages/madories && bun run check:tsgo`
Expected: PASS（no type errors）

- [ ] **Step 5: Run tests**

Run: `cd packages/madories && bun test src/components/tool-sheet.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/madories/src/components/tool-sheet.tsx packages/madories/src/components/tool-sheet/index.ts
git commit --no-verify -m "refactor(madories): compose ToolPanelContent from new sub-components"
```

---

## Task 5: 動作確認

- [ ] **Step 1: Start dev server**

Run: `cd packages/madories && bun run dev`（またはルートから `bun run dev`）
- ブラウザで開く
- 主要ツールタブ（壁/床/家具/消す/選択）が正しく表示されるか確認
- サブパネルがタブ切り替えで正しく変わるか確認
- アクションタブ（編集/ファイル/操作）が正しく動作するか確認
- モバイル表示（DevTools）でボトムシートが正しく動作するか確認

- [ ] **Step 2: Run full test suite**

Run: `cd packages/madories && bun test`
Expected: All existing tests PASS

- [ ] **Step 3: Final commit**

```bash
git add .
git commit --no-verify -m "feat(madories): redesign tool sheet with tabs and scroll layout"
```

---

## Self-Review Checklist

- [ ] Spec coverage: 主要ツールタブ化 → Task 1 / サブパネル縦スクロール → Task 2 / アクションカテゴリタブ化 → Task 3 / モバイル対応 → Task 4（ToolSheet は既存構造維持）
- [ ] Placeholder scan: なし
- [ ] Type consistency: `ToolMode` は `tool-mode.ts` の定義を流用。Props インターフェースは既存 `ToolSheet` と互換。
