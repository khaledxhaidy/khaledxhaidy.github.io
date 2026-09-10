// Generates v2/index.html from index.html. The two versions are the
// identical starry-night design; the only difference is the soundtrack:
// v1 (the root page) plays the Wedding March, v2 plays "A Thousand
// Years" — plus a version tag so the sheet shows where a reply came from.
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

patch('version: "v1"',   'version: "v2"');
patch('defaultSong: 0',  'defaultSong: 1');

// v2 lives under /v2/ — resolve every relative asset from the site root
patch("<head>", '<head>\n<base href="/">');

await mkdir(resolve(root, "v2"), { recursive: true });
await writeFile(resolve(root, "v2", "index.html"), html, "utf8");
console.log("v2/index.html written");
