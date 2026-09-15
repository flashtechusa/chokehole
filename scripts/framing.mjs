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
  // Wait out the entrance FOR REAL. Setting sim.phase never emits the phase
  // event, so the camera would stay in its wide establishing framing.
  await new Promise((r) => setTimeout(r, 5200));

  const d = app.debug();
  const sim = d.sim; const p = sim.p1; const a = sim.p2;
  const view = d.view;
  const scene = view.scene ?? view.stage?.scene;
  const cam = scene.activeCamera;
  const eng = scene.getEngine();
  const V3 = cam.position.constructor;
  const MAT = cam.getViewMatrix().constructor;

  const measure = () => {
    const w = eng.getRenderWidth(); const h = eng.getRenderHeight();
    let minY = 1e9; let maxY = -1e9; let minX = 1e9; let maxX = -1e9; let off = false;
    for (const m of scene.meshes) {
      if (!m.name.startsWith('p1_') && !m.name.startsWith('p2_')) continue;
      if (!m.isEnabled() || !m.isVisible) continue;
      /*
       * A wrestler is ONE skinned mesh now, and a skinned mesh's bounding box
       * is its REST pose unless you ask for the skeleton to be applied. Without
       * this the pin rows measured two standing bodies in a pin camera, read
       * 55% tall with their heads in the HUD band, and reported a framing
       * problem that did not exist — a problem this tool exists to stop.
       */
      if (m.skeleton) {
        m.skeleton.prepare();
        m.refreshBoundingInfo({ applySkeleton: true, applyMorph: false });
      }
      for (const v of m.getBoundingInfo().boundingBox.vectorsWorld) {
        const pr = V3.Project(v, MAT.Identity(), scene.getTransformMatrix(),
          cam.viewport.toGlobal(w, h));
        if (pr.z < 0 || pr.z > 1) off = true;
        minY = Math.min(minY, pr.y); maxY = Math.max(maxY, pr.y);
        minX = Math.min(minX, pr.x); maxX = Math.max(maxX, pr.x);
      }
    }
    const pct = (v, t) => Math.round((v / t) * 100);
    return {
      offscreen: off,
      top: pct(minY, h), bottom: pct(maxY, h),
      left: pct(minX, w), right: pct(maxX, w),
      height: pct(maxY - minY, h),
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
      await new Promise((r) => setTimeout(r, 1400));
      positions.push({ mid, sep, ...measure() });
    }
  }
  // The real thrown-out-of-the-ring case: one on the floor at the barricade,
  // one still in the middle of the ring. This is what the camera has to survive.
  for (const mid of [-2.3, 2.3]) {
    place = { mid, sep: 4.2, pin: false };
    await new Promise((r) => setTimeout(r, 1600));
    positions.push({ mid, sep: 4.2, label: 'thrown out', ...measure() });
  }
  place = { mid: 0, sep: 1.5, pin: false };
  for (const mode of ['PLAY', 'SIGNATURE', 'FINISHER', 'NEARFALL', 'PIN', 'VICTORY', 'ENTRANCE']) {
    // Pin cameras frame bodies that are ON the mat and ON TOP of each other, so
    // measure them that way: prone, and half a metre apart rather than the
    // metre and a half two standing wrestlers keep between them.
    const pinning = mode === 'PIN' || mode === 'NEARFALL';
    place = { mid: 0, sep: pinning ? 0.5 : 1.5, pin: pinning };
    view.camera.setMode(mode, { x: p.x, y: 1.6, z: p.z });
    await new Promise((r) => setTimeout(r, 2200));
    modes[mode] = measure();
  }
  clearInterval(hold);
  return { positions, modes, fov: cam.fov };
});

const bad = [];
const row = (label, m, prone = false) => {
  const flag = [];
  if (m.offscreen) flag.push('OFFSCREEN');
  // A pin camera is framed on two bodies lying on the mat, so a small vertical
  // extent is correct there and only there.
  if (!prone && m.height < 28) flag.push('SMALL');
  if (m.top < 24) flag.push('UNDER-HUD');
  if (m.bottom > 101) flag.push('FEET-OFF-FRAME');
  if (m.right > 82) flag.push('UNDER-BUTTONS');
  if (flag.length) bad.push(`${label}: ${flag.join(', ')}`);
  console.log(`  ${label.padEnd(22)} h=${String(m.height).padStart(3)}%  `
    + `top=${String(m.top).padStart(3)}%  bottom=${String(m.bottom).padStart(3)}%  `
    + `left=${String(m.left).padStart(3)}%  right=${String(m.right).padStart(3)}%`
    + (flag.length ? `   <-- ${flag.join(', ')}` : ''));
};

console.log(`fov ${out.fov}`);
console.log('across the ring:');
for (const p of out.positions) row(p.label ? `${p.label} mid=${p.mid}` : `mid=${p.mid} sep=${p.sep}`, p);
console.log('camera modes:');
for (const [k, v] of Object.entries(out.modes)) row(k, v, k === 'PIN' || k === 'NEARFALL');
console.log(`errors: ${errs.length ? errs.join(' | ') : 'none'}`);
console.log(bad.length ? `FRAMING PROBLEMS: ${bad.length}` : 'FRAMING OK');
await browser.close();
process.exit(bad.length || errs.length ? 1 : 0);
