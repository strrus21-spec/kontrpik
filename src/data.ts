import type { Hero, Positions, Stats, Tip } from './types.ts';

export const heroesFrom = (s: Stats, baseUrl = ''): Hero[] =>
  s.heroes.map((h, i) => ({ i, name: h[0], attr: h[1], roles: h[2], img: h[3].startsWith('data:') ? h[3] : baseUrl + h[3] }));

export interface AppData { stats: Stats; positions: Positions; tips: Tip[]; heroes: Hero[] }

export async function loadData(baseUrl: string): Promise<AppData> {
  const get = async <T>(p: string): Promise<T> => {
    const r = await fetch(baseUrl + p);
    if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`);
    return r.json();
  };
  const [stats, positions, tips] = await Promise.all([
    get<Stats>('data/stats.json'), get<Positions>('data/positions.json'), get<Tip[]>('data/tips.json'),
  ]);
  return { stats, positions, tips, heroes: heroesFrom(stats, baseUrl) };
}
