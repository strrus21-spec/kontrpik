import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseSteamId, personalBonus, smoothedWr, rankLabel, fetchPlayer, poolNames } from '../src/player.ts';
import { itemAdvice, THREATS, COUNTERS } from '../src/items.ts';
import { applyDraftQuery, draftQuery, hasDraftQuery } from '../src/share.ts';
import { defaultState } from '../src/state.ts';
import { heroesFrom } from '../src/data.ts';
import type { Stats } from '../src/types.ts';

describe('Steam ID', () => {
  const ok = (s: string) => { const r = parseSteamId(s); return r.ok ? r.id : r.reason; };
  it('разные форматы → Steam32', () => {
    expect(ok('86745912')).toBe(86745912);
    expect(ok('76561198047011640')).toBe(86745912);
    expect(ok('https://steamcommunity.com/profiles/76561198047011640/')).toBe(86745912);
    expect(ok('https://www.dotabuff.com/players/86745912/matches')).toBe(86745912);
    expect(ok('opendota.com/players/86745912')).toBe(86745912);
    expect(ok('https://stratz.com/players/86745912')).toBe(86745912);
    expect(ok('[U:1:86745912]')).toBe(86745912);
    expect(ok('STEAM_0:0:43372956')).toBe(86745912);
  });
  it('ошибки', () => {
    expect(ok('')).toBe('empty');
    expect(ok('https://steamcommunity.com/id/finik')).toBe('vanity');
    expect(ok('hello')).toBe('bad');
    expect(ok('99999999999')).toBe('bad');
  });
});

describe('личный бонус', () => {
  it('+0.3 за процент выше 50%, сглаживание, предел +3', () => {
    expect(personalBonus(0, 0)).toBe(0);
    expect(personalBonus(20, 8)).toBe(0);                       // ниже 50% — без штрафа
    expect(smoothedWr(10, 7)).toBeCloseTo(60);                  // (7+5)/(10+10)
    expect(personalBonus(10, 7)).toBeCloseTo(3);
    expect(personalBonus(5, 4)).toBeCloseTo(0.3 * ((4 + 5) / 15 * 100 - 50));
    expect(personalBonus(200, 180)).toBe(3);
  });
  it('пул: ≥ 5 игр + звёзды', () => {
    const p = { id: 1, name: '', avatar: '', rank: null, leaderboard: null, fetchedAt: 0, heroes: [{ name: 'Axe', games: 5, win: 3 }, { name: 'Lion', games: 4, win: 4 }] };
    expect([...poolNames(p, new Set(['Puck']))].sort()).toEqual(['Axe', 'Puck']);
  });
  it('ранг', () => {
    const m = ['Рекрут', 'Страж', 'Рыцарь', 'Герой', 'Легенда', 'Властелин', 'Божество', 'Титан'];
    expect(rankLabel(54, null, m)).toBe('Легенда 4');
    expect(rankLabel(80, 120, m)).toBe('Титан #120');
    expect(rankLabel(null, null, m)).toBe(null);
  });
});

describe('профиль OpenDota', () => {
  const names: Record<number, string> = { 1: 'Anti-Mage', 2: 'Axe' };
  const res = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  it('открытый профиль', async () => {
    const f = vi.fn(async (u: string) => u.includes('/heroes') ? res([{ hero_id: '2', games: 12, win: 8 }, { hero_id: 1, games: 30, win: 10 }, { hero_id: 3, games: 0, win: 0 }])
      : res({ profile: { personaname: 'FINIK', avatarfull: 'a.png' }, rank_tier: 54 }));
    const r = await fetchPlayer(5, async id => names[id], f as unknown as typeof fetch);
    expect(r.ok && r.player.heroes.map(h => h.name)).toEqual(['Anti-Mage', 'Axe']);
    expect(r.ok && r.player.name).toBe('FINIK');
    expect(f.mock.calls.map(c => c[0])).toEqual(['https://api.opendota.com/api/players/5', 'https://api.opendota.com/api/players/5/heroes?date=90']);
  });
  it('закрытый профиль и несуществующий игрок', async () => {
    const closed = vi.fn(async (u: string) => u.includes('/heroes') ? res([]) : res({ profile: { personaname: 'x' } }));
    expect(await fetchPlayer(5, async () => 'Axe', closed as unknown as typeof fetch)).toEqual({ ok: false, reason: 'closed' });
    const none = vi.fn(async (u: string) => u.includes('/heroes') ? res([]) : res({ profile: null }));
    expect(await fetchPlayer(5, async () => 'Axe', none as unknown as typeof fetch)).toEqual({ ok: false, reason: 'notFound' });
    const down = vi.fn(async () => { throw new Error('offline'); });
    expect(await fetchPlayer(5, async () => 'Axe', down as unknown as typeof fetch)).toEqual({ ok: false, reason: 'network' });
  });
});

describe('что купить', () => {
  const sample = ['Phantom Assassin', 'Pudge', 'Invoker', 'Axe', 'Crystal Maiden'];
  it('приёмка: MKB против PA и BKB против магии, у каждой причины есть конкретный враг', () => {
    const a = itemAdvice(sample, 0);
    expect(a.length).toBeGreaterThanOrEqual(4);
    expect(a.length).toBeLessThanOrEqual(6);
    const mkb = a.find(x => x.item === 'Monkey King Bar')!;
    expect(mkb.reasons).toEqual([{ tag: 'evasion', heroes: ['Phantom Assassin'] }]);
    const bkb = a.find(x => x.item === 'Black King Bar')!;
    expect(bkb.reasons.find(r => r.tag === 'magic_burst')!.heroes).toEqual(expect.arrayContaining(['Invoker', 'Crystal Maiden']));
    expect(a[0].item).toBe('Black King Bar');
    for (const x of a) for (const r of x.reasons) expect(r.heroes.length).toBeGreaterThan(0);
  });
  it('саппорт получает саппортские предметы', () => {
    const a = itemAdvice(sample, 5).map(x => x.item);
    expect(a).toContain('Glimmer Cape');
    expect(a).not.toContain('Monkey King Bar');
    expect(itemAdvice(['Riki'], 4).map(x => x.item)).toEqual(['Dust of Appearance', 'Sentry Ward']);
  });
  it('BKB не советуем против ульт сквозь BKB', () => {
    expect(itemAdvice(['Axe', 'Faceless Void'], 1)).toEqual([]);
    expect(itemAdvice(['Doom'], 1).map(x => x.item)).toEqual(["Linken's Sphere"]);
  });
  it('метки для 40 самых популярных героев пабликов', () => {
    const s: Stats = JSON.parse(readFileSync('tests/fixtures/stats-2026-11-02.json', 'utf8'));
    const solo = s.pub.all.solo;
    const top = [...Array(s.n).keys()].sort((a, b) => solo[2 * b] - solo[2 * a]).slice(0, 40).map(i => s.heroes[i][0]);
    expect(top.filter(n => !THREATS[n])).toEqual([]);
    // и для всех остальных героев (у новых — пустой список до согласования)
    expect(s.heroes.map(h => h[0]).filter(n => !(n in THREATS))).toEqual([]);
    const names = new Set(s.heroes.map(h => h[0]));
    expect(Object.keys(THREATS).filter(n => !names.has(n))).toEqual([]);
    expect(Object.keys(COUNTERS)).toHaveLength(14);
  });
});

describe('ссылка на драфт', () => {
  const s0: Stats = JSON.parse(readFileSync('tests/fixtures/stats-2026-11-02.json', 'utf8'));
  const heroes = heroesFrom(s0);
  const id = (n: string) => heroes.find(h => h.name === n)!.i;
  it('туда и обратно', () => {
    const s = defaultState();
    s.enemy = [id('Pudge'), id('Axe')]; s.ally = [id('Lion')]; s.ban = [id("Nature's Prophet")]; s.src = 'mid'; s.pos = 2;
    const q = draftQuery(s, heroes);
    expect(q).toBe('e=pudge,axe&a=lion&b=natures-prophet&r=mid&pos=2');
    expect(hasDraftQuery('?' + q)).toBe(true);
    const t = defaultState(); t.example = true;
    applyDraftQuery(t, '?' + q, heroes);
    expect(t).toMatchObject({ enemy: s.enemy, ally: s.ally, ban: s.ban, src: 'mid', pos: 2, example: false });
  });
  it('мусор и повторы отбрасываются', () => {
    const t = defaultState();
    applyDraftQuery(t, '?e=pudge,nope,pudge,PUDGE&a=pudge,lion&r=xxx&pos=9', heroes);
    expect(t.enemy).toEqual([id('Pudge')]); expect(t.ally).toEqual([id('Lion')]);
    expect(t.src).toBe('all'); expect(t.pos).toBe(0);
  });
});
