// Ссылка на драфт (6.8): ?e=pudge,axe&a=lion&b=…&r=mid&pos=2
import { slug } from './slug.ts';
import type { DraftState } from './state.ts';
import type { Hero, SrcKey } from './types.ts';

const SRCS: SrcKey[] = ['all', 'low', 'mid', 'high', 'pro'];

export function draftQuery(s: DraftState, heroes: Hero[]): string {
  const p = new URLSearchParams();
  const list = (ids: number[]) => ids.map(i => slug(heroes[i].name)).join(',');
  if (s.enemy.length) p.set('e', list(s.enemy));
  if (s.ally.length) p.set('a', list(s.ally));
  if (s.ban.length) p.set('b', list(s.ban));
  if (s.src !== 'all') p.set('r', s.src);
  if (s.pos) p.set('pos', String(s.pos));
  return p.toString().replace(/%2C/g, ',');
}

/** Есть ли в адресе драфт. */
export const hasDraftQuery = (search: string) => /[?&](e|a|b)=/.test(search);

/** Применить драфт из адреса поверх состояния. Неизвестные герои игнорируются. */
export function applyDraftQuery(s: DraftState, search: string, heroes: Hero[]): void {
  const p = new URLSearchParams(search);
  const bySlug = new Map(heroes.map(h => [slug(h.name), h.i]));
  const seen = new Set<number>();
  const ids = (k: string, lim: number) => (p.get(k) || '').split(',').map(x => bySlug.get(x.trim().toLowerCase()))
    .filter((x): x is number => x !== undefined && !seen.has(x) && !!seen.add(x)).slice(0, lim);
  s.enemy = ids('e', 5); s.ally = ids('a', 4); s.ban = ids('b', 24);
  const r = p.get('r') as SrcKey; if (SRCS.includes(r)) s.src = r;
  const pos = Number(p.get('pos')); s.pos = Number.isInteger(pos) && pos >= 0 && pos <= 5 ? pos : 0;
  s.example = false;
}
