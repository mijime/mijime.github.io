import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { apps, manifestFor, site, siteManifest } from "../apps.config.mjs";

const root = path.resolve(import.meta.dirname, "..");
const publicDir = path.join(root, "public");
const iconsDir = path.join(publicDir, "icons");

mkdirSync(iconsDir, { recursive: true });

function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function icon({ slug, icon: label, themeColor }, size, maskable = false) {
  const file = path.join(iconsDir, `${slug}${maskable ? "-maskable" : ""}-${size}.png`);
  const source = path.join(
    root,
    "pwa-icons",
    `${slug === site.slug ? "site" : slug}.svg`,
  );
  try {
    execFileSync("rsvg-convert", ["-w", String(size), "-h", String(size), source, "-o", file]);
    return;
  } catch {
    // Fall back to ImageMagick + a text glyph below.
  }
  const pointsize = Math.round(size * (maskable ? 0.26 : 0.38));
  execFileSync("magick", [
    "-size",
    `${size}x${size}`,
    `xc:${themeColor}`,
    "-gravity",
    "center",
    "-font",
    process.env.PWA_FONT ?? "/usr/share/fonts/liberation/LiberationSans-Bold.ttf",
    "-pointsize",
    String(pointsize),
    "-fill",
    "#fff8f4",
    "-annotate",
    "+0+0",
    label.toUpperCase(),
    file,
  ]);
}

for (const app of apps) {
  writeJson(path.join(publicDir, "apps", app.slug, "manifest.webmanifest"), manifestFor(app));
  icon(app, 192);
  icon(app, 512);
  icon(app, 512, true);
  icon(app, 180);
}

writeJson(path.join(publicDir, "manifest.webmanifest"), siteManifest());
icon(site, 192);
icon(site, 512);
icon(site, 512, true);
icon(site, 180);

console.log(`PWA manifests and icons generated for ${apps.length} apps + site`);
