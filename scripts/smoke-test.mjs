/**
 * Headless smoke test: boots the game at an iPhone-landscape viewport, walks the
 * whole flow (title -> menu -> select -> entrance -> match -> pin -> results ->
 * archives -> roster -> how to play -> settings), screenshots each step and
 * fails loudly on any console or page error.
 *
 *   npm run dev                      # in one terminal
 *   npx playwright install chromium  # once
 *   SHOT_DIR=/tmp/shots npm run smoke
 *
 * Playwright is intentionally NOT a dependency of the game; install it only if
 * you want to run this.
 */
import { chromium } from 'playwright';

const SHOT = process.env.SHOT_DIR || '/tmp/shots';
const URL = process.env.GAME_URL || 'http://localhost:5173/';
const errors = [];
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader',
         '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({
  viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '')));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(1500);

const shot = (n) => page.screenshot({ path: `${SHOT}/${n}.png` });
const S = await page.evaluate(() => ({ w: window.__CHOKEHOLE__.scale.width, h: window.__CHOKEHOLE__.scale.height }));
const R = await page.evaluate(() => {
  const r = document.querySelector('#game canvas').getBoundingClientRect();
  return { l: r.left, t: r.top, w: r.width, h: r.height };
});
const tap = async (dx, dy) => {
  await page.touchscreen.tap(R.l + (dx / S.w) * R.w, R.t + (dy / S.h) * R.h);
  await page.waitForTimeout(140);
};
const active = () => page.evaluate(() => window.__CHOKEHOLE__.scene.getScenes(true).map((s) => s.scene.key));
const waitScene = async (key, ms = 15000) => {
  const t0 = Date.now();
  for (;;) {
    const s = await active();
    if (s.includes(key)) return true;
    if (Date.now() - t0 > ms) { console.log('TIMEOUT waiting', key, 'saw', s); return false; }
    await page.waitForTimeout(150);
  }
};

// ---- to the match ----
await tap(S.w / 2, 440); await page.waitForTimeout(700);
await tap(S.w / 2, 440); await waitScene('Menu'); await page.waitForTimeout(400);
await shot('menu');
await tap(S.w / 2, 194); await waitScene('Select'); await page.waitForTimeout(400);
await shot('select-1');
const spacing = Math.min(370, (S.w - 90) / 2);
await tap(S.w / 2 - spacing / 2, 466); await page.waitForTimeout(500);   // JASSY
await tap(S.w / 2 + spacing / 2, 466); await page.waitForTimeout(500);   // RAID
await shot('select-arena');
await tap(S.w - 150, 486); await waitScene('Match'); await page.waitForTimeout(1000);
await shot('entrance');
await tap(S.w / 2, 470); await page.waitForTimeout(1800);
await shot('match');

const hold = async (k, ms) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
const st = () => page.evaluate(() => {
  const m = window.__CHOKEHOLE__.scene.getScene('Match');
  if (!m || !m.scene.isActive()) return null;
  return { phase: m.phase, heat: Math.round(m.heat), h1: Math.round(m.p1.health), h2: Math.round(m.p2.health),
           sq1: Math.round(m.p1.squelsh), s1: m.p1.state, s2: m.p2.state };
});

// ---- build SQUELSH and land a signature + finisher ----
for (let i = 0; i < 10; i++) {
  await hold('ArrowRight', 260);
  await hold('j', 60); await page.waitForTimeout(180);
  await hold('j', 340); await page.waitForTimeout(320);
  const s = await st();
  if (s && s.sq1 >= 50) break;
}
console.log('before special', JSON.stringify(await st()));
await hold('ArrowRight', 220);
await hold('l', 60);
await page.waitForTimeout(500);
await shot('signature');
console.log('after signature', JSON.stringify(await st()));

// ---- harness nudge: put the AI one hit from zero, then finish it legitimately ----
await page.evaluate(() => {
  const m = window.__CHOKEHOLE__.scene.getScene('Match');
  m.p2.health = 0.6;
});
let downed = false;
for (let i = 0; i < 40 && !downed; i++) {
  const s = await st();
  if (!s) break;
  await hold('ArrowRight', 150);
  await hold('j', 60);
  await page.waitForTimeout(220);
  const s2 = await st();
  if (s2 && (s2.s2 === 'DOWN' || s2.h2 <= 0)) downed = true;
}
console.log('downed?', downed, JSON.stringify(await st()));
await shot('down');

// walk in and cover
for (let i = 0; i < 40; i++) {
  const s = await st();
  if (!s || s.phase === 'PIN' || s.phase === 'ENDING') break;
  await hold('ArrowRight', 120);
  await hold('k', 60);
  await page.waitForTimeout(200);
}
console.log('pin?', JSON.stringify(await st()));
await page.waitForTimeout(900);
await shot('pin');
await page.waitForTimeout(2600);
console.log('end state', JSON.stringify(await st()));

// ---- other screens ----
await tap(S.w * 0.862, 486); await waitScene('Menu'); await page.waitForTimeout(400);
await tap(S.w / 2, 258); await waitScene('Archive'); await page.waitForTimeout(500);
await shot('archive');
await tap(62, 512); await waitScene('Menu'); await page.waitForTimeout(400);
await tap(S.w / 2, 318); await waitScene('Roster'); await page.waitForTimeout(500);
await shot('roster');
await tap(62, 512); await waitScene('Menu'); await page.waitForTimeout(400);
await tap(S.w / 2 - 78, 378); await waitScene('HowTo'); await page.waitForTimeout(500);
await shot('howto');
await tap(190, 440); await waitScene('Menu'); await page.waitForTimeout(400);
await tap(S.w / 2 + 78, 378); await waitScene('Settings'); await page.waitForTimeout(500);
await shot('settings');

console.log('=== ERRORS ===');
console.log(errors.length ? errors.join('\n---\n') : 'none');
await browser.close();
process.exit(errors.length ? 1 : 0);
