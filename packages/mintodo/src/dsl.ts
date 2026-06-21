import type { MindNode } from "./types";

export interface DslParseResult {
  board: { id: string; name: string };
  nodes: MindNode[];
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
    vx: 0,
    vy: 0,
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
    const {indent} = match.groups!;
    const {rest} = match.groups!;

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

    if (rest.startsWith("@")) return null;

    const [textMatch] = rest.split(/\s+/u);
    if (!textMatch) return null;

    const node: MindNode = {
      ...defaultNode(boardId),
      text: textMatch,
    };

    if (depth === 0) {
      node.id = "root";
      node.isRoot = true;
      rootText = textMatch;
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

export function serializeDSL(
  board: { name: string },
  nodes: Record<string, MindNode>,
): string {
  const rootNode = Object.values(nodes).find((n) => n.isRoot);
  if (!rootNode) return `${board.name}\n`;

  const out: string[] = [];
  const walk = (id: string, depth: number) => {
    const n = nodes[id];
    if (!n) return;
    out.push(`${" ".repeat(depth * 2)}${n.text}\n`);
    for (const cid of n.children) walk(cid, depth + 1);
  };
  walk(rootNode.id, 0);
  return out.join("");
}
