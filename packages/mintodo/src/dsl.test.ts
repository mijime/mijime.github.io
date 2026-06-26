import { describe, expect, it } from "vitest";
import { parseDSL, parseInlineDSL, serializeDSL } from "./dsl";
import type { MindNode } from "./types";

function findNode(nodes: Record<string, MindNode>, text: string): MindNode {
  const n = Object.values(nodes).find((x) => x.text === text);
  if (!n) throw new Error(`node "${text}" not found`);
  return n;
}

describe("parseDSL — indented-text DSL", () => {
  it("empty input → error", () => {
    const r = parseDSL("", "b1");
    expect(r.ok).toBe(false);
  });

  it("# at column 0 sets root.text (board name)", () => {
    const r = parseDSL("# マイボード\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nodes.root.text).toBe("マイボード");
  });

  it("## and ### are rejected", () => {
    const r1 = parseDSL("## sub\n", "b1");
    expect(r1.ok).toBe(false);
    const r2 = parseDSL("### sub\n", "b1");
    expect(r2.ok).toBe(false);
  });

  it("top-level task at column 0 is a child of root", () => {
    const r = parseDSL("- [ ] project\n  - [ ] child\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const project = findNode(r.nodes, "project");
    const child = findNode(r.nodes, "child");
    expect(project.parentId).toBe("root");
    expect(child.parentId).toBe(project.id);
  });

  it("checkbox - [ ] foo → inbox", () => {
    const r = parseDSL("- [ ] foo\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const foo = findNode(r.nodes, "foo");
    expect(foo.status).toBe("inbox");
  });

  it("status glyphs [-] [|] [x]", () => {
    const r = parseDSL("- [-] wip\n- [|] review\n- [x] done\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(findNode(r.nodes, "wip").status).toBe("wip");
    expect(findNode(r.nodes, "review").status).toBe("review");
    expect(findNode(r.nodes, "done").status).toBe("done");
    expect(findNode(r.nodes, "done").completed).toBe(true);
  });

  it("checkbox indented = child of nearest task at lower indent", () => {
    const r = parseDSL("- [ ] project\n  - [ ] a\n    - [ ] b\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const project = findNode(r.nodes, "project");
    const a = findNode(r.nodes, "a");
    const b = findNode(r.nodes, "b");
    expect(a.parentId).toBe(project.id);
    expect(b.parentId).toBe(a.id);
  });

  it("sibling tasks: child indent ends previous parent's scope", () => {
    const r = parseDSL("- [ ] A\n  - [ ] child\n- [ ] B\n  - [ ] other\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const a = findNode(r.nodes, "A");
    const b = findNode(r.nodes, "B");
    expect(findNode(r.nodes, "child").parentId).toBe(a.id);
    expect(findNode(r.nodes, "other").parentId).toBe(b.id);
  });

  it("checkbox nested under task", () => {
    const r = parseDSL("- [ ] parent\n  - [ ] child\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const parent = findNode(r.nodes, "parent");
    expect(findNode(r.nodes, "child").parentId).toBe(parent.id);
  });

  it("worklog: - text under task becomes WorkLogEntry with Date.now()", () => {
    const before = Date.now();
    const r = parseDSL("- [ ] task\n  - did something\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const task = findNode(r.nodes, "task");
    expect(task.workLogs).toHaveLength(1);
    expect(task.workLogs[0].text).toBe("did something");
    expect(task.workLogs[0].timestamp).toBeGreaterThanOrEqual(before);
  });

  it("worklog with timestamp: - YYYY-MM-DD HH:MM: text", () => {
    const r = parseDSL("- [ ] task\n  - 2026-06-25 14:30: did it\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const task = findNode(r.nodes, "task");
    const d = new Date(2026, 5, 25, 14, 30);
    expect(task.workLogs[0].timestamp).toBe(d.getTime());
    expect(task.workLogs[0].text).toBe("did it");
  });

  it("worklog without preceding task is rejected", () => {
    const r = parseDSL("- orphan log\n", "b1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("作業履歴の前にタスク");
  });

  it("worklog at wrong depth is rejected", () => {
    const r = parseDSL("- [ ] task\n    - wrong depth\n", "b1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("作業履歴のインデント");
  });

  it("multiple worklogs accumulate on the same task", () => {
    const r = parseDSL(
      "- [ ] task\n  - 2026-06-25 10:00: first\n  - 2026-06-25 11:00: second\n",
      "b1",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const task = findNode(r.nodes, "task");
    expect(task.workLogs).toHaveLength(2);
  });

  it("attributes inline: @priority:high @due:2026-12-31", () => {
    const r = parseDSL("- [ ] foo @priority:high @due:2026-12-31\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const foo = findNode(r.nodes, "foo");
    expect(foo.priority).toBe("high");
    expect(foo.dueDate).toBe("2026-12-31");
  });

  it("@estimate:8 sets estimate", () => {
    const r = parseDSL("- [ ] foo @estimate:8\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(findNode(r.nodes, "foo").estimate).toBe(8);
  });

  it("invalid checkbox glyph → error", () => {
    const r = parseDSL("- [?] foo\n", "b1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("チェックボックス");
  });

  it("invalid timestamp → error", () => {
    const r = parseDSL("- [ ] task\n  - 2026-13-99 25:99: foo\n", "b1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("タイムスタンプ");
  });

  it("tabs in indent → error", () => {
    const r = parseDSL("- [ ] a\n\t- [ ] b\n", "b1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("タブ");
  });

  it("odd indent (1 space) → error", () => {
    const r = parseDSL("- [ ] a\n - [ ] b\n", "b1");
    expect(r.ok).toBe(false);
  });

  it("unrecognized line → error", () => {
    const r = parseDSL("garbage line\n", "b1");
    expect(r.ok).toBe(false);
  });

  it("inline @attr in worklog body preserved as text", () => {
    const r = parseDSL("- [ ] task\n  - 2026-06-25 10:00: @priority:high note\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const task = findNode(r.nodes, "task");
    expect(task.workLogs[0].text).toBe("@priority:high note");
    expect(task.priority).toBe("medium");
  });
});

function rootNode(text = ""): MindNode {
  return {
    id: "root",
    boardId: "b1",
    text,
    parentId: null,
    isRoot: true,
    completed: false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    startDate: "",
    status: "inbox",
    children: ["a"],
    x: 0,
    y: 0,
    estimate: null,
    workLogs: [],
  };
}

describe("serializeDSL — indented-text DSL", () => {
  it("serializes root heading + child task", () => {
    const nodes: Record<string, MindNode> = {
      root: rootNode("Root"),
      a: {
        ...rootNode(),
        id: "a",
        parentId: "root",
        text: "Section",
        children: ["b"],
        status: "inbox",
      },
      b: {
        ...rootNode(),
        id: "b",
        parentId: "a",
        text: "Task",
        completed: true,
        status: "done",
        children: [],
      },
    };
    const out = serializeDSL(nodes);
    expect(out).toContain("- [ ] Section");
    expect(out).toContain("  - [x] Task");
  });

  it("serializes worklogs with timestamp", () => {
    const nodes: Record<string, MindNode> = {
      root: rootNode(),
      a: {
        ...rootNode(),
        id: "a",
        parentId: "root",
        text: "Task",
        children: [],
        workLogs: [
          {
            id: "wl1",
            timestamp: new Date(2026, 5, 25, 10, 0).getTime(),
            text: "Did X",
          },
        ],
      },
    };
    const out = serializeDSL(nodes);
    expect(out).toContain("  - 2026-06-25 10:00: Did X");
  });

  it("round-trip: simple board (all tasks)", () => {
    const src = "- [-] Project\n  - [-] Phase 1\n    - [ ] Task A\n    - [x] Task B\n";
    const r1 = parseDSL(src, "b1");
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const serialized = serializeDSL(r1.nodes);
    const r2 = parseDSL(serialized, "b1");
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    const project = findNode(r2.nodes, "Project");
    const phase = findNode(r2.nodes, "Phase 1");
    expect(project.parentId).toBe("root");
    expect(phase.parentId).toBe(project.id);
    expect(findNode(r2.nodes, "Task A").parentId).toBe(phase.id);
    expect(findNode(r2.nodes, "Task A").status).toBe("inbox");
    expect(findNode(r2.nodes, "Task B").parentId).toBe(phase.id);
    expect(findNode(r2.nodes, "Task B").status).toBe("done");
  });

  it("round-trip: worklogs preserved in order", () => {
    const src = "- [ ] Task\n  - 2026-06-25 10:00: First\n  - 2026-06-25 11:00: Second\n";
    const r1 = parseDSL(src, "b1");
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const serialized = serializeDSL(r1.nodes);
    const r2 = parseDSL(serialized, "b1");
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    const task = findNode(r2.nodes, "Task");
    expect(task.workLogs).toHaveLength(2);
    expect(task.workLogs[0].text).toBe("First");
    expect(task.workLogs[1].text).toBe("Second");
  });

  it("round-trip: attributes preserved", () => {
    const src = "- [ ] foo @priority:high @estimate:4 @due:2026-12-31\n";
    const r1 = parseDSL(src, "b1");
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const serialized = serializeDSL(r1.nodes);
    const r2 = parseDSL(serialized, "b1");
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    const foo = findNode(r2.nodes, "foo");
    expect(foo.priority).toBe("high");
    expect(foo.estimate).toBe(4);
    expect(foo.dueDate).toBe("2026-12-31");
  });

  it("round-trip: 4+ levels preserve all descendants (regression for serializer data loss)", () => {
    const src = "- [ ] A\n  - [ ] B\n    - [ ] C\n      - [ ] D\n";
    const r1 = parseDSL(src, "b1");
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const serialized = serializeDSL(r1.nodes);
    const r2 = parseDSL(serialized, "b1");
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    const b = findNode(r2.nodes, "B");
    const c = findNode(r2.nodes, "C");
    const d = findNode(r2.nodes, "D");
    expect(c.parentId).toBe(b.id);
    expect(d.parentId).toBe(c.id);
  });

  it("worklog attaches to the immediately preceding task", () => {
    const r = parseDSL("- [ ] A\n- [ ] B\n  - 2026-06-25 10:00: note\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const a = findNode(r.nodes, "A");
    const b = findNode(r.nodes, "B");
    expect(a.workLogs).toHaveLength(0);
    expect(b.workLogs).toHaveLength(1);
    expect(b.workLogs[0].text).toBe("note");
  });

  it("round-trip: board name + tasks", () => {
    const src = "# マイボード\n- [ ] 着手\n- [x] 完了\n";
    const r1 = parseDSL(src, "b1");
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const out = serializeDSL(r1.nodes);
    expect(out).toContain("# マイボード");
    expect(out).toContain("- [ ] 着手");
    expect(out).toContain("- [x] 完了");
    const r2 = parseDSL(out, "b1");
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.nodes.root.text).toBe("マイボード");
  });
});

describe("parseInlineDSL", () => {
  it("parses @estimate:8", () => {
    const r = parseInlineDSL("task @estimate:8");
    expect(r.estimate).toBe(8);
  });
  it("@estimate:0 is null", () => {
    expect(parseInlineDSL("task @estimate:0").estimate).toBeNull();
  });
});

describe("realistic boards", () => {
  const samples = {
    "01 personal project with worklog history": `# 2026 Q2 個人プロジェクト

- [-] メインプロジェクト @status:wip
  - [x] 要件定義 @priority:high @due:2026-04-15 @done
    - 2026-04-01 09:30: クライアントMTG実施
    - 2026-04-03 14:00: ドラフトv0.1 共有
    - 2026-04-10 11:00: フィードバック反映v0.2
    - 2026-04-15 18:30: 最終版FIX @done
  - [-] 設計フェーズ @priority:high @status:wip
    - [x] アーキテクチャ図 @done
      - 2026-04-20 10:00: PlantUMLで作成
    - [-] DB スキーマ @status:wip
      - 2026-04-25 16:00: レビュー待ち
  - [-] 実装フェーズ @priority:medium @status:wip
    - [ ] バックエンド @estimate:16
    - [ ] フロントエンド @estimate:24
  - [ ] リリース準備 @priority:low @due:2026-06-30
- [x] 個人タスク @done @color:emerald
  - [x] 健康診断 @due:2026-05-10 @done
    - 2026-05-08 09:00: 受診完了
- [ ] 学習 @priority:medium @color:sky
  - [ ] Rust 入門
  - [ ] システム設計読書会
`,
    "03 reading notes (worklog-heavy)": `# 読書メモ

- [-] 技術書 @status:wip
  - [x] Domain Modeling Made Functional @done
    - 2026-05-01 22:30: 第1章読了。型駆動設計の基本
    - 2026-05-03 23:15: 第3章読了。集約の境界の話
    - 2026-05-08 21:00: 読了。めちゃくちゃ良かった
  - [-] Designing Data-Intensive Applications @priority:high @status:wip
    - 2026-05-10 19:00: 第1章 概要
    - 2026-05-12 20:30: 第2章 データモデル
    - 2026-05-15 22:00: 第3章 ストレージエンジン
    - [ ] 第5章 レプリケーション
    - [ ] 第7章 トランザクション
  - [ ] Team Topologies
  - [-] A Philosophy of Software Design @status:wip
    - 読み始め
    - 第3章まで読了。深いモジュールの考え方が刺さった
- [x] 論文 @done
  - [x] The Chubby Lock Service @done
    - 2026-04-22 11:00: 要約作成
    - 2026-04-25 16:00: 社内勉強会で発表
  - [x] MapReduce @done
- [ ] 動画
  - [ ] Rust の面白い動画
`,
    "04 edge cases (glyphs + colors + deep nesting)": `# Edge cases @priority:high

- [ ] 特殊文字を含むテキスト
  - [ ] [角括弧] と @at と #hash を含むタスク
  - [ ] 絵文字入りタスク
- [ ] wip の特殊グリフ
  - [-] 進行中タスク @status:wip
  - [|] レビュー待ち @status:review
  - [x] 完了タスク @done
- [x] 複数属性の組み合わせ @priority:high @color:emerald @due:2026-12-31 @estimate:8 @done
- [-] 色違いのタスク @status:wip
  - [ ] 通常 @color:slate
  - [ ] 緊急 @priority:high @color:rose
  - [ ] アイデア @color:sky
  - [ ] 財務 @color:emerald
- [ ] 優先度バリエーション
  - [ ] 高優先 @priority:high
  - [ ] 中優先 @priority:medium
  - [ ] 低優先 @priority:low
- [-] 深いネスト @status:wip
  - [-] レベル1 @status:wip
    - [-] レベル2 @status:wip
      - [-] レベル3 @status:wip
        - [-] レベル4 @status:wip
          - [-] レベル5 @status:wip
            - [-] レベル6 @status:wip
              - [ ] レベル7 (leaf)
                - 2026-06-26 10:00: もう限界
`,
    "05 gantt sample with @start dates": `# Web アプリ再構築 @start:2026-06-26

- [x] Phase 1: MVP @start:2026-06-26 @due:2026-07-31 @done
  - [x] 認証機能 @estimate:16 @start:2026-06-26 @due:2026-07-10 @done
    - [x] OAuth 統合 @done
    - [x] メール/パスワード @estimate:4 @done
  - [x] データモデル @estimate:8 @start:2026-07-01 @done
    - [x] Prisma スキーマ @done
  - [x] API エンドポイント @estimate:24 @start:2026-07-05 @done
- [x] Phase 2: ベータリリース @start:2026-08-01 @due:2026-09-30 @done
  - [x] パフォーマンス改善 @priority:high @estimate:4 @done
  - [x] E2E テスト @estimate:16 @done
- [-] Phase 3: GA @start:2026-10-01 @status:wip
  - [ ] ドキュメント整備 @estimate:8
  - [ ] リリースノート作成 @estimate:4
    - [ ] 英語版 @estimate:4
    - [ ] 日本語版
  - [-] 本番デプロイ @status:wip @start:2026-11-01
    - [ ] ステージング検証 @estimate:8
    - [ ] 本番リリース @estimate:4
  - [ ] 振り返り
`,
    "06 kanban workflow": `# 今週のタスク

- [ ] Inbox @color:slate
  - [ ] API リファレンスの更新
  - [ ] 顧客からの問い合わせ対応
- [-] WIP @status:wip @color:sky
  - [-] ダッシュボード改修 @status:wip @priority:high
    - [ ] グラフコンポーネント @estimate:8
    - [ ] フィルター機能 @estimate:4
  - [-] バグ修正: ログイン @status:wip @priority:high @due:2026-07-01
- [|] Review @status:review @color:emerald
  - [|] 新規登録フロー @status:review @estimate:6
  - [|] パスワードリセット @status:review @estimate:4
- [x] Done @done @color:rose
  - [x] CI/CD パイプライン改善 @done
    - 2026-06-25 14:00: GitHub Actions 移行完了
  - [x] 不要コード削除 @done
`,
    "07 minimal board": `# 買い物リスト

- [ ] 牛乳
- [ ] パン
- [x] 卵 @done
`,
    "08 inline DSL catalog": `# 属性サンプル

- [ ] 優先度:高 @priority:high
- [ ] 優先度:中 @priority:medium
- [ ] 優先度:低 @priority:low
- [ ] カラー:スレート @color:slate
- [ ] カラー:空 @color:sky
- [ ] カラー:エメラルド @color:emerald
- [ ] カラー:バラ @color:rose
- [ ] 期限・見積もり @due:2026-12-31 @estimate:16 @start:2026-06-01
- [x] 全属性盛り @priority:high @color:rose @due:2026-12-31 @start:2026-06-01 @estimate:8 @done
`,
  } as const;

  type SampleKey = keyof typeof samples;
  const expectedNodeCount: Record<SampleKey, number> = {
    "01 personal project with worklog history": 14,
    "03 reading notes (worklog-heavy)": 12,
    "04 edge cases (glyphs + colors + deep nesting)": 25,
    "05 gantt sample with @start dates": 19,
    "06 kanban workflow": 14,
    "07 minimal board": 3,
    "08 inline DSL catalog": 9,
  };

  for (const [name, src] of Object.entries(samples)) {
    it(`parses: ${name}`, () => {
      const r = parseDSL(src, "b1");
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const nonRoot = Object.values(r.nodes).filter((n) => !n.isRoot);
      expect(nonRoot).toHaveLength(expectedNodeCount[name as SampleKey]);
    });

    it(`round-trips: ${name}`, () => {
      const r1 = parseDSL(src, "b1");
      expect(r1.ok).toBe(true);
      if (!r1.ok) return;
      const serialized = serializeDSL(r1.nodes);
      const r2 = parseDSL(serialized, "b1");
      expect(r2.ok).toBe(true);
      if (!r2.ok) return;
      const c1 = Object.values(r1.nodes).filter((n) => !n.isRoot).length;
      const c2 = Object.values(r2.nodes).filter((n) => !n.isRoot).length;
      expect(c2).toBe(c1);
      const text1 = Object.values(r1.nodes)
        .filter((n) => !n.isRoot)
        .map((n) => n.text)
        .toSorted();
      const text2 = Object.values(r2.nodes)
        .filter((n) => !n.isRoot)
        .map((n) => n.text)
        .toSorted();
      expect(text2).toEqual(text1);
      const r3 = parseDSL(serializeDSL(r2.nodes), "b1");
      expect(r3.ok).toBe(true);
      if (!r3.ok) return;
      const c3 = Object.values(r3.nodes).filter((n) => !n.isRoot).length;
      expect(c3).toBe(c1);
    });
  }
});
