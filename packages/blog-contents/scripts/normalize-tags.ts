#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentsDir = join(__dirname, "../contents");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory()
      ? walk(path)
      : path.endsWith(".md") || path.endsWith(".mdx")
        ? [path]
        : [];
  });
}

const patterns = process.argv.slice(2);
const files = patterns.length > 0 ? walk(contentsDir) : walk(contentsDir);

let changed = 0;

for (const file of files) {
  const original = readFileSync(file, "utf-8");
  const updated = original.replace(
    /^(Tags:\s*\[)(.*?)(\])$/m,
    (_, open, inner, close) => `${open}${inner.toLowerCase()}${close}`,
  );
  if (updated !== original) {
    writeFileSync(file, updated);
    console.log(`fixed: ${file}`);
    changed++;
  }
}

console.log(`done: ${changed} files updated`);
