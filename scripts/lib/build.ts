// Сборка public/data из OpenDota. Только запросы из scripts/opendota-queries.md:
// паблики — блоками по диапазонам match_id (запрос по времени падает с таймаутом).
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { slug } from '../../src/slug.ts';
import type { Stats } from '../../src/types.ts';
import { addMatch, createAccs, positionsFromRows, quantile, type MatchRow, type PosRow } from './aggregate.ts';

export interface HeroStat { id: number; localized_name: string; primary_attr: Stats['heroes'][number][1]; roles: string[]; icon: string }
export interface Api {
  getJSON<T>(path: string): Promise<T>;
  getBinary(url: string): Promise<Uint8Array>;
  sleep(ms: number): Promise<void>;
}
export interface BuildOptions {
  api: Api;
  /** Каталог public/ */
  root: string;
  log?: (msg: string) => void;
  now?: Date;
  /** Обновить позиции (про-матчи за 180 дней). По умолчанию — если файлу больше 7 дней. */
  positions?: boolean;
  chunks?: number;
  chunkSize?: number;
  /** Отступ от последнего match_id: у свежих матчей составы ещё пустые. */
  offset?: number;
  minMatches?: number;
  historyDays?: number;
}

const POS_SQL = `WITH p AS (
  SELECT pm.hero_id, pm.match_id, (pm.player_slot < 128) rad, pm.lane_role lr, pm.gold_per_min g
  FROM player_matches pm JOIN matches m USING (match_id)
  WHERE m.start_time > extract(epoch from now() - interval '180 days') AND pm.lane_role IN (1,2,3)
), r AS (
  SELECT hero_id, lr, rank() OVER (PARTITION BY match_id, rad, lr ORDER BY g DESC) k,
         count(*) OVER (PARTITION BY match_id, rad, lr) n
  FROM p
)
SELECT hero_id, lr, k, n, count(*) c FROM r GROUP BY hero_id, lr, k, n`;

const writeAtomic = (file: string, text: string) => { writeFileSync(file + '.tmp', text); renameSync(file + '.tmp', file); };
const readJSON = <T>(file: string): T | null => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };

export async function build(o: BuildOptions): Promise<{ stats: Stats; positionsUpdated: boolean }> {
  const { api, root } = o;
  const log = o.log || (() => {});
  const now = o.now || new Date();
  const CH = o.chunks ?? 20, SIZE = o.chunkSize ?? 200_000, OFFSET = o.offset ?? 300_000, MIN = o.minMatches ?? 50_000;
  const sql = <T>(q: string) => api.getJSON<{ rows: T[] }>('/explorer?sql=' + encodeURIComponent(q));
  const dataDir = join(root, 'data'), iconDir = join(root, 'icons');
  mkdirSync(dataDir, { recursive: true }); mkdirSync(iconDir, { recursive: true });

  log('Герои…');
  const hs = (await api.getJSON<HeroStat[]>('/heroStats')).sort((a, b) => a.localized_name.localeCompare(b.localized_name));
  if (hs.length < 100) throw new Error(`heroStats: всего ${hs.length} героев`);
  const ids = hs.map(h => h.id), N = ids.length, ix = new Map(ids.map((id, i) => [id, i]));
  const heroes: Stats['heroes'] = [];
  for (const h of hs) {
    const path = `icons/${slug(h.localized_name)}.png`;
    if (!existsSync(join(root, path))) {
      try {
        const bin = await api.getBinary('https://cdn.cloudflare.steamstatic.com' + h.icon.replace(/\?$/, ''));
        writeFileSync(join(root, path), bin);
        log(`Иконка: ${h.localized_name}`);
      } catch (e) { log(`Иконка не скачалась: ${h.localized_name} (${(e as Error).message})`); }
    }
    heroes.push([h.localized_name, h.primary_attr, h.roles, path, h.id]);
  }

  // Паблики
  const latest = (await sql<{ match_id: number }>('SELECT match_id FROM public_matches ORDER BY match_id DESC LIMIT 1')).rows[0].match_id;
  const acc = createAccs(N), counts = { all: 0, low: 0, mid: 0, high: 0 };
  const times: number[] = [];
  const top = latest - OFFSET;
  let failed = 0;
  for (let c = 0; c < CH; c++) {
    const a = top - (c + 1) * SIZE, b = a + SIZE - 1;
    log(`Паблики: блок ${c + 1} из ${CH} (${a}–${b})`);
    let rows: MatchRow[] = [];
    try {
      rows = (await sql<MatchRow>(`SELECT radiant_win r, avg_rank_tier t, radiant_team a, dire_team d, start_time s FROM public_matches WHERE match_id BETWEEN ${a} AND ${b} AND lobby_type = 7 AND game_mode IN (2, 22)`)).rows || [];
    } catch (e) { failed++; log(`  блок пропущен: ${(e as Error).message}`); continue; }
    for (const r of rows) if (addMatch(acc, counts, r, ix, N)) times.push(r.s);
    await api.sleep(1000);
  }
  if (counts.all < MIN) throw new Error(`OpenDota вернул слишком мало матчей: ${counts.all} (нужно ≥ ${MIN}), пропущено блоков: ${failed}`);
  times.sort((x, y) => x - y);

  // Про-сцена
  const pro = new Array(N * N * 2).fill(0), prosolo = new Array(N * 2).fill(0);
  let proOk = 0;
  for (let i = 0; i < N; i++) {
    if (i % 20 === 0) log(`Про-сцена: ${i + 1} из ${N}`);
    try {
      const mu = await api.getJSON<{ hero_id: number; games_played: number; wins: number }[]>(`/heroes/${ids[i]}/matchups`);
      for (const m of mu) {
        const y = ix.get(m.hero_id); if (y === undefined) continue;
        const k = 2 * (i * N + y); pro[k] = m.games_played; pro[k + 1] = m.wins;
        prosolo[2 * i] += m.games_played; prosolo[2 * i + 1] += m.wins;
      }
      proOk++;
    } catch (e) { log(`  матчапы ${hs[i].localized_name}: ${(e as Error).message}`); }
    await api.sleep(1100);
  }
  if (proOk < N * 0.8) throw new Error(`Про-сцена: загружено ${proOk} из ${N} героев`);

  // Период: отсекаем 0,5% самых старых и новых матчей — единичные «запоздалые» id искажают даты.
  const stats: Stats = {
    heroes, n: N, counts, pub: acc, pro: { vs: pro, solo: prosolo },
    from: quantile(times, 0.005), to: quantile(times, 0.995), updated: Math.floor(now.getTime() / 1000),
  };

  // Позиции — раз в неделю (тяжёлый запрос); при сбое остаются старые.
  const posFile = join(dataDir, 'positions.json');
  const posOld = existsSync(posFile) ? statSync(posFile).mtimeMs : 0;
  let positionsUpdated = false;
  if (o.positions ?? (now.getTime() - posOld > 7 * 864e5)) {
    log('Позиции (про-матчи за 180 дней)…');
    try {
      const rows = (await sql<PosRow>(POS_SQL)).rows || [];
      const pos = positionsFromRows(rows, new Map(hs.map(h => [h.id, h.localized_name])));
      if (Object.keys(pos).length >= 100) { writeAtomic(posFile, JSON.stringify(pos)); positionsUpdated = true; }
      else log(`  позиции: мало героев (${Object.keys(pos).length}), оставляю старые`);
    } catch (e) { log(`  позиции не обновлены: ${(e as Error).message}`); }
  }

  // Снимок для трендов (раздел 6.5): только solo по группам.
  const date = now.toISOString().slice(0, 10);
  const histDir = join(dataDir, 'history');
  mkdirSync(histDir, { recursive: true });
  writeAtomic(join(histDir, `${date}.json`), JSON.stringify({
    date, heroes: heroes.map(h => h[0]), counts,
    solo: { all: acc.all.solo, low: acc.low.solo, mid: acc.mid.solo, high: acc.high.solo, pro: prosolo },
  }));
  const keepFrom = new Date(now.getTime() - (o.historyDays ?? 60) * 864e5).toISOString().slice(0, 10);
  const files = readdirSync(histDir).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  for (const f of files) if (f.slice(0, 10) < keepFrom) unlinkSync(join(histDir, f));
  writeAtomic(join(histDir, 'index.json'), JSON.stringify(readdirSync(histDir).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().map(f => f.slice(0, 10))));

  writeAtomic(join(dataDir, 'stats.json'), JSON.stringify(stats));
  log(`Готово: ${counts.all} матчей, ${N} героев`);
  return { stats, positionsUpdated };
}

/** Боевой клиент OpenDota: лимит ~60 запросов в минуту, на 429 ждём и повторяем. */
export function openDotaApi(base = 'https://api.opendota.com/api', key = process.env.OPENDOTA_API_KEY): Api {
  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
  const withKey = (u: string) => (key ? u + (u.includes('?') ? '&' : '?') + 'api_key=' + encodeURIComponent(key) : u);
  async function req(url: string, tries = 4): Promise<Response> {
    for (let i = 0; ; i++) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(120_000), headers: { 'user-agent': 'kontrpik-data-builder' } });
        if (r.status === 429 && i < tries - 1) { await sleep(5000 * (i + 1)); continue; }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r;
      } catch (e) { if (i >= tries - 1) throw e; await sleep(2000 * (i + 1)); }
    }
  }
  return {
    getJSON: async <T>(p: string) => (await req(withKey(base + p))).json() as Promise<T>,
    getBinary: async (url: string) => new Uint8Array(await (await req(url)).arrayBuffer()),
    sleep,
  };
}
