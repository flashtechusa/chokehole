import type { MatchSim } from '@/game/combat/MatchSim';
import { FS } from '@/game/combat/states';
import type { FX2D } from '@/render2d/FX2D';

interface AppRuntime {
  sim: MatchSim | null;
  screen: string;
  view: { fx: FX2D } | null;
}

interface Challenge {
  id: string;
  label: string;
  sub: string;
  reward: number;
  heat: number;
  possible: (sim: MatchSim) => boolean;
  complete: (sim: MatchSim) => boolean;
}

/**
 * A tiny "book the match" layer inspired by the core idea of arcade wrestling:
 * the strongest play is the most entertaining play.
 *
 * This is deliberately presentation-side. The wrestling simulation remains
 * renderer-independent; the director watches public fighter state and rewards
 * the player when the room asks for a spot and they deliver it.
 *
 * It also adds verified performer prop LANGUAGE at signature time. The exact
 * choreography is a game adaptation; the source props/spots are documented in
 * MOVE_RESEARCH_JASSY.md and MOVE_RESEARCH_RAID.md.
 */
export function installShowDirector(app: unknown): void {
  const runtime = app as AppRuntime;

  const root = document.createElement('div');
  root.className = 'show-challenge';
  root.innerHTML = '<span class="show-kicker">CROWD WANTS</span><strong></strong><em></em>';
  document.getElementById('ui')?.appendChild(root);

  const stamp = document.createElement('div');
  stamp.className = 'live-build-stamp';
  stamp.textContent = 'ACTION-ARCADE LIVE • BUILD 0.4';
  document.getElementById('ui')?.appendChild(stamp);

  const title = root.querySelector('strong') as HTMLElement;
  const sub = root.querySelector('em') as HTMLElement;

  const challenges: Challenge[] = [
    {
      id: 'ropes',
      label: 'HIT THE ROPES',
      sub: 'RUN • REBOUND • COME BACK HOT',
      reward: 16,
      heat: 14,
      possible: (sim) => !sim.p1.outside && !sim.p1.isDown,
      complete: (sim) => sim.p1.state === FS.ROPE_RUN && sim.p1.ropeLaps > 0,
    },
    {
      id: 'taunt',
      label: 'WORK THE ROOM',
      sub: 'TAUNT THEM BEFORE THEY HIT YOU',
      reward: 14,
      heat: 18,
      possible: (sim) => !sim.p1.canSignature && !sim.p1.isDown && !sim.p1.isBusy,
      complete: (sim) => sim.p1.state === FS.TAUNT,
    },
    {
      id: 'up-top',
      label: 'GO UP TOP',
      sub: 'BUY THE OPENING • CLIMB • DIVE',
      reward: 24,
      heat: 24,
      possible: (sim) => !sim.p1.outside && !sim.p1.isDown,
      complete: (sim) => sim.p1.state === FS.AERIAL
        && (sim.p1.action?.move.kind === 'aerial' || sim.p1.action?.move.kind === 'dive'),
    },
    {
      id: 'rear',
      label: 'GET BEHIND THEM',
      sub: 'TURNING MATTERS • TAKE THE WAISTLOCK',
      reward: 18,
      heat: 16,
      possible: (sim) => !sim.p1.isDown && !sim.p2.isDown && !sim.p1.outside,
      complete: (sim) => sim.p1.rearHold
        && (sim.p1.state === FS.GRAPPLE_START || sim.p1.state === FS.GRAPPLING),
    },
    {
      id: 'prop',
      label: 'USE THE DAMN PROP',
      sub: 'THIS IS CHOKE HOLE, NOT THE OLYMPICS',
      reward: 22,
      heat: 25,
      possible: (sim) => !!sim.prop || !!sim.p1.carrying,
      complete: (sim) => sim.p1.action?.move.kind === 'prop',
    },
    {
      id: 'big-move',
      label: 'MAKE IT UGLY',
      sub: 'LAND A THROW, DIVE OR SIGNATURE',
      reward: 18,
      heat: 18,
      possible: (sim) => !sim.p1.isDown,
      complete: (sim) => {
        const kind = sim.p1.action?.move.kind;
        return kind === 'throw' || kind === 'aerial' || kind === 'dive'
          || kind === 'signature' || kind === 'finisher';
      },
    },
  ];

  let currentSim: MatchSim | null = null;
  let active: Challenge | null = null;
  let nextAt = 0;
  let expireAt = 0;
  let resultUntil = 0;
  let cursor = 0;
  let p1Action: object | null = null;
  let p2Action: object | null = null;

  const hide = (): void => {
    root.classList.remove('show', 'success', 'missed');
  };

  const pick = (sim: MatchSim): Challenge | null => {
    for (let n = 0; n < challenges.length; n += 1) {
      const c = challenges[(cursor + n) % challenges.length]!;
      if (c.possible(sim)) {
        cursor = (cursor + n + 1) % challenges.length;
        return c;
      }
    }
    return null;
  };

  const showChallenge = (c: Challenge, sim: MatchSim): void => {
    active = c;
    title.textContent = c.label;
    sub.textContent = c.sub;
    root.classList.remove('success', 'missed');
    root.classList.add('show');
    expireAt = sim.elapsed + 11000;
  };

  const complete = (c: Challenge, sim: MatchSim): void => {
    sim.p1.addIt(c.reward, sim.heat.frac);
    sim.heat.add(c.heat);
    title.textContent = 'THEY ATE THAT UP';
    sub.textContent = `+ IT FACTOR • ${c.label}`;
    root.classList.add('success', 'show');
    resultUntil = performance.now() + 1300;
    active = null;
    nextAt = sim.elapsed + 14500;
  };

  const miss = (sim: MatchSim): void => {
    title.textContent = 'TOO SLOW';
    sub.textContent = 'THE ROOM MOVED ON';
    root.classList.add('missed', 'show');
    resultUntil = performance.now() + 750;
    active = null;
    nextAt = sim.elapsed + 9000;
  };

  const performerSpotFx = (sim: MatchSim): void => {
    const fx = runtime.view?.fx;
    if (!fx) return;

    const a1 = sim.p1.action;
    if (a1 && a1 !== p1Action) {
      p1Action = a1;
      if (a1.move.kind === 'signature' && sim.p1.cfg.id === 'jassy') {
        fx.evictionNotice(sim.p2.x, sim.p2.groundY, sim.p1.dir);
      }
      if (a1.move.kind === 'signature' && sim.p1.cfg.id === 'raid') {
        fx.insecticideBottle(sim.p2.x, sim.p2.groundY, sim.p1.dir);
      }
    } else if (!a1) {
      p1Action = null;
    }

    const a2 = sim.p2.action;
    if (a2 && a2 !== p2Action) {
      p2Action = a2;
      if (a2.move.kind === 'signature' && sim.p2.cfg.id === 'jassy') {
        fx.evictionNotice(sim.p1.x, sim.p1.groundY, sim.p2.dir);
      }
      if (a2.move.kind === 'signature' && sim.p2.cfg.id === 'raid') {
        fx.insecticideBottle(sim.p1.x, sim.p1.groundY, sim.p2.dir);
      }
    } else if (!a2) {
      p2Action = null;
    }
  };

  const frame = (): void => {
    const sim = runtime.sim;

    if (sim !== currentSim) {
      currentSim = sim;
      active = null;
      nextAt = sim ? sim.elapsed + 12000 : 0;
      expireAt = 0;
      resultUntil = 0;
      p1Action = null;
      p2Action = null;
      hide();
    }

    if (!sim || runtime.screen !== 'MATCH' || sim.phase !== 'LIVE') {
      hide();
      requestAnimationFrame(frame);
      return;
    }

    performerSpotFx(sim);

    if (resultUntil > 0) {
      if (performance.now() >= resultUntil) {
        resultUntil = 0;
        hide();
      }
      requestAnimationFrame(frame);
      return;
    }

    if (active) {
      if (active.complete(sim)) complete(active, sim);
      else if (sim.elapsed >= expireAt) miss(sim);
    } else if (sim.elapsed >= nextAt) {
      const chosen = pick(sim);
      if (chosen) showChallenge(chosen, sim);
      else nextAt = sim.elapsed + 4000;
    }

    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}
