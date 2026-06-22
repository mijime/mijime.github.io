# mintodo DSL I/O Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** mintodo に YAML 風インデントの DSL によるエクスポート/インポート機能を追加する (拡張子 `.md`、位置情報は保存しない)。

**Architecture:** 純粋関数の `src/dsl.ts` を新規追加 (React/DB 非依存)。既存 JSON I/O は無改変。Toolbar に 2 ボタン (FileText/FileUp) を追加し、Import 時はボード名も上書きする。

**Tech Stack:** TypeScript, vitest, lucide-react, dexie (無変更)

## Global Constraints

- パッケージ: `packages/mintodo` で作業
- テスト: `pnpm --filter @mijime/mintodo test` (vitest, jsdom)
- 型チェック + lint: `pnpm --filter @mijime/mintodo run check`
- コミットプレフィックス: `feat(mintodo):` (本機能は新機能)
- 既存 JSON I/O を一切変更しない
- 既存テストを壊さない
- 拡張子 `.md`、MIME `text/markdown`
- DSL 1 ファイル = 1 ボード、位置情報 (x/y/vx/vy) は保存しない
- 認識属性: `@priority` (low|medium|high) / `@color` (slate|sky|emerald|rose) / `@due` (YYYY-MM-DD) / `@done`
- 未知属性 `@*:*` は無視
- インデント: 半角スペース 2 個固定 (タブはエラー、増減は ±2 のみ許容)
- コメント: 行頭 `#` のみ、空行は無視
- エラー時: パーサは `null` 返却 (既存 `parseImportedJson` と一貫)

---

## File Structure

| ファイル | 種類 | 責務 |
|---|---|---|
| `packages/mintodo/src/dsl.ts` | 新規 | `parseDSL` / `serializeDSL` の純粋関数 |
| `packages/mintodo/src/dsl.test.ts` | 新規 | DSL 関数の単体テスト |
| `packages/mintodo/src/storage.ts` | 変更 | `downloadText` ヘルパー追加 |
| `packages/mintodo/src/storage.test.ts` | 変更 | `downloadText` テスト追加 |
| `packages/mintodo/src/components/Toolbar.tsx` | 変更 | DSL Export/Import ボタン 2 つ + ハンドラ |

---

### Task 1: downloadText ヘルパーを storage.ts に追加

**Files:**
- Modify: `packages/mintodo/src/storage.ts:104-115` (downloadJson の直後に追加)
- Test: `packages/mintodo/src/storage.test.ts:1-216` (末尾に describe ブロック追加)

**Interfaces:**
- Produces: `export function downloadText(text: string, filename: string, mime: string): string` — Blob URL を返し、anchor を click する副作用あり (既存 `downloadJson` と同じパターン)

- [ ] **Step 1: 失敗するテストを書く**

`packages/mintodo/src/storage.test.ts` の末尾 (`});` の直前) に以下を追加:

```ts
describe("downloadText", () => {
  it("produces a Blob URL", () => {
    const url = downloadText("hello", "test.md", "text/markdown");
    expect(url).toMatch(/^blob:/u);
    URL.revokeObjectURL(url);
  });
});
```

- [ ] **Step 2: テスト失敗を確認**

Run: `pnpm --filter @mijime/mintodo test -- storage.test.ts`
Expected: FAIL — `downloadText` is not exported from `./storage`

- [ ] **Step 3: downloadText を実装**

`packages/mintodo/src/storage.ts` の `downloadJson` 関数の直後 (line 115 の `}` の後) に追加:

```ts
export function downloadText(text: string, filename: string, mime: string): string {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  if (typeof document !== "undefined") {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }
  return url;
}
```

`packages/mintodo/src/storage.test.ts` の import に `downloadText` を追加:

```ts
import {
  createBoard,
  deleteBoard,
  discardV1Data,
  downloadJson,
  downloadText,
  getCurrentBoardId,
  hasV1Data,
  loadBoards,
  loadNodesForBoard,
  parseImportedJson,
  renameBoard,
  saveNodesForBoard,
  setCurrentBoardId,
} from "./storage";
```

- [ ] **Step 4: テスト通過を確認**

Run: `pnpm --filter @mijime/mintodo test -- storage.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
cd packages/mintodo && git add src/storage.ts src/storage.test.ts && git commit -m "feat(mintodo): add downloadText helper for DSL export"
```

---

### Task 2: parseDSL の基本構造 (ルート行・インデント・コメント・空行)

**Files:**
- Create: `packages/mintodo/src/dsl.ts`
- Create: `packages/mintodo/src/dsl.test.ts`

**Interfaces:**
- Produces: `export interface DslParseResult { board: { id: string; name: string }; nodes: MindNode[] }`
- Produces: `export function parseDSL(text: string, boardId: string): DslParseResult | null`

- [ ] **Step 1: 失敗するテスト群を書く**

`packages/mintodo/src/dsl.test.ts` を新規作成:

```ts
import { describe, expect, it } from "vitest";
import type { MindNode } from "./types";
import { parseDSL, serializeDSL } from "./dsl";

function findNode(nodes: MindNode[], id: string): MindNode {
  const n = nodes.find((x) => x.id === id);
  if (!n) throw new Error(`node ${id} not found`);
  return n;
}

function root(nodes: MindNode[]): MindNode {
  return findNode(nodes, "root");
}

describe("parseDSL — structure", () => {
  it("parses root only", () => {
    const r = parseDSL("買い物リスト\n", "b1");
    expect(r).not.toBeNull();
    expect(r!.board).toEqual({ id: "b1", name: "買い物リスト" });
    expect(r!.nodes).toHaveLength(1);
    expect(root(r!.nodes).text).toBe("買い物リスト");
    expect(root(r!.nodes).isRoot).toBe(true);
    expect(root(r!.nodes).children).toEqual([]);
  });

  it("parses root and one child", () => {
    const r = parseDSL("買い物リスト\n  牛乳\n", "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes).toHaveLength(2);
    expect(root(r!.nodes).children).toHaveLength(1);
    const child = r!.nodes.find((n) => n.text === "牛乳")!;
    expect(child.parentId).toBe("root");
  });

  it("parses deep nesting", () => {
    const text = "A\n  B\n    C\n      D\n";
    const r = parseDSL(text, "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes).toHaveLength(4);
    const ids = r!.nodes.map((n) => n.id);
    const d = findNode(r!.nodes, "n2");
    expect(d.parentId).toBe("n1");
    void ids;
  });

  it("parses siblings at same level", () => {
    const text = "Root\n  A\n  B\n  C\n";
    const r = parseDSL(text, "b1");
    expect(r).not.toBeNull();
    expect(root(r!.nodes).children).toHaveLength(3);
  });

  it("ignores comment lines", () => {
    const text = "# header\nRoot\n  # child comment\n  Child\n";
    const r = parseDSL(text, "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes).toHaveLength(2);
  });

  it("ignores blank lines", () => {
    const text = "Root\n\n  A\n\n  B\n";
    const r = parseDSL(text, "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes).toHaveLength(3);
  });

  it("accepts CRLF line endings", () => {
    const text = "Root\r\n  Child\r\n";
    const r = parseDSL(text, "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes).toHaveLength(2);
  });

  it("returns null when no root line", () => {
    expect(parseDSL("\n  Child\n", "b1")).toBeNull();
    expect(parseDSL("", "b1")).toBeNull();
  });

  it("returns null on tab character", () => {
    expect(parseDSL("Root\n\tChild\n", "b1")).toBeNull();
  });

  it("returns null on non-2-multiple indent", () => {
    expect(parseDSL("Root\n   Child\n", "b1")).toBeNull();
  });

  it("returns null on +4 indent jump", () => {
    expect(parseDSL("Root\n      Child\n", "b1")).toBeNull();
  });

  it("returns null on -4 indent jump", () => {
    expect(parseDSL("Root\n  A\n      B\n", "b1")).toBeNull();
  });

  it("returns null on empty text after stripping", () => {
    expect(parseDSL("Root\n  @priority:high\n", "b1")).toBeNull();
  });

  it("preserves spaces in text", () => {
    const r = parseDSL("Root\n  牛乳 500ml\n", "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes[1].text).toBe("牛乳 500ml");
  });
});
```

- [ ] **Step 2: テスト失敗を確認**

Run: `pnpm --filter @mijime/mintodo test -- dsl.test.ts`
Expected: FAIL — module `./dsl` not found

- [ ] **Step 3: dsl.ts を実装 (基本構造のみ)**

`packages/mintodo/src/dsl.ts` を新規作成。属性はまだ未対応 (次の Task で追加)。まずは行解析とツリー構築のみ:

```ts
import type { MindNode } from "./types";

export interface DslParseResult {
  board: { id: string; name: string };
  nodes: MindNode[];
}

interface ParsedLine {
  depth: number;
  text: string;
}

function parseLines(text: string): ParsedLine[] | null {
  const lines = text.replace(/\r\n?/gu, "\n").split("\n");
  const result: ParsedLine[] = [];
  let prevDepth = -1;

  for (const rawLine of lines) {
    if (rawLine.length === 0) continue;
    if (rawLine.includes("\t")) return null;

    const match = /^( *)([^ ].*)$/u.exec(rawLine);
    if (!match) continue;
    const indent = match[1]!.length;
    if (indent % 2 !== 0) return null;
    const rest = match[2]!;

    if (rest.startsWith("#")) continue;

    const depth = indent / 2;
    if (result.length === 0) {
      if (depth !== 0) return null;
    } else {
      if (depth > prevDepth + 1) return null;
      if (depth < prevDepth - 1) return null;
    }

    const textPart = rest.split(/\s+/u)[0]!;
    if (!textPart) return null;

    result.push({ depth, text: textPart });
    prevDepth = depth;
  }

  if (result.length === 0) return null;
  if (result[0]!.depth !== 0) return null;
  return result;
}

export function parseDSL(text: string, boardId: string): DslParseResult | null {
  const parsed = parseLines(text);
  if (!parsed) return null;

  let idCounter = 0;
  const nodes: MindNode[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i]!;
    const id = i === 0 ? "root" : `n${idCounter++}`;
    let parentId: string | null = null;
    if (i > 0) {
      for (let j = i - 1; j >= 0; j--) {
        if (nodes[j]!.parentId === null && nodes[j]!.isRoot) {
          if (parsed[j]!.depth === p.depth - 1) {
            parentId = nodes[j]!.id;
            break;
          }
        } else if (parsed[j]!.depth === p.depth - 1) {
          parentId = nodes[j]!.id;
          break;
        }
      }
    }
    nodes.push({
      id,
      boardId,
      text: p.text,
      parentId,
      isRoot: id === "root",
      completed: false,
      collapsed: false,
      priority: "medium",
      categoryColor: "slate",
      dueDate: "",
      children: [],
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
    });
  }

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    if (i > 0 && node.parentId) {
      const parent = nodes.find((n) => n.id === node.parentId);
      if (parent) parent.children.push(node.id);
    }
  }

  return {
    board: { id: boardId, name: nodes[0]!.text },
    nodes,
  };
}

export function serializeDSL(board: { name: string }, nodes: Record<string, MindNode>): string {
  const root = Object.values(nodes).find((n) => n.isRoot);
  if (!root) return `${board.name}\n`;

  const lines: string[] = [];
  const walk = (node: MindNode, depth: number): void => {
    const indent = "  ".repeat(depth);
    lines.push(`${indent}${node.text}`);
    for (const childId of node.children) {
      const child = nodes[childId];
      if (child) walk(child, depth + 1);
    }
  };
  walk(root, 0);
  return `${lines.join("\n")}\n`;
}
```

- [ ] **Step 4: テスト通過を確認**

Run: `pnpm --filter @mijime/mintodo test -- dsl.test.ts`
Expected: PASS (全 13 ケース)

- [ ] **Step 5: コミット**

```bash
cd packages/mintodo && git add src/dsl.ts src/dsl.test.ts && git commit -m "feat(mintodo): add parseDSL/serializeDSL with basic structure"
```

---

### Task 3: parseDSL に属性サポートを追加

**Files:**
- Modify: `packages/mintodo/src/dsl.ts` (parseDSL と型を拡張)
- Modify: `packages/mintodo/src/dsl.test.ts` (属性テストを追加)

**Interfaces:**
- Produces: `parseDSL` が `@priority` / `@color` / `@due` / `@done` を解釈し、未知の `@*:*` は無視

- [ ] **Step 1: 失敗する属性テストを追加**

`packages/mintodo/src/dsl.test.ts` の末尾 (`});` の直前) に追加:

```ts
describe("parseDSL — attributes", () => {
  it("parses @priority:high", () => {
    const r = parseDSL("Root\n  牛乳 @priority:high\n", "b1")!;
    const child = r.nodes.find((n) => n.text === "牛乳")!;
    expect(child.priority).toBe("high");
  });

  it("parses @color:sky", () => {
    const r = parseDSL("Root\n  パン @color:sky\n", "b1")!;
    const child = r.nodes.find((n) => n.text === "パン")!;
    expect(child.categoryColor).toBe("sky");
  });

  it("parses @due:YYYY-MM-DD", () => {
    const r = parseDSL("Root\n  期限タスク @due:2026-06-25\n", "b1")!;
    const child = r.nodes.find((n) => n.text === "期限タスク")!;
    expect(child.dueDate).toBe("2026-06-25");
  });

  it("parses @done", () => {
    const r = parseDSL("Root\n  完了済み @done\n", "b1")!;
    const child = r.nodes.find((n) => n.text === "完了済み")!;
    expect(child.completed).toBe(true);
  });

  it("parses multiple attributes in fixed order on input", () => {
    const r = parseDSL("Root\n  X @done @priority:high @color:emerald @due:2026-01-01\n", "b1")!;
    const child = r.nodes.find((n) => n.text === "X")!;
    expect(child.completed).toBe(true);
    expect(child.priority).toBe("high");
    expect(child.categoryColor).toBe("emerald");
    expect(child.dueDate).toBe("2026-01-01");
  });

  it("ignores unknown attributes", () => {
    const r = parseDSL("Root\n  X @foo:bar @priority:low\n", "b1")!;
    const child = r.nodes.find((n) => n.text === "X")!;
    expect(child.priority).toBe("low");
  });

  it("returns null on invalid priority", () => {
    expect(parseDSL("Root\n  X @priority:urgent\n", "b1")).toBeNull();
  });

  it("returns null on invalid color", () => {
    expect(parseDSL("Root\n  X @color:purple\n", "b1")).toBeNull();
  });

  it("returns null on invalid due date", () => {
    expect(parseDSL("Root\n  X @due:2026/06/25\n", "b1")).toBeNull();
    expect(parseDSL("Root\n  X @due:not-a-date\n", "b1")).toBeNull();
  });
});
```

- [ ] **Step 2: テスト失敗を確認**

Run: `pnpm --filter @mijime/mintodo test -- dsl.test.ts`
Expected: 新規 9 件 FAIL (属性未実装)

- [ ] **Step 3: parseDSL を属性対応に拡張**

`packages/mintodo/src/dsl.ts` の `ParsedLine` インターフェイスと `parseLines` を以下に置換:

```ts
import type { CategoryColor, MindNode, Priority } from "./types";

const ALLOWED_PRIORITIES: Priority[] = ["low", "medium", "high"];
const ALLOWED_COLORS: CategoryColor[] = ["slate", "sky", "emerald", "rose"];

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === s;
}

export interface DslParseResult {
  board: { id: string; name: string };
  nodes: MindNode[];
}

interface ParsedLine {
  depth: number;
  text: string;
  priority: Priority;
  categoryColor: CategoryColor;
  dueDate: string;
  completed: boolean;
}

function parseLines(text: string): ParsedLine[] | null {
  const lines = text.replace(/\r\n?/gu, "\n").split("\n");
  const result: ParsedLine[] = [];
  let prevDepth = -1;

  for (const rawLine of lines) {
    if (rawLine.length === 0) continue;
    if (rawLine.includes("\t")) return null;

    const match = /^( *)([^ ].*)$/u.exec(rawLine);
    if (!match) continue;
    const indent = match[1]!.length;
    if (indent % 2 !== 0) return null;
    const rest = match[2]!;

    if (rest.startsWith("#")) continue;

    const depth = indent / 2;
    if (result.length === 0) {
      if (depth !== 0) return null;
    } else {
      if (depth > prevDepth + 1) return null;
      if (depth < prevDepth - 1) return null;
    }

    const tokens = rest.split(/\s+/u);
    const textTokens: string[] = [];
    const attrs: string[] = [];
    let seenAttr = false;
    for (const tok of tokens) {
      if (tok.startsWith("@")) {
        attrs.push(tok);
        seenAttr = true;
      } else if (!seenAttr) {
        textTokens.push(tok);
      } else {
        textTokens.push(tok);
      }
    }
    const textPart = textTokens.join(" ").trim();
    if (!textPart) return null;

    const parsed: ParsedLine = {
      depth,
      text: textPart,
      priority: "medium",
      categoryColor: "slate",
      dueDate: "",
      completed: false,
    };

    for (const attr of attrs) {
      const colonIdx = attr.indexOf(":");
      const key = colonIdx === -1 ? attr.slice(1) : attr.slice(1, colonIdx);
      const value = colonIdx === -1 ? "" : attr.slice(colonIdx + 1);

      switch (key) {
        case "priority": {
          if (!ALLOWED_PRIORITIES.includes(value as Priority)) return null;
          parsed.priority = value as Priority;
          break;
        }
        case "color": {
          if (!ALLOWED_COLORS.includes(value as CategoryColor)) return null;
          parsed.categoryColor = value as CategoryColor;
          break;
        }
        case "due": {
          if (!isValidDate(value)) return null;
          parsed.dueDate = value;
          break;
        }
        case "done": {
          parsed.completed = true;
          break;
        }
        default:
          break;
      }
    }

    result.push(parsed);
    prevDepth = depth;
  }

  if (result.length === 0) return null;
  if (result[0]!.depth !== 0) return null;
  return result;
}
```

続けて `parseDSL` の `nodes.push` の内容を更新。`for (let i = 0; i < parsed.length; i++)` の中で、ノード作成を以下に置換:

```ts
    const p = parsed[i]!;
    const id = i === 0 ? "root" : `n${idCounter++}`;
    let parentId: string | null = null;
    if (i > 0) {
      for (let j = i - 1; j >= 0; j--) {
        if (parsed[j]!.depth === p.depth - 1) {
          parentId = nodes[j]!.id;
          break;
        }
      }
    }
    nodes.push({
      id,
      boardId,
      text: p.text,
      parentId,
      isRoot: id === "root",
      completed: p.completed,
      collapsed: false,
      priority: p.priority,
      categoryColor: p.categoryColor,
      dueDate: p.dueDate,
      children: [],
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
    });
```

- [ ] **Step 4: テスト通過を確認**

Run: `pnpm --filter @mijime/mintodo test -- dsl.test.ts`
Expected: 全 PASS (基本 13 + 属性 9 = 22 件)

- [ ] **Step 5: コミット**

```bash
cd packages/mintodo && git add src/dsl.ts src/dsl.test.ts && git commit -m "feat(mintodo): add DSL attribute parsing (@priority/@color/@due/@done)"
```

---

### Task 4: serializeDSL に属性出力を追加 + ラウンドトリップテスト

**Files:**
- Modify: `packages/mintodo/src/dsl.ts` (serializeDSL を更新)
- Modify: `packages/mintodo/src/dsl.test.ts` (シリアライズ + ラウンドトリップテスト追加)

**Interfaces:**
- Produces: `serializeDSL` がデフォルト以外の属性を `priority` → `color` → `due` → `done` の順で出力

- [ ] **Step 1: 失敗するシリアライズテストを追加**

`packages/mintodo/src/dsl.test.ts` の末尾に追加:

```ts
function makeNode(
  id: string,
  boardId: string,
  opts: Partial<MindNode> = {},
): MindNode {
  return {
    id,
    boardId,
    text: opts.text ?? "node",
    parentId: opts.parentId ?? null,
    isRoot: opts.isRoot ?? false,
    completed: opts.completed ?? false,
    collapsed: false,
    priority: opts.priority ?? "medium",
    categoryColor: opts.categoryColor ?? "slate",
    dueDate: opts.dueDate ?? "",
    children: opts.children ?? [],
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
  };
}

describe("serializeDSL", () => {
  it("serializes root only", () => {
    const out = serializeDSL(
      { name: "Board" },
      { root: makeNode("root", "b1", { isRoot: true, text: "Board" }) },
    );
    expect(out).toBe("Board\n");
  });

  it("serializes parent + child", () => {
    const out = serializeDSL(
      { name: "B" },
      {
        root: makeNode("root", "b1", { isRoot: true, text: "B", children: ["c1"] }),
        c1: makeNode("c1", "b1", { text: "Child", parentId: "root" }),
      },
    );
    expect(out).toBe("B\n  Child\n");
  });

  it("emits attributes in fixed order: priority, color, due, done", () => {
    const out = serializeDSL(
      { name: "B" },
      {
        root: makeNode("root", "b1", { isRoot: true, text: "B", children: ["c1"] }),
        c1: makeNode("c1", "b1", {
          text: "X",
          parentId: "root",
          priority: "high",
          categoryColor: "emerald",
          dueDate: "2026-01-01",
          completed: true,
        }),
      },
    );
    expect(out).toBe("B\n  X @priority:high @color:emerald @due:2026-01-01 @done\n");
  });

  it("omits default attributes", () => {
    const out = serializeDSL(
      { name: "B" },
      {
        root: makeNode("root", "b1", { isRoot: true, text: "B", children: ["c1"] }),
        c1: makeNode("c1", "b1", { text: "X", parentId: "root" }),
      },
    );
    expect(out).toBe("B\n  X\n");
  });

  it("roundtrips: serialize -> parse -> serialize is stable", () => {
    const original: Record<string, MindNode> = {
      root: makeNode("root", "b1", { isRoot: true, text: "Board", children: ["a", "b"] }),
      a: makeNode("a", "b1", {
        text: "A",
        parentId: "root",
        priority: "high",
        categoryColor: "sky",
        children: ["a1"],
      }),
      a1: makeNode("a1", "b1", { text: "A1", parentId: "a", completed: true }),
      b: makeNode("b", "b1", { text: "B", parentId: "root", dueDate: "2026-12-31" }),
    };
    const dsl = serializeDSL({ name: "Board" }, original);
    const parsed = parseDSL(dsl, "b1")!;
    const reserialized = serializeDSL({ name: parsed.board.name }, fromArray(parsed.nodes));
    expect(reserialized).toBe(dsl);
  });
});

function fromArray(arr: MindNode[]): Record<string, MindNode> {
  const rec: Record<string, MindNode> = {};
  for (const n of arr) rec[n.id] = n;
  return rec;
}
```

- [ ] **Step 2: テスト失敗を確認**

Run: `pnpm --filter @mijime/mintodo test -- dsl.test.ts`
Expected: 新規 5 件 FAIL (属性出力なし)

- [ ] **Step 3: serializeDSL を更新**

`packages/mintodo/src/dsl.ts` の `serializeDSL` を以下に置換:

```ts
export function serializeDSL(board: { name: string }, nodes: Record<string, MindNode>): string {
  const root = Object.values(nodes).find((n) => n.isRoot);
  if (!root) return `${board.name}\n`;

  const lines: string[] = [];
  const walk = (node: MindNode, depth: number): void => {
    const indent = "  ".repeat(depth);
    const attrs: string[] = [];
    if (node.priority !== "medium") attrs.push(`@priority:${node.priority}`);
    if (node.categoryColor !== "slate") attrs.push(`@color:${node.categoryColor}`);
    if (node.dueDate) attrs.push(`@due:${node.dueDate}`);
    if (node.completed) attrs.push("@done");
    const attrStr = attrs.length ? ` ${attrs.join(" ")}` : "";
    lines.push(`${indent}${node.text}${attrStr}`);
    for (const childId of node.children) {
      const child = nodes[childId];
      if (child) walk(child, depth + 1);
    }
  };
  walk(root, 0);
  return `${lines.join("\n")}\n`;
}
```

- [ ] **Step 4: テスト通過を確認**

Run: `pnpm --filter @mijime/mintodo test -- dsl.test.ts`
Expected: 全 PASS (27 件)

- [ ] **Step 5: コミット**

```bash
cd packages/mintodo && git add src/dsl.ts src/dsl.test.ts && git commit -m "feat(mintodo): serializeDSL emits attributes in fixed order"
```

---

### Task 5: Toolbar に DSL Export/Import ボタンを追加

**Files:**
- Modify: `packages/mintodo/src/components/Toolbar.tsx:1-73, 171-189`

**Interfaces:**
- Consumes: `useBoardActions().renameBoard` (既存), `parseDSL` / `serializeDSL` / `downloadText` (前タスクで追加)
- Consumes: `state.currentBoardId`, `state.nodes`, `state.boards`

- [ ] **Step 1: imports を追加**

`packages/mintodo/src/components/Toolbar.tsx` の import 群を以下に置換:

```tsx
import {
  Download,
  Eye,
  FileText,
  FileUp,
  Keyboard,
  Menu,
  Moon,
  Network,
  Search,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef } from "react";
import { useMindStore } from "../hooks/use-mind-store";
import { useBoardActions } from "../hooks/use-board-actions";
import { downloadJson, downloadText, parseImportedJson } from "../storage";
import { db } from "../db";
import { parseDSL, serializeDSL } from "../dsl";
import type { MindNode } from "../types";
```

- [ ] **Step 2: `actions` を取得し、DSL ハンドラを追加**

`Toolbar` 関数内の `const { state, dispatch } = useMindStore();` (line 30) を以下に置換:

```tsx
  const { state, dispatch } = useMindStore();
  const actions = useBoardActions();
  const dslFileRef = useRef<HTMLInputElement>(null);

  const onExportDsl = () => {
    const currentBoard = state.boards.find((b) => b.id === state.currentBoardId);
    const text = serializeDSL(
      { name: currentBoard?.name ?? "Unknown" },
      state.nodes,
    );
    const date = new Date().toISOString().slice(0, 10);
    const url = downloadText(
      text,
      `mintodo_${currentBoard?.name ?? "Unknown"}_${date}.md`,
      "text/markdown",
    );
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const onImportDslClick = () => dslFileRef.current?.click();

  const onDslFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseDSL(text, state.currentBoardId ?? "");
    if (!parsed) {
      alert("DSLの読み込みに失敗しました。ファイルが壊れている可能性があります。");
      e.target.value = "";
      return;
    }
    if (
      Object.keys(state.nodes).length > 0 &&
      !confirm(
        `「${parsed.board.name}」から${parsed.nodes.length}件のタスクをインポートします。\n現在のボード「${state.boards.find((b) => b.id === state.currentBoardId)?.name ?? ""}」のタスクと名前は置き換えられます。続行しますか?`,
      )
    ) {
      e.target.value = "";
      return;
    }
    if (state.currentBoardId) {
      try {
        await actions.renameBoard(state.currentBoardId, parsed.board.name);
      } catch (err) {
        console.error(err);
      }
    }
    const rec: Record<string, MindNode> = {};
    for (const n of parsed.nodes) rec[n.id] = n;
    dispatch({ nodes: rec, type: "SET_NODES" });
    e.target.value = "";
  };
```

- [ ] **Step 3: ボタンと file input を追加**

`packages/mintodo/src/components/Toolbar.tsx` の JSON Import ボタンの直後 (`<input ref={fileRef}...>` の前、line 181-189 付近) に以下を追加:

```tsx
          <button
            type="button"
            className="p-2 rounded transition"
            style={{ color: "var(--mid)" }}
            title="DSLエクスポート"
            onClick={onExportDsl}
          >
            <FileText size={16} />
          </button>
          <button
            type="button"
            className="p-2 rounded transition"
            style={{ color: "var(--mid)" }}
            title="DSLインポート"
            onClick={onImportDslClick}
          >
            <FileUp size={16} />
          </button>
```

そして `<input ref={fileRef} ...>` (line 190) の直後に追加:

```tsx
          <input
            ref={dslFileRef}
            type="file"
            accept=".md"
            className="hidden"
            onChange={onDslFile}
          />
```

- [ ] **Step 4: 型エラー確認**

Run: `pnpm --filter @mijime/mintodo run check:tsgo`
Expected: エラー 0

- [ ] **Step 5: 全テスト + lint 通過を確認**

Run: `pnpm --filter @mijime/mintodo test && pnpm --filter @mijime/mintodo run check`
Expected: 全 PASS、lint エラー 0

- [ ] **Step 6: コミット**

```bash
cd packages/mintodo && git add src/components/Toolbar.tsx && git commit -m "feat(mintodo): add DSL export/import buttons to Toolbar"
```

---

### Task 6: 受け入れ確認 + ドキュメント更新

**Files:**
- Modify: `packages/mintodo/CLAUDE.md` (オプション: 機能一覧に DSL I/O を追記)

- [ ] **Step 1: 全テスト + 全体 check を実行**

Run: `pnpm --filter @mijime/mintodo test && pnpm --filter @mijime/mintodo run check`
Expected: 全 PASS、lint エラー 0、型エラー 0

- [ ] **Step 2: 既存 JSON I/O が壊れていないことを再確認**

Run: `pnpm --filter @mijime/mintodo test -- storage.test.ts`
Expected: 全 PASS (`downloadJson` / `parseImportedJson` 関連のテスト含む)

- [ ] **Step 3: dev サーバーで手動確認 (任意、可能なら)**

Run: `pnpm --filter @mijime/mintodo dev`

確認項目:
- [ ] Toolbar に 4 ボタン (JSON Export/Import + DSL Export/Import) が表示される
- [ ] DSL Export で `.md` ファイルがダウンロードされる
- [ ] ダウンロードした `.md` をテキストエディタで開いて読める
- [ ] DSL Import で `.md` を選択するとボード名が DSL のルート行に置き換わる
- [ ] ネスト・属性・@done が MindMap に反映される
- [ ] 不正な `.md` (タブ含む等) は alert で拒否される

- [ ] **Step 4: コミット (ドキュメント更新した場合のみ)**

```bash
cd packages/mintodo && git add CLAUDE.md && git commit -m "docs(mintodo): mention DSL I/O in CLAUDE.md"
```

---

## Self-Review Checklist

実装時に確認すること:

- [ ] Task 1〜6 の全ステップを順序通り実行した
- [ ] 各 Task 末尾で `git commit` している
- [ ] `pnpm test` が全件通る (最終確認は Task 6)
- [ ] `pnpm run check` がエラーなしで通る
- [ ] 既存 JSON I/O のテストが通る
- [ ] ファイル名拡張子が `.md` である
- [ ] Import 時にボード名が上書きされる
- [ ] `x, y, vx, vy` が永続化されない
- [ ] `@priority` / `@color` / `@due` / `@done` 以外の属性は無視される
