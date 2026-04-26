import * as duckdb from "@duckdb/duckdb-wasm";
import type { PostMeta } from "./types.ts";

let _db: duckdb.AsyncDuckDB | null = null;

export async function getDB(): Promise<duckdb.AsyncDuckDB> {
  if (_db) return _db;

  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
  const worker = await duckdb.createWorker(bundle.mainWorker!);
  const logger = new duckdb.ConsoleLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  _db = db;
  return db;
}

function parseRow(row: Record<string, unknown>): PostMeta {
  const tags = row.Tags;
  return {
    Title: String(row.Title ?? ""),
    Description:
      row.Description !== null && row.Description !== undefined
        ? String(row.Description)
        : undefined,
    Tags: Array.isArray(tags) ? tags.map(String) : [],
    CreatedAt:
      row.CreatedAt !== null && row.CreatedAt !== undefined ? String(row.CreatedAt) : undefined,
    UpdatedAt:
      row.UpdatedAt !== null && row.UpdatedAt !== undefined ? String(row.UpdatedAt) : undefined,
    IsDraft: row.IsDraft === true,
    category: String(row.category ?? ""),
    ym: String(row.ym ?? ""),
    slug: String(row.slug ?? ""),
  };
}

export async function queryBlogMeta(sql: string): Promise<PostMeta[]> {
  const db = await getDB();
  const conn = await db.connect();
  try {
    const result = await conn.query(sql);
    return result.toArray().map((row) => parseRow(row.toJSON()));
  } finally {
    await conn.close();
  }
}
