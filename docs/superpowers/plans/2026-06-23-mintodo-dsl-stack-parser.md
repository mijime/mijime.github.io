# mintodo DSL Stack-Based Parser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `parseDSL` in `src/dsl.ts` to a stack-based parser that allows arbitrary indent jumps (no more "depth delta ≤ 1" constraint), so users can express free trees like `task1 / tasks1-1 / tasks1-1-1 / hello` with `task1-2` as a sibling of `tasks1-1` at the root level.

**Architecture:** Replace `parentByDepth: string[]` with a `stack: { depth: number; node: MindNode }[]`. For each non-empty line, pop the stack while `top.depth >= current.depth`; the remaining top is the parent. Reject second depth-0 line as malformed (preserves "1 board = 1 root").

**Tech Stack:** TypeScript, vitest, no new dependencies

**Reference spec:** `docs/superpowers/specs/2026-06-23-mintodo-dsl-stack-parser-design.md`

**Reference implementation (current code to read):** `/Users/kojima.takashi/src/github.com/mijime/mijime.github.io/packages/mintodo/src/dsl.ts`

## Global Constraints

- Type check: `pnpm run check:tsgo` (tsgo --noEmit) must pass with zero errors
- Lint: `pnpm run check:oxlint` (oxlint) must pass with zero errors
- Format: oxfmt via pre-commit hook (auto-formats on commit)
- Test: `pnpm test` (vitest run) — all tests must pass
- Pure functions: no DOM, no random, no Date
- Public API: `parseDSL(text, boardId)`, `parseInlineDSL(raw)`, `serializeDSL(board, nodes)` signatures must stay
- Constraints preserved: first node at depth 0, no tabs, indent 2-space multiple, no empty text, no second depth-0 line

## File Structure

- `packages/mintodo/src/dsl.ts` — modify `parseDSL` body only (~30 lines changed)
- `packages/mintodo/src/dsl.test.ts` — modify 2 existing tests + add 4 new tests
- No other files touched

---

## Task 1: Refactor `parseDSL` to stack-based + update/add tests

**Files:**
- Modify: `packages/mintodo/src/dsl.ts`
- Modify: `packages/mintodo/src/dsl.test.ts`

**Context:** Current `parseDSL` enforces `Math.abs(depth - prevDepth) > 1 → null`, which rejects the user's `task1 / tasks1-1 / tasks1-1-1 / hello / task1-2` input (depth jumps 3 → 1). The fix is a stack-based parent resolution.

### Step 1: Replace `parseDSL` body with stack-based implementation

In `/Users/kojima.takashi/src/github.com/mijime/mijime.github.io/packages/mintodo/src/dsl.ts`, replace the entire `parseDSL` function body (from `export function parseDSL(text: string, boardId: string): DslParseResult | null {` through the matching `}` at the end of that function, line 35 to line 149) with the implementation below. Do NOT touch `parseInlineDSL`, `serializeDSL`, `defaultNode`, `isValidDate`, the `ALLOWED_*` constants, or the `DslParseResult` / `InlineDslResult` interfaces.

```ts
export function parseDSL(text: string, boardId: string): DslParseResult | null {
  const lines = text.replaceAll(/\r\n?/gu, "\n").split("\n");

  const nodes: MindNode[] = [];
  let firstNode = true;
  let counter = 0;
  let rootText = "";
  const stack: { depth: number; node: MindNode }[] = [];

  for (const raw of lines) {
    if (raw === "" || /^\s*#/u.test(raw)) continue;

    const match = /^(?<indent>\s*)(?<rest>.*)$/u.exec(raw);
    if (!match) continue;
    const { indent } = match.groups!;
    const { rest } = match.groups!;

    if (rest === "") return null;
    if (/\t/u.test(indent)) return null;
    if (indent.length % 2 !== 0) return null;
    const depth = indent.length / 2;

    if (firstNode) {
      if (depth !== 0) return null;
      firstNode = false;
    }

    while (stack.length > 0 && stack[stack.length - 1]!.depth >= depth) {
      stack.pop();
    }

    const parent = stack.length > 0 ? stack[stack.length - 1]!.node : null;

    if (parent === null && depth === 0) {
      return null;
    }

    const tokens = rest.split(/\s+/u);
    const textTokens: string[] = [];
    const attrTokens: string[] = [];
    for (const tok of tokens) {
      if (tok.startsWith("@")) attrTokens.push(tok);
      else textTokens.push(tok);
    }

    const text = textTokens.join(" ").trim();
    if (!text) return null;

    let priority: Priority = "medium";
    let categoryColor: CategoryColor = "slate";
    let dueDate = "";
    let completed = false;

    for (const tok of attrTokens) {
      const colon = tok.indexOf(":");
      const key = colon === -1 ? tok.slice(1) : tok.slice(1, colon);
      const value = colon === -1 ? "" : tok.slice(colon + 1);
      switch (key) {
        case "priority": {
          if (!ALLOWED_PRIORITIES.has(value as Priority)) return null;
          priority = value as Priority;
          break;
        }
        case "color": {
          if (!ALLOWED_COLORS.has(value as CategoryColor)) return null;
          categoryColor = value as CategoryColor;
          break;
        }
        case "due": {
          if (!isValidDate(value)) return null;
          dueDate = value;
          break;
        }
        case "done": {
          completed = true;
          break;
        }
        default: {
          break;
        }
      }
    }

    const node: MindNode = {
      ...defaultNode(boardId),
      text,
      priority,
      categoryColor,
      dueDate,
      completed,
    };

    if (parent === null) {
      node.id = "root";
      node.isRoot = true;
      rootText = text;
    } else {
      node.id = `n${counter++}`;
      node.parentId = parent.id;
      parent.children.push(node.id);
    }

    nodes.push(node);
    stack.push({ depth, node });
  }

  if (firstNode) return null;

  return {
    board: { id: boardId, name: rootText },
    nodes,
  };
}
```

### Step 2: Update the two indent-jump rejection tests

In `/Users/kojima.takashi/src/github.com/mijime/mijime.github.io/packages/mintodo/src/dsl.test.ts`, find the two tests (around line 85-91):

```ts
  it("returns null on +4 indent jump", () => {
    expect(parseDSL("Root\n      Child\n", "b1")).toBeNull();
  });

  it("returns null on -4 indent jump", () => {
    expect(parseDSL("Root\n  A\n      B\n", "b1")).toBeNull();
  });
```

Replace them with:

```ts
  it("allows +4 indent jump (deep child of root)", () => {
    const r = parseDSL("Root\n        DeepChild\n", "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes).toHaveLength(2);
    const child = r!.nodes.find((n) => n.text === "DeepChild")!;
    expect(child.parentId).toBe("root");
  });

  it("allows -4 indent jump (sibling of grandchild back at root level)", () => {
    const r = parseDSL("Root\n  A\n      B\n  C\n", "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes).toHaveLength(4);
    const c = r!.nodes.find((n) => n.text === "C")!;
    expect(c.parentId).toBe("root");
    const b = r!.nodes.find((n) => n.text === "B")!;
    expect(b.parentId).toBe("A");
  });
```

### Step 3: Add 4 new tests

Find the closing `});` of the `describe("parseDSL — structure", ...)` block (just before the `describe("parseDSL — attributes"` line, around line 102) and add the following 4 tests just before it:

```ts
  it("allows -2 indent jump: user's task1/tasks1-1/tasks1-1-1/hello + task1-2 case", () => {
    const text =
      "task1\n" +
      "  tasks1-1\n" +
      "    tasks1-1-1\n" +
      "      hello\n" +
      "  task1-2\n";
    const r = parseDSL(text, "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes).toHaveLength(5);
    const task1 = root(r!.nodes);
    expect(task1.children).toHaveLength(2);
    const tasks1_1 = r!.nodes.find((n) => n.text === "tasks1-1")!;
    const task1_2 = r!.nodes.find((n) => n.text === "task1-2")!;
    expect(tasks1_1.parentId).toBe("root");
    expect(task1_2.parentId).toBe("root");
    const tasks1_1_1 = r!.nodes.find((n) => n.text === "tasks1-1-1")!;
    expect(tasks1_1_1.parentId).toBe(tasks1_1.id);
    const hello = r!.nodes.find((n) => n.text === "hello")!;
    expect(hello.parentId).toBe(tasks1_1_1.id);
  });

  it("allows -3 indent jump: deep subtree then back to root level", () => {
    const text = "A\n  B\n    C\n      D\n  E\n";
    const r = parseDSL(text, "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes).toHaveLength(5);
    const a = root(r!.nodes);
    const e = r!.nodes.find((n) => n.text === "E")!;
    expect(e.parentId).toBe(a.id);
    const b = r!.nodes.find((n) => n.text === "B")!;
    expect(b.parentId).toBe(a.id);
  });

  it("allows arbitrary +N indent: deep child from root", () => {
    const text = "A\n            B\n";
    const r = parseDSL(text, "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes).toHaveLength(2);
    const b = r!.nodes.find((n) => n.text === "B")!;
    expect(b.parentId).toBe("root");
  });

  it("returns null on a second depth-0 line (multiple roots)", () => {
    expect(parseDSL("Root\nOther\n", "b1")).toBeNull();
  });
```

### Step 4: Run tests, verify all pass

Run: `cd /Users/kojima/takashi/src/github.com/mijime/mijime.github.io/packages/mintodo && pnpm test`
Expected: All tests pass, including the 14 maintained `parseDSL — structure` tests + the 4 new tests + the 2 updated tests + the attribute tests + the roundtrip tests + everything else. Total test count should be 4 more than before (178/178 was 174/174).

If any test fails:
- For the new tests: debug the stack logic. Trace through the algorithm manually for the failing input.
- For existing tests: re-check that the constraints (depth 0 first, no tabs, 2-space multiple, no empty text, no second root) are still enforced.

### Step 5: Run type check + lint

Run: `cd /Users/kojima/takashi/src/github.com/mijime.mijime.github.io/packages/mintodo && pnpm run check`
Expected: zero errors.

### Step 6: Commit

```bash
cd /Users/kojima.takashi/src/github.com/mijime/mijime.github.io
git add packages/mintodo/src/dsl.ts packages/mintodo/src/dsl.test.ts
git commit -m "feat(mintodo): refactor DSL parser to stack-based for free tree support"
```

---

## Self-Review Checklist

- ✅ Spec coverage: every requirement in spec maps to a step
  - Stack-based algorithm → Step 1
  - Multiple roots reject → Step 1 (the `parent === null && depth === 0` check)
  - Updated +4/-4 tests → Step 2
  - 4 new tests (user case, -3 jump, +N jump, multiple roots reject) → Step 3
- ✅ Placeholder scan: no "TBD" or "implement later" — all code is real
- ✅ Type consistency: `parseDSL`, `parseInlineDSL`, `serializeDSL`, `MindNode`, `Priority`, `CategoryColor` defined once and referenced consistently
- ✅ All file paths absolute
- ✅ All commands have expected output
- ✅ Single commit (1 task = 1 commit)
