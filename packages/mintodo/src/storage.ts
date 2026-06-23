import { db } from "./db";
import type { Board, MindNode } from "./types";

function arrayToRecord(arr: MindNode[]): Record<string, MindNode> {
  const rec: Record<string, MindNode> = {};
  for (const n of arr) {
    rec[n.id] = n;
  }
  return rec;
}

export async function loadBoards(): Promise<Board[]> {
  const boards = await db.boards.orderBy("updatedAt").toArray();
  return boards.toReversed();
}

export async function loadNodesForBoard(boardId: string): Promise<Record<string, MindNode>> {
  const all = await db.nodes.where("boardId").equals(boardId).toArray();
  return arrayToRecord(all);
}

export async function saveNodesForBoard(
  boardId: string,
  nodes: Record<string, MindNode>,
): Promise<void> {
  await db.transaction("rw", db.nodes, async () => {
    await db.nodes.where("boardId").equals(boardId).delete();
    await db.nodes.bulkPut(Object.values(nodes));
  });
}

export async function createBoard(name: string): Promise<{ board: Board; rootId: string }> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const board: Board = { id, name, createdAt: now, updatedAt: now };
  const rootId = "root";
  const root: MindNode = {
    id: "root",
    boardId: id,
    text: name,
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
  };
  await db.transaction("rw", db.boards, db.nodes, async () => {
    await db.boards.add(board);
    await db.nodes.add(root);
  });
  return { board, rootId };
}

export async function renameBoard(id: string, name: string): Promise<void> {
  await db.boards.update(id, { name, updatedAt: Date.now() });
}

export async function deleteBoard(id: string): Promise<void> {
  await db.transaction("rw", db.boards, db.nodes, async () => {
    await db.nodes.where("boardId").equals(id).delete();
    await db.boards.delete(id);
  });
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const entry = await db.meta.get(key);
  return entry?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

export async function getCurrentBoardId(): Promise<string | null> {
  const entry = await db.meta.get("currentBoardId");
  return (entry?.value as string | undefined) ?? null;
}

export async function setCurrentBoardId(id: string | null): Promise<void> {
  await (id === null
    ? db.meta.delete("currentBoardId")
    : db.meta.put({ key: "currentBoardId", value: id }));
}

export async function hasV1Data(): Promise<boolean> {
  const nodeCount = await db.nodes.count();
  const boardCount = await db.boards.count();
  return nodeCount > 0 && boardCount === 0;
}

export async function discardV1Data(): Promise<void> {
  await db.transaction("rw", db.nodes, async () => {
    await db.nodes.clear();
  });
}
