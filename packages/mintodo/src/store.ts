import type { MindNode } from "./types";

function makeNode(
  id: string,
  text: string,
  opts: Partial<MindNode> & { x: number; y: number },
): MindNode {
  return {
    categoryColor: "slate",
    children: [],
    collapsed: false,
    completed: false,
    dueDate: "",
    parentId: null,
    priority: "medium",
    vx: 0,
    vy: 0,
    ...opts,
    id,
    isRoot: opts.isRoot ?? false,
    text,
  };
}

export function createInitialNodes(): Record<string, MindNode> {
  const root = makeNode("root", "メインプロジェクト", {
    categoryColor: "slate",
    children: ["node-1", "node-2", "node-3"],
    isRoot: true,
    priority: "medium",
    x: 0,
    y: 0,
  });

  const node1 = makeNode("node-1", "企画・設計", {
    categoryColor: "sky",
    children: ["node-1-1", "node-1-2"],
    parentId: "root",
    priority: "high",
    x: -250,
    y: -120,
  });

  const node11 = makeNode("node-1-1", "要件定義書作成", {
    categoryColor: "sky",
    completed: true,
    dueDate: "2026-06-25",
    parentId: "node-1",
    priority: "high",
    x: -450,
    y: -180,
  });

  const node12 = makeNode("node-1-2", "UIデザイン作成", {
    categoryColor: "sky",
    dueDate: "2026-07-01",
    parentId: "node-1",
    priority: "medium",
    x: -450,
    y: -70,
  });

  const node2 = makeNode("node-2", "実装フェーズ", {
    categoryColor: "emerald",
    children: ["node-2-1", "node-2-2"],
    parentId: "root",
    priority: "high",
    x: 250,
    y: -50,
  });

  const node21 = makeNode("node-2-1", "フロントエンド実装", {
    categoryColor: "emerald",
    parentId: "node-2",
    priority: "high",
    x: 480,
    y: -100,
  });

  const node22 = makeNode("node-2-2", "API連携", {
    categoryColor: "emerald",
    parentId: "node-2",
    priority: "medium",
    x: 480,
    y: 0,
  });

  const node3 = makeNode("node-3", "テスト & リリース", {
    categoryColor: "rose",
    parentId: "root",
    priority: "low",
    x: 0,
    y: 180,
  });

  return {
    "node-1": node1,
    "node-1-1": node11,
    "node-1-2": node12,
    "node-2": node2,
    "node-2-1": node21,
    "node-2-2": node22,
    "node-3": node3,
    root,
  };
}
