// Сохранение в localStorage. Героев храним по имени (индексы меняются при обновлении данных).
import type { Hero, SrcKey } from './types.ts';

export type Side = 'enemy' | 'ally' | 'ban';
export interface DraftState {
  enemy: number[]; ally: number[]; ban: number[];
  mode: Side; role: string; src: SrcKey; pos: number; q: string; example: boolean;
}

export const DRAFT_KEY = 'kontrpik-draft';
/** Ключ прототипа: герои по индексам. Читаем один раз для переноса. */
export const LEGACY_KEY = 'counterpick2';
export const SAMPLE = ['Phantom Assassin', 'Pudge', 'Invoker', 'Axe', 'Crystal Maiden'];
const SRCS: SrcKey[] = ['all', 'low', 'mid', 'high', 'pro'];
const LIMIT: Record<Side, number> = { enemy: 5, ally: 4, ban: 24 };

export const defaultState = (): DraftState =>
  ({ enemy: [], ally: [], ban: [], mode: 'enemy', role: '', src: 'all', pos: 0, q: '', example: false });

interface Stored { enemy: string[]; ally: string[]; ban: string[]; mode: Side; src: SrcKey; pos: number; example: boolean }

export function serialize(s: DraftState, heroes: Hero[]): Stored {
  const names = (ids: number[]) => ids.map(i => heroes[i]?.name).filter(Boolean) as string[];
  return { enemy: names(s.enemy), ally: names(s.ally), ban: names(s.ban), mode: s.mode, src: s.src, pos: s.pos, example: s.example };
}

/** Восстановить состояние. raw — новый формат (имена), legacy — формат прототипа (индексы). */
export function deserialize(raw: unknown, legacy: unknown, heroes: Hero[]): DraftState {
  const s = defaultState();
  const byName = new Map(heroes.map(h => [h.name, h.i]));
  const ids = (a: unknown, fromIdx: boolean): number[] => {
    if (!Array.isArray(a)) return [];
    const out = a.map(x => (fromIdx ? (typeof x === 'number' && heroes[x] ? x : undefined) : byName.get(String(x))))
      .filter((x): x is number => x !== undefined);
    return [...new Set(out)];
  };
  const src = (raw && typeof raw === 'object' ? raw : legacy && typeof legacy === 'object' ? legacy : null) as Record<string, unknown> | null;
  const fromIdx = src !== null && src === legacy;
  if (src && Array.isArray(src.enemy)) {
    const seen = new Set<number>();
    for (const side of ['enemy', 'ally', 'ban'] as Side[]) {
      s[side] = ids(src[side], fromIdx).filter(i => !seen.has(i) && seen.add(i)).slice(-LIMIT[side]);
    }
    if (src.mode === 'enemy' || src.mode === 'ally' || src.mode === 'ban') s.mode = src.mode;
    if (SRCS.includes(src.src as SrcKey)) s.src = src.src as SrcKey;
    const p = Number(src.pos); if (Number.isInteger(p) && p >= 0 && p <= 5) s.pos = p;
    s.example = !!src.example;
  }
  if (!s.enemy.length && !s.ally.length && !s.ban.length) {
    s.enemy = SAMPLE.map(n => byName.get(n)).filter((x): x is number => x !== undefined);
    s.example = true;
  }
  return s;
}

const read = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };

export function loadState(heroes: Hero[]): DraftState {
  const raw = read(DRAFT_KEY);
  return deserialize(raw, raw ? null : read(LEGACY_KEY), heroes);
}
export function saveState(s: DraftState, heroes: Hero[]) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(serialize(s, heroes))); } catch { /* ignore */ }
}

export function where(s: DraftState, id: number): Side | null {
  for (const side of ['enemy', 'ally', 'ban'] as Side[]) if (s[side].includes(id)) return side;
  return null;
}

/** Клик по герою в пуле: убрать из текущей стороны и/или добавить в сторону режима. */
export function toggle(s: DraftState, id: number) {
  const cur = where(s, id);
  if (cur) s[cur] = s[cur].filter(x => x !== id);
  if (cur !== s.mode) {
    if (s[s.mode].length >= LIMIT[s.mode]) s[s.mode].shift();
    s[s.mode].push(id);
  }
  if (cur === 'enemy' || s.mode === 'enemy') s.example = false;
}

// Изученные фишки (по русскому заголовку, как в прототипе)
const KNOWN_KEY = 'kontrpik-known';
export const loadKnown = (): Set<string> => { const v = read(KNOWN_KEY); return new Set(Array.isArray(v) ? v.map(String) : []); };
export const saveKnown = (k: Set<string>) => { try { localStorage.setItem(KNOWN_KEY, JSON.stringify([...k])); } catch { /* ignore */ } };
