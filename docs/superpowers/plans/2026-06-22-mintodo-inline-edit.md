# mintodo インライン編集 & DSL インライン入力 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ノードクリックで選択、ダブルクリックでインライン編集、属性編集の折りたたみ、新規ノード初期値=空、テキストからの DSL 入力 (`@priority:high` 等) を可能にする。

**Architecture:** 既存の reducer-based state に `editingNodeId` / `pendingCreationNodeId` を追加。`NodeInlineEditor` コンポーネントを新規作成し、`NodeCard` が `editingNodeId === node.id` のときだけ描画する。DSL 解析は `src/dsl.ts` に `parseInlineDSL` を追加 (1 行専用、`parseDSL` の attribute ロジックを再利用)。EditModal は温存し「…」ボタンから引き続きアクセス可能。

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind 4 + Dexie (IndexedDB) + vitest + @testing-library/react + jsdom + fake-indexeddb。Lint/Format は oxlint / oxfmt。パッケージマネージャ pnpm。

**Spec:** `docs/superpowers/specs/2026-06-22-mintodo-inline-edit-design.md`

## File Structure

| ファイル | 種別 | 責務 |
|---|---|---|
| `src/dsl.ts` | 変更 | `parseInlineDSL` 追加 |
| `src/dsl.test.ts` | 変更 | `parseInlineDSL` のテスト追加 |
| `src/store.ts` | 変更 | `editingNodeId` / `pendingCreationNodeId` state + 4 action + `ADD_CHILD` の `text=""` + 自動 inline edit 開始 |
| `src/store.test.ts` | 変更 | 新 action のテスト追加 |
| `src/components/NodeInlineEditor.tsx` | 新規 | インライン編集 UI (textarea + 折りたたみ式属性バー + 保存/キャンセル) |
| `src/components/NodeInlineEditor.test.tsx` | 新規 | コンポーネントテスト |
| `src/components/NodeCard.tsx` | 変更 | click/dblclick handler + 編集モード時 render 切替 + draggable 抑止 |
| `src/components/NodeCard.test.tsx` | 変更 | click / dblclick / 編集モード render テスト |
| `src/components/Canvas.tsx` | 変更 | `onRequestEdit` を NodeCard に渡す |
| `src/hooks/use-keyboard.ts` | 変更 | `editingNodeId !== null` の間全ショートカットを early return |
| `src/integration.test.tsx` | 変更 | インライン編集の end-to-end テスト追加 |

## Global Constraints

- パッケージマネージャ: **pnpm** (`package.json` の scripts は `pnpm test` / `pnpm run check` / `pnpm run format`)
- テストランナー: **vitest** (`npm test` ではなく `pnpm test`)
- 既存テストパターン: コンポーネントテストは `MindProvider initialState={s}` で `Capture` 子を使って `useMindStore().state` を読み取る。Hook テストは `renderHook` + `createElement(MindProvider, ...)` ラッパー
- コードスタイル: 既存コードに倣う (関数コンポーネント + 関数ヘルパー + Tailwind クラス)。コメントは付けない
- **`shell === bash` で `cd && command` 禁止**。`workdir` を使う
- 全タスク完了後、`pnpm test` と `pnpm run check` がエラーなしで通ること
- コミットメッセージは `<type>(mintodo): <description>` 形式。`<type>` は `feat` / `test` / `chore` / `refactor` のいずれか
- 既存の `EditModal` / `DslEditorModal` / 永続化 / 折り畳み / DnD リペアレント / ヘルプモーダル / ボード CRUD は **壊さない**
- ルートノードの `text` は `board.name` を反映するため、空文字を許可しない (`parseInlineDSL` の空判定は **非ルートノードのみ** 削除判定で使う)
- グローバルキーボードの `Escape` キーは `state.modal` が open なら まず modal を閉じる挙動を維持。インライン編集中は `useKeyboard` 側で early return し、`NodeInlineEditor` 内の textarea ハンドラで cancel する (二重発火回避)

---

## Task 1: `parseInlineDSL` を dsl.ts に追加 (TDD)

**Files:**
- Modify: `packages/mintodo/src/dsl.ts` (export を 1 つ追加)
- Modify: `packages/mintodo/src/dsl.test.ts` (新規 describe ブロック追加)

**Interfaces:**
- 既存 export: `parseDSL(text: string, boardId: string): DslParseResult | null` / `serializeDSL(...)` / 型 `DslParseResult`
- 新規 export:
  ```ts
  export interface InlineDslResult {
    text: string;
    hasAnyAttribute: boolean;
    priority: Priority | null;
    categoryColor: CategoryColor | null;
    dueDate: string | null;
    completed: boolean | null;
  }
  export function parseInlineDSL(text: string): InlineDslResult
  ```
- `parseInlineDSL` のルール:
  - 入力の前後空白を trim しない (生のまま扱う)
  - 空白でトークン化
  - `@` で始まるトークンを attribute 候補、それ以外を text 部分
  - text 部分: 空白で結合して **前後の空白は trim する** (認識属性は text に含めない)
  - 不正トークン (`@priority:urgent` 等): 黙って **text 側に含める** (寛容)
  - 未知トークン (`@foo:bar`): 黙って text 側に含める
  - 空文字 / 空白のみの入力: `{ text: "", hasAnyAttribute: false, ...全部 null }`
  - `hasAnyAttribute` は **認識可能トークン** (`@priority` / `@color` / `@due` / `@done`) のいずれかが 1 つでも含まれていれば true
  - 不正値のトークンは `hasAnyAttribute` を true にしない (無視されたため)

- [ ] **Step 1: 失敗するテストを追加**

`packages/mintodo/src/dsl.test.ts` の末尾に新しい `describe` ブロックを追加 (import には `parseInlineDSL` を追加):

```ts
import { parseDSL, parseInlineDSL, serializeDSL } from "./dsl";
// ... 既存の import はそのまま

describe("parseInlineDSL", () => {
  it("returns empty result for empty string", () => {
    expect(parseInlineDSL("")).toEqual({
      text: "",
      hasAnyAttribute: false,
      priority: null,
      categoryColor: null,
      dueDate: null,
      completed: null,
    });
  });

  it("returns empty result for whitespace-only string", () => {
    expect(parseInlineDSL("   ")).toEqual({
      text: "",
      hasAnyAttribute: false,
      priority: null,
      categoryColor: null,
      dueDate: null,
      completed: null,
    });
  });

  it("returns plain text without attributes", () => {
    expect(parseInlineDSL("hello")).toEqual({
      text: "hello",
      hasAnyAttribute: false,
      priority: null,
      categoryColor: null,
      dueDate: null,
      completed: null,
    });
  });

  it("extracts @priority:high", () => {
    const r = parseInlineDSL("hello @priority:high");
    expect(r.text).toBe("hello");
    expect(r.hasAnyAttribute).toBe(true);
    expect(r.priority).toBe("high");
  });

  it("extracts @done as completed flag", () => {
    const r = parseInlineDSL("buy milk @done");
    expect(r.text).toBe("buy milk");
    expect(r.hasAnyAttribute).toBe(true);
    expect(r.completed).toBe(true);
  });

  it("extracts multiple attributes", () => {
    const r = parseInlineDSL("task @priority:high @color:sky @done @due:2026-06-25");
    expect(r.text).toBe("task");
    expect(r.priority).toBe("high");
    expect(r.categoryColor).toBe("sky");
    expect(r.completed).toBe(true);
    expect(r.dueDate).toBe("2026-06-25");
    expect(r.hasAnyAttribute).toBe(true);
  });

  it("keeps invalid @priority:urgent as text", () => {
    const r = parseInlineDSL("hello @priority:urgent");
    expect(r.text).toBe("hello @priority:urgent");
    expect(r.priority).toBeNull();
    expect(r.hasAnyAttribute).toBe(false);
  });

  it("keeps invalid @color:purple as text", () => {
    const r = parseInlineDSL("hello @color:purple");
    expect(r.text).toBe("hello @color:purple");
    expect(r.categoryColor).toBeNull();
    expect(r.hasAnyAttribute).toBe(false);
  });

  it("keeps invalid @due as text", () => {
    const r = parseInlineDSL("hello @due:notadate");
    expect(r.text).toBe("hello @due:notadate");
    expect(r.dueDate).toBeNull();
    expect(r.hasAnyAttribute).toBe(false);
  });

  it("keeps unknown @foo:bar as text", () => {
    const r = parseInlineDSL("hello @foo:bar");
    expect(r.text).toBe("hello @foo:bar");
    expect(r.hasAnyAttribute).toBe(false);
  });

  it("handles text that is only attributes", () => {
    const r = parseInlineDSL("@priority:high");
    expect(r.text).toBe("");
    expect(r.hasAnyAttribute).toBe(true);
    expect(r.priority).toBe("high");
  });

  it("joins multi-word text with single spaces", () => {
    const r = parseInlineDSL("foo   bar  baz @priority:high");
    expect(r.text).toBe("foo bar baz");
    expect(r.priority).toBe("high");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm --filter mintodo test -- dsl.test.ts -t parseInlineDSL`
Expected: FAIL (`parseInlineDSL is not a function`)

- [ ] **Step 3: `parseInlineDSL` を実装**

`packages/mintodo/src/dsl.ts` の末尾 (export `serializeDSL` の後) に追加。`parseDSL` の ALLOWED セット / `isValidDate` を再利用する:

```ts
export interface InlineDslResult {
  text: string;
  hasAnyAttribute: boolean;
  priority: Priority | null;
  categoryColor: CategoryColor | null;
  dueDate: string | null;
  completed: boolean | null;
}

export function parseInlineDSL(raw: string): InlineDslResult {
  const result: InlineDslResult = {
    text: "",
    hasAnyAttribute: false,
    priority: null,
    categoryColor: null,
    dueDate: null,
    completed: null,
  };
  if (!raw) return result;

  const tokens = raw.split(/\s+/u).filter((t) => t.length > 0);
  const textTokens: string[] = [];

  for (const tok of tokens) {
    if (!tok.startsWith("@")) {
      textTokens.push(tok);
      continue;
    }
    const colon = tok.indexOf(":");
    const key = colon === -1 ? tok.slice(1) : tok.slice(1, colon);
    const value = colon === -1 ? "" : tok.slice(colon + 1);
    switch (key) {
      case "priority": {
        if (ALLOWED_PRIORITIES.has(value as Priority)) {
          result.priority = value as Priority;
          result.hasAnyAttribute = true;
        } else {
          textTokens.push(tok);
        }
        break;
      }
      case "color": {
        if (ALLOWED_COLORS.has(value as CategoryColor)) {
          result.categoryColor = value as CategoryColor;
          result.hasAnyAttribute = true;
        } else {
          textTokens.push(tok);
        }
        break;
      }
      case "due": {
        if (isValidDate(value)) {
          result.dueDate = value;
          result.hasAnyAttribute = true;
        } else {
          textTokens.push(tok);
        }
        break;
      }
      case "done": {
        result.completed = true;
        result.hasAnyAttribute = true;
        break;
      }
      default: {
        textTokens.push(tok);
        break;
      }
    }
  }

  result.text = textTokens.join(" ").trim();
  return result;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm --filter mintodo test -- dsl.test.ts -t parseInlineDSL`
Expected: 全件 PASS

- [ ] **Step 5: format & lint**

Run: `pnpm --filter mintodo format && pnpm --filter mintodo check`

- [ ] **Step 6: コミット**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io
git add packages/mintodo/src/dsl.ts packages/mintodo/src/dsl.test.ts
git commit -m "feat(mintodo): add parseInlineDSL for single-line DSL input"
```

---

## Task 2: store に inline edit state と action を追加 (TDD)

**Files:**
- Modify: `packages/mintodo/src/store.ts`
- Modify: `packages/mintodo/src/store.test.ts`

**Interfaces:**
- `State` に追加: `editingNodeId: string | null`, `pendingCreationNodeId: string | null`
- `Action` に追加:
  ```ts
  | { type: "OPEN_INLINE_EDIT"; nodeId: string }
  | { type: "CLOSE_INLINE_EDIT" }
  | { type: "CANCEL_INLINE_EDIT" }
  | { type: "SAVE_INLINE_EDIT"; id: string; patch: { text: string; priority: Priority; categoryColor: CategoryColor; dueDate: string; completed: boolean } }
  ```
- `ADD_CHILD` の変更: `text: "新規タスク"` → `text: ""`、戻り値に `editingNodeId: newId` と `pendingCreationNodeId: newId` を追加
- 各新規 action の挙動は spec に従う:
  - `OPEN_INLINE_EDIT`: `{ ...state, selectedNodeId: action.nodeId, editingNodeId: action.nodeId }` (pendingCreationNodeId はそのまま)
  - `CLOSE_INLINE_EDIT`: `{ ...state, editingNodeId: null, pendingCreationNodeId: null }`
  - `CANCEL_INLINE_EDIT`: `pendingCreationNodeId === editingNodeId` ならそのノードを `DELETE_NODE` 相当の処理 (DELETE の case ロジックを内部関数化せず、case 内に書く)、その後 `{ editingNodeId: null, pendingCreationNodeId: null }`
  - `SAVE_INLINE_EDIT`: `UPDATE_NODE` 相当で `action.patch` を `action.id` のノードにマージ。`{ ...state, nodes: next, editingNodeId: null, pendingCreationNodeId: null }` (`withRadialLayout` は使わない。テキストと属性だけなので radial 配置は変わらないが、念のため呼ばない; テストで確認)
- `createInitialState` の両 state を `null` に

- [ ] **Step 1: 失敗するテストを追加**

`packages/mintodo/src/store.test.ts` の末尾に新規 `describe` ブロック追加。`makeNode` ヘルパーは既存のもの (行 5) をそのまま使う:

```ts
describe("reducer - inline edit state", () => {
  function makeStateWithInline(overrides: { editingNodeId?: string | null; pendingCreationNodeId?: string | null; nodes?: Record<string, MindNode> } = {}): State {
    return {
      ...createInitialState(),
      currentBoardId: "b-a",
      nodes: overrides.nodes ?? {
        root: makeNode("root", "b-a", { isRoot: true, text: "R" }),
        a: makeNode("a", "b-a", { parentId: "root", text: "A" }),
      },
      editingNodeId: overrides.editingNodeId ?? null,
      pendingCreationNodeId: overrides.pendingCreationNodeId ?? null,
    };
  }

  it("createInitialState starts with editingNodeId=null, pendingCreationNodeId=null", () => {
    const s = createInitialState();
    expect(s.editingNodeId).toBeNull();
    expect(s.pendingCreationNodeId).toBeNull();
  });

  it("OPEN_INLINE_EDIT sets editingNodeId and selectedNodeId", () => {
    const s = makeStateWithInline();
    const next = reducer(s, { type: "OPEN_INLINE_EDIT", nodeId: "a" });
    expect(next.editingNodeId).toBe("a");
    expect(next.selectedNodeId).toBe("a");
  });

  it("CLOSE_INLINE_EDIT clears both edit state fields", () => {
    const s = makeStateWithInline({ editingNodeId: "a", pendingCreationNodeId: "a" });
    const next = reducer(s, { type: "CLOSE_INLINE_EDIT" });
    expect(next.editingNodeId).toBeNull();
    expect(next.pendingCreationNodeId).toBeNull();
  });

  it("CANCEL_INLINE_EDIT on existing node clears state without deleting", () => {
    const s = makeStateWithInline({ editingNodeId: "a" });
    const next = reducer(s, { type: "CANCEL_INLINE_EDIT" });
    expect(next.editingNodeId).toBeNull();
    expect(next.nodes.a).toBeDefined();
  });

  it("CANCEL_INLINE_EDIT on a newly-created node deletes it", () => {
    const nodes = {
      root: makeNode("root", "b-a", { isRoot: true, text: "R", children: ["a"] }),
      a: makeNode("a", "b-a", { parentId: "root", text: "" }),
    };
    const s = makeStateWithInline({ nodes, editingNodeId: "a", pendingCreationNodeId: "a" });
    const next = reducer(s, { type: "CANCEL_INLINE_EDIT" });
    expect(next.nodes.a).toBeUndefined();
    expect(next.nodes.root.children).not.toContain("a");
    expect(next.editingNodeId).toBeNull();
    expect(next.pendingCreationNodeId).toBeNull();
  });

  it("SAVE_INLINE_EDIT applies the patch to the target node and clears state", () => {
    const s = makeStateWithInline({ editingNodeId: "a" });
    const next = reducer(s, {
      type: "SAVE_INLINE_EDIT",
      id: "a",
      patch: { text: "new", priority: "high", categoryColor: "sky", dueDate: "2026-06-25", completed: true },
    });
    expect(next.nodes.a.text).toBe("new");
    expect(next.nodes.a.priority).toBe("high");
    expect(next.nodes.a.categoryColor).toBe("sky");
    expect(next.nodes.a.dueDate).toBe("2026-06-25");
    expect(next.nodes.a.completed).toBe(true);
    expect(next.editingNodeId).toBeNull();
  });

  it("ADD_CHILD sets text='' and editingNodeId/pendingCreationNodeId to newId", () => {
    const s = makeStateWithInline();
    const next = reducer(s, { type: "ADD_CHILD", newId: "n1", parentId: "root" });
    expect(next.nodes.n1.text).toBe("");
    expect(next.editingNodeId).toBe("n1");
    expect(next.pendingCreationNodeId).toBe("n1");
    expect(next.nodes.n1.categoryColor).toBe("slate");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm --filter mintodo test -- store.test.ts -t "inline edit"`
Expected: FAIL (action が未定義 / 期待値と不一致)

- [ ] **Step 3: store.ts を変更**

`packages/mintodo/src/store.ts` を以下のように変更:

(a) `State` interface に 2 フィールド追加:

```ts
export interface State {
  // ... 既存フィールド
  editingNodeId: string | null;
  pendingCreationNodeId: string | null;
  // ... 既存
}
```

(b) `createInitialState` の戻り値に 2 行追加:

```ts
editingNodeId: null,
pendingCreationNodeId: null,
```

(c) `Action` union に 4 case 追加 (UPDATE_NODE の前あたりに挿入):

```ts
| { type: "OPEN_INLINE_EDIT"; nodeId: string }
| { type: "CLOSE_INLINE_EDIT" }
| { type: "CANCEL_INLINE_EDIT" }
| {
    type: "SAVE_INLINE_EDIT";
    id: string;
    patch: { text: string; priority: Priority; categoryColor: CategoryColor; dueDate: string; completed: boolean };
  }
```

(d) `Priority` / `CategoryColor` の import を `types` から追加 (既にあるはず。なければ `import type { Board, CategoryColor, MindNode, Modal, Priority, View } from "./types";` に変更)

(e) reducer switch の `SELECT` ケースの **前** に `OPEN_INLINE_EDIT` ケース追加:

```ts
case "OPEN_INLINE_EDIT": {
  return { ...state, selectedNodeId: action.nodeId, editingNodeId: action.nodeId };
}
```

(f) `DELETE_NODE` ケースの **後** に `CLOSE_INLINE_EDIT` / `CANCEL_INLINE_EDIT` / `SAVE_INLINE_EDIT` ケース追加:

```ts
case "CLOSE_INLINE_EDIT": {
  return { ...state, editingNodeId: null, pendingCreationNodeId: null };
}
case "CANCEL_INLINE_EDIT": {
  if (state.editingNodeId && state.editingNodeId === state.pendingCreationNodeId) {
    const target = state.nodes[state.editingNodeId];
    if (target && !target.isRoot) {
      const updated = new Map(Object.entries(state.nodes));
      const remove = (id: string): void => {
        const n = updated.get(id);
        if (!n) return;
        for (const cid of n.children) remove(cid);
        updated.delete(id);
      };
      remove(state.editingNodeId);
      if (target.parentId) {
        const parent = updated.get(target.parentId);
        if (parent) {
          updated.set(parent.id, {
            ...parent,
            children: parent.children.filter((c) => c !== state.editingNodeId),
          });
        }
      }
      return withRadialLayout(
        { ...state, nodes: Object.fromEntries(updated), editingNodeId: null, pendingCreationNodeId: null },
        Object.fromEntries(updated),
      );
    }
  }
  return { ...state, editingNodeId: null, pendingCreationNodeId: null };
}
case "SAVE_INLINE_EDIT": {
  const node = state.nodes[action.id];
  if (!node) return { ...state, editingNodeId: null, pendingCreationNodeId: null };
  const updated = { ...state.nodes, [action.id]: { ...node, ...action.patch } };
  return {
    ...state,
    nodes: updated,
    editingNodeId: null,
    pendingCreationNodeId: null,
  };
}
```

(g) `ADD_CHILD` ケースを 2 箇所変更:
- `text: "新規タスク",` → `text: "",`
- 戻り値: `return withRadialLayout({ ...state, nodes: nextNodes, selectedNodeId: newId }, nextNodes);` を以下のように変更 (editingNodeId と pendingCreationNodeId を同時セット):

```ts
return withRadialLayout(
  {
    ...state,
    nodes: nextNodes,
    selectedNodeId: newId,
    editingNodeId: newId,
    pendingCreationNodeId: newId,
  },
  nextNodes,
);
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm --filter mintodo test -- store.test.ts`
Expected: 全件 PASS (既存テストも壊さない)

- [ ] **Step 5: format & lint**

Run: `pnpm --filter mintodo format && pnpm --filter mintodo check`

- [ ] **Step 6: コミット**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io
git add packages/mintodo/src/store.ts packages/mintodo/src/store.test.ts
git commit -m "feat(mintodo): add inline edit state and 4 actions to store"
```

---

## Task 3: `NodeInlineEditor` コンポーネントを新規作成 (TDD)

**Files:**
- Create: `packages/mintodo/src/components/NodeInlineEditor.tsx`
- Create: `packages/mintodo/src/components/NodeInlineEditor.test.tsx`

**Interfaces:**
- Props:
  ```ts
  interface Props {
    node: MindNode;
    onCancel: () => void;
    onSave: (patch: { text: string; priority: Priority; categoryColor: CategoryColor; dueDate: string; completed: boolean }) => void;
    onDelete: () => void;
  }
  ```
- 内部 state: `text` / `expanded` (default `false`) / `priority` / `color` / `dueDate` / `barTouched` (default `false`)
- 初期化: マウント時に `parseInlineDSL(node.text)` を実行し、結果を bar 初期値に反映。`text` state は `node.text` をそのまま入れる
- 表示構造 (既存の `EditModal` のスタイルを参考):
  - textarea: `w-full`, `min-h-[80px]`, `min-w-[240px]`, `max-w-[480px]`, `border`, `rounded`, `p-2`, `text-sm`, `font-mono`
  - 折りたたみトグル: `<button>` `▸ 属性 (N)` / `▾ 属性 (N)` (`N` は `barTouched` または DSL 由来の属性数。実装は `{expanded ? "▾" : "▸"} 属性` で OK、N の表示は nice-to-have)
  - 展開時: 色 swatches (4) / 優先度 buttons (3) / 期限 `<input type="date">`
  - フッタ: `キャンセル` / `保存` ボタン
- キーボード:
  - textarea 内 `Enter` (Shift なし) → 保存
  - textarea 内 `Shift+Enter` → 改行
  - `Escape` (textarea フォーカス中) → キャンセル
- textarea 変更ハンドラ:
  1. `setText(value)`
  2. `parseInlineDSL(value)` で `dsl` を取得
  3. `!barTouched` の場合のみ、bar の `priority` / `color` / `dueDate` を `dsl.priority` / `dsl.categoryColor` / `dsl.dueDate` で更新 (null なら `node.priority` 等の元の値を維持)
- 属性バークリック: bar 値を更新 + `setBarTouched(true)`
- 保存ロジック (`onSave` 呼び出し前):
  1. `parseInlineDSL(text)` で `dsl` を取得
  2. `dsl.text === "" && !dsl.hasAnyAttribute` → `onDelete()` 呼んで終了
  3. それ以外 → `onSave({ text: dsl.text, priority, categoryColor: color, dueDate, completed: dsl.completed ?? node.completed })` (bar の現在の値を保存)

- [ ] **Step 1: 失敗するテストを追加**

新規ファイル `packages/mintodo/src/components/NodeInlineEditor.test.tsx`:

```tsx
import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NodeInlineEditor } from "./NodeInlineEditor";
import type { MindNode } from "../types";

function makeNode(opts: Partial<MindNode> = {}): MindNode {
  return {
    id: "n1",
    boardId: "b1",
    text: "initial",
    parentId: "root",
    isRoot: false,
    completed: false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    children: [],
    x: 0,
    y: 0,
    ...opts,
  };
}

describe("NodeInlineEditor", () => {
  it("renders textarea with node.text", () => {
    const { container } = render(
      <NodeInlineEditor
        node={makeNode({ text: "hello" })}
        onCancel={() => {}}
        onSave={() => {}}
        onDelete={() => {}}
      />,
    );
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(ta.value).toBe("hello");
  });

  it("calls onSave with the text on Enter (no shift)", () => {
    const onSave = vi.fn();
    const { container } = render(
      <NodeInlineEditor
        node={makeNode()}
        onCancel={() => {}}
        onSave={onSave}
        onDelete={() => {}}
      />,
    );
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "new text" } });
    });
    act(() => {
      fireEvent.keyDown(ta, { key: "Enter", shiftKey: false });
    });
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ text: "new text" }),
    );
  });

  it("does not call onSave on Shift+Enter (allows newline)", () => {
    const onSave = vi.fn();
    const { container } = render(
      <NodeInlineEditor
        node={makeNode()}
        onCancel={() => {}}
        onSave={onSave}
        onDelete={() => {}}
      />,
    );
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.keyDown(ta, { key: "Enter", shiftKey: true });
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onCancel on Escape", () => {
    const onCancel = vi.fn();
    const { container } = render(
      <NodeInlineEditor
        node={makeNode()}
        onCancel={onCancel}
        onSave={() => {}}
        onDelete={() => {}}
      />,
    );
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.keyDown(ta, { key: "Escape" });
    });
    expect(onCancel).toHaveBeenCalled();
  });

  it("extracts @priority:high and reflects on bar", () => {
    const { container } = render(
      <NodeInlineEditor
        node={makeNode()}
        onCancel={() => {}}
        onSave={() => {}}
        onDelete={() => {}}
      />,
    );
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "task @priority:high" } });
    });
    // 展開して「高」ボタンが selected 状態か確認
    const toggle = container.querySelector("[data-attr-toggle]") as HTMLButtonElement;
    act(() => {
      fireEvent.click(toggle);
    });
    const highBtn = container.querySelector("[data-priority='high']") as HTMLButtonElement;
    expect(highBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("calls onDelete when saving with empty text and no DSL attributes", () => {
    const onDelete = vi.fn();
    const onSave = vi.fn();
    const { container } = render(
      <NodeInlineEditor
        node={makeNode()}
        onCancel={() => {}}
        onSave={onSave}
        onDelete={onDelete}
      />,
    );
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "" } });
    });
    act(() => {
      fireEvent.keyDown(ta, { key: "Enter" });
    });
    expect(onDelete).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onSave with the current bar values when no DSL attribute is typed", () => {
    const onSave = vi.fn();
    const { container } = render(
      <NodeInlineEditor
        node={makeNode()}
        onCancel={() => {}}
        onSave={onSave}
        onDelete={() => {}}
      />,
    );
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "just text" } });
    });
    const toggle = container.querySelector("[data-attr-toggle]") as HTMLButtonElement;
    act(() => {
      fireEvent.click(toggle);
    });
    const highBtn = container.querySelector("[data-priority='high']") as HTMLButtonElement;
    act(() => {
      fireEvent.click(highBtn);
    });
    act(() => {
      fireEvent.keyDown(ta, { key: "Enter" });
    });
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ text: "just text", priority: "high" }),
    );
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm --filter mintodo test -- NodeInlineEditor.test.tsx`
Expected: FAIL (`Cannot find module './NodeInlineEditor'`)

- [ ] **Step 3: `NodeInlineEditor` を実装**

`packages/mintodo/src/components/NodeInlineEditor.tsx` を新規作成:

```tsx
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { parseInlineDSL } from "../dsl";
import type { CategoryColor, MindNode, Priority } from "../types";

interface Props {
  node: MindNode;
  onCancel: () => void;
  onSave: (patch: {
    text: string;
    priority: Priority;
    categoryColor: CategoryColor;
    dueDate: string;
    completed: boolean;
  }) => void;
  onDelete: () => void;
}

const COLORS: { value: CategoryColor; label: string; bg: string }[] = [
  { value: "slate", label: "slate", bg: "bg-slate-400" },
  { value: "sky", label: "sky", bg: "bg-sky-400" },
  { value: "emerald", label: "emerald", bg: "bg-emerald-400" },
  { value: "rose", label: "rose", bg: "bg-rose-400" },
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];

function swatchActive(c: CategoryColor, current: CategoryColor): string {
  return c === current ? "ring-2 ring-offset-1 ring-slate-700 dark:ring-slate-200" : "";
}

export function NodeInlineEditor({ node, onCancel, onSave, onDelete }: Props) {
  const initial = parseInlineDSL(node.text);
  const [text, setText] = useState<string>(node.text);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [priority, setPriority] = useState<Priority>(initial.priority ?? node.priority);
  const [color, setColor] = useState<CategoryColor>(initial.categoryColor ?? node.categoryColor);
  const [dueDate, setDueDate] = useState<string>(initial.dueDate ?? node.dueDate);
  const [barTouched, setBarTouched] = useState<boolean>(false);

  function handleTextChange(value: string): void {
    setText(value);
    if (!barTouched) {
      const dsl = parseInlineDSL(value);
      setPriority(dsl.priority ?? node.priority);
      setColor(dsl.categoryColor ?? node.categoryColor);
      setDueDate(dsl.dueDate ?? node.dueDate);
    }
  }

  function handlePriorityClick(p: Priority): void {
    setPriority(p);
    setBarTouched(true);
  }

  function handleColorClick(c: CategoryColor): void {
    setColor(c);
    setBarTouched(true);
  }

  function handleDueDateChange(d: string): void {
    setDueDate(d);
    setBarTouched(true);
  }

  function commit(): void {
    const dsl = parseInlineDSL(text);
    if (dsl.text === "" && !dsl.hasAnyAttribute) {
      onDelete();
      return;
    }
    onSave({
      text: dsl.text,
      priority,
      categoryColor: color,
      dueDate,
      completed: dsl.completed ?? node.completed,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commit();
    }
  }

  return (
    <div
      data-inline-editor
      className="bg-white dark:bg-slate-800 border-2 border-sky-400 rounded-lg p-3 shadow-lg flex flex-col gap-2 min-w-[260px] max-w-[480px]"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <textarea
        autoFocus
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        className="w-full text-sm font-mono border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 resize-y min-h-[60px]"
      />
      <button
        type="button"
        data-attr-toggle
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 self-start hover:underline"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        属性
      </button>
      {expanded && (
        <div className="flex flex-col gap-2 border-t border-slate-200 dark:border-slate-700 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-12">色</span>
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => handleColorClick(c.value)}
                className={`w-6 h-6 rounded-full ${c.bg} ${swatchActive(c.value, color)}`}
                aria-label={c.label}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-12">優先度</span>
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                data-priority={p.value}
                aria-pressed={priority === p.value}
                onClick={() => handlePriorityClick(p.value)}
                className={`px-2 py-1 text-xs rounded border ${priority === p.value ? "bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900" : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-12">期限</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => handleDueDateChange(e.target.value)}
              className="text-xs border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      )}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={commit}
          className="px-3 py-1 text-xs rounded bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
        >
          保存
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm --filter mintodo test -- NodeInlineEditor.test.tsx`
Expected: 全件 PASS

- [ ] **Step 5: format & lint**

Run: `pnpm --filter mintodo format && pnpm --filter mintodo check`

- [ ] **Step 6: コミット**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io
git add packages/mintodo/src/components/NodeInlineEditor.tsx packages/mintodo/src/components/NodeInlineEditor.test.tsx
git commit -m "feat(mintodo): add NodeInlineEditor with collapsible attribute bar"
```

---

## Task 4: `NodeCard` に click/dblclick と編集モード render 切替を追加 (TDD)

**Files:**
- Modify: `packages/mintodo/src/components/NodeCard.tsx`
- Modify: `packages/mintodo/src/components/NodeCard.test.tsx`

**Interfaces:**
- 既存の `Props { node: MindNode }` は変えない
- `useMindStore()` から `state.editingNodeId` を取得
- 編集モード (`state.editingNodeId === node.id`) のとき:
  - `draggable={false}`
  - 通常 render の代わりに `<NodeInlineEditor node={node} onCancel={...} onSave={...} onDelete={...} />` を描画
  - `onCancel={() => dispatch({ type: "CANCEL_INLINE_EDIT" })}`
  - `onSave={(patch) => dispatch({ type: "SAVE_INLINE_EDIT", id: node.id, patch })}`
  - `onDelete={() => { dispatch({ type: "DELETE_NODE", id: node.id }); dispatch({ type: "CLOSE_INLINE_EDIT" }); }}`
- 非編集モードの root と child の両 div に `onClick` と `onDoubleClick` を追加
  - `onClick={(e) => { e.stopPropagation(); dispatch({ id: node.id, type: "SELECT" }); }}` (内部ボタンは既に `e.stopPropagation()` しているので干渉しない)
  - `onDoubleClick={(e) => { e.stopPropagation(); dispatch({ type: "OPEN_INLINE_EDIT", nodeId: node.id }); }}`
- 編集モード中、root と child の div 自体は描画されない (`NodeInlineEditor` だけ)。drag ハンドラも描画されない
- 既存の ellipsis ボタンはそのまま `EditModal` を開く挙動を維持 (「…」は温存)

- [ ] **Step 1: 失敗するテストを追加**

`packages/mintodo/src/components/NodeCard.test.tsx` の末尾に新規 `describe` ブロック追加。`setup` / `Capture` / `makeState` / `makeNode` は既存のものを利用:

```tsx
describe("NodeCard inline edit wiring", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("click on child node dispatches SELECT", () => {
    const { container } = setup();
    const childEl = container.querySelector('[data-node-id="a"]') as HTMLElement;
    act(() => {
      fireEvent.click(childEl);
    });
    expect(capturedState!.selectedNodeId).toBe("a");
  });

  it("click on root node dispatches SELECT", () => {
    const { container } = setup();
    const rootEl = container.querySelector('[data-node-id="root"]') as HTMLElement;
    act(() => {
      fireEvent.click(rootEl);
    });
    expect(capturedState!.selectedNodeId).toBe("root");
  });

  it("double-click on child node dispatches OPEN_INLINE_EDIT", () => {
    const { container } = setup();
    const childEl = container.querySelector('[data-node-id="a"]') as HTMLElement;
    act(() => {
      fireEvent.doubleClick(childEl);
    });
    expect(capturedState!.editingNodeId).toBe("a");
    expect(capturedState!.selectedNodeId).toBe("a");
  });

  it("when editingNodeId matches node.id, NodeInlineEditor is rendered and add/collapse/ellipsis buttons are hidden", () => {
    const s: State = {
      ...makeState(),
      editingNodeId: "a",
    };
    const { container } = render(
      <MindProvider initialState={s}>
        <Capture />
        {Object.values(s.nodes).map((n: MindNode) => (
          <NodeCard key={n.id} node={n} />
        ))}
      </MindProvider>,
    );
    const editor = container.querySelector("[data-inline-editor]");
    expect(editor).toBeTruthy();
    const childEl = container.querySelector('[data-node-id="a"]') as HTMLElement;
    expect(childEl.querySelector("textarea")).toBeTruthy();
    // 編集モード中は ellipsis / add / collapse ボタンは出ない (NodeCard の通常 render 部分)
    expect(childEl.querySelector("[data-testid='ellipsis']")).toBeNull();
  });

  it("when editing, draggable is false on the editor's wrapper", () => {
    const s: State = {
      ...makeState(),
      editingNodeId: "a",
    };
    const { container } = render(
      <MindProvider initialState={s}>
        <Capture />
        {Object.values(s.nodes).map((n: MindNode) => (
          <NodeCard key={n.id} node={n} />
        ))}
      </MindProvider>,
    );
    // 編集モード時は NodeCard 由来の div (data-node-id="a") は出ない
    expect(container.querySelector('[data-node-id="a"]')).toBeNull();
  });
});
```

注: 既存テストの `makeState` は `editingNodeId: null` を含まない。`State` の `editingNodeId` が必須化されたので、既存 `makeState` 関数に以下を追加する必要あり (Task 2 で State interface を変更したため):

```ts
function makeState(): State {
  return {
    // ... 既存フィールド
    editingNodeId: null,
    pendingCreationNodeId: null,
    // ... 既存
  };
}
```

これを Step 1 のテスト追加より **先** に行う (Step 1.5 として独立させる)。

- [ ] **Step 1.5: 既存 `makeState` に新フィールドを追加**

`packages/mintodo/src/components/NodeCard.test.tsx` の `makeState` 関数に以下を追加:

```ts
editingNodeId: null,
pendingCreationNodeId: null,
```

(配置場所は `view: { pan: { x: 0, y: 0 }, zoom: 1 },` の直後)

- [ ] **Step 2: 既存テストが落ちないこと + 新テストが失敗することを確認**

Run: `pnpm --filter mintodo test -- NodeCard.test.tsx`
Expected: 既存 8 件は PASS、新規 "inline edit wiring" describe 内 5 件は FAIL

- [ ] **Step 3: `NodeCard.tsx` を変更**

`packages/mintodo/src/components/NodeCard.tsx` を以下のように変更:

(a) import 追加:

```ts
import { NodeInlineEditor } from "./NodeInlineEditor";
```

(b) `NodeCard` 関数本体の先頭、`isSelected` 取得の直後に追加:

```ts
const isEditing = state.editingNodeId === node.id;
```

(c) 関数の **最後** (root return の前) に、編集モード時の early return を追加:

```ts
if (isEditing) {
  return (
    <div
      id={`node-dom-${node.id}`}
      data-node-id={node.id}
      style={{ left: node.x, top: node.y }}
      className="absolute -translate-x-1/2 -translate-y-1/2"
    >
      <NodeInlineEditor
        node={node}
        onCancel={() => dispatch({ type: "CANCEL_INLINE_EDIT" })}
        onSave={(patch) => dispatch({ type: "SAVE_INLINE_EDIT", id: node.id, patch })}
        onDelete={() => {
          dispatch({ id: node.id, type: "DELETE_NODE" });
          dispatch({ type: "CLOSE_INLINE_EDIT" });
        }}
      />
    </div>
  );
}
```

(d) root return の div に追加 (既存 className の前あたり、`onMouseDown` 等の前):

```tsx
onClick={(e) => {
  e.stopPropagation();
  dispatch({ id: node.id, type: "SELECT" });
}}
onDoubleClick={(e) => {
  e.stopPropagation();
  dispatch({ type: "OPEN_INLINE_EDIT", nodeId: node.id });
}}
```

(e) child return の div に追加 (同じ位置):

```tsx
onClick={(e) => {
  e.stopPropagation();
  dispatch({ id: node.id, type: "SELECT" });
}}
onDoubleClick={(e) => {
  e.stopPropagation();
  dispatch({ type: "OPEN_INLINE_EDIT", nodeId: node.id });
}}
```

(f) ellipsis ボタンに `data-testid="ellipsis"` を追加 (既存 test との衝突なしの確認として):

```tsx
<button
  type="button"
  data-testid="ellipsis"
  // ... 既存 props
>
```

(g) 両方の plus ボタン (root 用 `+` と child 用 `+`) から `dispatch({ modal: ..., type: "OPEN_MODAL" })` を削除。`ADD_CHILD` の reducer が `editingNodeId: newId` をセットするため、これだけで inline edit が自動で開く。修正後:

root の plus ボタン:
```tsx
onClick={(e) => {
  e.stopPropagation();
  const newId = `node-${Date.now()}`;
  dispatch({ newId, parentId: node.id, type: "ADD_CHILD" });
}}
```

child の plus ボタン:
```tsx
onClick={(e) => {
  e.stopPropagation();
  const newId = `node-${Date.now()}`;
  dispatch({ newId, parentId: node.id, type: "ADD_CHILD" });
}}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm --filter mintodo test -- NodeCard.test.tsx`
Expected: 全件 PASS

- [ ] **Step 5: format & lint**

Run: `pnpm --filter mintodo format && pnpm --filter mintodo check`

- [ ] **Step 6: コミット**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io
git add packages/mintodo/src/components/NodeCard.tsx packages/mintodo/src/components/NodeCard.test.tsx
git commit -m "feat(mintodo): wire click/dblclick to SELECT and inline edit in NodeCard"
```

---

## Task 5: `Canvas.tsx` で `onRequestEdit` を NodeCard に渡す

**Files:**
- Modify: `packages/mintodo/src/components/Canvas.tsx`

**Interfaces:**
- 変更なし。`<NodeCard>` に `onRequestEdit` を渡す新しい prop は **追加しない** (NodeCard は `useMindStore` を直接呼ぶので、外部 prop は不要)
- 確認: `NodeCard` 内部で `useMindStore()` を呼んで dispatch しているため、Canvas 側での prop 追加は不要。Canvas 側の変更はゼロでも成立する

- [ ] **Step 1: 変更不要であることを確認**

`Canvas.tsx` を読んで、NodeCard に prop を渡していないことを確認する:

Run: `grep -n "NodeCard" /Users/kojima.takashi/src/github.com/mijime/mijime.github.io/packages/mintodo/src/components/Canvas.tsx`
Expected: `<NodeCard key={n.id} node={n} />` の 1 行のみ。変更不要

- [ ] **Step 2: コミット (変更なしなので no-op)**

`git status` で Canvas.tsx に差分が出ないことを確認。差分が出たら rebase して前のタスクに含める。no-op の場合このタスクはスキップ可能だが、チェックポイントとして残す。

Run: `cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io && git status`
Expected: クリーン (no changes to commit)

---

## Task 6: `use-keyboard.ts` で編集中はショートカットを無効化 & Tab/Enter/E の dispatch を inline edit 向けに変更

**Files:**
- Modify: `packages/mintodo/src/hooks/use-keyboard.ts`

**Interfaces:**
- (a) `onKeyDown` 関数の **Escape case の前** にガード追加:
  ```ts
  if (state.editingNodeId !== null) return;
  ```
  - `isEditableTarget(e.target)` の **前** に置く (textarea 編集中は何も発火させない)
- (b) `Tab` ケース / `Enter` ケース: `ADD_CHILD` の dispatch 後に続く `OPEN_MODAL` を削除。`ADD_CHILD` の reducer が `editingNodeId: newId` をセットするため、これだけで inline edit が開く
- (c) `e` / `E` ケース: `OPEN_MODAL` (EditModal 起動) を `OPEN_INLINE_EDIT` (inline edit 起動) に変更
- (d) `Space` ケースはそのまま (完了トグル、編集とは独立)

- [ ] **Step 1: `use-keyboard.ts` を変更**

`packages/mintodo/src/hooks/use-keyboard.ts` を以下のように修正:

(a) `onKeyDown` 関数の先頭 (Escape 判定の前) に追加:
```ts
if (state.editingNodeId !== null) return;
```

(b) `Tab` ケースを以下に置換:
```ts
case "Tab": {
  e.preventDefault();
  const newId = `node-${Date.now()}`;
  dispatch({ newId, parentId: state.selectedNodeId, type: "ADD_CHILD" });
  break;
}
```

(c) `Enter` ケースを以下に置換 (OPEN_MODAL 行を削除):
```ts
case "Enter": {
  if (!active.isRoot && active.parentId) {
    e.preventDefault();
    const newId = `node-${Date.now()}`;
    dispatch({ newId, parentId: active.parentId, type: "ADD_CHILD" });
  }
  break;
}
```

(d) `e`/`E` ケースを以下に置換 (OPEN_MODAL → OPEN_INLINE_EDIT):
```ts
case "e":
case "E": {
  if (!active.isRoot) {
    e.preventDefault();
    dispatch({ type: "OPEN_INLINE_EDIT", nodeId: state.selectedNodeId });
  }
  break;
}
```

- [ ] **Step 2: 既存テストが落ちないことを確認**

Run: `pnpm --filter mintodo test`
Expected: 全件 PASS (既存テストに use-keyboard 単体のテストはないが、間接的に integration test でカバー)

- [ ] **Step 3: format & lint**

Run: `pnpm --filter mintodo format && pnpm --filter mintodo check`

- [ ] **Step 4: コミット**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io
git add packages/mintodo/src/hooks/use-keyboard.ts
git commit -m "feat(mintodo): disable global keyboard shortcuts while inline editing; switch Tab/Enter/E to inline edit"
```

---

## Task 7: 統合テストで end-to-end の動作を確認

**Files:**
- Modify: `packages/mintodo/src/integration.test.tsx`

**Interfaces:**
- 既存の `App` render + ボード作成テスト (行 12-50) はそのまま
- 新規 describe ブロックで以下を確認:
  - ボード作成 → ノード dblclick → inline editor 表示
  - textarea に `タスク @priority:high` 入力 → Enter → ノードの `text` が `タスク` (DSL トークン除去) で `priority: "high"` に更新
  - 別のノード dblclick → 新規 inline editor 表示 (前の編集は確定保存扱い)

- [ ] **Step 1: 失敗するテストを追加**

`packages/mintodo/src/integration.test.tsx` の末尾に新規 `describe` 追加:

```tsx
describe("inline edit end-to-end", () => {
  afterEach(async () => {
    await db.delete();
  });

  it("dblclick on root then dblclick on child opens inline editor; type and save updates the node", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });

    fireEvent.click(screen.getByText("+ 新規ボード作成"));
    const input = screen.getByPlaceholderText("例: メインプロジェクト") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Test" } });
    await act(() => {
      fireEvent.click(screen.getByText("作成"));
    });
    await act(async () => {
      await flush(300);
    });

    // dblclick on root to open inline editor
    const root = document.querySelector('[data-node-id="root"]') as HTMLElement;
    expect(root).toBeTruthy();
    await act(async () => {
      fireEvent.doubleClick(root);
    });
    const editor = document.querySelector("[data-inline-editor]");
    expect(editor).toBeTruthy();
    const ta = editor!.querySelector("textarea") as HTMLTextAreaElement;
    expect(ta.value).toBe("Test");

    // type new text with DSL token
    await act(async () => {
      fireEvent.change(ta, { target: { value: "買い物 @priority:high" } });
    });
    await act(async () => {
      fireEvent.keyDown(ta, { key: "Enter" });
    });
    await act(async () => {
      await flush(50);
    });

    // editor should be gone, root text should be "買い物"
    expect(document.querySelector("[data-inline-editor]")).toBeNull();
    const rootAfter = document.querySelector('[data-node-id="root"]') as HTMLElement;
    expect(rootAfter.textContent).toContain("買い物");
    expect(rootAfter.textContent).not.toContain("@priority");

    // verify in DB
    const nodes = await db.nodes.toArray();
    const rootNode = nodes.find((n) => n.isRoot);
    expect(rootNode).toBeTruthy();
    expect(rootNode!.text).toBe("買い物");
    expect(rootNode!.priority).toBe("high");
  });

  it("pressing Tab on the root creates a new child and auto-opens inline editor with empty text", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });

    fireEvent.click(screen.getByText("+ 新規ボード作成"));
    const input = screen.getByPlaceholderText("例: メインプロジェクト") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Test" } });
    await act(() => {
      fireEvent.click(screen.getByText("作成"));
    });
    await act(async () => {
      await flush(300);
    });

    // focus the body and press Tab while root is selected
    const root = document.querySelector('[data-node-id="root"]') as HTMLElement;
    expect(root).toBeTruthy();
    await act(async () => {
      fireEvent.click(root); // SELECT root
    });
    await act(async () => {
      fireEvent.keyDown(document.body, { key: "Tab" });
    });
    await act(async () => {
      await flush(50);
    });

    // new child node should exist, editor should be open with empty text
    const editor = document.querySelector("[data-inline-editor]");
    expect(editor).toBeTruthy();
    const ta = editor!.querySelector("textarea") as HTMLTextAreaElement;
    expect(ta.value).toBe("");

    // pressing Esc on empty new node should delete it (CANCEL_INLINE_EDIT on pending creation)
    await act(async () => {
      fireEvent.keyDown(ta, { key: "Escape" });
    });
    await act(async () => {
      await flush(50);
    });
    expect(document.querySelector("[data-inline-editor]")).toBeNull();

    const nodes = await db.nodes.toArray();
    expect(nodes.filter((n) => !n.isRoot)).toHaveLength(0);
  });

  it("saving an empty inline edit deletes the existing node", async () => {
    render(<App />);
    await act(async () => {
      await flush(100);
    });

    fireEvent.click(screen.getByText("+ 新規ボード作成"));
    const input = screen.getByPlaceholderText("例: メインプロジェクト") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Test" } });
    await act(() => {
      fireEvent.click(screen.getByText("作成"));
    });
    await act(async () => {
      await flush(300);
    });

    // focus root and press Tab to create a child
    const root = document.querySelector('[data-node-id="root"]') as HTMLElement;
    await act(async () => {
      fireEvent.click(root);
    });
    await act(async () => {
      fireEvent.keyDown(document.body, { key: "Tab" });
    });
    await act(async () => {
      await flush(50);
    });

    // type text then save (so the node becomes a regular child, not pending)
    const ta1 = document.querySelector("[data-inline-editor] textarea") as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(ta1, { target: { value: "real task" } });
    });
    await act(async () => {
      fireEvent.keyDown(ta1, { key: "Enter" });
    });
    await act(async () => {
      await flush(50);
    });
    expect(document.querySelector("[data-inline-editor]")).toBeNull();

    // re-open inline editor on that child and clear text + save → should delete
    const child = document.querySelector('[data-node-id^="node-"]') as HTMLElement;
    expect(child).toBeTruthy();
    await act(async () => {
      fireEvent.doubleClick(child);
    });
    const ta2 = document.querySelector("[data-inline-editor] textarea") as HTMLTextAreaElement;
    expect(ta2.value).toBe("real task");
    await act(async () => {
      fireEvent.change(ta2, { target: { value: "" } });
    });
    await act(async () => {
      fireEvent.keyDown(ta2, { key: "Enter" });
    });
    await act(async () => {
      await flush(50);
    });

    const nodes = await db.nodes.toArray();
    expect(nodes.filter((n) => !n.isRoot)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm --filter mintodo test -- integration.test.tsx`
Expected: 新規テストは FAIL (inline editor が出ない / DSL パースされない)。既存テストは PASS

- [ ] **Step 3: 失敗したら実装をデバッグ**

Task 1-6 の実装が正しく動いていないはず。前タスクに戻って修正。

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm --filter mintodo test -- integration.test.tsx`
Expected: 全件 PASS

- [ ] **Step 5: format & lint**

Run: `pnpm --filter mintodo format && pnpm --filter mintodo check`

- [ ] **Step 6: コミット**

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io
git add packages/mintodo/src/integration.test.tsx
git commit -m "test(mintodo): add inline edit end-to-end test"
```

---

## Task 8: 全体確認

- [ ] **Step 1: 全テスト実行**

Run: `pnpm test`
Expected: 全件 PASS

- [ ] **Step 2: check (type + lint)**

Run: `pnpm run check`
Expected: エラーなし

- [ ] **Step 3: format 最終確認**

Run: `pnpm run format`
Expected: 差分なし (または format 適用後の差分のみ、コミット)

- [ ] **Step 4: 仕様カバレッジ確認**

spec の受け入れ条件と本 plan のタスクを照合:

| 受け入れ条件 | 担当タスク |
|---|---|
| `pnpm test` 全件 pass | Task 8 Step 1 |
| `pnpm run check` エラーなし | Task 8 Step 2 |
| クリックで `.node-selected` ハイライト | Task 4 (onClick → SELECT) |
| ダブルクリックで inline 編集 UI | Task 4 (onDoubleClick → OPEN_INLINE_EDIT, render NodeInlineEditor) |
| デフォルト畳まれた「属性」セクション | Task 3 (expanded: false 初期) |
| 展開で色 / 優先度 / 期限の 3 セクション | Task 3 (NodeInlineEditor render) |
| キャンセル / 保存ボタン | Task 3 |
| DSL 入力で priority / done 反映 | Task 1, 3, 7 |
| 表示から DSL トークン除去 | Task 1 (parseInlineDSL) + Task 7 (text 保存) |
| 属性バー値で priority 設定 | Task 3, 7 |
| 空保存でノード削除 | Task 3 (onDelete) + Task 4 (DELETE_NODE + CLOSE_INLINE_EDIT) |
| 不正トークンはテキスト残置 | Task 1 (parseInlineDSL の寛容パース) |
| 新規作成直後に inline 編集自動開始 | Task 2 (ADD_CHILD 変更) |
| 編集中グローバルショートカット無効 | Task 6 |
| ドラッグとクリック/ダブルクリック非干渉 | Task 4 (既存 drag ロジックは据え置き、HTML5 drag は click と独立) |
| 「…」→ EditModal 経路維持 | Task 4 (ellipsis 据え置き) |
| 既存機能 (折り畳み / DnD / DSL editor / IndexedDB) 維持 | Task 8 (全テスト pass で確認) |
