import duckdb from "duckdb";
const { Database } = duckdb;
import { writeFileSync, mkdirSync, unlinkSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import type { PostMeta } from "./types.ts";

interface Token {
  surface_form: string;
  pos: string;
  basic_form: string;
}

async function loadTokenizer(): Promise<(text: string) => Token[]> {
  const require = createRequire(import.meta.url);
  const mod = require("lindera-js/lindera_js.js");
  return mod.tokenize as unknown as (text: string) => Token[];
}

const STOP_POS = new Set(["助詞", "助動詞", "記号", "接続詞", "感動詞"]);
const STOP_WORDS = new Set([
  "する",
  "ある",
  "なる",
  "いる",
  "れる",
  "られる",
  "こと",
  "もの",
  "ため",
  "よう",
]);

function extractKeywords(tokens: Token[], topN = 10): string[] {
  const freq = new Map<string, number>();
  for (const t of tokens) {
    if (!STOP_POS.has(t.pos)) {
      const word = t.basic_form === "*" ? t.surface_form : t.basic_form;
      if (word && word.length >= 2 && !STOP_WORDS.has(word)) {
        freq.set(word, (freq.get(word) ?? 0) + 1);
      }
    }
  }
  return [...freq.entries()]
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([w]) => w);
}

const defaultContentsDir =
  process.env.BLOG_CONTENTS_DIR ?? join(import.meta.dirname, "../contents");

function parseFrontmatter(raw: string): Record<string, unknown> {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const meta: Record<string, unknown> = {};
  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":");
    if (colon !== -1) {
      const key = line.slice(0, colon).trim();
      const val = line
        .slice(colon + 1)
        .trim()
        .replaceAll(/^['"]|['"]$/g, "");
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
      ? fm.Tags.replaceAll(/[[\]'"\s]/g, "")
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
    slug: file.replace(/\.md$/, ""),
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

function getBody(meta: PostMeta, contentsDir: string): string {
  const path = join(contentsDir, meta.category, meta.ym, `${meta.slug}.md`);
  const raw = readFileSync(path, "utf8");
  const m = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return m ? m[1].trim() : raw;
}

export async function generateBlogParquet(
  outDir: string,
  contentsDir = defaultContentsDir,
): Promise<void> {
  const tokenize = await loadTokenizer();
  const meta = scanMeta(contentsDir);

  const enriched = meta.map((p) => {
    const body = getBody(p, contentsDir);
    const tokens: Token[] = tokenize(body);
    const keywords = extractKeywords(tokens);
    return { ...p, Keywords: keywords };
  });

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
