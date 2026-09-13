// Generates the alternate versions from index.html:
//   v2 — the same starry night, but playing "A Thousand Years"
//   v3 — the dove-envelope postal design, Wedding March
//   v4 — the arabesque design, Wedding March
// The root page (v1) stays the starry night with the Wedding March.
//
//   node tools/make-v2.mjs

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(resolve(root, "index.html"), "utf8");

const VERSIONS = {
  v2: [
    ['version: "v1"',              'version: "v2"'],
    ['defaultSong: 0',             'defaultSong: 1'],
  ],
  v3: [
    ['version: "v1"',              'version: "v3"'],
    ['data-variant="night"',       'data-variant="postal"'],
    ['content="#0D1728"',          'content="#F8F3E8"'],
    ['variants: ["night"]',        'variants: ["postal"]'],
    ['defaultVariant: "night"',    'defaultVariant: "postal"'],
  ],
  v4: [
    ['version: "v1"',              'version: "v4"'],
    ['data-variant="night"',       'data-variant="arabesque"'],
    ['content="#0D1728"',          'content="#0C3A31"'],
    ['variants: ["night"]',        'variants: ["arabesque"]'],
    ['defaultVariant: "night"',    'defaultVariant: "arabesque"'],
  ],
};

for (const [name, patches] of Object.entries(VERSIONS)) {
  let html = source;

  // each patch must land exactly once — a miss means index.html drifted
  for (const [from, to] of patches) {
    const n = html.split(from).length - 1;
    if (n !== 1) throw new Error(`${name}: expected exactly 1 match, got ${n}: ${from}`);
    html = html.replace(from, to);
  }

  // versions live under /vN/ — resolve every relative asset from the root
  html = html.replace("<head>", '<head>\n<base href="/">');

  await mkdir(resolve(root, name), { recursive: true });
  await writeFile(resolve(root, name, "index.html"), html, "utf8");
  console.log(`${name}/index.html written`);
}
