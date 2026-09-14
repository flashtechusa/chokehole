/**
 * Headless pacing harness.
 *
 * Stops the render loop and steps MatchSim at a fixed 16.67 ms with a scripted
 * player, so match pacing can be measured without depending on frame rate. The
 * first prototype was tuned against a rig running at 4.7 fps and the numbers
 * were meaningless; this exists so that cannot happen again.
 *
 *   node scripts/pace.mjs [EASY|NORMAL|BRUTAL] [showman|basic|passive] [maxSteps]
 *
 * `showman` uses the ring — ropes, turnbuckle, props, taunts. `basic` only
 * punches and grapples; it should LOSE, because the most entertaining way to
 * play is meant to be the strongest.
 *
 * Requires a server (npm run preview) at GAME_URL.
 */
import { chromium } from 'playwright';

const URL = process.env.GAME_URL || 'http://localhost:4173/';
const DIFF = process.argv[2] ?? 'NORMAL';
const MODE = process.argv[3] ?? 'showman';
const STEPS = Number(process.argv[4] ?? 30000);

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'],
});
const ctx = await b.newContext({ viewport:{width:844,height:390}, deviceScaleFactor:1 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__CHOKEHOLE__, null, { timeout: 30000 });

const out = await page.evaluate(async (opts) => {
  const app = window.__CHOKEHOLE__;
  const d0 = app.debug();
  d0.startMatch();
  await new Promise(r => setTimeout(r, 400));
  const d = app.debug();
  const sim = d.sim;
  const T = d.tuning;

  // Deterministic: stop rendering, drive the sim ourselves at a fixed dt.
  sim.startNow();
  sim.phase = 'LIVE';
  sim.p1.setState('IDLE'); sim.p2.setState('IDLE');

  const DT = 16.667;
  const neutral = () => ({ moveX:0, moveY:0, attack:false, grab:false, special:false, anyPress:false });

  const log = {
    steps:0, attacks:0, ropeRuns:0, rebounds:0, perches:0, divesThrown:0, divesLanded:0,
    taunts:{}, props:0, nearFalls:0, reversals:0, kickouts:0, pinsStarted:0,
    outcomes:{clean:0, whiff:0}, byKind:{}, hp:[], it:[], heat:[], phaseSeen:{},
  };

  let cad = 0, mash = 0, plan = 'fight', planT = 0;
  const rnd = () => Math.random();

  const step = () => {
    const p = sim.p1, a = sim.p2;
    const i = neutral();
    const dx = a.x - p.x, dz = a.z - p.z;
    const dist = Math.hypot(dx, dz);
    const nx = dist > 0.01 ? dx/dist : 1, nz = dist > 0.01 ? dz/dist : 0;
    cad -= DT; mash -= DT; planT -= DT;

    // Reversal cue: always take it.
    if (p.reversalArmed && cad <= 0) { i.attack = true; i.anyPress = true; cad = 200; }

    // Pins are a timing minigame: aim for the zone like a player watching the bar.
    if (sim.phase === 'PIN' && sim.pin && sim.pinned === p) {
      const pin = sim.pin;
      const near = Math.abs(pin.marker - pin.zoneCenter) <= pin.liveHalf * 1.25 + 0.04;
      if (pin.liveHalf > 0 && near && !pin.attemptUsed && Math.random() < 0.5) {
        i.attack = true; i.anyPress = true;
      }
      return runOne(i);
    }
    // Mash out of holds and knockdowns at a human ~7 taps/sec.
    const held = p.state === 'GRAPPLED' || p.state === 'DOWN';
    if (held && mash <= 0) { mash = 140; i.attack = true; i.anyPress = true; }

    if (opts.mode === 'passive') { window.__I = i; return runOne(i); }

    if (!held) {
      // Climb plans persist: walking to a corner takes longer than one tick.
      const climbing = plan === 'climb' && (p.state === 'CLIMB' || p.state === 'PERCH');
      if (planT <= 0 && !climbing) {
        planT = 1400 + rnd()*1600;
        const r = rnd();
        // A "showman" player uses the ring; a "basic" one only punches.
        if (opts.mode === 'basic') plan = 'fight';
        else if (a.isDown && (a.healthFrac <= 0.55 || a.exhausted)) { plan = 'fight'; planT = 900; }
        else if (sim.prop && !p.carrying && r < 0.20) { plan = 'prop'; planT = 3200; }
        else if (r < 0.38) { plan = 'climb'; planT = 3400; }
        else if (r < 0.58) plan = 'ropes';
        else if (r < 0.68) plan = 'taunt';
        else plan = 'fight';
      }

      if (p.state === 'PERCH') {
        if (cad <= 0) { cad = 260; i.attack = true; i.anyPress = true; }
      } else if (p.state === 'ROPE_RUN') {
        if (dist < 2.6 && cad <= 0) { cad = 260; i.attack = true; i.anyPress = true; }
      } else if (p.state === 'APRON') {
        if (cad <= 0) { cad = 300; i.grab = true; i.anyPress = true; }
      } else if (plan === 'climb') {
        const c = nearestCornerTo(p.x, p.z, T);
        const cd = Math.hypot(c.x - p.x, c.z - p.z);
        if (cd > 0.7) { const m = cd||1; i.moveX = (c.x-p.x)/m; i.moveY = (c.z-p.z)/m; }
        else if (cad <= 0) { cad = 400; i.grab = true; i.anyPress = true; }
      } else if (plan === 'prop' && sim.prop && !p.carrying) {
        const t = sim.prop;
        const m = Math.hypot(t.x - p.x, t.z - p.z) || 1;
        i.moveX = (t.x - p.x)/m; i.moveY = (t.z - p.z)/m;
      } else if (plan === 'ropes') {
        // sprint at the nearest rope away from the opponent
        const ax = Math.abs(p.x) >= Math.abs(p.z);
        const dirx = ax ? -Math.sign(nx || 1) : 0;
        const dirz = ax ? 0 : -Math.sign(nz || 1);
        i.moveX = dirx; i.moveY = dirz;
      } else if (plan === 'taunt') {
        if (cad <= 0) { cad = 1200; i.special = true; i.anyPress = true; }
      } else {
        if (p.canFinish || (p.canSignature && rnd() < 0.03)) {
          if (dist <= 2.0 && cad <= 0) { cad = 400; i.special = true; i.anyPress = true; }
          else { i.moveX = nx; i.moveY = nz; }
        } else if (dist > 1.25) { i.moveX = nx*0.7; i.moveY = nz*0.7; }
        else if (cad <= 0) {
          cad = opts.mode === 'basic' ? 340 : 480;
          if (a.isDown && dist < 1.6) { i.grab = true; }
          else if (rnd() < 0.26) { i.grab = true; }
          else { i.attack = true; }
          i.anyPress = true;
          log.attacks++;
        }
      }
    }
    return runOne(i);
  };

  function nearestCornerTo(x, z, T) {
    const h = T.ring.half;
    const cs = [[h,h],[h,-h],[-h,h],[-h,-h]];
    let best = cs[0], bd = Infinity;
    for (const c of cs) { const d = (c[0]-x)**2 + (c[1]-z)**2; if (d < bd) { bd = d; best = c; } }
    return { x: best[0], z: best[1] };
  }

  let lastP1 = sim.p1.health, lastP2 = sim.p2.health;
  function runOne(i) {
    sim.update(DT, i);
    log.steps++;
    log.phaseSeen[sim.phase] = (log.phaseSeen[sim.phase]||0)+1;
    for (const e of sim.drainEvents()) {
      if (e.type === 'hit') {
        const k = e.report.move.kind;
        log.byKind[k] = (log.byKind[k]||0)+1;
        if (e.report.attacker === sim.p1) {
          log.outcomes.clean++;
          if (k === 'aerial' || k === 'dive') log.divesLanded++;
        }
      }
      if (e.type === 'reversal' && e.by === sim.p1) log.reversals++;
      if (e.type === 'pinStart') log.pinsStarted++;
      if (e.type === 'pinEscape' && e.nearFall) log.nearFalls++;
      if (e.type === 'pinEscape') { log.escAt = log.escAt || {}; const c = window.__lastPinCount ?? -1; log.escAt[c] = (log.escAt[c]||0)+1; }
      if (e.type === 'pinCount') window.__lastPinCount = e.count;
      if (e.type === 'pinStart') { window.__lastPinCount = 0; log.pinHealth = log.pinHealth || []; log.pinHealth.push(+(e.defender.healthFrac).toFixed(2)); }
      if (e.type === 'pinEscape') log.kickouts++;
      if (e.type === 'propTaken' && e.who === sim.p1) log.props++;
      if (e.type === 'fighter' && e.who === sim.p1) {
        const ev = e.event;
        if (ev.type === 'ropeRun') log.ropeRuns++;
        if (ev.type === 'rebound') log.rebounds++;
        if (ev.type === 'perch') log.perches++;
        if (ev.type === 'taunt') log.taunts[ev.taunt.kind] = (log.taunts[ev.taunt.kind]||0)+1;
        if (ev.type === 'move' && (ev.move.kind === 'aerial' || ev.move.kind === 'dive')) log.divesThrown++;
        if (ev.type === 'whiff') log.outcomes.whiff++;
      }
    }
    // Track how each perch ends, so "dives never happen" has a cause.
    const st = sim.p1.state;
    if (st === 'PERCH') { window.__wasPerch = true; }
    else if (window.__wasPerch) {
      window.__wasPerch = false;
      log.perchEnd = log.perchEnd || {};
      log.perchEnd[st] = (log.perchEnd[st]||0)+1;
    }
    if (log.steps % 60 === 0) {
      log.hp.push([Math.round(sim.p1.health), Math.round(sim.p2.health)]);
      log.it.push(Math.round(sim.p1.it));
      log.heat.push(Math.round(sim.heat.value));
    }
    lastP1 = sim.p1.health; lastP2 = sim.p2.health;
    return sim.result !== null;
  }

  for (let k = 0; k < opts.steps; k++) { if (step()) break; }

  return {
    ...log,
    seconds: (log.steps * DT) / 1000,
    result: sim.result,
    p1: Math.round(sim.p1.health), p2: Math.round(sim.p2.health),
    max1: sim.p1.maxHealth, max2: sim.p2.maxHealth,
    heatPeak: Math.round(sim.heat.peak),
  };
}, { mode: MODE, steps: STEPS });

console.log(JSON.stringify(out));
console.log('ERRORS:' + (errs.length ? '\n  ' + errs.slice(0,5).join('\n  ') : ' none'));
await b.close();
