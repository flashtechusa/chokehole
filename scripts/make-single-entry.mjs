/**
 * Derives `single.html` from `index.html` for the standalone build.
 *
 * The standalone file must reference NOTHING outside itself, so the favicon and
 * apple-touch-icon links are stripped. Generated rather than hand-maintained so
 * it cannot drift from index.html, and every removal is asserted — an earlier
 * hand-written version silently failed to match and shipped a file with two
 * broken references.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('index.html', 'utf8');
let out = src;

// any <link> whose href points at a file on disk
const externalLink = /^[ \t]*<link\b[^>]*href="\.\/[^"]*"[^>]*>\r?\n/gm;
const removed = src.match(externalLink) ?? [];
if (removed.length === 0) {
  console.error('make-single-entry: found no external <link> tags to strip.');
  console.error('index.html changed shape — check this script still matches.');
  process.exit(1);
}
out = out.replace(externalLink, '');

out = out.replace(
  '<title>CHOKE HOLE: NO HOLES BARRED</title>',
  '<title>CHOKE HOLE: NO HOLES BARRED</title>\n'
  + '<!-- Standalone single-file build. No server, no install: just open this file. -->',
);

// note: src="/src/main.ts" stays -- the build consumes it. The real guarantee
// that nothing external survives is asserted on the built file, in name-single.mjs.

writeFileSync('single.html', out);
console.log(`make-single-entry: stripped ${removed.length} external link(s) -> single.html`);
