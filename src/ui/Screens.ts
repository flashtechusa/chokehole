import type { ArenaConfig } from '@/game/arenas/types';
import type { WrestlerConfig } from '@/game/characters/types';
import type { MatchResult } from '@/game/combat/MatchSim';
import type { Difficulty } from '@/game/ai/profiles';
import { CANON } from '@/game/config/canon';
import { formatClock } from '@/game/util/math';
import { h, menuButton } from './dom';

/**
 * Full-screen HTML panels. Broadcast comedy belongs here, in the transitions,
 * rather than on top of the fight (Bible s22, s25).
 */

export function titleScreen(onFight: () => void, onHowTo: () => void, record: string): HTMLElement {
  const p = h('div', 'panel');
  const logo = h('div', 'logo');
  logo.innerHTML = `
    <span class="l1">${CANON.title1}</span>
    <span class="l2">${CANON.title2}</span>
    <span class="l3">${CANON.subtitle}</span>
    <span class="l4">${CANON.tagline}</span>`;
  p.appendChild(logo);

  const row = h('div', 'row');
  row.style.marginTop = '16px';
  row.appendChild(menuButton('FIGHT', 'JASSY vs RAID — THE ORIGINAL WAREHOUSE', '', onFight));
  row.appendChild(menuButton('HOW TO PLAY', record, 'alt small', onHowTo));
  p.appendChild(row);

  p.appendChild(h('div', 'note', `${CANON.network} · ${CANON.buildLabel}`));
  return p;
}

export function howToScreen(onBack: () => void): HTMLElement {
  const p = h('div', 'panel');
  p.appendChild(h('div', 'result-title win', 'HOW TO PLAY'));

  const grid = h('div', 'howto');
  const card = (title: string, body: string): HTMLElement => {
    const c = h('div', 'card');
    c.appendChild(h('h3', '', title));
    c.appendChild(h('p', '', body));
    return c;
  };
  grid.append(
    card('LEFT THUMB', 'Touch anywhere on the left to move. Push further to run. You always face your opponent.'),
    card('ATTACK', 'Tap it. Keep tapping for a combo — the third hit is heavy automatically. No holds, no timings.'),
    card('GRAB', 'Close in and grab. Then push the stick to pick a throw, or tap ATTACK to slam. Near a downed, hurt opponent it covers for the pin.'),
    card('RUN THE ROPES', 'Sprint into the ropes and you rebound off them, faster every lap. ATTACK on the way back is a running move. It hurts.'),
    card('GO UP TOP', 'Stand in a corner away from your opponent and press GRAB to climb. Then ATTACK to dive. Miss and you land on your face.'),
    card('IT FACTOR', 'Fills when you ENTERTAIN, not when you grind. Dives, reversals, taunts and kickouts pay. Jabs barely do. Half = SIGNATURE, full = FINISHER.'),
    card('REVERSAL', 'When the big yellow cue appears, tap ATTACK. One button, timed — that is the whole defence.'),
    card('SQUELSH & PROPS', 'A can drops in the ring, and something far too large turns up at ringside. Walk over either one.'),
  );
  p.appendChild(grid);

  p.appendChild(menuButton('BACK', null, 'ghost small', onBack));
  return p;
}

/**
 * The pre-match archive card: the REAL layer, printed verbatim with its source
 * tier, immediately before the I.B.S. dramatisation (Bible s5).
 */
export function archiveCard(arena: ArenaConfig, onContinue: () => void): HTMLElement {
  const p = h('div', 'panel');
  const card = h('div', 'archive');

  card.appendChild(h('div', 'tier', `REAL HISTORY · ${arena.sourceTier.replace(/_/g, ' ')}`));
  card.appendChild(h('h2', '', arena.displayName));
  card.appendChild(h('div', 'where',
    `${arena.eventName ?? ''} · ${arena.city} · ${arena.year ?? ''}`));
  card.appendChild(h('p', '', arena.historyCard));

  const fiction = h('div', 'fiction');
  fiction.textContent = `${arena.fictionDisclaimer} — ${arena.spectacle.label}: ${arena.spectacle.description}`;
  card.appendChild(fiction);

  p.appendChild(card);
  p.appendChild(menuButton('RING THE BELL', null, '', onContinue));
  return p;
}

export function resultScreen(
  result: MatchResult,
  player: WrestlerConfig,
  opponent: WrestlerConfig,
  onRematch: () => void,
  onHome: () => void,
): HTMLElement {
  const p = h('div', 'panel');
  p.appendChild(h('div', `result-title ${result.playerWon ? 'win' : 'lose'}`,
    result.playerWon ? 'WINNER' : 'DEFEAT'));
  p.appendChild(h('div', 'fighter-name slam center stroke',
    result.playerWon ? player.displayName : opponent.displayName));

  const quote = h('div', 'hint');
  quote.textContent = `“${result.playerWon ? player.quotes.win : opponent.quotes.win}”`;
  p.appendChild(quote);

  const stars = h('div', 'stars');
  stars.innerHTML = Array.from({ length: 5 }, (_, i) =>
    i < result.rating ? '<span>★</span>' : '<span class="off">★</span>').join('');
  p.appendChild(stars);

  const dl = h('dl', 'stat-grid');
  const add = (k: string, v: string): void => {
    dl.appendChild(h('dt', '', k));
    dl.appendChild(h('dd', '', v));
  };
  add('METHOD', { PIN: 'PINFALL', KO: 'KNOCKOUT', TIME: 'TIME LIMIT' }[result.method]);
  add('MATCH TIME', formatClock(result.durationMs));
  add('CROWD PEAK', `${Math.round(result.heatPeak)}%`);
  add('BEST COMBO', `${result.bestCombo} HITS`);
  add('REVERSALS', String(result.reversals));
  add('DIVES LANDED', String(result.aerials));
  add('NEAR FALLS', String(result.nearFalls));
  add('FINISHER', result.finisherLanded ? 'LANDED' : 'NO');
  p.appendChild(dl);

  const row = h('div', 'row');
  row.appendChild(menuButton('REMATCH', 'RUN IT BACK', '', onRematch));
  row.appendChild(menuButton('HOME', null, 'ghost small', onHome));
  p.appendChild(row);
  return p;
}

export function pauseScreen(
  difficulty: Difficulty,
  onResume: () => void,
  onDifficulty: (d: Difficulty) => void,
  onQuit: () => void,
): HTMLElement {
  const p = h('div', 'panel clear');
  p.appendChild(h('div', 'result-title win', 'PAUSED'));

  const row = h('div', 'row');
  const diffs: Difficulty[] = ['EASY', 'NORMAL', 'BRUTAL'];
  const labels: Record<Difficulty, string> = {
    EASY: 'ROOKIE', NORMAL: 'CARD MATCH', BRUTAL: 'MAIN EVENT',
  };
  for (const d of diffs) {
    row.appendChild(menuButton(
      labels[d], d === difficulty ? 'CURRENT' : null,
      d === difficulty ? 'small' : 'ghost small',
      () => onDifficulty(d),
    ));
  }
  p.appendChild(row);

  const row2 = h('div', 'row');
  row2.style.marginTop = '10px';
  row2.appendChild(menuButton('RESUME', null, '', onResume));
  row2.appendChild(menuButton('QUIT', null, 'ghost small', onQuit));
  p.appendChild(row2);
  return p;
}

export function loadingScreen(): HTMLElement {
  const p = h('div', 'panel');
  const logo = h('div', 'logo');
  logo.innerHTML = `<span class="l1">${CANON.title1}</span><span class="l2">${CANON.title2}</span>`;
  p.appendChild(logo);
  p.appendChild(h('div', 'hint', 'TUNING THE BROADCAST…'));
  return p;
}
