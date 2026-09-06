/**
 * Verifies a deployed (or local) build actually loads: boots the game, records
 * every network response, and fails on any 4xx/5xx, failed request, or console
 * error. Use it to prove a Pages URL is live, not just that DNS resolves.
 *
 *   URL=https://flashtechusa.github.io/choke-hole/ SHOT=/tmp/live.png \
 *     node scripts/check-deploy.mjs
 *
 * Exits non-zero if anything is broken.
 */
import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({ viewport:{width:844,height:390}, deviceScaleFactor:1, isMobile:true, hasTouch:true });
const page = await ctx.newPage();
const errs = [], net = [];
page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type()==='error') errs.push('CONSOLE ' + m.text()); });
page.on('response', r => net.push([r.status(), r.url()]));
page.on('requestfailed', r => net.push(['FAILED', r.url()]));
await page.goto(process.env.URL, { waitUntil: 'load' });
await page.waitForTimeout(4000);
const booted = await page.evaluate(() => !!window.__CHOKEHOLE__ && window.__CHOKEHOLE__.scene.getScenes(true).map(s=>s.scene.key));
await page.screenshot({ path: process.env.SHOT });
console.log('scenes running:', JSON.stringify(booted));
console.log('--- network ---');
for (const [s,u] of net) console.log(String(s).padEnd(7), u.length>90 ? u.slice(0,90)+'…' : u);
console.log('--- errors ---');
console.log(errs.length ? errs.join('\n') : 'none');
const bad = net.filter(([s]) => s === 'FAILED' || (typeof s === 'number' && s >= 400));
console.log('BAD RESPONSES:', bad.length ? JSON.stringify(bad) : 'none');
await browser.close();
process.exit(errs.length || bad.length ? 1 : 0);
