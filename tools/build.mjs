// Folds the invitation into a single self-contained file:
//   · every <link rel=stylesheet> replaced with the stylesheet itself
//   · every image inlined as a data URI, in HTML src= and CSS url()
//   · the document wrapper stripped, since the preview host supplies one
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

const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
               webp: "image/webp", svg: "image/svg+xml", gif: "image/gif",
               mp3: "audio/mpeg", m4a: "audio/mp4", ogg: "audio/ogg", wav: "audio/wav" };

// hosted previews reject pages over 16 MB — stay safely below it
const BUDGET = 15 * 1024 * 1024;

const cache = new Map();
async function dataUri(relPath) {
  if (cache.has(relPath)) return cache.get(relPath);
  const bytes = await readFile(resolve(root, relPath));
  const ext = relPath.split(".").pop().toLowerCase();
  const uri = `data:${MIME[ext] || "application/octet-stream"};base64,${bytes.toString("base64")}`;
  cache.set(relPath, uri);
  console.log(`  ${relPath.padEnd(30)} ${Math.round(bytes.length / 1024)} KB`);
  return uri;
}

/* ── stylesheets ────────────────────────────────────────────────── */
const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)];
if (!links.length) throw new Error("no stylesheet links found in index.html");

for (const [tag, href] of links) {
  let css = await readFile(resolve(root, href), "utf8");

  // url(../assets/x) and url(assets/x) -> data URIs
  const urls = [...new Set([...css.matchAll(/url\((?:'|")?((?:\.\.\/)?assets\/[^)'"]+)(?:'|")?\)/g)]
    .map(m => m[1]))];
  for (const u of urls) {
    const rel = u.replace(/^\.\.\//, "");
    css = css.replaceAll(u, await dataUri(rel));
  }

  html = html.replace(tag, `<style>\n/* ${href} */\n${css}\n</style>`);
}

/* ── images in markup ───────────────────────────────────────────── */
const srcs = [...new Set([...html.matchAll(/src="(assets\/[^"]+)"/g)].map(m => m[1]))];
for (const ref of srcs) {
  html = html.replaceAll(`src="${ref}"`, `src="${await dataUri(ref)}"`);
}
html = html.replaceAll(' loading="lazy"', "");

/* ── audio, referenced from the CONFIG block ────────────────────── */
// Inlined greedily in order of appearance while the page stays under
// BUDGET; anything left keeps its relative path, which the single-file
// preview cannot resolve but a normal folder deployment serves fine.
const tracks = [...new Set([...html.matchAll(/"(assets\/[^"]+\.(?:mp3|m4a|ogg|wav))"/g)].map(m => m[1]))];
for (const ref of tracks) {
  const bytes = await readFile(resolve(root, ref));
  const projected = Buffer.byteLength(html) + Math.ceil(bytes.length * 4 / 3);
  if (projected > BUDGET) {
    console.log(`  ${ref.padEnd(30)} ${Math.round(bytes.length / 1024)} KB  SKIPPED (over budget — plays on folder hosting only)`);
    continue;
  }
  html = html.replaceAll(`"${ref}"`, `"${await dataUri(ref)}"`);
}

/* ── unwrap the document ────────────────────────────────────────── */
const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (!headMatch || !bodyMatch) throw new Error("could not find <head> / <body>");

// The host supplies its own <html> element, so the variant and language
// hooks that live on <html> have to be re-applied at runtime instead.
const htmlAttrs = (html.match(/<html([^>]*)>/i) || [, ""])[1];
const bootstrap = `<script>(function(){var a=${JSON.stringify(htmlAttrs.trim())};` +
  `a.replace(/([\\w-]+)="([^"]*)"/g,function(m,k,v){document.documentElement.setAttribute(k,v);});})();</script>`;

const head = headMatch[1].replace(/<meta[^>]*>\s*/gi, "").trim();
const out = `${head}\n\n${bootstrap}\n${bodyMatch[1].trim()}\n`;

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, out, "utf8");

console.log(`\n  ${links.length} stylesheets, ${cache.size} images`);
console.log(`  -> dist/invitation.html  ${Math.round(Buffer.byteLength(out) / 1024)} KB`);
