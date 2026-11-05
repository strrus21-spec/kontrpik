import type { Hero, Positions, Stats, Tip } from './types.ts';

export const heroesFrom = (s: Stats, baseUrl = ''): Hero[] =>
  s.heroes.map((h, i) => ({ i, name: h[0], attr: h[1], roles: h[2], img: h[3].startsWith('data:') ? h[3] : baseUrl + h[3], odId: h[4] }));

/** Сборки предметов про-игроков (scripts/lib/items.ts). */
export interface HeroBuild { start: string[]; early: string[]; mid: string[]; late: string[] }
export interface ItemsData { updated: number; items: Record<string, { n: string; c: number; i: string; a?: number }>; ids?: Record<string, string>; heroes: Record<string, HeroBuild> }
export interface AppData { stats: Stats; positions: Positions; tips: Tip[]; heroes: Hero[]; items: ItemsData | null }

/** Данные, вшитые в страницу (отдельный файл kontrpik.html — scripts/build-standalone.ts). */
export interface Embedded { stats: Stats; positions: Positions; tips: Tip[]; patch?: unknown; items?: ItemsData }
export const embedded = (): Embedded | null => (globalThis as { __KP_DATA__?: Embedded }).__KP_DATA__ ?? null;

export async function loadData(baseUrl: string): Promise<AppData> {
  const e = embedded();
  if (e) return { stats: e.stats, positions: e.positions, tips: e.tips, heroes: heroesFrom(e.stats, baseUrl), items: e.items ?? null };
  const get = async <T>(p: string): Promise<T> => {
    const r = await fetch(baseUrl + p);
    if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`);
    return r.json();
  };
  const [stats, positions, tips, items] = await Promise.all([
    get<Stats>('data/stats.json'), get<Positions>('data/positions.json'), get<Tip[]>('data/tips.json'),
    get<ItemsData>('data/items.json').catch(() => null),   // необязательный файл
  ]);
  return { stats, positions, tips, heroes: heroesFrom(stats, baseUrl), items };
}
