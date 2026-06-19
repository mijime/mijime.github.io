import Dexie, { type Table } from "dexie";
import type { Board, MindNode } from "./types";

export interface MetaEntry {
  key: string;
  value: unknown;
}

export class MindDB extends Dexie {
  public boards!: Table<Board, string>;
  public nodes!: Table<MindNode, [string, string]>;
  public meta!: Table<MetaEntry, string>;

  public constructor() {
    super("mintodo");
    this.version(1).stores({
      meta: "key",
      nodes: "id",
    });
    this.version(2).stores({
      meta: "key",
      boards: "id, updatedAt",
      nodes: "[boardId+id], boardId",
    });
  }
}

export const db = new MindDB();
