/**
 * Player agency check.
 *
 * Drives the game through its OWN touch controls -- the stick zone and the
 * three buttons, with real pointer events -- and measures how much of a live
 * match the player is actually allowed to do something.
 *
 * This exists because every other harness in this repo bypassed the input
 * layer: `pace.mjs` feeds intents straight to the simulation, and the ad-hoc
 * tests patched `stickToWorld`. All of them reported a healthy match. None of
 * them could see that the player spends most of it on the mat, because being on
 * the mat is not an error, it is just not a game.
 *
 *   node scripts/agency.mjs
 *
 * Requires a server at GAME_URL.
 *
 * What good looks like:
 *   theirControl        <= 35%    of live match time spent in a state the
 *                                 OPPONENT put you in (stun, down, getup,
 *                                 thrown, grappled, whipped, cornered, pinned)
 *   worstTheirLockMs    <= 3600ms in one unbroken stretch of the above, which
 *                                 is about what a grapple-throw-landing costs
 *   medianWindowMs      >= 900ms  of freedom between those stretches
 *   knockdowns taken    within about 2x of knockdowns dealt
 *
 * `actionable` is reported but NOT judged: time spent in your own attack
 * animation is time you chose to spend, and a bot that mashes will drive that
 * number to the floor in a game that is perfectly playable.
 */
import { chromium } from 'playwright';

const URL = process.env.GAME_URL || 'http://localhost:4173/';
const SECONDS = Number(process.env.AGENCY_SECONDS || 60);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader',
         '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({
  viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

await page.addInitScript(() => localStorage.setItem('chokehole.save.v2', JSON.stringify({
  version: 2,
  settings: { music: 0, sfx: 0, announcer: 0, muted: true, reduceShake: false,
              reduceFlash: false, difficulty: 'NORMAL', quality: null },
  records: {}, totalWins: 0, totalMatches: 0, seenHowTo: true,
})));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__CHOKEHOLE__, null, { timeout: 30000 });
await page.evaluate(() => window.__CHOKEHOLE__.debug().startMatch());
await page.waitForFunction(() => window.__CHOKEHOLE__.debug().sim?.phase === 'LIVE',
  null, { timeout: 25000 });

const out = await page.evaluate(async (seconds) => {
  const app = window.__CHOKEHOLE__;
  const d = app.debug();
  const sim = d.sim;
  const p = sim.p1;

  const zone = document.querySelector('.stick-zone');
  const btn = (c) => document.querySelector(`.${c}`);
  // Synthesized pointers are not real pointers, so capture would throw.
  zone.setPointerCapture = () => {};
  zone.releasePointerCapture = () => {};

  const ev = (el, type, x, y) => el.dispatchEvent(new PointerEvent(type, {
    pointerId: 1, clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: true,
  }));

  const ACTIONABLE = new Set(['IDLE', 'WALK', 'RUN', 'ROPE_RUN', 'PERCH', 'APRON']);
  /*
   * The distinction that matters. Being locked in an animation you CHOSE is a
   * game; being locked in one the opponent chose for you is not. Counting them
   * together is how a mashing bot makes a healthy game look broken -- the same
   * mistake the framing check made by measuring standing bodies in a pin.
   */
  const THEIRS = new Set(['STUN', 'DOWN', 'GETUP', 'THROWN', 'GRAPPLED', 'DRAGGED',
                          'WHIPPED', 'CORNERED', 'PINNED']);

  // Count what the match does to the player and what the player does back.
  const drain = sim.drainEvents.bind(sim);
  let hitsDealt = 0, hitsTaken = 0, downsTaken = 0, downsDealt = 0, reversalsWon = 0;
  sim.drainEvents = () => {
    const list = drain();
    for (const e of list) {
      if (e.type === 'hit') {
        if (e.report.attacker === p) { hitsDealt++; if (e.report.move.knockdown) downsDealt++; }
        else { hitsTaken++; if (e.report.move.knockdown) downsTaken++; }
      }
      if (e.type === 'reversal' && e.by === p) reversalsWon++;
    }
    return list;
  };

  let stickDown = false;
  const ox = 120, oy = 300;
  const press = (dirX) => {
    if (!stickDown) { ev(zone, 'pointerdown', ox, oy); stickDown = true; }
    ev(zone, 'pointermove', ox + dirX * 60, oy);
  };
  const release = () => { if (stickDown) { ev(zone, 'pointerup', ox, oy); stickDown = false; } };
  const tap = (cls) => {
    const b = btn(cls); const r = b.getBoundingClientRect();
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    ev(b, 'pointerdown', x, y); ev(b, 'pointerup', x, y);
  };

  const hist = {};
  let frames = 0, actionableFrames = 0;
  let lockMs = 0, worstLock = 0, lastT = performance.now();
  let cad = 0, grabCad = 0;
  let discarded = 0;   // ATTACK taps made while the player could not act
  let theirsFrames = 0;
  let theirLockMs = 0, worstTheirLock = 0;
  // How long a free window lasts before the opponent takes control back.
  let freeMs = 0;
  const windows = [];

  const end = performance.now() + seconds * 1000;
  while (performance.now() < end && sim.phase === 'LIVE') {
    await new Promise((r) => requestAnimationFrame(r));
    const now = performance.now();
    const dt = now - lastT; lastT = now;
    frames++;
    const st = String(p.state);
    hist[st] = (hist[st] || 0) + 1;
    const can = ACTIONABLE.has(st);
    if (can) { actionableFrames++; if (lockMs > worstLock) worstLock = lockMs; lockMs = 0; }
    else lockMs += dt;

    const theirs = THEIRS.has(st);
    if (theirs) {
      theirsFrames++;
      theirLockMs += dt;
      if (freeMs > 0) { windows.push(Math.round(freeMs)); freeMs = 0; }
    } else {
      if (theirLockMs > worstTheirLock) worstTheirLock = theirLockMs;
      theirLockMs = 0;
      freeMs += dt;
    }

    cad -= dt; grabCad -= dt;
    const gap = sim.p2.x - p.x;
    const dist = Math.abs(gap);
    if (!can) {
      // What a player does: mash. It is also the reversal cue.
      if (cad <= 0) { tap('btn-attack'); discarded++; cad = 130; }
      continue;
    }
    if (dist > 1.25) press(Math.sign(gap));
    else {
      release();
      // Human pacing: throw one strike, watch what happens, throw another.
      // A bot that mashes every frame is in its OWN attack animation all match
      // and makes the game look like it never gives the player a turn.
      if (grabCad <= 0 && Math.random() < 0.22) { tap('btn-grab'); grabCad = 1400; cad = 620; }
      else if (cad <= 0) { tap('btn-attack'); cad = 520; }
    }
  }
  release();
  if (lockMs > worstLock) worstLock = lockMs;
  if (theirLockMs > worstTheirLock) worstTheirLock = theirLockMs;
  if (freeMs > 0) windows.push(Math.round(freeMs));

  const pct = (n) => Math.round((n / Math.max(1, frames)) * 100);
  const top = Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([k, n]) => `${k} ${pct(n)}%`);
  windows.sort((a, b) => a - b);
  return {
    seconds, frames, fps: Math.round(frames / seconds),
    actionable: pct(actionableFrames),
    theirControl: pct(theirsFrames),
    worstTheirLockMs: Math.round(worstTheirLock),
    freeWindows: windows.length,
    medianWindowMs: windows.length ? windows[windows.length >> 1] : null,
    shortestWindowMs: windows[0] ?? null,
    worstLockMs: Math.round(worstLock),
    hitsDealt, hitsTaken, downsDealt, downsTaken, reversalsWon,
    wastedTaps: discarded,
    states: top,
    phase: sim.phase,
  };
}, SECONDS);

const bad = [];
if (out.theirControl > 35) {
  bad.push(`opponent holds the player ${out.theirControl}% of the match (want <= 35%)`);
}
/*
 * 3600, not 3000. A grapple into a throw into a landing is one legitimate
 * wrestling sequence and it genuinely runs about three and a half seconds --
 * and it is escapable, because five taps break the hold. The median window is
 * the real gate here; this one only catches a stretch no single sequence
 * explains.
 */
if (out.worstTheirLockMs > 3600) {
  bad.push(`longest unbroken stretch under the opponent's control ${out.worstTheirLockMs}ms (want <= 3600ms)`);
}
if (out.medianWindowMs !== null && out.medianWindowMs < 900) {
  bad.push(`median free window ${out.medianWindowMs}ms (want >= 900ms)`);
}
if (out.downsTaken > out.downsDealt * 2 + 2) {
  bad.push(`knocked down ${out.downsTaken}x against ${out.downsDealt}x dealt`);
}
console.log(JSON.stringify(out, null, 1));
console.log(`errors: ${errs.length ? errs.slice(0, 3).join(' | ') : 'none'}`);
console.log(bad.length ? `AGENCY PROBLEMS:\n  - ${bad.join('\n  - ')}` : 'AGENCY OK');
await browser.close();
process.exit(bad.length || errs.length ? 1 : 0);
