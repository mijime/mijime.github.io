import type { CategoryColor, MindNode, Priority, TaskStatus, WorkLogEntry } from "./types";

export type ParseResult =
  | { ok: true; nodes: Record<string, MindNode> }
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
const STATUS_FROM_GLYPH: Record<string, TaskStatus> = {
  " ": "inbox",
  "-": "wip",
  "|": "review",
  x: "done",
};

const INDENT_UNIT = 2;
const TIMESTAMP_RE =
  /^(?<y>\d{4})-(?<m>\d{2})-(?<d>\d{2}) (?<h>\d{2}):(?<min>\d{2}): (?<rest>.*)$/u;
const TIMESTAMP_PREFIX_RE = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:/u;
const CHECKBOX_RE = /^-\s+\[(?<g>[ x|-])\]\s+(?<rest>.*)$/u;
const BOARD_NAME_RE = /^#\s+(?<rest>.*)$/u;
const BULLET_RE = /^-\s+(?<rest>.*)$/u;

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

const pad2 = (n: number): string => String(n).padStart(2, "0");

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function parseTimestamp(s: string): { timestamp: number; text: string } | null {
  const m = TIMESTAMP_RE.exec(s);
  if (!m || !m.groups) return null;
  const y = Number(m.groups.y);
  const mo = Number(m.groups.m);
  const d = Number(m.groups.d);
  const h = Number(m.groups.h);
  const mi = Number(m.groups.min);
  const dt = new Date(y, mo - 1, d, h, mi);
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d ||
    dt.getHours() !== h ||
    dt.getMinutes() !== mi
  )
    return null;
  return { timestamp: dt.getTime(), text: m.groups.rest };
}

interface ParsedLine {
  indent: number;
  kind: "board-name" | "task" | "worklog";
  body: string;
  line: number;
  checkboxStatus?: TaskStatus;
  worklogTimestamp?: number;
}

function classifyLine(raw: string, lineNo: number): ParsedLine | { error: string } {
  if (raw.includes("\t")) {
    return { error: `行 ${lineNo}: タブ文字は使えません` };
  }
  const m = /^(?<spaces> *)/u.exec(raw);
  const indent = m && m.groups ? m.groups.spaces.length : 0;
  if (indent % INDENT_UNIT !== 0) {
    return { error: `行 ${lineNo}: インデントは ${INDENT_UNIT} スペース単位です` };
  }
  const depth = indent / INDENT_UNIT;
  const rest = raw.slice(indent);

  if (depth === 0) {
    const bm = BOARD_NAME_RE.exec(rest);
    if (bm && bm.groups) {
      return { indent, line: lineNo, kind: "board-name", body: bm.groups.rest };
    }
  }

  const cm = CHECKBOX_RE.exec(rest);
  if (cm && cm.groups) {
    const { g } = cm.groups;
    if (!(g in STATUS_FROM_GLYPH)) {
      return {
        error: `行 ${lineNo}: チェックボックスの状態は \`[ ]\` / \`[-]\` / \`[|]\` / \`[x]\` のいずれかである必要があります`,
      };
    }
    return {
      indent,
      line: lineNo,
      kind: "task",
      body: cm.groups.rest,
      checkboxStatus: STATUS_FROM_GLYPH[g],
    };
  }

  const partialCb = /^-\s+\[(?<g>[^\s\]])\]/u.exec(rest);
  if (partialCb && partialCb.groups) {
    return {
      error: `行 ${lineNo}: チェックボックスの状態は \`[ ]\` / \`[-]\` / \`[|]\` / \`[x]\` のいずれかである必要があります`,
    };
  }

  const bm = BULLET_RE.exec(rest);
  if (bm && bm.groups) {
    const ts = parseTimestamp(bm.groups.rest);
    if (TIMESTAMP_PREFIX_RE.test(bm.groups.rest) && !ts) {
      return { error: `行 ${lineNo}: 作業履歴のタイムスタンプが不正です` };
    }
    return {
      indent,
      line: lineNo,
      kind: "worklog",
      body: ts ? ts.text : bm.groups.rest,
      worklogTimestamp: ts ? ts.timestamp : undefined,
    };
  }

  return {
    error: `行 ${lineNo}: 認識できない行です (\`#\` / \`##\` / \`###\` / \`- [ ]\` / \`- ...\` のいずれかで始まってください)`,
  };
}

interface ParsedAttrs {
  text: string;
  priority: Priority;
  categoryColor: CategoryColor;
  dueDate: string;
  completed: boolean;
  status: TaskStatus;
  estimate: number | null;
}

function parseAttributes(raw: string): ParsedAttrs | null {
  const tokens = raw.split(/\s+/u).filter((t) => t.length > 0);
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

function makeNode(id: string, parentId: string, boardId: string, attrs: ParsedAttrs): MindNode {
  return {
    id,
    boardId,
    text: attrs.text,
    parentId,
    isRoot: false,
    completed: attrs.completed,
    collapsed: false,
    priority: attrs.priority,
    categoryColor: attrs.categoryColor,
    dueDate: attrs.dueDate,
    status: attrs.status,
    children: [],
    x: 0,
    y: 0,
    estimate: attrs.estimate,
    workLogs: [],
  };
}

export function parseDSL(text: string, boardId: string): ParseResult {
  if (!text.trim()) {
    return { ok: false, reason: "トップレベル要素がありません (空のドキュメントです)", line: 0 };
  }

  const lines = text.split("\n");
  const parsed: ParsedLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const r = classifyLine(raw, i + 1);
    if ("error" in r) {
      return { ok: false, reason: r.error, line: i + 1 };
    }
    parsed.push(r);
  }

  if (parsed.length === 0) {
    return { ok: false, reason: "トップレベル要素がありません (空のドキュメントです)", line: 0 };
  }

  const nodes: Record<string, MindNode> = {};
  nodes.root = {
    id: "root",
    boardId,
    text: "",
    parentId: null,
    isRoot: true,
    completed: false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    status: "inbox",
    children: [],
    x: 0,
    y: 0,
    estimate: null,
    workLogs: [],
  };
  const counter = { value: 0 };
  const stack: { depth: number; nodeId: string }[] = [];
  let lastTask: { id: string | null; depth: number } = { id: null, depth: -1 };

  for (const p of parsed) {
    const depth = p.indent / INDENT_UNIT;

    if (p.kind === "board-name") {
      nodes.root.text = p.body;
      continue;
    }

    if (p.kind === "task") {
      const attrs = parseAttributes(p.body);
      if (!attrs) {
        return {
          ok: false,
          reason: `行 ${p.line}: チェックボックスの状態は \`[ ]\` / \`[-]\` / \`[|]\` / \`[x]\` のいずれかである必要があります`,
          line: p.line,
        };
      }
      const checkboxStatus = p.checkboxStatus ?? "inbox";
      const status: TaskStatus = attrs.status === "inbox" ? checkboxStatus : attrs.status;
      const completed = attrs.completed || checkboxStatus === "done";

      while (stack.length > 0 && stack.at(-1)!.depth >= depth) stack.pop();
      const [top] = stack.slice(-1);
      const parentId = top?.nodeId ?? "root";
      const nodeId = `n${counter.value++}`;
      const node = makeNode(nodeId, parentId, boardId, {
        ...attrs,
        status,
        completed,
      });
      nodes[nodeId] = node;
      nodes[parentId].children.push(nodeId);
      stack.push({ depth, nodeId });
      lastTask = { id: nodeId, depth };
      continue;
    }

    if (p.kind === "worklog") {
      if (lastTask.id === null) {
        return {
          ok: false,
          reason: `行 ${p.line}: 作業履歴の前にタスクが見当たりません`,
          line: p.line,
        };
      }
      if (depth !== lastTask.depth + 1) {
        return {
          ok: false,
          reason: `行 ${p.line}: 作業履歴のインデントが不正です (親タスクの 1 レベル下げて配置してください)`,
          line: p.line,
        };
      }
      const ts = p.worklogTimestamp ?? Date.now();
      const entry: WorkLogEntry = {
        id: `wl-${ts}-${counter.value++}`,
        timestamp: ts,
        text: p.body,
      };
      const parent = nodes[lastTask.id];
      nodes[lastTask.id] = { ...parent, workLogs: [...parent.workLogs, entry] };
    }
  }

  return { ok: true, nodes };
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

function serializeNode(node: MindNode, nodes: Record<string, MindNode>, depth: number): string[] {
  const attrStr = buildAttrSuffix(node);
  const out: string[] = [];
  const indent = "  ".repeat(depth);
  const glyph = GLYPH_FOR_STATUS[node.status] ?? " ";
  out.push(`${indent}- [${glyph}] ${node.text}${attrStr}`);
  for (const wl of node.workLogs) {
    out.push(`${"  ".repeat(depth + 1)}- ${formatTimestamp(wl.timestamp)}: ${wl.text}`);
  }
  for (const cid of node.children) {
    const child = nodes[cid];
    if (child) out.push(...serializeNode(child, nodes, depth + 1));
  }
  return out;
}

export function serializeDSL(nodes: Record<string, MindNode>): string {
  const root = Object.values(nodes).find((n) => n.isRoot);
  if (!root) {
    const out: string[] = [];
    for (const n of Object.values(nodes)) out.push(...serializeNode(n, nodes, 0));
    return `${out.join("\n")}\n`;
  }
  const out: string[] = [];
  if (root.text) out.push(`# ${root.text}${buildAttrSuffix(root)}`);
  for (const cid of root.children) {
    const child = nodes[cid];
    if (child) out.push(...serializeNode(child, nodes, 0));
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
