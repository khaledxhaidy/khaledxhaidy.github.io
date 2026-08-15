// Turns index.html into a single self-contained file:
//   · assets/fonts.css folded into a <style>
//   · every photo inlined as a data URI
//   · the document wrapper stripped, since the preview host supplies its own
//
//   node tools/build.mjs
//
// Output: dist/invitation.html

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = resolve(root, "dist", "invitation.html");

let html = await readFile(resolve(root, "index.html"), "utf8");

/* ── fonts ──────────────────────────────────────────────────────── */
const fontsCss = await readFile(resolve(root, "assets", "fonts.css"), "utf8");
const linkTag = /<link rel="stylesheet" href="assets\/fonts\.css">/;
if (!linkTag.test(html)) throw new Error("fonts.css <link> not found in index.html");
html = html.replace(linkTag, `<style>\n${fontsCss}\n</style>`);

/* ── images ─────────────────────────────────────────────────────── */
const refs = [...new Set([...html.matchAll(/src="(assets\/[^"]+)"/g)].map(m => m[1]))];
let imgBytes = 0;
for (const ref of refs) {
  const bytes = await readFile(resolve(root, ref));
  imgBytes += bytes.length;
  html = html.replaceAll(`src="${ref}"`, `src="data:image/jpeg;base64,${bytes.toString("base64")}"`);
  console.log(`  inlined ${ref.padEnd(26)} ${Math.round(bytes.length / 1024)} KB`);
}
html = html.replaceAll(' loading="lazy"', "");

/* ── unwrap ─────────────────────────────────────────────────────── */
// The preview host wraps the file in its own doctype/head/body, so the
// tags here would nest a second document inside the first.
const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (!headMatch || !bodyMatch) throw new Error("Could not find <head> / <body> in index.html");

const head = headMatch[1]
  .replace(/<meta[^>]*>\s*/gi, "")   // charset/viewport are the host's job
  .trim();

const out = `${head}\n\n${bodyMatch[1].trim()}\n`;

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, out, "utf8");

const kb = n => `${Math.round(n / 1024)} KB`;
console.log(`\n  fonts  ${kb(Buffer.byteLength(fontsCss))} (css, already base64)`);
console.log(`  photos ${kb(imgBytes)} raw`);
console.log(`  -> dist/invitation.html  ${kb(Buffer.byteLength(out))}`);
