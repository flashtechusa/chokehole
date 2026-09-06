/**
 * Renames the standalone build to something recognisable in Downloads, and
 * proves it is actually standalone: any surviving external href/src would 404
 * when the file is opened from disk.
 */
import { renameSync, existsSync, statSync, readFileSync } from 'node:fs';

const from = 'dist-single/single.html';
const to = 'dist-single/CHOKE-HOLE.html';
if (!existsSync(from)) {
  console.error(`expected ${from} — did the single-file build run?`);
  process.exit(1);
}

const html = readFileSync(from, 'utf8');
// Only inspect markup: the inlined bundle is full of string literals that look
// like attributes, and matching those gives false positives.
const markup = html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => m.slice(0, m.indexOf('>') + 1) + '</script>')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>');
const external = (markup.match(/(?:href|src)="(?!data:|#|blob:)[^"]+"/g) ?? [])
  .filter((r) => !/w3\.org/.test(r));
if (external.length) {
  console.error('\n  NOT standalone — these would 404 when opened from disk:');
  for (const r of external) console.error(`    ${r}`);
  process.exit(1);
}

renameSync(from, to);
const mb = (statSync(to).size / 1024 / 1024).toFixed(2);
console.log(`\n  ${to}  (${mb} MB) — fully self-contained, verified no external refs.`);
console.log('  Open it in a browser. That is the whole game.\n');
