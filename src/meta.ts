// Мета и тир-лист (6.5). Тир = сглаженный винрейт + доля пиков.
import { fitsPos } from './scoring.ts';
import type { Hero, Positions, SrcKey, Stats, Tables } from './types.ts';

export type Tier = 'S' | 'A' | 'B' | 'C';
export interface MetaRow { h: Hero; g: number; wr: number; wrS: number; pick: number; score: number; tier: Tier; trend: number | null }

/** Сглаживание винрейта к 50%: виртуальные игры. У про-сцены выборки меньше. */
export const META_K: Record<SrcKey, number> = { all: 200, low: 200, mid: 200, high: 200, pro: 25 };
/** Вес доли пиков: +0.15 к счёту за каждый процент пиков. */
export const PICK_WEIGHT = 0.15;
/** Доли тиров сверху вниз: S — 10%, A — 25%, B — 35%, C — остальные. */
export const TIER_SHARE: [Tier, number][] = [['S', 0.10], ['A', 0.25], ['B', 0.35], ['C', 1]];

const tablesOf = (s: Stats, src: SrcKey): Tables => (src === 'pro' ? s.pro : s.pub[src]);

export function tierList(stats: Stats, heroes: Hero[], positions: Positions, src: SrcKey, pos: number, trend?: Map<string, number>): MetaRow[] {
  const T = tablesOf(stats, src), K = META_K[src];
  let total = 0; for (let i = 0; i < stats.n; i++) total += T.solo[2 * i];
  const rows = heroes.filter(h => T.solo[2 * h.i] && fitsPos(h, pos, positions)).map(h => {
    const g = T.solo[2 * h.i], w = T.solo[2 * h.i + 1];
    const wr = w / g * 100, wrS = (w + K * 0.5) / (g + K) * 100;
    const pick = total ? g / total * 10 * 100 : 0;      // % матчей, где герой выбран (10 слотов на матч)
    return { h, g, wr, wrS, pick, score: (wrS - 50) + PICK_WEIGHT * pick, tier: 'C' as Tier, trend: trend?.get(h.name) ?? null };
  }).sort((a, b) => b.score - a.score);
  let start = 0;
  for (const [tier, share] of TIER_SHARE) {
    const end = tier === 'C' ? rows.length : Math.max(start + 1, Math.round(rows.length * share) + start);
    for (let i = start; i < Math.min(end, rows.length); i++) rows[i].tier = tier;
    start = end;
  }
  return rows;
}

export interface Snapshot { date: string; heroes: string[]; solo: Record<SrcKey, number[]> }

/** Снимок для сравнения: самый свежий, который старше latest хотя бы на 7 дней; иначе null. */
export function pickBaseline(dates: string[], latest: string, days = 7): string | null {
  const limit = new Date(Date.parse(latest + 'T00:00:00Z') - days * 864e5).toISOString().slice(0, 10);
  const older = dates.filter(d => d <= limit).sort();
  return older.length ? older[older.length - 1] : null;
}

/** Изменение винрейта (п.п.) по каждому герою между снимками. Сопоставление по имени. */
export function trendMap(now: Snapshot, then: Snapshot, src: SrcKey, minGames = 100): Map<string, number> {
  const idx = new Map(then.heroes.map((n, i) => [n, i]));
  const out = new Map<string, number>();
  const a = now.solo[src], b = then.solo[src];
  if (!a || !b) return out;
  const min = src === 'pro' ? 20 : minGames;
  now.heroes.forEach((name, i) => {
    const j = idx.get(name); if (j === undefined) return;
    const g1 = a[2 * i], g0 = b[2 * j];
    if (g1 < min || g0 < min) return;
    out.set(name, (a[2 * i + 1] / g1 - b[2 * j + 1] / g0) * 100);
  });
  return out;
}

export type SortKey = 'score' | 'wr' | 'pick' | 'trend' | 'name';
export function sortRows(rows: MetaRow[], key: SortKey, dir: 1 | -1): MetaRow[] {
  const v = (r: MetaRow): number | string => key === 'name' ? r.h.name : key === 'trend' ? (r.trend ?? -Infinity) : r[key];
  return [...rows].sort((a, b) => { const x = v(a), y = v(b); return (x < y ? -1 : x > y ? 1 : 0) * dir; });
}
