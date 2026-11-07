import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readdirSync } from 'node:fs';
import { rankAdjust, steamCollect, steamFallback, steamRow, type SteamApi, type SteamMatch } from '../scripts/lib/steam.ts';
import type { Stats } from '../src/types.ts';

const P = (slot: number, hero: number, leaver = 0) => ({ player_slot: slot, team_number: slot < 128 ? 0 : 1, hero_id: hero, leaver_status: leaver });
const match = (seq: number, o: Partial<SteamMatch> = {}): SteamMatch => ({
  match_id: seq, match_seq_num: seq, radiant_win: seq % 2 === 0, lobby_type: 7, game_mode: 22, human_players: 10, duration: 2000, start_time: 1_800_000_000 + seq,
  players: [0, 1, 2, 3, 4].map(i => P(i, 101 + i)).concat([128, 129, 130, 131, 132].map((s, i) => P(s, 106 + i))), ...o,
});

describe('Steam: запасной источник', () => {
  it('берёт только рейтинговые All Pick / CM на 10 игроков без ливеров', () => {
    expect(steamRow(match(2))).toEqual({ r: true, t: null, a: [101, 102, 103, 104, 105], d: [106, 107, 108, 109, 110], s: 1_800_000_002 });
    expect(steamRow(match(2, { lobby_type: 0 }))).toBeNull();          // обычный, не рейтинговый
    expect(steamRow(match(2, { game_mode: 23 }))).toBeNull();          // турбо
    expect(steamRow(match(2, { human_players: 9 }))).toBeNull();
    expect(steamRow(match(2, { duration: 300 }))).toBeNull();
    const m = match(2); m.players[3].leaver_status = 2;
    expect(steamRow(m)).toBeNull();
  });
  it('поправка группы рангов: свежий общий винрейт + разница группы и общего в снимке', () => {
    // снимок: общий 50%, группа 60% (+10 п.); свежий общий 40% → группа 50%; размер выборки — из снимка группы
    expect(rankAdjust([100, 40], [1000, 500], [200, 120])).toEqual([200, 100]);
    expect(rankAdjust([0, 0], [1000, 500], [200, 120])).toEqual([200, 120]);   // нет свежих данных — как в снимке
    expect(rankAdjust([100, 95], [100, 20], [10, 9])).toEqual([10, 10]);        // не больше 100%
  });
  it('копит дневные порции Steam и из них собирает stats.json, если OpenDota упал', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kp-steam-')); mkdirSync(join(root, 'data'));
    const n = 10, heroes = Array.from({ length: n }, (_, i) => [`H${i}`, 'str', [], `icons/h${i}.png`, 101 + i]) as Stats['heroes'];
    const z = (len: number, v = 0) => new Array(len).fill(v);
    const tab = () => ({ vs: z(n * n * 2), with: z(n * n * 2), solo: z(n * 2) });
    const snap: Stats = { heroes, n, counts: { all: 900, low: 300, mid: 400, high: 200 }, pub: { all: tab(), low: tab(), mid: tab(), high: tab() }, pro: { vs: z(n * n * 2, 1), solo: z(n * 2, 1) }, from: 1, to: 2, updated: 1_790_000_000 };
    writeFileSync(join(root, 'data', 'stats.json'), JSON.stringify(snap));
    let calls = 0;
    const api: SteamApi = {
      latestSeq: async () => 1_000_000,
      bySeq: async seq => { calls++; return Array.from({ length: 100 }, (_, i) => match(seq + i)); },
      sleep: async () => {},
    };
    // в запасе пусто → ошибка, stats.json не трогаем
    await expect(steamFallback({ root })).rejects.toThrow('слишком мало');
    // 9 ночей по 10 000 матчей; хранится 7 последних
    for (let d = 1; d <= 9; d++) await steamCollect({ api, root, target: 10_000, paceMs: 0, now: new Date(`2026-11-0${d}T03:30:00Z`) });
    expect(readdirSync(join(root, 'data', 'steam')).sort()).toEqual(['2026-11-03.json', '2026-11-04.json', '2026-11-05.json', '2026-11-06.json', '2026-11-07.json', '2026-11-08.json', '2026-11-09.json']);
    const st = await steamFallback({ root, now: new Date('2026-11-10T00:00:00Z') });
    expect(st.source).toBe('steam');
    expect(st.rankSnap).toBe(1_790_000_000);
    expect(st.counts.all).toBe(70_000);
    expect(st.counts.low).toBe(300);                      // размер групп — из снимка
    expect(st.pro).toEqual(snap.pro);                     // про-сцена — из снимка
    expect(st.pub.all.solo[0]).toBe(70_000);              // герой 101 играл в каждом матче
    expect(JSON.parse(readFileSync(join(root, 'data', 'stats.json'), 'utf8')).source).toBe('steam');
    expect(JSON.parse(readFileSync(join(root, 'data', 'stats-od.json'), 'utf8')).source).toBeUndefined();
    expect(calls).toBeGreaterThan(0);
  });
});
