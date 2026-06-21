/* eslint-disable init-declarations */
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
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
import type { MindNode, SaveData } from "./types";

function makeNode(id: string, boardId: string, opts: Partial<MindNode> = {}): MindNode {
  return {
    id,
    boardId,
    text: opts.text ?? "node",
    parentId: opts.parentId ?? null,
    isRoot: opts.isRoot ?? false,
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
    ...opts,
  };
}

beforeEach(async () => {
  await db.boards.clear();
  await db.nodes.clear();
  await db.meta.clear();
});

afterEach(async () => {
  await db.boards.clear();
  await db.nodes.clear();
  await db.meta.clear();
});

describe("createBoard", () => {
  it("adds a board and a root node", async () => {
    const { board, rootId } = await createBoard("My Project");
    expect(board.name).toBe("My Project");
    expect(board.id).toMatch(/^[0-9a-f-]{36}$/u);
    expect(rootId).toBe("root");
    const stored = await db.boards.get(board.id);
    expect(stored).toBeDefined();
    const root = await db.nodes.get([board.id, rootId]);
    expect(root).toBeDefined();
    expect(root?.boardId).toBe(board.id);
    expect(root?.isRoot).toBe(true);
  });
});

describe("loadBoards", () => {
  it("returns boards sorted by updatedAt desc", async () => {
    const a = await createBoard("A");
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 5);
    });
    const b = await createBoard("B");
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 5);
    });
    const c = await createBoard("C");
    const list = await loadBoards();
    expect(list.map((x) => x.id)).toEqual([c.board.id, b.board.id, a.board.id]);
  });

  it("returns empty array when no boards", async () => {
    expect(await loadBoards()).toEqual([]);
  });
});

describe("loadNodesForBoard / saveNodesForBoard", () => {
  it("round-trips nodes for a specific board", async () => {
    const { board, rootId } = await createBoard("P1");
    const nodes: Record<string, MindNode> = {
      [rootId]: makeNode(rootId, board.id, { isRoot: true, text: "root" }),
      "n-1": makeNode("n-1", board.id, { parentId: rootId, text: "child" }),
    };
    await saveNodesForBoard(board.id, nodes);
    const loaded = await loadNodesForBoard(board.id);
    expect(Object.keys(loaded).toSorted()).toEqual([rootId, "n-1"].toSorted());
  });

  it("only returns nodes for the requested board", async () => {
    const p1 = await createBoard("P1");
    const p2 = await createBoard("P2");
    await saveNodesForBoard(p1.board.id, {
      root: makeNode("root", p1.board.id, { isRoot: true, text: "p1-root" }),
    });
    await saveNodesForBoard(p2.board.id, {
      root: makeNode("root", p2.board.id, { isRoot: true, text: "p2-root" }),
    });
    const p1Nodes = await loadNodesForBoard(p1.board.id);
    expect(p1Nodes.root.text).toBe("p1-root");
  });
});

describe("renameBoard", () => {
  it("updates name and updatedAt", async () => {
    const { board } = await createBoard("Old");
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 5);
    });
    const before = (await db.boards.get(board.id))!.updatedAt;
    await renameBoard(board.id, "New");
    const after = await db.boards.get(board.id);
    expect(after?.name).toBe("New");
    expect(after!.updatedAt).toBeGreaterThan(before);
  });
});

describe("deleteBoard", () => {
  it("removes the board and all its nodes", async () => {
    const { board, rootId } = await createBoard("Doomed");
    await saveNodesForBoard(board.id, {
      [rootId]: makeNode(rootId, board.id, { isRoot: true }),
      "n-1": makeNode("n-1", board.id, { parentId: rootId }),
    });
    await deleteBoard(board.id);
    expect(await db.boards.get(board.id)).toBeUndefined();
    expect(await db.nodes.where("boardId").equals(board.id).count()).toBe(0);
  });
});

describe("currentBoardId", () => {
  it("getCurrentBoardId returns null by default", async () => {
    expect(await getCurrentBoardId()).toBeNull();
  });

  it("setCurrentBoardId then getCurrentBoardId", async () => {
    await setCurrentBoardId("abc");
    expect(await getCurrentBoardId()).toBe("abc");
  });

  it("setCurrentBoardId(null) clears", async () => {
    await setCurrentBoardId("abc");
    await setCurrentBoardId(null);
    expect(await getCurrentBoardId()).toBeNull();
  });
});

describe("migration", () => {
  it("hasV1Data is true when nodes exist but no boards", async () => {
    await db.nodes.add(makeNode("orphan", "unknown", { isRoot: true }));
    expect(await hasV1Data()).toBe(true);
  });

  it("hasV1Data is false when boards exist", async () => {
    const { board } = await createBoard("X");
    await db.nodes.add(makeNode("n", board.id));
    expect(await hasV1Data()).toBe(false);
  });

  it("hasV1Data is false when no nodes", async () => {
    expect(await hasV1Data()).toBe(false);
  });

  it("discardV1Data removes all nodes", async () => {
    await db.nodes.add(makeNode("orphan", "unknown"));
    await discardV1Data();
    expect(await db.nodes.count()).toBe(0);
  });
});

describe("JSON import / export", () => {
  it("downloadJson produces a Blob URL", () => {
    const data: SaveData = {
      version: 2,
      board: { id: "b", name: "B" },
      nodes: [],
    };
    const url = downloadJson(data, "test.json");
    expect(url).toMatch(/^blob:/u);
    URL.revokeObjectURL(url);
  });

  it("parseImportedJson reads valid v2 data", () => {
    const data: SaveData = {
      version: 2,
      board: { id: "b", name: "B" },
      nodes: [makeNode("root", "b", { isRoot: true })],
    };
    const json = JSON.stringify(data);
    const parsed = parseImportedJson(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.version).toBe(2);
    expect(parsed!.nodes.length).toBe(1);
  });

  it("parseImportedJson returns null on invalid data", () => {
    expect(parseImportedJson("not json")).toBeNull();
    expect(parseImportedJson("{}")).toBeNull();
    expect(parseImportedJson(JSON.stringify({ version: 1, nodes: [] }))).toBeNull();
    expect(parseImportedJson(JSON.stringify({ version: 2 }))).toBeNull();
    expect(
      parseImportedJson(JSON.stringify({ version: 2, board: { id: "b" }, nodes: "bad" })),
    ).toBeNull();
  });
});

describe("downloadText", () => {
  it("produces a Blob URL", () => {
    const url = downloadText("hello", "test.md", "text/markdown");
    expect(url).toMatch(/^blob:/u);
    URL.revokeObjectURL(url);
  });
});
