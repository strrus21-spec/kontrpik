// Агрегация матчей OpenDota в таблицы контр/синергия/solo. Порт обработчика refresh из prototype/desktop/main.js.
import type { PubKey } from '../../src/types.ts';

export const BUCKETS: Record<PubKey, (t: number) => boolean> = {
  all: () => true,
  // avg_rank_tier: десятки — медаль (1 Рекрут … 4 Герой, 5 Легенда, 6 Властелин, 7 Божество, 8 Титан)
  low: t => t < 50,             // Рекрут–Герой
  mid: t => t >= 50 && t < 70,  // Легенда–Властелин
  high: t => t >= 70,           // Божество–Титан
};

export interface Acc { vs: number[]; with: number[]; solo: number[] }
export type Accs = Record<PubKey, Acc>;

export function createAccs(n: number): Accs {
  const mk = (): Acc => ({ vs: new Array(n * n * 2).fill(0), with: new Array(n * n * 2).fill(0), solo: new Array(n * 2).fill(0) });
  return { all: mk(), low: mk(), mid: mk(), high: mk() };
}

/** Строка public_matches: r — radiant_win, t — avg_rank_tier, a/d — составы (hero_id), s — start_time. */
export interface MatchRow { r: boolean; t: number | null; a: number[] | null; d: number[] | null; s: number }

/** Добавить матч. Возвращает false, если составы неполные или есть неизвестный герой. */
export function addMatch(acc: Accs, counts: Record<PubKey, number>, row: MatchRow, ix: Map<number, number>, n: number): boolean {
  if (!row.a || !row.d || row.a.length !== 5 || row.d.length !== 5) return false;
  const A = row.a.map(x => ix.get(x)), D = row.d.map(x => ix.get(x));
  if (A.includes(undefined) || D.includes(undefined)) return false;
  const t = row.t || 0;
  for (const bk of Object.keys(BUCKETS) as PubKey[]) {
    if (!BUCKETS[bk](t)) continue;
    counts[bk]++;
    const M = acc[bk];
    for (const [team, opp, won] of [[A, D, row.r], [D, A, !row.r]] as [number[], number[], boolean][]) {
      const w = won ? 1 : 0;
      for (const x of team) {
        M.solo[2 * x]++; M.solo[2 * x + 1] += w;
        for (const y of opp) { const k = 2 * (x * n + y); M.vs[k]++; M.vs[k + 1] += w; }
        for (const y of team) if (y !== x) { const k = 2 * (x * n + y); M.with[k]++; M.with[k + 1] += w; }
      }
    }
  }
  return true;
}

/** Строка запроса позиций: lr — lane_role, k — место по золоту в линии, c — число игр. */
export interface PosRow { hero_id: number; lr: number; k: number; n: number; c: number }

/** lane_role 1 (safe): k=1 → pos1, иначе pos5; 2 (mid): k=1 → pos2, иначе pos4; 3 (off): k=1 → pos3, иначе pos4. */
export function posIndex(lr: number, k: number): number | null {
  if (lr === 1) return k === 1 ? 0 : 4;
  if (lr === 2) return k === 1 ? 1 : 3;
  if (lr === 3) return k === 1 ? 2 : 3;
  return null;
}

export function positionsFromRows(rows: PosRow[], nameById: Map<number, string>): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const r of rows) {
    const name = nameById.get(r.hero_id), p = posIndex(r.lr, r.k);
    if (!name || p === null) continue;
    (out[name] ||= [0, 0, 0, 0, 0])[p] += Number(r.c);
  }
  return out;
}

/** Квантиль по уже отсортированному массиву. */
export const quantile = (sorted: number[], q: number) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))] : 0;
