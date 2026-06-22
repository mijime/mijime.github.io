import type { CategoryColor, MindNode, Priority } from "./types";

export interface DslParseResult {
  board: { id: string; name: string };
  nodes: MindNode[];
}

const ALLOWED_PRIORITIES: ReadonlySet<Priority> = new Set(["low", "medium", "high"]);
const ALLOWED_COLORS: ReadonlySet<CategoryColor> = new Set(["slate", "sky", "emerald", "rose"]);

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function defaultNode(boardId: string): MindNode {
  return {
    id: "",
    boardId,
    text: "",
    parentId: null,
    isRoot: false,
    completed: false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    children: [],
    x: 0,
    y: 0,
  };
}

export function parseDSL(text: string, boardId: string): DslParseResult | null {
  const lines = text.replaceAll(/\r\n?/gu, "\n").split("\n");

  const nodes: MindNode[] = [];
  let prevDepth = 0;
  let firstNode = true;
  let counter = 0;
  let rootText = "";
  const parentByDepth: string[] = [];

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
    } else if (Math.abs(depth - prevDepth) > 1) {
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

    if (depth === 0) {
      node.id = "root";
      node.isRoot = true;
      rootText = text;
    } else {
      node.id = `n${counter++}`;
      node.parentId = parentByDepth[depth - 1];
    }

    parentByDepth[depth] = node.id;
    if (depth + 1 < parentByDepth.length) parentByDepth.length = depth + 1;

    nodes.push(node);
    prevDepth = depth;
  }

  if (firstNode) return null;

  for (const n of nodes) {
    if (n.parentId) {
      const parent = nodes.find((x) => x.id === n.parentId);
      if (parent) parent.children.push(n.id);
    }
  }

  return {
    board: { id: boardId, name: rootText },
    nodes,
  };
}

export function serializeDSL(board: { name: string }, nodes: Record<string, MindNode>): string {
  const rootNode = Object.values(nodes).find((n) => n.isRoot);
  if (!rootNode) return `${board.name}\n`;

  const out: string[] = [];
  const walk = (node: MindNode, depth: number): void => {
    const indent = "  ".repeat(depth);
    const attrs: string[] = [];
    if (node.priority !== "medium") attrs.push(`@priority:${node.priority}`);
    if (node.categoryColor !== "slate") attrs.push(`@color:${node.categoryColor}`);
    if (node.dueDate) attrs.push(`@due:${node.dueDate}`);
    if (node.completed) attrs.push("@done");
    const attrStr = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
    out.push(`${indent}${node.text}${attrStr}\n`);
    for (const cid of node.children) {
      const child = nodes[cid];
      if (child) walk(child, depth + 1);
    }
  };
  walk(rootNode, 0);
  return out.join("");
}
