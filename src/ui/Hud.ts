import type { Fighter } from '@/game/combat/Fighter';
import type { MatchSim } from '@/game/combat/MatchSim';
import { CANON, C } from '@/game/config/canon';
import { formatClock } from '@/game/util/math';
import { h, setText, toggle } from './dom';

interface FighterBlock {
  root: HTMLElement;
  name: HTMLElement;
  tag: HTMLElement;
  bar: HTMLElement;
  barFill: HTMLElement;
  barValue: HTMLElement;
  itBar: HTMLElement;
  itFill: HTMLElement;
  itLabel: HTMLElement;
  chip: HTMLElement;
}

/**
 * The match HUD. During live combat it shows only what matters (Bible s22):
 * two names, two health bars, two IT Factor meters, an active Squelsh chip, the
 * clock, a one-word crowd-heat state, and the big situational prompts. No viewer
 * counter, no ticker, no sponsor paragraphs — those belong in the transitions.
 */
export class Hud {
  readonly root: HTMLElement;
  private left: FighterBlock;
  private right: FighterBlock;
  private clock: HTMLElement;
  private heat: HTMLElement;
  private cue: HTMLElement;
  private callout: HTMLElement;
  private calloutTitle: HTMLElement;
  private calloutSub: HTMLElement;
  private calloutTimer = 0;

  private pinPanel: HTMLElement;
  private pinCount: HTMLElement;
  private pinTitle: HTMLElement;
  private pinTrack: HTMLElement;
  private pinZone: HTMLElement;
  private pinMarker: HTMLElement;
  private pinHelp: HTMLElement;

  constructor(p1: Fighter, p2: Fighter) {
    this.root = h('div');

    const top = h('div', 'hud-top');
    this.left = this.makeBlock(p1, false);
    this.right = this.makeBlock(p2, true);

    const centre = h('div', 'hud-centre');
    const bug = h('div', 'bug');
    bug.innerHTML = `<span class="dot">●</span> ${CANON.network} ${CANON.liveBug}`;
    this.clock = h('div', 'clock', '2:00');
    this.heat = h('div', 'heat-pip');
    this.heat.innerHTML = 'CROWD <b>COLD</b>';
    centre.append(bug, this.clock, this.heat);

    top.append(this.left.root, centre, this.right.root);
    this.root.appendChild(top);

    this.cue = h('div', 'cue');
    this.root.appendChild(this.cue);

    this.callout = h('div', 'callout');
    this.calloutTitle = h('span', 'title');
    this.calloutSub = h('span', 'sub');
    this.callout.append(this.calloutTitle, this.calloutSub);
    this.root.appendChild(this.callout);

    this.pinPanel = h('div', 'pin-panel');
    this.pinCount = h('div', 'pin-count', '');
    this.pinTitle = h('div', 'pin-title', 'TAP ATTACK IN THE GREEN');
    const track = h('div', 'pin-track');
    this.pinTrack = track;
    this.pinZone = h('div', 'pin-zone');
    this.pinMarker = h('div', 'pin-marker');
    track.append(this.pinZone, this.pinMarker);
    this.pinHelp = h('div', 'pin-help', 'ONE ATTEMPT PER COUNT');
    this.pinPanel.append(this.pinCount, this.pinTitle, track, this.pinHelp);
    this.root.appendChild(this.pinPanel);
  }

  private makeBlock(f: Fighter, right: boolean): FighterBlock {
    const root = h('div', `fighter-block${right ? ' right' : ''}`);
    const name = h('div', 'fighter-name slam stroke', f.cfg.displayName);
    const tag = h('div', 'fighter-tag', f.cfg.tagline);

    const bar = h('div', 'bar');
    const barFill = h('div', 'bar-fill');
    const barValue = h('div', 'bar-value', '100');
    bar.append(barFill, barValue);

    const itRow = h('div', 'it-row');
    const itLabel = h('div', 'it-label', 'IT');
    const itBar = h('div', 'it-bar');
    const itFill = h('div', 'it-fill');
    itBar.appendChild(itFill);
    itRow.append(itLabel, itBar);

    const chip = h('div', 'squelsh-chip hidden', 'SQUELSH');

    root.append(name, tag, bar, itRow, chip);
    return { root, name, tag, bar, barFill, barValue, itBar, itFill, itLabel, chip };
  }

  /* ------------------------------------------------------------------ */

  update(dt: number, sim: MatchSim): void {
    this.updateBlock(this.left, sim.p1);
    this.updateBlock(this.right, sim.p2);

    setText(this.clock, formatClock(sim.timeLeft));

    const label = sim.heat.label;
    const b = this.heat.querySelector('b');
    if (b && b.textContent !== label) b.textContent = label;
    toggle(this.heat, 'hot', label === 'ROWDY');
    toggle(this.heat, 'unhinged', label === 'UNHINGED');

    // The reversal cue: one large prompt, the whole defensive vocabulary.
    const armed = sim.p1.reversalArmed && sim.phase === 'LIVE';
    if (armed) {
      setText(this.cue, 'TAP ATTACK — REVERSE!');
      this.cue.classList.add('reversal');
    }
    toggle(this.cue, 'show', armed);

    if (this.calloutTimer > 0) {
      this.calloutTimer -= dt;
      if (this.calloutTimer <= 0) toggle(this.callout, 'show', false);
    }

    this.updatePin(sim);
  }

  private updateBlock(b: FighterBlock, f: Fighter): void {
    const frac = Math.max(0, f.healthFrac);
    b.barFill.style.transform = `scaleX(${frac})`;
    b.barFill.style.backgroundColor = frac > 0.55 ? C.squelsh : frac > 0.28 ? C.acid : C.blood;
    setText(b.barValue, String(Math.ceil(f.health)));

    const itFrac = f.itFrac;
    b.itFill.style.transform = `scaleX(${itFrac})`;
    toggle(b.itBar, 'ready', f.canSignature && !f.canFinish);
    toggle(b.itBar, 'full', f.canFinish);
    setText(b.itLabel, f.canFinish ? 'FINISHER' : f.canSignature ? 'IT READY' : 'IT');

    const sq = f.squelsh;
    toggle(b.chip, 'hidden', !sq);
    if (sq) {
      const secs = Math.ceil(sq.remaining / 1000);
      setText(b.chip, `${sq.label} ${secs}s`);
    }
  }

  private updatePin(sim: MatchSim): void {
    const p = sim.pin;
    toggle(this.pinPanel, 'show', !!p);
    if (!p) return;
    setText(this.pinCount, p.count > 0 ? String(p.count) : '');
    // The escape bar only exists once an escape is actually possible.
    const open = p.liveHalf > 0;
    toggle(this.pinTrack, 'hidden', !open);
    toggle(this.pinTitle, 'hidden', !open);
    if (open) {
      const left = Math.max(0, (p.zoneCenter - p.liveHalf) * 100);
      const width = Math.min(100 - left, p.liveHalf * 200);
      this.pinZone.style.left = `${left}%`;
      this.pinZone.style.width = `${width}%`;
      this.pinMarker.style.left = `${p.marker * 100}%`;
    }

    const defenderIsPlayer = sim.pinned === sim.p1;
    if (defenderIsPlayer && !open) {
      setText(this.pinHelp, 'HANG ON…');
      this.pinHelp.className = 'pin-help';
    } else if (!defenderIsPlayer) {
      setText(this.pinHelp, 'COVER THEM — HOLD IT');
      this.pinHelp.className = 'pin-help';
    } else if (p.lastAttemptHit === true) {
      setText(this.pinHelp, 'KICKOUT!');
      this.pinHelp.className = 'pin-help good';
    } else if (p.lastAttemptHit === false) {
      setText(this.pinHelp, 'MISSED — NEXT COUNT');
      this.pinHelp.className = 'pin-help bad';
    } else {
      setText(this.pinHelp, p.attemptUsed ? 'WAIT FOR THE NEXT COUNT' : 'ONE ATTEMPT PER COUNT');
      this.pinHelp.className = 'pin-help';
    }
  }

  /** A broadcast lower third: move names, Squelsh drops, kickouts. */
  showCallout(text: string, sub?: string, accent?: string): void {
    setText(this.calloutTitle, text);
    setText(this.calloutSub, sub ?? '');
    this.calloutSub.style.display = sub ? '' : 'none';
    const col = accent ?? C.pink;
    this.calloutTitle.style.borderTopColor = col;
    this.calloutTitle.style.borderBottomColor = col;
    toggle(this.callout, 'show', true);
    this.calloutTimer = 1700;
  }

  /** A big centred prompt that is not the reversal cue (FIGHT, TIME). */
  flashCue(text: string, ms = 1100): void {
    setText(this.cue, text);
    this.cue.classList.remove('reversal');
    toggle(this.cue, 'show', true);
    window.setTimeout(() => toggle(this.cue, 'show', false), ms);
  }

  setVisible(v: boolean): void { this.root.style.display = v ? '' : 'none'; }
}

