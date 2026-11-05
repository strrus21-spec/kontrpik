import { describe, expect, it } from 'vitest';
import { analyzeMatch, isCore, loadParsed, parseMatchId, type Match, type MPlayer } from '../src/match.ts';

const pl = (slot: number, o: Partial<MPlayer> = {}): MPlayer => ({ player_slot: slot, hero_id: slot + 1, kills: 2, deaths: 3, assists: 4, net_worth: 10000, ...o });
function match(me: Partial<MPlayer>, extra: Partial<Match> = {}): Match {
  const players = [pl(0, { account_id: 42, ...me }), pl(1, { net_worth: 9000 }), pl(2, { net_worth: 8000 }), pl(3, { net_worth: 3000 }), pl(4, { net_worth: 2000 }),
    ...[128, 129, 130, 131, 132].map(s => pl(s))];
  return { match_id: 1, version: 21, duration: 40 * 60, radiant_win: true, start_time: 0, players, ...extra };
}

describe('номер матча', () => {
  it('число и ссылки', () => {
    expect(parseMatchId('8012345678')).toBe(8012345678);
    expect(parseMatchId('https://www.dotabuff.com/matches/8012345678')).toBe(8012345678);
    expect(parseMatchId('https://www.opendota.com/matches/8012345678/overview')).toBe(8012345678);
    expect(parseMatchId('stratz.com/matches/8012345678')).toBe(8012345678);
    expect(parseMatchId('abc')).toBeNull();
  });
});

describe('выводы', () => {
  it('керри: добивание, смерти до 10:00 и вне драк, предмет, фарм, участие, золото', () => {
    const m = match({ net_worth: 20000, kills: 5, deaths: 9, assists: 3, lh_t: [0, 3, 6, 9, 12, 15, 18, 21, 24, 26, 28],
      purchase_log: [{ time: 300, key: 'tango' }, { time: 1750, key: 'black_king_bar' }],
      benchmarks: { gold_per_min: { raw: 420.4, pct: 0.3 }, last_hits_per_min: { raw: 5, pct: 0.25 } },
      gold_reasons: { '1': -3100 } }, {
      teamfights: [{ players: Array.from({ length: 10 }, (_, i) => ({ deaths: i === 0 ? 2 : 0 })) }],
    });
    m.players[5].kills_log = [{ time: 200, key: 'npc_dota_hero_pudge' }, { time: 900, key: 'npc_dota_hero_pudge' }];
    m.players[6].kills_log = [{ time: 400, key: 'npc_dota_hero_pudge' }, { time: 300, key: 'npc_dota_hero_axe' }];
    const ins = analyzeMatch(m, m.players[0], 'npc_dota_hero_pudge');
    expect(ins.length).toBeGreaterThanOrEqual(3); expect(ins.length).toBeLessThanOrEqual(6);
    const by = (k: string) => ins.find(i => i.kind === k)!;
    expect(by('lh10').v).toEqual({ lh: 28, pct: 25 }); expect(by('lh10').tone).toBe('bad');
    expect(by('deaths').v).toEqual({ deaths: 9, early: 2, alone: 7 }); expect(by('deaths').tone).toBe('bad');
    expect(by('item').v).toEqual({ item: 'Black King Bar', time: '29:10' });
    expect(by('farm').v).toEqual({ gpm: 420, pct: 30 });
    expect(by('kp').v.kp).toBe(Math.round(8 / (5 + 2 * 4) * 100));
    expect(by('goldLost').v).toEqual({ gold: 3100, deaths: 9 });
    expect(ins.find(i => i.kind === 'wards')).toBeUndefined();
    expect(ins[0].tone).toBe('bad');
  });
  it('саппорт: варды вместо фарма, без lh', () => {
    const m = match({ net_worth: 1000, obs_placed: 3, sen_placed: 5, observer_kills: 2, lh_t: Array(20).fill(5) });
    const p = m.players[0];
    expect(isCore(m, p)).toBe(false);
    const ins = analyzeMatch(m, p);
    expect(ins.map(i => i.kind)).toContain('wards');
    expect(ins.find(i => i.kind === 'wards')!.tone).toBe('bad');   // 3 обса за 40 минут
    expect(ins.find(i => i.kind === 'lh10')).toBeUndefined();
  });
  it('неразобранный матч без логов: выводы только из того, что есть', () => {
    const m = match({ net_worth: 20000, deaths: 0 });
    const ins = analyzeMatch(m, m.players[0]);
    expect(ins.map(i => i.kind).sort()).toEqual(['deaths', 'kp']);
  });
});

describe('ожидание разбора', () => {
  const res = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
  it('ставит в очередь, опрашивает задачу, затем отдаёт разобранный матч', async () => {
    let parsed = false, polls = 0;
    const calls: string[] = [];
    const f = (async (u: string, init?: RequestInit) => {
      calls.push((init?.method || 'GET') + ' ' + u.replace('https://api.opendota.com/api', ''));
      if (u.endsWith('/request/77') && init?.method === 'POST') return res({ job: { jobId: 5 } });
      if (u.endsWith('/request/5')) { polls++; if (polls >= 2) parsed = true; return res(polls >= 2 ? null : { jobId: 5 }); }
      return res(match({}, { match_id: 77, version: parsed ? 21 : null }));
    }) as typeof fetch;
    const progress: number[] = [];
    const r = await loadParsed(77, { fetchFn: f, sleep: async () => {}, onProgress: s => progress.push(s) });
    expect(r.ok).toBe(true);
    expect(calls).toEqual(['GET /matches/77', 'POST /request/77', 'GET /request/5', 'GET /request/5', 'GET /matches/77']);
    expect(progress).toEqual([5, 10]);
  });
  it('таймаут и несуществующий матч', async () => {
    const never = (async (u: string, init?: RequestInit) => init?.method === 'POST' ? res({ job: { jobId: 1 } }) : u.includes('/request/') ? res({ jobId: 1 }) : res(match({}, { version: null }))) as typeof fetch;
    expect(await loadParsed(1, { fetchFn: never, sleep: async () => {}, timeoutSec: 30 })).toEqual({ ok: false, reason: 'timeout' });
    const none = (async () => res({ error: 'Not Found' }, 404)) as typeof fetch;
    expect(await loadParsed(1, { fetchFn: none })).toEqual({ ok: false, reason: 'notFound' });
  });
});

describe('роль по линии', () => {
  it('офлейнер беднее саппортов — всё равно ядро; саппорт на линии с керри — нет', () => {
    const m = match({ net_worth: 4000, gold_per_min: 300, lane_role: 3 });
    const [off, a, b, c, d] = m.players;
    Object.assign(a, { lane_role: 1, gold_per_min: 600, net_worth: 15000 });
    Object.assign(b, { lane_role: 1, gold_per_min: 320, net_worth: 6000 });   // саппорт с керри
    Object.assign(c, { lane_role: 2, gold_per_min: 550, net_worth: 12000 });
    Object.assign(d, { lane_role: 3, gold_per_min: 280, net_worth: 5000 });    // саппорт с офлейнером
    expect(isCore(m, off)).toBe(true);
    expect(isCore(m, b)).toBe(false);
    expect(isCore(m, d)).toBe(false);
    expect(isCore(m, a)).toBe(true);
  });
});
