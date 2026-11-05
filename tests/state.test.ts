import { describe, expect, it } from 'vitest';
import { deserialize, serialize, toggle, defaultState, SAMPLE } from '../src/state.ts';
import { heroMatch } from '../src/search.ts';
import type { Hero } from '../src/types.ts';

const names = ['Axe', 'Bane', 'Crystal Maiden', 'Invoker', 'Lion', 'Phantom Assassin', 'Pudge'];
const heroes: Hero[] = names.map((name, i) => ({ i, name, attr: 'str', roles: [], img: '' }));

describe('state', () => {
  it('сохраняет героев по имени и читает обратно', () => {
    const s = defaultState(); s.enemy = [6, 0]; s.ally = [4]; s.pos = 2; s.src = 'mid';
    const stored = serialize(s, heroes);
    expect(stored.enemy).toEqual(['Pudge', 'Axe']);
    // другой порядок героев (новый герой в данных) — драфт сохраняется
    const shifted: Hero[] = ['Abaddon', ...names].map((name, i) => ({ i, name, attr: 'str', roles: [], img: '' }));
    const back = deserialize(JSON.parse(JSON.stringify(stored)), null, shifted);
    expect(back.enemy.map(i => shifted[i].name)).toEqual(['Pudge', 'Axe']);
    expect(back.ally.map(i => shifted[i].name)).toEqual(['Lion']);
    expect(back.pos).toBe(2); expect(back.src).toBe('mid');
  });
  it('переносит драфт прототипа (индексы)', () => {
    const s = deserialize(null, { enemy: [1, 3], ally: [], ban: [0], mode: 'ban', src: 'pro', pos: 5 }, heroes);
    expect(s.enemy).toEqual([1, 3]); expect(s.ban).toEqual([0]); expect(s.mode).toBe('ban'); expect(s.src).toBe('pro');
  });
  it('пустое хранилище → пример пика', () => {
    const s = deserialize(null, null, heroes);
    expect(s.example).toBe(true);
    expect(s.enemy.map(i => heroes[i].name)).toEqual(SAMPLE);
  });
  it('мусор в хранилище не ломает загрузку', () => {
    const s = deserialize({ enemy: ['Nope', 5, null], ally: 'x', src: 'zzz', pos: 9 }, null, heroes);
    expect(s.src).toBe('all'); expect(s.pos).toBe(0);
    expect(s.enemy.length).toBe(5); // пустой драфт → пример
  });
  it('toggle: лимит 5 врагов, перенос между сторонами', () => {
    const s = defaultState();
    for (let i = 0; i < 6; i++) toggle(s, i);
    expect(s.enemy).toEqual([1, 2, 3, 4, 5]);
    s.mode = 'ally'; toggle(s, 3);
    expect(s.enemy).toEqual([1, 2, 4, 5]); expect(s.ally).toEqual([3]);
    toggle(s, 3); expect(s.ally).toEqual([]);
  });
  it('поиск по русским прозвищам', () => {
    expect(heroMatch({ name: 'Phantom Assassin' }, 'фантомка')).toBe(true);
    expect(heroMatch({ name: 'Pudge' }, 'пуд')).toBe(true);
    expect(heroMatch({ name: 'Queen of Pain' }, 'квопа')).toBe(true);
    expect(heroMatch({ name: 'Spirit Breaker' }, 'бара')).toBe(true);
    expect(heroMatch({ name: 'Pudge' }, 'invoker')).toBe(false);
  });
});
