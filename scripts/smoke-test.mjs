/**
 * End-to-end smoke test through the real UI: title -> archive -> match ->
 * combat -> pin -> results -> rematch. Fails on any console error, page error
 * or failed request.
 *
 * Screenshots are captured at deviceScaleFactor 1, i.e. true phone CSS pixels.
 * Capturing at 2 is what hid the unreadable type in the first prototype.
 */
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const SHOT = process.env.SHOT_DIR || '/tmp/chokehole-shots';
const URL = process.env.GAME_URL || 'http://localhost:4173/';
fs.mkdirSync(SHOT, { recursive: true });

const errors = [];
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader',
         '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({
  viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('requestfailed', (r) => errors.push('REQFAIL ' + r.url()));

const shot = (n) => page.screenshot({ path: path.join(SHOT, n + '.png') });
const tap = async (label) => {
  const el = page.locator('button.big-btn', { hasText: label }).first();
  await el.waitFor({ state: 'visible', timeout: 10000 });
  await el.dispatchEvent('pointerdown');
};
const state = () => page.evaluate(() => {
  const d = window.__CHOKEHOLE__.debug();
  const s = d.sim;
  return {
    screen: d.screen, fps: d.fps, quality: d.quality,
    phase: s ? s.phase : null,
    h1: s ? Math.round(s.p1.health) : null,
    h2: s ? Math.round(s.p2.health) : null,
    s1: s ? s.p1.state : null, s2: s ? s.p2.state : null,
  };
});

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__CHOKEHOLE__, null, { timeout: 30000 });
await page.waitForTimeout(1800);
await shot('01-title');
console.log('title   ', JSON.stringify(await state()));

await tap('HOW TO');
await page.waitForTimeout(500);
await shot('02-howto');
await tap('BACK');
await page.waitForTimeout(400);

await tap('FIGHT');
await page.waitForTimeout(600);
await shot('03-archive');
await tap('RING THE BELL');
await page.waitForTimeout(4500);
await shot('04-match');
console.log('match   ', JSON.stringify(await state()));

// real button presses through the touch layer
const attack = page.locator('.btn-attack');
const grab = page.locator('.btn-grab');
for (let i = 0; i < 26; i++) {
  const b = i % 5 === 4 ? grab : attack;
  await b.dispatchEvent('pointerdown');
  await b.dispatchEvent('pointerup');
  await page.waitForTimeout(170);
}
await shot('05-fighting');
console.log('fought  ', JSON.stringify(await state()));

// Force the finish so the pin, results and rematch paths are exercised. The
// opponent has to be flattened and covered in the same tick, or they simply get
// back up before the cover lands.
await page.evaluate(() => {
  const s = window.__CHOKEHOLE__.debug().sim;
  const d = s.p2;
  d.health = 0;
  d.exhausted = true;
  d.action = null;
  d.setState('DOWN');
  d.y = d.groundY;
  s.p1.action = null;
  s.p1.setState('IDLE');
  s.p1.x = d.x + 0.5; s.p1.z = d.z;
  s.p1.events.push({ type: 'wantsPin' });
});
await page.waitForTimeout(1500);
await shot('06-pin');
console.log('pin     ', JSON.stringify(await state()));

await page.waitForTimeout(8000);
await shot('07-results');
const after = await state();
console.log('results ', JSON.stringify(after));
if (after.screen !== 'RESULT') errors.push(`expected RESULT screen, got ${after.screen}`);

await tap('REMATCH');
await page.waitForTimeout(3000);
const again = await state();
console.log('rematch ', JSON.stringify(again));
if (again.screen !== 'MATCH') errors.push(`rematch did not start a match: ${again.screen}`);
await shot('08-rematch');

console.log('=== ERRORS ===');
console.log(errors.length ? errors.slice(0, 10).join('\n') : 'none');
await browser.close();
process.exit(errors.length ? 1 : 0);
