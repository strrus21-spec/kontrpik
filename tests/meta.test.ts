import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { heroesFrom } from '../src/data.ts';
import { pickBaseline, sortRows, tierList, trendMap, type Snapshot } from '../src/meta.ts';
import type { Positions, Stats } from '../src/types.ts';

const stats: Stats = JSON.parse(readFileSync('tests/fixtures/stats-2026-11-02.json', 'utf8'));
const positions: Positions = JSON.parse(readFileSync('tests/fixtures/positions-2026-11-02.json', 'utf8'));
const heroes = heroesFrom(stats);

describe('тир-лист', () => {
  const rows = tierList(stats, heroes, positions, 'all', 0);
  it('все герои с играми, тиры S/A/B/C по долям', () => {
    expect(rows).toHaveLength(127);
    const c = (t: string) => rows.filter(r => r.tier === t).length;
    expect([c('S'), c('A'), c('B'), c('C')]).toEqual([13, 32, 44, 38]);
    expect(rows[0].tier).toBe('S'); expect(rows[126].tier).toBe('C');
    expect(rows[0].score).toBeGreaterThanOrEqual(rows[1].score);
  });
  it('доля пиков: сумма 1000% (10 героев в матче)', () => {
    expect(rows.reduce((s, r) => s + r.pick, 0)).toBeCloseTo(1000, 0);
    const pudge = rows.find(r => r.h.name === 'Pudge')!;
    expect(pudge.pick).toBeCloseTo(394546 / 1405493 * 100, 1);
  });
  it('сглаживание тянет редких героев к 50%', () => {
    for (const r of rows) expect(Math.abs(r.wrS - 50)).toBeLessThanOrEqual(Math.abs(r.wr - 50) + 1e-9);
  });
  it('фильтр позиции', () => {
    const p5 = tierList(stats, heroes, positions, 'all', 5);
    expect(p5.length).toBeLessThan(60);
    expect(p5.some(r => r.h.name === 'Crystal Maiden')).toBe(true);
    expect(p5.some(r => r.h.name === 'Anti-Mage')).toBe(false);
  });
  it('сортировка', () => {
    const byName = sortRows(rows, 'name', 1);
    expect(byName[0].h.name).toBe('Abaddon');
    const byPick = sortRows(rows, 'pick', -1);
    expect(byPick[0].h.name).toBe('Pudge');
  });
});

describe('тренды', () => {
  it('базовый снимок — не моложе 7 дней', () => {
    const d = ['2026-10-25', '2026-10-28', '2026-10-30', '2026-11-04', '2026-11-05'];
    expect(pickBaseline(d, '2026-11-05')).toBe('2026-10-28');
    expect(pickBaseline(['2026-11-01', '2026-11-05'], '2026-11-05')).toBeNull();
  });
  it('изменение винрейта по имени, мало игр — пропуск', () => {
    const now: Snapshot = { date: '2026-11-05', heroes: ['Axe', 'Lion', 'Puck'], solo: { all: [1000, 550, 1000, 480, 50, 30] } as never };
    const then: Snapshot = { date: '2026-10-29', heroes: ['Abaddon', 'Axe', 'Lion', 'Puck'], solo: { all: [10, 5, 1000, 500, 1000, 500, 1000, 500] } as never };
    const m = trendMap(now, then, 'all');
    expect(m.get('Axe')).toBeCloseTo(5); expect(m.get('Lion')).toBeCloseTo(-2); expect(m.has('Puck')).toBe(false);
  });
});
