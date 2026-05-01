#!/usr/bin/env bun
import { readdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { join } from "path";

const contentsDir = join(import.meta.dir, "../contents");

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
const files =
  patterns.length > 0
    ? patterns.flatMap((p) => [...new Bun.Glob(p).scanSync(".")])
    : walk(contentsDir);

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
