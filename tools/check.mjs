// Site check: `npm run check` (builds first). Looks through every page in public/ and
// reports broken links, missing images or files, anchors that point nowhere, pages
// without a title or main heading, images without a description, and leftover
// placeholders in [brackets]. Problems that would break the site fail the check;
// placeholders are listed as reminders only.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const pages = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".html")) pages.push(p);
  }
})(root);

const errors = [], reminders = [];
const idsIn = new Map(pages.map((p) => [p, new Set([...fs.readFileSync(p, "utf8").matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));
let refs = 0;

for (const page of pages) {
  const html = fs.readFileSync(page, "utf8");
  const rel = path.relative(root, page);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
  if (dup.length) errors.push(`${rel}: the same id is used twice (${dup.join(", ")})`);
  for (const m of html.matchAll(/aria-(?:labelledby|describedby|controls)="([^"]+)"/g))
    for (const id of m[1].split(/\s+/)) if (!ids.includes(id)) errors.push(`${rel}: points to a missing element #${id}`);

  for (const m of html.matchAll(/(?:href|src|poster)="([^"]+)"|srcset="([^"]+)"/g)) {
    const values = m[1] ? [m[1]] : m[2].split(",").map((s) => s.trim().split(/\s+/)[0]);
    for (const v of values) {
      refs++;
      if (/^(https?:|mailto:|tel:|data:)/.test(v)) continue;
      const [file, hash] = v.split("#");
      const clean = file.split("?")[0];
      let target = clean === "" ? page : clean.startsWith("/") ? path.join(root, clean) : path.resolve(path.dirname(page), clean);
      if (clean.endsWith("/") || (fs.existsSync(target) && fs.statSync(target).isDirectory())) target = path.join(target, "index.html");
      if (!fs.existsSync(target)) { errors.push(`${rel}: missing file ${v}`); continue; }
      if (hash && target.endsWith(".html") && !idsIn.get(target)?.has(hash)) errors.push(`${rel}: link to #${hash} finds nothing on ${path.relative(root, target)}`);
    }
  }
  if (!/<title>[^<]{5,}<\/title>/.test(html)) errors.push(`${rel}: page has no title`);
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) errors.push(`${rel}: should have exactly one main heading (has ${h1})`);
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) errors.push(`${rel}: image without a description: ${m[0].slice(0, 80)}`);
  const ph = [...new Set(html.match(/\[(?:000[^\]]*|date|dato|12 [^\]]*|AquaVant[^\]]*)\]/g) || [])];
  if (ph.length) reminders.push(`${rel}: ${ph.join(" ")}`);
}

console.log(`Checked ${pages.length} pages and ${refs} links and files.`);
if (reminders.length) console.log(`\nStill to fill in (not errors):\n  ${reminders.join("\n  ")}`);
if (errors.length) {
  console.log(`\nPROBLEMS (${errors.length}):\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log("\nAll good: no broken links or missing files.");
