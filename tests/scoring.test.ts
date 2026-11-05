// Контрольный пример из раздела 4 ТЗ: данные 31.10–02.11.2026, все ранги, пик PA/Pudge/Invoker/Axe/CM.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { heroesFrom } from '../src/data.ts';
import { banSuggestions, counter, K, mainPos, rankPicks, synergy, verdictIndex } from '../src/scoring.ts';
import type { Positions, Stats } from '../src/types.ts';

const stats: Stats = JSON.parse(readFileSync('tests/fixtures/stats-2026-11-02.json', 'utf8'));
const positions: Positions = JSON.parse(readFileSync('tests/fixtures/positions-2026-11-02.json', 'utf8'));
const heroes = heroesFrom(stats);
const id = (name: string) => heroes.find(h => h.name === name)!.i;
const enemy = ['Phantom Assassin', 'Pudge', 'Invoker', 'Axe', 'Crystal Maiden'].map(id);
const T = stats.pub.all;
const top = (pos = 0, n = 3) =>
  rankPicks({ T, n: stats.n, heroes, positions, draft: { enemy, ally: [], ban: [] }, pos }).slice(0, n).map(r => r.h.name);

describe('алгоритм счёта (раздел 4)', () => {
  it('топ-3 против PA/Pudge/Invoker/Axe/CM', () => {
    expect(top()).toEqual(['Earth Spirit', 'Puck', 'Lifestealer']);
  });
  it('Pos 1: Lifestealer, Ursa, Tiny', () => {
    expect(top(1)).toEqual(['Lifestealer', 'Ursa', 'Tiny']);
  });
  it('Pos 5: Phoenix, Disruptor, Bane', () => {
    expect(top(5)).toEqual(['Phoenix', 'Disruptor', 'Bane']);
  });
  it('счёт Earth Spirit = +9.1, как в прототипе', () => {
    const r = rankPicks({ T, n: stats.n, heroes, positions, draft: { enemy, ally: [], ban: [] } })[0];
    expect(r.score).toBeCloseTo(9.13, 2);
  });

  it('формулы: сглаживание K=25 и ожидаемый винрейт', () => {
    expect(K).toBe(25);
    // пустая пара → преимущество 0
    const empty = { vs: [0, 0, 0, 0, 0, 0, 0, 0], with: [0, 0, 0, 0, 0, 0, 0, 0], solo: [100, 60, 100, 40] };
    expect(counter(empty, 2, 0, 1).adv).toBeCloseTo(0);
    // p(c)=.6, p(e)=.4 → E=.7; 10 игр, 10 побед → W=(10+17.5)/35
    const t = { vs: [0, 0, 10, 10, 0, 0, 0, 0], with: [0, 0, 0, 0, 0, 0, 0, 0], solo: [100, 60, 100, 40] };
    expect(counter(t, 2, 0, 1).adv).toBeCloseTo(((10 + 25 * 0.7) / 35 - 0.7) * 100);
    // синергия: E = .6 + .4 − .5 = .5
    const s = { vs: t.with, with: [0, 0, 4, 1, 0, 0, 0, 0], solo: t.solo };
    expect(synergy(s, 2, 0, 1).adv).toBeCloseTo(((1 + 12.5) / 29 - 0.5) * 100);
    // clamp 0.05..0.95
    const c = { vs: [0, 0, 0, 0, 0, 0, 0, 0], solo: [10, 10, 10, 0] };
    expect(counter({ ...c, vs: [0, 0, 1, 1, 0, 0, 0, 0] }, 2, 0, 1).adv).toBeCloseTo(((1 + 25 * 0.95) / 26 - 0.95) * 100);
  });

  it('про-сцена: синергия не считается', () => {
    const r = rankPicks({ T: stats.pro, n: stats.n, heroes, positions, draft: { enemy, ally: [id('Lion')], ban: [] }, pro: true });
    expect(r.every(x => x.ss.length === 0 && x.y === 0)).toBe(true);
  });

  it('позиции и оценки', () => {
    expect(mainPos(heroes[id('Pudge')], positions)).toEqual([4, 3, 5]);
    expect([6, 3, 0, -0.1].map(verdictIndex)).toEqual([0, 1, 2, 3]);
  });

  it('кого банить: 5 героев, без занятых', () => {
    const ally = [id('Lion')];
    const b = banSuggestions(T, stats.n, heroes, { enemy, ally, ban: [] });
    expect(b).toHaveLength(5);
    expect(b.some(x => enemy.includes(x.h.i) || ally.includes(x.h.i))).toBe(false);
  });
});
