// Алгоритм счёта — раздел 4 ТЗ. Не менять без согласования: покрыт тестом tests/scoring.test.ts.
import type { Hero, Positions, Tables } from './types.ts';

/** Сглаживание: вес «виртуальных» игр с ожидаемым результатом. */
export const K = 25;
/** Герой подходит позиции, если там ≥ 15% его про-игр. */
export const POS_MIN = 0.15;

const clamp = (v: number) => Math.min(0.95, Math.max(0.05, v));

/** Базовый винрейт p(x). */
export function base(T: Tables, x: number): number {
  const g = T.solo[2 * x], w = T.solo[2 * x + 1];
  return g ? w / g : 0.5;
}

export interface PairResult { adv: number; g: number; raw: number | null }

/** Преимущество в п.п.: сглаженный винрейт пары минус ожидаемый из общих винрейтов героев. */
export function pair(T: Tables, mat: 'vs' | 'with', n: number, x: number, y: number, expected: number): PairResult {
  const M = T[mat]!;
  const k = 2 * (x * n + y), g = M[k], w = M[k + 1];
  return { adv: ((w + K * expected) / (g + K) - expected) * 100, g, raw: g ? (w / g) * 100 : null };
}

/** Контр c против e: E = clamp(p(c) − p(e) + 0.5). */
export const counter = (T: Tables, n: number, c: number, e: number) =>
  pair(T, 'vs', n, c, e, clamp(base(T, c) - base(T, e) + 0.5));

/** Синергия c с a: E = clamp(p(c) + p(a) − 0.5). */
export const synergy = (T: Tables, n: number, c: number, a: number) =>
  pair(T, 'with', n, c, a, clamp(base(T, c) + base(T, a) - 0.5));

/** Доли игр героя на pos1..pos5. При < 40 про-игр — запасной вариант по ролям OpenDota. */
export function posShare(h: Pick<Hero, 'name' | 'roles'>, positions: Positions): number[] {
  const d = positions[h.name];
  const t = d ? d.reduce((a, b) => a + b, 0) : 0;
  if (d && t >= 40) return d.map(x => x / t);
  const r = h.roles;
  const s = [
    r.includes('Carry') ? 1 : 0,
    r.includes('Nuker') && !r.includes('Support') ? 0.6 : 0,
    r.includes('Initiator') || r.includes('Durable') ? 0.6 : 0,
    r.includes('Support') ? 1 : 0,
    r.includes('Support') ? 1 : 0,
  ];
  const st = s.reduce((a, b) => a + b, 0) || 1;
  return s.map(x => x / st);
}

export const fitsPos = (h: Pick<Hero, 'name' | 'roles'>, p: number, positions: Positions) =>
  !p || posShare(h, positions)[p - 1] >= POS_MIN;

/** Позиции героя (≥ 15%), по убыванию доли. */
export const mainPos = (h: Pick<Hero, 'name' | 'roles'>, positions: Positions) =>
  posShare(h, positions)
    .map((v, i) => [v, i + 1] as const)
    .filter(x => x[0] >= POS_MIN)
    .sort((a, b) => b[0] - a[0])
    .map(x => x[1]);

export interface Draft { enemy: number[]; ally: number[]; ban: number[] }
export interface PairRow extends PairResult { e: number }
export interface PickRow { h: Hero; c: number; y: number; score: number; cs: PairRow[]; ss: PairRow[]; wr: number; g: number }

export interface RankOptions {
  T: Tables;
  n: number;
  heroes: Hero[];
  positions: Positions;
  draft: Draft;
  pos?: number;
  role?: string;
  /** Про-сцена: синергия не считается. */
  pro?: boolean;
}

/** Счёт = Σ контр по врагам + Σ синергия по союзникам. Отсортировано по убыванию. */
export function rankPicks(o: RankOptions): PickRow[] {
  const { T, n, draft } = o;
  const taken = new Set([...draft.enemy, ...draft.ally, ...draft.ban]);
  const rows: PickRow[] = [];
  for (const h of o.heroes) {
    if (taken.has(h.i)) continue;
    if (o.role && !h.roles.includes(o.role)) continue;
    if (!fitsPos(h, o.pos || 0, o.positions)) continue;
    if (!T.solo[2 * h.i]) continue;
    const cs = draft.enemy.map(e => ({ e, ...counter(T, n, h.i, e) }));
    const ss = o.pro ? [] : draft.ally.map(a => ({ e: a, ...synergy(T, n, h.i, a) }));
    const c = cs.reduce((s, p) => s + p.adv, 0), y = ss.reduce((s, p) => s + p.adv, 0);
    rows.push({ h, c, y, score: c + y, cs, ss, wr: base(T, h.i) * 100, g: T.solo[2 * h.i] });
  }
  return rows.sort((a, b) => b.score - a.score);
}

export interface BanRow { h: Hero; s: number; worst: { a: number; adv: number } }

/** Кого банить: 5 героев, сильнейших против моих союзников. */
export function banSuggestions(T: Tables, n: number, heroes: Hero[], draft: Draft, limit = 5): BanRow[] {
  const taken = new Set([...draft.enemy, ...draft.ally, ...draft.ban]);
  return heroes
    .filter(h => !taken.has(h.i) && T.solo[2 * h.i])
    .map(h => {
      const parts = draft.ally.map(a => ({ a, ...counter(T, n, h.i, a) }));
      return { h, s: parts.reduce((s, p) => s + p.adv, 0), worst: parts.sort((x, y) => y.adv - x.adv)[0] };
    })
    .sort((a, b) => b.s - a.s)
    .slice(0, limit);
}

/** Оценка словами: индекс в словаре verdict (Отличный ≥ 6, Хороший ≥ 3, Нормально ≥ 0, Не советую). */
export const verdictIndex = (s: number) => (s >= 6 ? 0 : s >= 3 ? 1 : s >= 0 ? 2 : 3);
