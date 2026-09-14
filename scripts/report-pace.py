"""Formats scripts/pace.mjs output. Pipe pace.mjs stdout into it."""
import sys, json
j = json.loads(sys.stdin.read().split('\n')[0])
r = j.get('result') or {}
print('  length      : %5.0fs   %s by %s' % (
    j['seconds'],
    'PLAYER WINS' if r.get('playerWon') else 'PLAYER LOSES' if r else 'NO RESULT',
    r.get('method', '-')))
print('  health      : p1=%d/%d  p2=%d/%d   heatPeak=%d  rating=%s' % (
    j['p1'], j['max1'], j['p2'], j['max2'], j['heatPeak'], r.get('rating', '-')))
print('  spectacle   : ropeRuns=%d rebounds=%d perches=%d dives=%d/%d props=%d counters=%d' % (
    j['ropeRuns'], j['rebounds'], j['perches'], j['divesLanded'], j['divesThrown'], j['props'],
    j.get('counters', 0)))
print('  drama       : reversals=%d pins=%d kickouts=%d nearFalls=%d taunts=%s' % (
    j['reversals'], j['pinsStarted'], j['kickouts'], j['nearFalls'], json.dumps(j['taunts'])))
print('  turning     : rearThrows=%d backAttacks=%d   spots=%s' % (
    j.get('rearThrows', 0), j.get('backAttacks', 0), json.dumps(j.get('spots', {}))))
print('  hits by kind: %s' % json.dumps(j['byKind']))
