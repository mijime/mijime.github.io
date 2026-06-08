import duckdb from "duckdb";
const { Database } = duckdb;
import { writeFileSync, mkdirSync, unlinkSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
const { join } = path;
import type { PostMeta } from "./types.ts";

const defaultContentsDir =
  process.env.BLOG_CONTENTS_DIR ?? join(import.meta.dirname, "../contents");

function parseFrontmatter(raw: string): Record<string, unknown> {
  const match = raw.match(/^---\n(?<frontmatter>[\s\S]*?)\n---/u);
  if (!match) return {};
  const meta: Record<string, unknown> = {};
  for (const line of match.groups!.frontmatter.split("\n")) {
    const colon = line.indexOf(":");
    if (colon !== -1) {
      const key = line.slice(0, colon).trim();
      const val = line
        .slice(colon + 1)
        .trim()
        .replaceAll(/^['"]|['"]$/gu, "");
      meta[key] = val;
    }
  }
  return meta;
}

function scanFile(
  contentsDir: string,
  category: string,
  ym: string,
  file: string,
): PostMeta | null {
  if (!file.endsWith(".md")) return null;
  const raw = readFileSync(join(contentsDir, category, ym, file), "utf8");
  const fm = parseFrontmatter(raw);
  if (fm.IsDraft === "true" || fm.IsDraft === true) return null;
  const tags =
    typeof fm.Tags === "string"
      ? fm.Tags.replaceAll(/[[\]'"\s]/gu, "")
          .split(",")
          .filter(Boolean)
      : [];
  return {
    Title: String(fm.Title ?? ""),
    Description: fm.Description ? String(fm.Description) : undefined,
    Tags: tags,
    CreatedAt: fm.CreatedAt ? String(fm.CreatedAt) : undefined,
    UpdatedAt: fm.UpdatedAt ? String(fm.UpdatedAt) : undefined,
    category,
    ym,
    slug: file.replace(/\.md$/u, ""),
  };
}

function scanMeta(contentsDir: string): PostMeta[] {
  const posts: PostMeta[] = [];
  try {
    for (const category of readdirSync(contentsDir)) {
      for (const ym of readdirSync(join(contentsDir, category))) {
        for (const file of readdirSync(join(contentsDir, category, ym))) {
          const post = scanFile(contentsDir, category, ym, file);
          if (post) posts.push(post);
        }
      }
    }
  } catch {
    // contents dir not found
  }
  return posts;
}

export async function generateBlogParquet(
  outDir: string,
  contentsDir = defaultContentsDir,
): Promise<void> {
  const meta = scanMeta(contentsDir);
  const enriched = meta.map((p) => ({ ...p, Keywords: [] as string[] }));

  return new Promise((resolve, reject) => {
    mkdirSync(outDir, { recursive: true });
    const tmpJson = join(outDir, "blog-meta.tmp.json");
    const outFile = join(outDir, "blog-meta.parquet");
    writeFileSync(tmpJson, JSON.stringify(enriched));

    const db = new Database(":memory:");
    db.exec(
      `COPY (SELECT * FROM read_json('${tmpJson}', columns={Title: 'VARCHAR', Description: 'VARCHAR', Tags: 'VARCHAR[]', CreatedAt: 'VARCHAR', UpdatedAt: 'VARCHAR', category: 'VARCHAR', ym: 'VARCHAR', slug: 'VARCHAR', Keywords: 'VARCHAR[]'})) TO '${outFile}' (FORMAT PARQUET)`,
      (err) => {
        try {
          unlinkSync(tmpJson);
        } catch {
          /* ignore */
        }
        db.close();
        if (err) reject(err);
        else resolve();
      },
    );
  });
}
