import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addMatch, createAccs, positionsFromRows, posIndex } from '../scripts/lib/aggregate.ts';
import { build, type Api, type HeroStat } from '../scripts/lib/build.ts';
import { rankPicks } from '../src/scoring.ts';
import { heroesFrom } from '../src/data.ts';

describe('агрегация матчей', () => {
  it('один матч: solo, vs, with и группы рангов', () => {
    const n = 10, ix = new Map(Array.from({ length: n }, (_, i) => [100 + i, i]));
    const acc = createAccs(n), counts = { all: 0, low: 0, mid: 0, high: 0 };
    const ok = addMatch(acc, counts, { r: true, t: 45, a: [100, 101, 102, 103, 104], d: [105, 106, 107, 108, 109], s: 1 }, ix, n);
    expect(ok).toBe(true);
    expect(counts).toEqual({ all: 1, low: 0, mid: 1, high: 0 });
    const M = acc.all;
    expect([M.solo[0], M.solo[1]]).toEqual([1, 1]);         // герой 0 выиграл
    expect([M.solo[10], M.solo[11]]).toEqual([1, 0]);       // герой 5 проиграл
    expect([M.vs[2 * (0 * n + 5)], M.vs[2 * (0 * n + 5) + 1]]).toEqual([1, 1]);
    expect([M.vs[2 * (5 * n + 0)], M.vs[2 * (5 * n + 0) + 1]]).toEqual([1, 0]);
    expect([M.with[2 * (0 * n + 1)], M.with[2 * (0 * n + 1) + 1]]).toEqual([1, 1]);
    expect(M.with[2 * (0 * n + 0)]).toBe(0);                // сам с собой не считается
    expect(acc.low.solo[0]).toBe(0);
  });
  it('неполные составы и неизвестные герои пропускаются', () => {
    const ix = new Map([[1, 0]]), acc = createAccs(1), counts = { all: 0, low: 0, mid: 0, high: 0 };
    expect(addMatch(acc, counts, { r: true, t: 0, a: [1], d: null, s: 1 }, ix, 1)).toBe(false);
    expect(addMatch(acc, counts, { r: true, t: 0, a: [1, 1, 1, 1, 9], d: [1, 1, 1, 1, 1], s: 1 }, ix, 1)).toBe(false);
    expect(counts.all).toBe(0);
  });
  it('позиции: линия + место по золоту', () => {
    expect([posIndex(1, 1), posIndex(1, 2), posIndex(2, 1), posIndex(2, 2), posIndex(3, 1), posIndex(3, 2)]).toEqual([0, 4, 1, 3, 2, 3]);
    const p = positionsFromRows([{ hero_id: 2, lr: 3, k: 1, n: 2, c: 10 }, { hero_id: 2, lr: 1, k: 2, n: 2, c: 3 }, { hero_id: 2, lr: 3, k: 2, n: 2, c: 1 }], new Map([[2, 'Axe']]));
    expect(p).toEqual({ Axe: [0, 0, 10, 1, 3] });
  });
});

// Поддельный OpenDota: 110 героев, случайные паблики, матчапы.
function fakeApi(opts: { fail?: boolean } = {}): Api & { calls: string[] } {
  const N = 110;
  const heroes: HeroStat[] = Array.from({ length: N }, (_, i) => ({ id: i + 1, localized_name: `Hero ${String(i).padStart(3, '0')}`, primary_attr: 'str', roles: ['Carry'], icon: `/i/${i}.png?` }));
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const calls: string[] = [];
  return {
    calls,
    async getJSON<T>(p: string): Promise<T> {
      calls.push(p);
      if (p === '/heroStats') return heroes as T;
      if (p.startsWith('/explorer')) {
        const q = decodeURIComponent(p.split('sql=')[1]);
        if (q.includes('ORDER BY match_id DESC')) return { rows: [{ match_id: 9_000_000 }] } as T;
        if (q.includes('player_matches')) return { rows: heroes.flatMap(h => [{ hero_id: h.id, lr: 1, k: 1, n: 2, c: 50 }]) } as T;
        if (opts.fail) throw new Error('timeout');
        const rows = Array.from({ length: 200 }, () => {
          const pick = new Set<number>(); while (pick.size < 10) pick.add(1 + Math.floor(rnd() * N));
          const a = [...pick];
          return { r: rnd() < 0.5, t: Math.floor(rnd() * 80), a: a.slice(0, 5), d: a.slice(5), s: 1_793_300_000 + Math.floor(rnd() * 200_000) };
        });
        // поздний «выброс» по времени не должен попасть в период
        rows.push({ r: true, t: 10, a: [1, 2, 3, 4, 5], d: [6, 7, 8, 9, 10], s: 1_700_000_000 });
        return { rows } as T;
      }
      const m = p.match(/^\/heroes\/(\d+)\/matchups$/);
      if (m) return heroes.filter(h => h.id !== +m[1]).map(h => ({ hero_id: h.id, games_played: 40, wins: 20 })) as T;
      throw new Error('unexpected ' + p);
    },
    async getBinary() { return new Uint8Array([137, 80, 78, 71]); },
    async sleep() {},
  };
}

describe('build-data', () => {
  it('собирает stats.json, иконки, снимок истории и позиции', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kp-'));
    const api = fakeApi();
    const now = new Date('2026-11-05T03:00:00Z');
    const { stats, positionsUpdated } = await build({ api, root, now, chunks: 3, minMatches: 100, items: false });
    expect(stats.n).toBe(110);
    expect(stats.counts.all).toBe(603);
    expect(stats.counts.low + stats.counts.mid + stats.counts.high).toBe(603);
    expect(stats.from).toBeGreaterThan(1_793_000_000);
    expect(stats.heroes[0]).toEqual(['Hero 000', 'str', ['Carry'], 'icons/hero-000.png', 1]);
    expect(existsSync(join(root, 'icons/hero-109.png'))).toBe(true);
    expect(positionsUpdated).toBe(true);
    const saved = JSON.parse(readFileSync(join(root, 'data/stats.json'), 'utf8'));
    expect(saved.counts).toEqual(stats.counts);
    const hist = JSON.parse(readFileSync(join(root, 'data/history/2026-11-05.json'), 'utf8'));
    expect(hist.solo.all).toHaveLength(220);
    expect(JSON.parse(readFileSync(join(root, 'data/history/index.json'), 'utf8'))).toEqual(['2026-11-05']);
    // только диапазоны match_id, без запросов по времени к public_matches
    const qs = api.calls.filter(c => c.startsWith('/explorer')).map(c => decodeURIComponent(c));
    expect(qs.filter(q => q.includes('public_matches') && q.includes('start_time >'))).toHaveLength(0);
    expect(qs.filter(q => q.includes('BETWEEN'))).toHaveLength(3);
    // результат совместим с алгоритмом счёта
    const rows = rankPicks({ T: saved.pub.all, n: saved.n, heroes: heroesFrom(saved), positions: {}, draft: { enemy: [0, 1], ally: [2], ban: [] } });
    expect(rows.length).toBeGreaterThan(50);
  });

  it('при сбое OpenDota ничего не перезаписывает', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kp-'));
    mkdirSync(join(root, 'data'), { recursive: true });
    writeFileSync(join(root, 'data/stats.json'), '{"old":true}');
    await expect(build({ api: fakeApi({ fail: true }), root, chunks: 3, minMatches: 100, items: false })).rejects.toThrow(/слишком мало матчей/);
    expect(readFileSync(join(root, 'data/stats.json'), 'utf8')).toBe('{"old":true}');
    expect(existsSync(join(root, 'data/history'))).toBe(false);
  });

  it('позиции не трогает, если файл уже есть (обновление — по флагу); старые снимки удаляет', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kp-'));
    mkdirSync(join(root, 'data/history'), { recursive: true });
    writeFileSync(join(root, 'data/positions.json'), '{"keep":1}');
    writeFileSync(join(root, 'data/history/2026-01-01.json'), '{}');
    writeFileSync(join(root, 'data/history/2026-11-01.json'), '{}');
    const now = new Date('2026-11-05T03:00:00Z');
    utimesSync(join(root, 'data/positions.json'), now, new Date(now.getTime() - 864e5));
    const { positionsUpdated } = await build({ api: fakeApi(), root, now, chunks: 3, minMatches: 100, items: false });
    expect(positionsUpdated).toBe(false);
    expect(readFileSync(join(root, 'data/positions.json'), 'utf8')).toBe('{"keep":1}');
    expect(JSON.parse(readFileSync(join(root, 'data/history/index.json'), 'utf8'))).toEqual(['2026-11-01', '2026-11-05']);
  });
});
