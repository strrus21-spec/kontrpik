// Запасной источник статистики пабликов — Steam Web API (IDOTA2Match_570).
// Steam не отдаёт ранг матча, поэтому так считается только «все ранги»; группы рангов
// получаются из последнего снимка OpenDota поправками (rankAdjust), см. docs/STATUS.md.
import { addMatch, createAccs, type Accs, type MatchRow } from './aggregate.ts';
import type { PubKey, Stats } from '../../src/types.ts';

export interface SteamPlayer { player_slot: number; team_number?: number; hero_id: number; leaver_status?: number }
export interface SteamMatch { match_id: number; match_seq_num: number; radiant_win: boolean; lobby_type: number; game_mode: number; human_players: number; duration: number; start_time: number; players: SteamPlayer[] }
export interface SteamApi { latestSeq(): Promise<number>; bySeq(seq: number): Promise<SteamMatch[]>; sleep(ms: number): Promise<void> }

/** Рейтинговый матч All Pick / Captains Mode, 10 игроков, без ливеров, дольше 10 минут → строка для addMatch. */
export function steamRow(m: SteamMatch): MatchRow | null {
  if (m.lobby_type !== 7 || ![2, 22].includes(m.game_mode) || m.human_players !== 10 || m.duration < 600) return null;
  if (m.players.length !== 10 || m.players.some(p => (p.leaver_status ?? 0) > 1)) return null;
  const rad = (p: SteamPlayer) => (p.team_number !== undefined ? p.team_number === 0 : p.player_slot < 128);
  return { r: m.radiant_win, t: null, a: m.players.filter(rad).map(p => p.hero_id), d: m.players.filter(p => !rad(p)).map(p => p.hero_id), s: m.start_time };
}

/**
 * Собрать «все ранги» из последних матчей Steam. Steam ограничивает частоту запросов, поэтому
 * один поток с паузой; при отказе — ждём всё дольше (до минуты) и продолжаем с того же места.
 */
export async function steamPubs(api: SteamApi, ix: Map<number, number>, n: number, o: { target?: number; span?: number; paceMs?: number; budgetMs?: number; log?: (m: string) => void } = {}) {
  const target = o.target ?? 120_000, span = o.span ?? 260_000, pace = o.paceMs ?? 1000, budget = o.budgetMs ?? 32 * 60_000, log = o.log ?? (() => {});
  const latest = await api.latestSeq(), t0 = Date.now();
  const acc = createAccs(n), counts: Record<PubKey, number> = { all: 0, low: 0, mid: 0, high: 0 };
  const times: number[] = [];
  let seq = latest - span, reqs = 0, fails = 0, streak = 0;
  while (seq < latest && counts.all < target && Date.now() - t0 < budget) {
    let ms: SteamMatch[];
    try { ms = await api.bySeq(seq); reqs++; streak = 0; }
    catch (e) {
      fails++; streak++;
      if (fails <= 5 || fails % 20 === 0) log(`  Steam: отказ (${(e as Error).message}), пауза`);
      if (streak > 30) break;
      await api.sleep(Math.min(60_000, 5000 * streak)); continue;
    }
    if (!ms.length) break;
    for (const m of ms) { const r = steamRow(m); if (r && addMatch(acc, counts, r, ix, n)) times.push(r.s); }
    seq = ms[ms.length - 1].match_seq_num + 1;
    if (reqs % 200 === 0) log(`  Steam: ${reqs} запросов, ${counts.all} матчей`);
    await api.sleep(pace);
  }
  log(`Steam: ${counts.all} матчей за ${reqs} запросов (отказов ${fails}), ${((Date.now() - t0) / 60000).toFixed(1)} мин`);
  return { all: acc.all, count: counts.all, times };
}

/**
 * Группы рангов по снимку: для каждой ячейки (игры, победы) берём размер выборки из снимка группы,
 * а винрейт = свежий общий + (винрейт группы в снимке − общий винрейт в снимке).
 */
export function rankAdjust(fresh: number[], snapAll: number[], snapB: number[]): number[] {
  const out = snapB.slice();
  for (let k = 0; k + 1 < out.length; k += 2) {
    const g = snapB[k], gf = fresh[k], ga = snapAll[k];
    if (!g || !gf || !ga) continue;
    const wr = fresh[k + 1] / gf + (snapB[k + 1] / g - snapAll[k + 1] / ga);
    out[k + 1] = Math.round(g * Math.min(1, Math.max(0, wr)));
  }
  return out;
}

/** Статистика из Steam + снимка OpenDota (snap): общие — свежие, группы — с поправками, про-сцена — из снимка. */
export function steamStats(snap: Stats, fresh: Accs['all'], count: number, times: number[], now: Date): Stats {
  const q = (p: number) => times.length ? times.slice().sort((a, b) => a - b)[Math.min(times.length - 1, Math.floor(p * times.length))] : snap.to;
  const pub = { all: fresh } as Stats['pub'];
  for (const b of ['low', 'mid', 'high'] as const) {
    const S = snap.pub[b], A = snap.pub.all;
    pub[b] = { vs: rankAdjust(fresh.vs, A.vs, S.vs), with: rankAdjust(fresh.with, A.with, S.with), solo: rankAdjust(fresh.solo, A.solo, S.solo) };
  }
  return {
    heroes: snap.heroes, n: snap.n, counts: { ...snap.counts, all: count }, pub, pro: snap.pro,
    from: q(0.005), to: q(0.995), updated: Math.floor(now.getTime() / 1000),
    source: 'steam', rankSnap: snap.updated,
  };
}

/** Боевой клиент Steam Web API. */
export function steamWebApi(key: string): SteamApi {
  const B = 'https://api.steampowered.com/IDOTA2Match_570';
  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
  async function get<T>(p: string, tries = 2): Promise<T> {
    for (let i = 0; ; i++) {
      try {
        const r = await fetch(`${B}${p}&key=${key}`, { signal: AbortSignal.timeout(60_000) });
        if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { status: r.status });
        return await r.json() as T;
      } catch (e) { if (i >= tries - 1 || (e as { status?: number }).status === 429) throw e; await sleep(2000); }
    }
  }
  return {
    latestSeq: async () => (await get<{ result: { matches: { match_seq_num: number }[] } }>('/GetMatchHistory/v1/?matches_requested=1')).result.matches[0].match_seq_num,
    bySeq: async seq => (await get<{ result: { matches?: SteamMatch[] } }>(`/GetMatchHistoryBySequenceNum/v1/?start_at_match_seq_num=${seq}&matches_requested=100`)).result.matches || [],
    sleep,
  };
}

/**
 * Запасная сборка: OpenDota недоступен → паблики из Steam, группы рангов и про-сцена — из снимка.
 * Снимок — data/stats-od.json (последняя удачная сборка OpenDota), иначе data/stats.json, если он из OpenDota.
 */
export async function steamFallback(o: { api: SteamApi; root: string; now?: Date; log?: (m: string) => void; target?: number; budgetMs?: number }) {
  const { readFileSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { writeAtomic } = await import('./build.ts');
  const log = o.log ?? (() => {}), dataDir = join(o.root, 'data');
  const read = (f: string) => existsSync(join(dataDir, f)) ? JSON.parse(readFileSync(join(dataDir, f), 'utf8')) as Stats : null;
  const cur = read('stats.json');
  const snap = read('stats-od.json') ?? (cur && cur.source !== 'steam' ? cur : null);
  if (!snap) throw new Error('нет снимка OpenDota для групп рангов');
  const ix = new Map(snap.heroes.map((h, i) => [h[4]!, i] as [number, number]).filter(([id]) => id));
  if (ix.size < snap.n * 0.9) throw new Error('в снимке нет id героев');
  const r = await steamPubs(o.api, ix, snap.n, { log, target: o.target, budgetMs: o.budgetMs });
  if (r.count < 30_000) throw new Error(`Steam: слишком мало матчей (${r.count})`);
  const stats = steamStats(snap, r.all, r.count, r.times, o.now ?? new Date());
  if (!read('stats-od.json')) writeAtomic(join(dataDir, 'stats-od.json'), JSON.stringify(snap));
  writeAtomic(join(dataDir, 'stats.json'), JSON.stringify(stats));
  log(`Готово (Steam): ${r.count} матчей; группы рангов по снимку от ${new Date(snap.updated * 1000).toISOString().slice(0, 10)}`);
  return stats;
}
