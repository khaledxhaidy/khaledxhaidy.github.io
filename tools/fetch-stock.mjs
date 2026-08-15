// Searches Openverse for PUBLIC DOMAIN (CC0 / PDM) photos and downloads
// candidates into scratch/stock/ so they can be reviewed before use.
// Public domain only — no attribution strings to carry into the invitation.
//
//   node tools/fetch-stock.mjs

import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "scratch", "stock");
await mkdir(outDir, { recursive: true });

const QUERIES = [
  "wedding invitation flat lay",
  "wedding stationery",
  "red wax seal letter",
  "rose petals white",
  "gold texture paper",
  "floral watercolor wreath",
  "calligraphy wedding card"
];

const manifest = [];
let n = 0;

for (const q of QUERIES) {
  const url = "https://api.openverse.org/v1/images/?" + new URLSearchParams({
    q,
    license: "cc0,pdm",
    page_size: "6",
    mature: "false"
  });

  let data;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "wedding-invite/1.0" } });
    data = await res.json();
  } catch (e) {
    console.log(`  ! ${q}: ${e.message}`);
    continue;
  }

  console.log(`\n"${q}" -> ${data.result_count ?? 0} results`);

  for (const r of (data.results || []).slice(0, 4)) {
    try {
      const img = await fetch(r.url, { headers: { "User-Agent": "wedding-invite/1.0" } });
      if (!img.ok) { console.log(`    skip ${img.status}  ${r.title}`); continue; }
      const buf = Buffer.from(await img.arrayBuffer());
      if (buf.length < 8000) { console.log(`    skip tiny  ${r.title}`); continue; }

      const name = `c${String(++n).padStart(2, "0")}.jpg`;
      await writeFile(resolve(outDir, name), buf);
      manifest.push({ file: name, query: q, title: r.title, license: r.license, src: r.foreign_landing_url });
      console.log(`    ${name}  ${Math.round(buf.length / 1024)} KB  [${r.license}]  ${r.title}`);
    } catch (e) {
      console.log(`    ! ${r.title}: ${e.message}`);
    }
  }
}

await writeFile(resolve(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\n${manifest.length} candidates in scratch/stock/`);
