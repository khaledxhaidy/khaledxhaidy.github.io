// Generates v2/index.html — the dove-envelope version — from index.html.
// v1 (the root page) is the starry night with the Wedding March;
// v2 is the postal design with "A Thousand Years" as its default song.
//
//   node tools/make-v2.mjs

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let html = await readFile(resolve(root, "index.html"), "utf8");

// each patch must land exactly once — a miss means index.html drifted
function patch(from, to) {
  const n = html.split(from).length - 1;
  if (n !== 1) throw new Error(`expected exactly 1 match, got ${n}: ${from}`);
  html = html.replace(from, to);
}

patch('data-variant="night"',      'data-variant="postal"');
patch('content="#0D1728"',         'content="#F8F3E8"');
patch('version: "v1"',             'version: "v2"');
patch('defaultSong: 0',            'defaultSong: 1');
patch('variants: ["night"]',       'variants: ["postal"]');
patch('defaultVariant: "night"',   'defaultVariant: "postal"');

// v2 lives under /v2/ — resolve every relative asset from the site root
patch("<head>", '<head>\n<base href="/">');

await mkdir(resolve(root, "v2"), { recursive: true });
await writeFile(resolve(root, "v2", "index.html"), html, "utf8");
console.log("v2/index.html written");
