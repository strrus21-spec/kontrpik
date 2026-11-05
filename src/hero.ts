// Страница героя (6.3): матчапы, позиции, винрейты по группам рангов. Использует функции раздела 4 без изменений.
import { base, counter, posShare, synergy } from './scoring.ts';
import type { Hero, Positions, Stats, SrcKey, Tables } from './types.ts';

export interface Matchup { h: Hero; adv: number; g: number }
export interface HeroProfile {
  pos: { p: number; share: number }[];
  /** Винрейт и игры по каждой группе. */
  wr: { src: SrcKey; wr: number | null; g: number }[];
  /** Кого он контрит: его преимущество против y. */
  beats: Matchup[];
  /** Кто контрит его: преимущество y против него. */
  losesTo: Matchup[];
  /** С кем лучше всего (нет для про-сцены). */
  bestWith: Matchup[];
}

const SRCS: SrcKey[] = ['all', 'low', 'mid', 'high', 'pro'];
const tablesOf = (s: Stats, src: SrcKey): Tables => (src === 'pro' ? s.pro : s.pub[src]);

export function heroProfile(stats: Stats, heroes: Hero[], positions: Positions, h: Hero, src: SrcKey): HeroProfile {
  const T = tablesOf(stats, src), n = stats.n;
  const others = heroes.filter(o => o.i !== h.i && T.solo[2 * o.i]);
  const top = (list: Matchup[], k: number) => list.sort((a, b) => b.adv - a.adv).slice(0, k);
  const beats = top(others.map(o => ({ h: o, ...counter(T, n, h.i, o.i) })), 8);
  const losesTo = top(others.map(o => ({ h: o, ...counter(T, n, o.i, h.i) })), 8);
  const bestWith = src === 'pro' ? [] : top(others.map(o => ({ h: o, ...synergy(T, n, h.i, o.i) })), 5);
  return {
    pos: posShare(h, positions).map((share, i) => ({ p: i + 1, share })),
    wr: SRCS.map(k => { const t = tablesOf(stats, k), g = t.solo[2 * h.i]; return { src: k, wr: g ? base(t, h.i) * 100 : null, g }; }),
    beats, losesTo, bestWith,
  };
}
