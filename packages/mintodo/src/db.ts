import Dexie, { type Table } from "dexie";
import type { MindNode } from "./types";

export interface MetaEntry {
  key: string;
  value: unknown;
}

export class MindDB extends Dexie {
  nodes!: Table<MindNode, string>;
  meta!: Table<MetaEntry, string>;

  constructor() {
    super("mintodo");
    this.version(1).stores({
      meta: "key",
      nodes: "id",
    });
  }
}

export const db = new MindDB();
