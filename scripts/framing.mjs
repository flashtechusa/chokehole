/**
 * Framing check.
 *
 * Projects both wrestlers' bounding boxes to screen pixels and reports how much
 * of the frame they fill, across the width of the ring, at several separations,
 * and in every camera mode. This exists because "it looks 2.5D" was checked by
 * eye and was wrong: the screenshots were all taken a second after the bell,
 * inside the ENTRANCE camera's wide establishing shot — the one mode that is
 * supposed to be wide.
 *
 *   node scripts/framing.mjs
 *
 * Requires a server (npm run preview) at GAME_URL.
 *
 * What good looks like on a 844x390 phone. The camera is a broadcast hard
 * camera framed on the RING, not a fighting-game camera framed on the two
 * bodies, so a wrestler is a third of the screen rather than two thirds:
 *   height   30-42% of the screen   (below ~28% they stop being readable)
 *   top      >= 26%                 (the HUD owns the top quarter)
 *   right    <= 80%                 (the three buttons own the bottom right)
 */
import { chromium } from 'playwright';

const URL = process.env.GAME_URL || 'http://localhost:4173/';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__CHOKEHOLE__, null, { timeout: 30000 });

const out = await page.evaluate(async () => {
  const app = window.__CHOKEHOLE__;
  app.debug().startMatch();
  // Wait out the entrance for real, the way the original note says to.
  await new Promise((r) => setTimeout(r, 5200));

  const d = app.debug();
  const sim = d.sim; const p = sim.p1; const a = sim.p2;
  const view = d.view;

  /*
   * The renderer is flat now, so there is no bounding box to project: a
   * wrestler occupies a known column of world space, from the mat at their feet
   * to their own height above it, about a third of a unit either side. Asking
   * the view to project those four corners is both simpler and honest -- it is
   * the same projection the comic layer aims with.
   */
  const measure = () => {
    let minY = 1e9; let maxY = -1e9; let minX = 1e9; let maxX = -1e9;
    for (const f of [p, a]) {
      const h = f === p ? 1.95 : 1.88;
      for (const [dx, dy] of [[-0.34, 0], [0.34, 0], [-0.34, h], [0.34, h]]) {
        const pr = view.project(f.x + dx, f.y + dy);
        if (!pr) continue;
        minX = Math.min(minX, pr.x); maxX = Math.max(maxX, pr.x);
        minY = Math.min(minY, pr.y); maxY = Math.max(maxY, pr.y);
      }
    }
    const pct = (v) => Math.round(v * 100);
    return {
      offscreen: minX < -0.02 || maxX > 1.02,
      top: pct(minY), bottom: pct(maxY),
      left: pct(minX), right: pct(maxX),
      height: pct(maxY - minY),
    };
  };

  let place = { mid: 0, sep: 1.5, pin: false };
  const hold = setInterval(() => {
    p.x = place.mid - place.sep / 2; p.facing = 0; p.vx = 0;
    a.x = place.mid + place.sep / 2; a.facing = Math.PI; a.vx = 0;
    p.y = p.groundY; a.y = a.groundY;
    p.setState(place.pin ? 'PIN' : 'IDLE');
    a.setState(place.pin ? 'PINNED' : 'IDLE');
  }, 16);

  const positions = []; const modes = {};
  for (const mid of [-2.6, -1.3, 0, 1.3, 2.6]) {
    for (const sep of [1.4, 3.2, 5.0]) {
      place = { mid, sep, pin: false };
      await new Promise((r) => setTimeout(r, 900));
      positions.push({ mid, sep, ...measure() });
    }
  }
  for (const mid of [-2.3, 2.3]) {
    place = { mid, sep: 4.2, pin: false };
    await new Promise((r) => setTimeout(r, 900));
    positions.push({ mid, sep: 4.2, label: 'thrown out', ...measure() });
  }
  return { positions, modes, fov: 0 };
});

const bad = [];
const row = (label, m) => {
  const flag = [];
  if (m.offscreen) flag.push('OFFSCREEN');
  if (m.height < 26) flag.push('SMALL');
  if (m.top < 24) flag.push('UNDER-HUD');
  if (m.bottom > 101) flag.push('FEET-OFF-FRAME');
  if (m.right > 84) flag.push('UNDER-BUTTONS');
  if (flag.length) bad.push(`${label}: ${flag.join(', ')}`);
  console.log(`  ${label.padEnd(22)} h=${String(m.height).padStart(3)}%  `
    + `top=${String(m.top).padStart(3)}%  bottom=${String(m.bottom).padStart(3)}%  `
    + `left=${String(m.left).padStart(3)}%  right=${String(m.right).padStart(3)}%`
    + (flag.length ? `   <-- ${flag.join(', ')}` : ''));
};

console.log('across the ring:');
for (const q of out.positions) row(q.label ? `${q.label} mid=${q.mid}` : `mid=${q.mid} sep=${q.sep}`, q);
console.log(`errors: ${errs.length ? errs.join(' | ') : 'none'}`);
console.log(bad.length ? `FRAMING PROBLEMS: ${bad.length}` : 'FRAMING OK');
await browser.close();
process.exit(bad.length || errs.length ? 1 : 0);
