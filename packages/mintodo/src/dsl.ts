import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root, List, ListItem, Paragraph, PhrasingContent } from "mdast";

import type { CategoryColor, MindNode, Priority, TaskStatus, WorkLogEntry } from "./types";

export type ParseResult =
  | { ok: true; nodes: Record<string, MindNode>; rootText: string }
  | { ok: false; reason: string; line: number };

const ALLOWED_PRIORITIES: ReadonlySet<Priority> = new Set(["low", "medium", "high"]);
const ALLOWED_COLORS: ReadonlySet<CategoryColor> = new Set(["slate", "sky", "emerald", "rose"]);
const ALLOWED_STATUSES: ReadonlySet<TaskStatus> = new Set(["inbox", "wip", "review", "done"]);
const GLYPH_FOR_STATUS: Record<TaskStatus, string> = {
  inbox: " ",
  wip: "-",
  review: "|",
  done: "x",
};

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parseAttributes(tokens: string[]): {
  text: string;
  priority: Priority;
  categoryColor: CategoryColor;
  dueDate: string;
  completed: boolean;
  status: TaskStatus;
  estimate: number | null;
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
  let estimate: number | null = null;
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
      case "estimate": {
        const n = Number(value);
        estimate = Number.isFinite(n) && n > 0 ? n : null;
        break;
      }
      default: {
        break;
      }
    }
  }
  return { text, priority, categoryColor, dueDate, completed, status, estimate };
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function extractText(nodes: PhrasingContent[]): string {
  return nodes.map((n) => (n.type === "text" || n.type === "inlineCode" ? n.value : "")).join("");
}

function paragraphText(p: Paragraph): string {
  return extractText(p.children);
}

function indentOf(node: { position?: { start: { column: number } } }): number {
  return (node.position?.start.column ?? 1) - 1;
}

function makeNodeData(
  id: string,
  parentId: string,
  p: {
    text: string;
    priority: Priority;
    categoryColor: CategoryColor;
    dueDate: string;
    completed: boolean;
    status: TaskStatus;
    estimate: number | null;
    boardId: string;
  },
): MindNode {
  return {
    id,
    boardId: p.boardId,
    text: p.text,
    parentId,
    isRoot: false,
    completed: p.completed,
    collapsed: false,
    priority: p.priority,
    categoryColor: p.categoryColor,
    dueDate: p.dueDate,
    status: p.status,
    estimate: p.estimate,
    workLogs: [],
    children: [],
    x: 0,
    y: 0,
  };
}

const IMPLICIT_ROOT_ID = "";

function processListItem(
  item: ListItem,
  boardId: string,
  nodes: Record<string, MindNode>,
  counter: { value: number },
  stack: { depth: number; nodeId: string }[],
  lastTask: { id: string | null; depth: number },
  usedIds: Set<string>,
): ParseResult | null {
  const line = item.position?.start.line ?? 0;
  const indent = indentOf(item);
  if (indent % 2 !== 0) {
    return { ok: false, reason: `行 ${line}: インデントは2スペース単位です`, line };
  }
  const visualDepth = indent / 2;
  const parentDepth = stack.length > 0 ? stack.at(-1)!.depth : -1;
  const depth = Math.max(visualDepth, parentDepth + 1);
  const firstParagraph = item.children.find((c) => c.type === "paragraph") as Paragraph | undefined;
  if (!firstParagraph) return { ok: false, reason: `行 ${line}: 空のリスト項目です`, line };
  const fullText = paragraphText(firstParagraph);

  let kind: "task-inbox" | "task-done" | "task-wip" | "task-review" | "worklog" = "worklog";
  let bodyText = fullText;
  let worklogTimestamp: number | null = null;

  if (fullText.startsWith("[-] ")) {
    kind = "task-wip";
    bodyText = fullText.slice(4);
  } else if (fullText.startsWith("[|] ")) {
    kind = "task-review";
    bodyText = fullText.slice(4);
  } else if (item.checked === true) {
    kind = "task-done";
  } else if (item.checked === false) {
    kind = "task-inbox";
  } else if (/^\[[^\s\-|x]\]\s/u.test(fullText)) {
    return {
      ok: false,
      reason: `行 ${line}: チェックボックスの状態は \`[ ]\` / \`[-]\` / \`[|]\` / \`[x]\` のいずれかである必要があります`,
      line,
    };
  } else {
    const tsMatch =
      /^(?<y>\d{4})-(?<m>\d{2})-(?<d>\d{2}) (?<h>\d{2}):(?<min>\d{2}): (?<rest>.*)$/u.exec(
        fullText,
      );
    if (tsMatch) {
      const [, y, m, d, h, min, rest] = tsMatch;
      const dt = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
      if (
        Number.isNaN(dt.getTime()) ||
        dt.getFullYear() !== Number(y) ||
        dt.getMonth() !== Number(m) - 1 ||
        dt.getDate() !== Number(d) ||
        dt.getHours() !== Number(h) ||
        dt.getMinutes() !== Number(min)
      ) {
        return { ok: false, reason: `行 ${line}: 作業履歴のタイムスタンプが不正です`, line };
      }
      worklogTimestamp = dt.getTime();
      bodyText = rest;
    } else if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:/u.test(fullText)) {
      return { ok: false, reason: `行 ${line}: 作業履歴のタイムスタンプが不正です`, line };
    } else {
      worklogTimestamp = Date.now();
    }
  }

  if (kind === "worklog") {
    if (lastTask.id === null) {
      return { ok: false, reason: `行 ${line}: 作業履歴の前にタスクが見当たりません`, line };
    }
    if (depth !== lastTask.depth + 1) {
      return {
        ok: false,
        reason: `行 ${line}: 作業履歴のインデントが不正です (親タスクの 1 レベル下げて配置してください)`,
        line,
      };
    }
    const entry: WorkLogEntry = {
      id: `wl-${worklogTimestamp}-${counter.value++}`,
      timestamp: worklogTimestamp!,
      text: bodyText,
    };
    const parent = nodes[lastTask.id];
    nodes[lastTask.id] = { ...parent, workLogs: [...parent.workLogs, entry] };
    return null;
  }

  let status: TaskStatus = "inbox";
  if (kind === "task-inbox") {
    status = "inbox";
  } else if (kind === "task-done") {
    status = "done";
  } else if (kind === "task-wip") {
    status = "wip";
  } else if (kind === "task-review") {
    status = "review";
  }

  const tokens = bodyText.split(/\s+/u).filter((t) => t.length > 0);
  const parsed = parseAttributes(tokens);
  if (!parsed) {
    return {
      ok: false,
      reason: `行 ${line}: チェックボックスの状態は \`[ ]\` / \`[-]\` / \`[|]\` / \`[x]\` のいずれかである必要があります`,
      line,
    };
  }
  const finalStatus = parsed.status === "inbox" ? status : parsed.status;
  const finalCompleted = parsed.completed || kind === "task-done";

  while (stack.length > 0 && stack.at(-1)!.depth >= depth) stack.pop();
  const parentEntry = stack.length > 0 ? stack.at(-1)! : null;
  const parentId = parentEntry?.nodeId ?? IMPLICIT_ROOT_ID;

  let nodeId = `n${counter.value++}`;
  if (depth === 0 && !usedIds.has(parsed.text)) {
    nodeId = parsed.text;
    usedIds.add(nodeId);
  }

  const node = makeNodeData(nodeId, parentId, {
    ...parsed,
    completed: finalCompleted,
    status: finalStatus,
    boardId,
  });
  nodes[nodeId] = node;
  if (parentId !== IMPLICIT_ROOT_ID) nodes[parentId].children.push(nodeId);
  stack.push({ depth, nodeId });
  lastTask.id = nodeId;
  lastTask.depth = depth;
  return null;
}

function processList(
  list: List,
  boardId: string,
  nodes: Record<string, MindNode>,
  counter: { value: number },
  stack: { depth: number; nodeId: string }[],
  lastTask: { id: string | null; depth: number },
  usedIds: Set<string>,
): ParseResult | null {
  for (const item of list.children) {
    if (item.type !== "listItem") continue;
    const r = processListItem(item, boardId, nodes, counter, stack, lastTask, usedIds);
    if (r) return r;
    for (const child of item.children) {
      if (child.type === "list") {
        const r2 = processList(child, boardId, nodes, counter, stack, lastTask, usedIds);
        if (r2) return r2;
      }
    }
  }
  return null;
}

export function parseDSL(text: string, boardId: string): ParseResult {
  if (!text.trim())
    return { ok: false, reason: "トップレベル要素がありません (空のドキュメントです)", line: 0 };

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/^[ \t]/u.test(lines[i]) && lines[i].includes("\t")) {
      return { ok: false, reason: `行 ${i + 1}: タブ文字は使えません`, line: i + 1 };
    }
  }

  const preprocessed = lines.map((l) => l.replace(/^[\t ]+(?<hashes>#{1,3})\s/u, "$1 ")).join("\n");

  const tree: Root = (() => {
    try {
      return unified().use(remarkParse).use(remarkGfm).parse(preprocessed);
    } catch {
      return { type: "root", children: [], position: undefined as never };
    }
  })();
  if (!tree.children) {
    return { ok: false, reason: "Markdownのパースに失敗しました", line: 0 };
  }

  const nodes: Record<string, MindNode> = {};
  const counter = { value: 0 };
  const stack: { depth: number; nodeId: string }[] = [];
  const lastTask: { id: string | null; depth: number } = { id: null, depth: -1 };
  const usedIds = new Set<string>();
  let hasContent = false;

  for (const block of tree.children) {
    if (block.type === "heading") {
      if (block.depth < 1 || block.depth > 3) {
        return {
          ok: false,
          reason: `行 ${block.position?.start.line ?? 0}: 見出しレベルが不正です (#, ##, ### のみサポート)`,
          line: block.position?.start.line ?? 0,
        };
      }
      const headingText = block.children
        .map((c) => (c.type === "text" || c.type === "inlineCode" ? c.value : ""))
        .join("");
      const tokens = headingText.split(/\s+/u).filter((t) => t.length > 0);
      const parsed = parseAttributes(tokens);
      if (!parsed)
        return {
          ok: false,
          reason: `行 ${block.position?.start.line ?? 0}: 見出しの解析に失敗しました`,
          line: block.position?.start.line ?? 0,
        };
      const depth = block.depth - 1;
      while (stack.length > 0 && stack.at(-1)!.depth >= depth) stack.pop();
      const parentEntry = stack.length > 0 ? stack.at(-1)! : null;
      const parentId = parentEntry?.nodeId ?? IMPLICIT_ROOT_ID;
      let nodeId = `n${counter.value++}`;
      if (depth === 0 && !usedIds.has(parsed.text)) {
        nodeId = parsed.text;
        usedIds.add(nodeId);
      }
      const node: MindNode = {
        id: nodeId,
        boardId,
        text: parsed.text,
        parentId,
        isRoot: false,
        completed: false,
        collapsed: false,
        priority: parsed.priority,
        categoryColor: parsed.categoryColor,
        dueDate: parsed.dueDate,
        status: "inbox",
        children: [],
        x: 0,
        y: 0,
        estimate: parsed.estimate,
        workLogs: [],
      };
      nodes[nodeId] = node;
      if (parentId !== IMPLICIT_ROOT_ID) nodes[parentId].children.push(nodeId);
      stack.push({ depth, nodeId });
      lastTask.id = nodeId;
      lastTask.depth = depth;
      hasContent = true;
    } else if (block.type === "list") {
      const r = processList(block as List, boardId, nodes, counter, stack, lastTask, usedIds);
      if (r) return r;
      hasContent = true;
    } else if (block.type === "paragraph") {
      const t = paragraphText(block).trim();
      if (/^#{1,2}[^ #]/u.test(t)) continue;
      return {
        ok: false,
        reason: `行 ${block.position?.start.line ?? 0}: 認識できない行です`,
        line: block.position?.start.line ?? 0,
      };
    } else {
      return {
        ok: false,
        reason: `行 ${block.position?.start.line ?? 0}: サポートされていないノード ${block.type}`,
        line: block.position?.start.line ?? 0,
      };
    }
  }

  if (!hasContent)
    return { ok: false, reason: "トップレベル要素がありません (空のドキュメントです)", line: 0 };
  return { ok: true, nodes, rootText: "" };
}

function buildAttrSuffix(node: MindNode): string {
  const attrs: string[] = [];
  if (node.priority !== "medium") attrs.push(`@priority:${node.priority}`);
  if (node.categoryColor !== "slate") attrs.push(`@color:${node.categoryColor}`);
  if (node.dueDate) attrs.push(`@due:${node.dueDate}`);
  if (node.status !== "inbox" && node.status !== "done") attrs.push(`@status:${node.status}`);
  if (node.estimate !== null && node.estimate > 0) attrs.push(`@estimate:${node.estimate}`);
  if (node.completed && node.status === "done") attrs.push("@done");
  return attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
}

function serializeNode(node: MindNode, nodes: Record<string, MindNode>, depth: number): string {
  const attrStr = buildAttrSuffix(node);
  const lines: string[] = [];
  if (depth <= 2 && node.children.length > 0) {
    lines.push(`${"#".repeat(depth + 1)} ${node.text}${attrStr}`);
    for (const cid of node.children) {
      const child = nodes[cid];
      if (child) lines.push(serializeNode(child, nodes, depth + 1));
    }
    return lines.join("\n");
  }
  const indent = "  ".repeat(depth + 1);
  const glyph = GLYPH_FOR_STATUS[node.status] ?? " ";
  const mainLine = `${indent}- [${glyph}] ${node.text}${attrStr}`;
  const allLines = [mainLine];
  for (const wl of node.workLogs) {
    allLines.push(`${"  ".repeat(depth + 2)}- ${formatTimestamp(wl.timestamp)}: ${wl.text}`);
  }
  return allLines.join("\n");
}

export function serializeDSL(nodes: Record<string, MindNode>): string {
  const out: string[] = [];
  const explicitRoot = Object.values(nodes).find((n) => n.isRoot);
  if (explicitRoot) {
    for (const cid of explicitRoot.children) {
      const child = nodes[cid];
      if (child) out.push(serializeNode(child, nodes, 0));
    }
  } else {
    const rootChildren = Object.values(nodes).filter((n) => n.parentId === IMPLICIT_ROOT_ID);
    for (const child of rootChildren) {
      out.push(serializeNode(child, nodes, 0));
    }
  }
  return `${out.join("\n")}\n`;
}

export interface InlineDslResult {
  text: string;
  hasAnyAttribute: boolean;
  priority: Priority | null;
  categoryColor: CategoryColor | null;
  dueDate: string | null;
  completed: boolean | null;
  status: TaskStatus | null;
  estimate: number | null;
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
    estimate: null,
  };
  if (!raw) return result;
  for (const line of raw.split("\n")) {
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
          } else textTokens.push(tok);
          break;
        }
        case "color": {
          if (ALLOWED_COLORS.has(value as CategoryColor)) {
            result.categoryColor = value as CategoryColor;
            result.hasAnyAttribute = true;
          } else textTokens.push(tok);
          break;
        }
        case "due": {
          if (isValidDate(value)) {
            result.dueDate = value;
            result.hasAnyAttribute = true;
          } else textTokens.push(tok);
          break;
        }
        case "status": {
          if (ALLOWED_STATUSES.has(value as TaskStatus)) {
            result.status = value as TaskStatus;
            result.hasAnyAttribute = true;
          } else textTokens.push(tok);
          break;
        }
        case "done": {
          result.completed = true;
          result.status = "done";
          result.hasAnyAttribute = true;
          break;
        }
        case "estimate": {
          const n = Number(value);
          result.estimate = Number.isFinite(n) && n > 0 ? n : null;
          result.hasAnyAttribute = true;
          break;
        }
        default: {
          textTokens.push(tok);
          break;
        }
      }
    }
    if (textTokens.length > 0) result.text += (result.text ? "\n" : "") + textTokens.join(" ");
  }
  return result;
}
