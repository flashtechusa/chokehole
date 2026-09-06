/** Renames the standalone build to something you can recognise in Downloads. */
import { renameSync, existsSync, statSync } from 'node:fs';

const from = 'dist-single/single.html';
const to = 'dist-single/CHOKE-HOLE.html';
if (!existsSync(from)) {
  console.error(`expected ${from} — did the single-file build run?`);
  process.exit(1);
}
renameSync(from, to);
const mb = (statSync(to).size / 1024 / 1024).toFixed(2);
console.log(`\n  ${to}  (${mb} MB) — open this file in a browser. That is the whole game.\n`);
