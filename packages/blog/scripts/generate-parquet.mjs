import duckdb from "duckdb";
import { writeFileSync, mkdirSync, unlinkSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { tokenize } from "lindera-js/lindera_js.js";

const { join } = path;
const { Database } = duckdb;

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

function extractKeywords(tokens, topN = 10) {
  const freq = new Map();
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

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n(?<frontmatter>[\s\S]*?)\n---/u);
  if (!match) return {};
  const meta = {};
  for (const line of match.groups.frontmatter.split("\n")) {
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

function scanFile(contentsDir, category, ym, file) {
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

function scanMeta(contentsDir) {
  const posts = [];
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
    /* contents dir not found */
  }
  return posts;
}

function getBody(meta, contentsDir) {
  const raw = readFileSync(join(contentsDir, meta.category, meta.ym, `${meta.slug}.md`), "utf8");
  const m = raw.match(/^---\n[\s\S]*?\n---\n(?<body>[\s\S]*)$/u);
  return m ? m.groups.body.trim() : raw;
}

const outDir = join(process.cwd(), "public");
const contentsDir = join(process.cwd(), "../../packages/blog-contents/contents");
const meta = scanMeta(contentsDir);

const enriched = meta.map((p) => {
  const body = getBody(p, contentsDir);
  const tokens = tokenize(body);
  const keywords = extractKeywords(tokens);
  return { ...p, Keywords: keywords };
});

mkdirSync(outDir, { recursive: true });
const tmpJson = join(outDir, "blog-meta.tmp.json");
const outFile = join(outDir, "blog-meta.parquet");
writeFileSync(tmpJson, JSON.stringify(enriched));

await new Promise((resolve, reject) => {
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
