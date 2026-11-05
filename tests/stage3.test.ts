import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { heroesFrom } from '../src/data.ts';
import { heroProfile } from '../src/hero.ts';
import { assignPositions, laneFor, laneHints, LANE_VS } from '../src/lane.ts';
import { counter } from '../src/scoring.ts';
import type { Positions, Stats } from '../src/types.ts';

const stats: Stats = JSON.parse(readFileSync('tests/fixtures/stats-2026-11-02.json', 'utf8'));
const positions: Positions = JSON.parse(readFileSync('tests/fixtures/positions-2026-11-02.json', 'utf8'));
const heroes = heroesFrom(stats);
const H = (n: string) => heroes.find(h => h.name === n)!;
const sample = ['Phantom Assassin', 'Pudge', 'Invoker', 'Axe', 'Crystal Maiden'].map(H);

describe('страница героя', () => {
  const p = heroProfile(stats, heroes, positions, H('Pudge'), 'all');
  it('топ-8 контрит, топ-8 контрят его, топ-5 с кем лучше', () => {
    expect(p.beats).toHaveLength(8); expect(p.losesTo).toHaveLength(8); expect(p.bestWith).toHaveLength(5);
    expect(p.beats[0].adv).toBeGreaterThanOrEqual(p.beats[7].adv);
    // согласовано с алгоритмом раздела 4
    const T = stats.pub.all;
    expect(p.losesTo[0].adv).toBeCloseTo(counter(T, stats.n, p.losesTo[0].h.i, H('Pudge').i).adv);
    expect([...p.beats, ...p.losesTo, ...p.bestWith].some(m => m.h.name === 'Pudge')).toBe(false);
  });
  it('позиции и винрейты по группам', () => {
    expect(p.pos.map(x => x.p)).toEqual([1, 2, 3, 4, 5]);
    expect(p.pos.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1);
    expect(p.wr.map(x => x.src)).toEqual(['all', 'low', 'mid', 'high', 'pro']);
    expect(p.wr[0].g).toBe(stats.pub.all.solo[2 * H('Pudge').i]);
  });
  it('про-сцена без синергии', () => {
    expect(heroProfile(stats, heroes, positions, H('Pudge'), 'pro').bestWith).toEqual([]);
  });
});

describe('моя линия', () => {
  it('пример пика: PA — 1, Invoker — 2, Axe — 3, Pudge — 4, CM — 5', () => {
    const a = assignPositions(sample, positions);
    expect(sample.map(h => a.get(h.i))).toEqual([1, 4, 2, 3, 5]);
  });
  it('пары линий', () => {
    expect(LANE_VS[1]).toEqual([3, 4]); expect(LANE_VS[2]).toEqual([2]); expect(LANE_VS[4]).toEqual([1, 5]);
  });
  it('керри стоит против Axe и Pudge, миду достаётся Invoker', () => {
    const T = stats.pub.all;
    const l1 = laneFor(T, stats.n, H('Lifestealer'), 1, sample, positions)!;
    expect(l1.opponents.map(o => o.h.name)).toEqual(['Axe', 'Pudge']);
    expect(['easy', 'mid', 'hard']).toContain(l1.level);
    const l2 = laneFor(T, stats.n, H('Puck'), 2, sample, positions)!;
    expect(l2.opponents.map(o => o.h.name)).toEqual(['Invoker']);
    expect(laneFor(T, stats.n, H('Puck'), 0, sample, positions)).toBeNull();
  });
  it('подсказки: 2–3, про Pudge — за крипами', () => {
    const l = laneFor(stats.pub.all, stats.n, H('Lifestealer'), 1, sample, positions)!;
    const h = laneHints(l, 1);
    expect(h.length).toBeGreaterThanOrEqual(2); expect(h.length).toBeLessThanOrEqual(3);
    expect(h.map(x => x.key)).toContain('pudge');
    expect(h[1].key).toBe('startCore');
  });
});
