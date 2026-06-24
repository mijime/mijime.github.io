import type { CategoryColor, MindNode, Priority, TaskStatus } from "./types";

export interface DslParseResult {
  board: { id: string; name: string };
  nodes: MindNode[];
}

const ALLOWED_PRIORITIES: ReadonlySet<Priority> = new Set(["low", "medium", "high"]);
const ALLOWED_COLORS: ReadonlySet<CategoryColor> = new Set(["slate", "sky", "emerald", "rose"]);
const ALLOWED_STATUSES: ReadonlySet<TaskStatus> = new Set(["inbox", "wip", "review", "done"]);

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
    status: "inbox",
    children: [],
    x: 0,
    y: 0,
  };
}

function parseAttributes(tokens: string[]): {
  text: string;
  priority: Priority;
  categoryColor: CategoryColor;
  dueDate: string;
  completed: boolean;
  status: TaskStatus;
} | null {
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
  let status: TaskStatus = "inbox";

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
        status = "done";
        break;
      }
      case "status": {
        if (!ALLOWED_STATUSES.has(value as TaskStatus)) return null;
        status = value as TaskStatus;
        if (status === "done") completed = true;
        break;
      }
      default: {
        break;
      }
    }
  }

  return { text, priority, categoryColor, dueDate, completed, status };
}

export function parseDSL(text: string, boardId: string): DslParseResult | null {
  const lines = text.replaceAll(/\r\n?/gu, "\n").split("\n");
  if (lines.length === 0) return null;
  const header = lines[0].trim().toLowerCase();
  if (header !== "mindmap") return null;

  const nodes: MindNode[] = [];
  let counter = 0;
  let rootText = "";
  let hasRoot = false;
  const stack: { depth: number; node: MindNode }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === "" || /^\s*#/u.test(raw)) continue;

    const m = /^(?<indent>\s*)(?<rest>.*)$/u.exec(raw);
    if (!m) continue;
    const { indent } = m.groups!;
    const { rest } = m.groups!;

    if (rest === "") return null;
    if (/\t/u.test(indent)) return null;
    if (indent.length % 2 !== 0) return null;
    const depth = indent.length / 2;

    const match = /^[*]\s+(?<body>.*)$/u.exec(rest);
    if (!match) return null;
    const {body} = match.groups!;

    const tokens = body.split(/\s+/u).filter((t) => t.length > 0);
    const parsed = parseAttributes(tokens);
    if (!parsed) return null;

    while (stack.length > 0 && stack.at(-1)!.depth >= depth) {
      stack.pop();
    }

    const parent = stack.length > 0 ? stack.at(-1)!.node : null;
    if (parent === null) {
      if (hasRoot) return null;
      hasRoot = true;
    }

    const node: MindNode = {
      ...defaultNode(boardId),
      text: parsed.text,
      priority: parsed.priority,
      categoryColor: parsed.categoryColor,
      dueDate: parsed.dueDate,
      completed: parsed.completed,
      status: parsed.status,
    };

    if (parent === null) {
      node.id = "root";
      node.isRoot = true;
      rootText = parsed.text;
    } else {
      node.id = `n${counter++}`;
      node.parentId = parent.id;
      parent.children.push(node.id);
    }

    nodes.push(node);
    stack.push({ depth, node });
  }

  if (!hasRoot) return null;

  return {
    board: { id: boardId, name: rootText },
    nodes,
  };
}

export function serializeDSL(board: { name: string }, nodes: Record<string, MindNode>): string {
  const rootNode = Object.values(nodes).find((n) => n.isRoot);
  if (!rootNode) return `mindmap\n  * ${board.name}\n`;

  const out: string[] = ["mindmap"];
  const walk = (node: MindNode, depth: number): void => {
    const indent = "  ".repeat(depth + 1);
    const attrs: string[] = [];
    if (node.priority !== "medium") attrs.push(`@priority:${node.priority}`);
    if (node.categoryColor !== "slate") attrs.push(`@color:${node.categoryColor}`);
    if (node.dueDate) attrs.push(`@due:${node.dueDate}`);
    if (node.status !== "inbox") attrs.push(`@status:${node.status}`);
    const attrStr = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
    out.push(`${indent}* ${node.text}${attrStr}`);
    for (const cid of node.children) {
      const child = nodes[cid];
      if (child) walk(child, depth + 1);
    }
  };
  walk(rootNode, 0);
  return `${out.join("\n")  }\n`;
}

export interface InlineDslResult {
  text: string;
  hasAnyAttribute: boolean;
  priority: Priority | null;
  categoryColor: CategoryColor | null;
  dueDate: string | null;
  completed: boolean | null;
  status: TaskStatus | null;
}

export function parseInlineDSL(raw: string): InlineDslResult {
  const result: InlineDslResult = {
    text: "",
    hasAnyAttribute: false,
    priority: null,
    categoryColor: null,
    dueDate: null,
    completed: null,
    status: null,
  };
  if (!raw) return result;

  const lines = raw.split("\n");
  const textLines: string[] = [];

  for (const line of lines) {
    const tokens = line.split(/\s+/u).filter((t) => t.length > 0);
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
        case "status": {
          if (ALLOWED_STATUSES.has(value as TaskStatus)) {
            result.status = value as TaskStatus;
            result.hasAnyAttribute = true;
          } else {
            textTokens.push(tok);
          }
          break;
        }
        case "done": {
          result.completed = true;
          result.status = "done";
          result.hasAnyAttribute = true;
          break;
        }
        default: {
          textTokens.push(tok);
          break;
        }
      }
    }

    if (textTokens.length > 0) {
      textLines.push(textTokens.join(" "));
    }
  }

  result.text = textLines.join("\n");
  return result;
}
