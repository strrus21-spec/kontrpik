// Разбор матча (6.6): загрузка, ожидание разбора OpenDota и выводы только из данных матча.
const API = 'https://api.opendota.com/api';

/** Номер матча из числа или ссылки Dotabuff/OpenDota/Stratz. */
export function parseMatchId(input: string): number | null {
  const s = input.trim();
  const m = s.match(/(?:matches?\/)(\d{6,12})/i) || s.match(/^(\d{6,12})$/);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isSafeInteger(v) ? v : null;
}

export interface Bench { raw: number; pct: number }
export interface MPlayer {
  account_id?: number | null; player_slot: number; hero_id: number; isRadiant?: boolean;
  kills: number; deaths: number; assists: number; last_hits?: number; gold_per_min?: number; net_worth?: number;
  lh_t?: number[] | null; purchase_log?: { time: number; key: string }[] | null; kills_log?: { time: number; key: string }[] | null;
  obs_placed?: number | null; sen_placed?: number | null; observer_kills?: number | null;
  gold_reasons?: Record<string, number> | null; lane_role?: number | null;
  benchmarks?: Record<string, Bench> | null; personaname?: string | null;
  // расширенный разбор (есть в разобранных матчах)
  xp_per_min?: number; denies?: number; hero_damage?: number; tower_damage?: number; hero_healing?: number; level?: number;
  item_0?: number; item_1?: number; item_2?: number; item_3?: number; item_4?: number; item_5?: number; item_neutral?: number;
  gold_t?: number[] | null; xp_t?: number[] | null; dn_t?: number[] | null; networth_t?: number[] | null;
  lane?: number | null; position_est?: number | null; lane_efficiency_pct?: number | null; is_roaming?: boolean | null;
  deaths_log?: { time: number; key: string; gold_lost?: number; gold_fed?: number; time_dead?: number }[] | null;
  buyback_log?: { time: number }[] | null;
  obs_log?: { time: number; x: number; y: number }[] | null; sen_log?: { time: number; x: number; y: number }[] | null;
  lane_pos?: Record<string, Record<string, number>> | null;
  damage_targets?: Record<string, Record<string, number>> | null; damage_taken?: Record<string, number> | null;
  stuns?: number | null; teamfight_participation?: number | null; camps_stacked?: number | null;
}
export interface Match {
  match_id: number; version?: number | null; duration: number; radiant_win: boolean; start_time: number;
  radiant_score?: number; dire_score?: number; players: MPlayer[];
  teamfights?: Teamfight[] | null;
  radiant_gold_adv?: number[] | null; radiant_xp_adv?: number[] | null;
  objectives?: { time: number; type: string; key?: string; team?: number; slot?: number; player_slot?: number }[] | null;
  picks_bans?: { is_pick: boolean; hero_id: number; team: number; order: number }[] | null;
  first_blood_time?: number;
}
export interface TfPlayer { deaths: number; damage?: number; healing?: number; gold_delta?: number; xp_delta?: number; buybacks?: number; killed?: Record<string, number>; item_uses?: Record<string, number>; ability_uses?: Record<string, number>; deaths_pos?: Record<string, Record<string, number>> }
export interface Teamfight { start: number; end: number; deaths: number; players: TfPlayer[] }

export const isRadiant = (p: MPlayer) => p.isRadiant ?? p.player_slot < 128;
export const isParsed = (m: Match) => m.version !== null && m.version !== undefined;

/**
 * Ядро (pos 1–3) или саппорт (pos 4–5). Как в positions.json: по линии и золоту внутри линии —
 * самый богатый на своей линии (безопасной, центральной или сложной) — ядро. Если линий нет
 * (неразобранный матч), запасной вариант — трое самых богатых в команде.
 */
export function isCore(m: Match, p: MPlayer): boolean {
  const team = m.players.filter(x => isRadiant(x) === isRadiant(p));
  const gold = (x: MPlayer) => x.gold_per_min ?? x.net_worth ?? 0;
  if (team.every(x => typeof x.lane_role === 'number')) {
    if (![1, 2, 3].includes(p.lane_role!)) return false;
    const lane = team.filter(x => x.lane_role === p.lane_role).sort((a, b) => gold(b) - gold(a));
    return lane[0] === p;
  }
  const byNw = [...team].sort((a, b) => (b.net_worth ?? 0) - (a.net_worth ?? 0));
  return byNw.indexOf(p) < 3;
}

/** Ключевые предметы: внутреннее имя → название. Первый купленный из них — «ключевой предмет». */
export const KEY_ITEMS: Record<string, string> = {
  black_king_bar: 'Black King Bar', blink: 'Blink Dagger', manta: 'Manta Style', bfury: 'Battle Fury', radiance: 'Radiance',
  desolator: 'Desolator', maelstrom: 'Maelstrom', mjollnir: 'Mjollnir', skadi: 'Eye of Skadi', butterfly: 'Butterfly',
  satanic: 'Satanic', ultimate_scepter: "Aghanim's Scepter", sange_and_yasha: 'Sange and Yasha', kaya_and_sange: 'Kaya and Sange',
  yasha_and_kaya: 'Yasha and Kaya', echo_sabre: 'Echo Sabre', hand_of_midas: 'Hand of Midas', silver_edge: 'Silver Edge',
  invis_sword: 'Shadow Blade', monkey_king_bar: 'Monkey King Bar', assault: 'Assault Cuirass', heart: 'Heart of Tarrasque',
  orchid: 'Orchid Malevolence', bloodthorn: 'Bloodthorn', diffusal_blade: 'Diffusal Blade', basher: 'Skull Basher',
  harpoon: 'Harpoon', blade_mail: 'Blade Mail', force_staff: 'Force Staff', glimmer_cape: 'Glimmer Cape', aether_lens: 'Aether Lens',
  pipe: 'Pipe of Insight', crimson_guard: 'Crimson Guard', lotus_orb: 'Lotus Orb', spirit_vessel: 'Spirit Vessel', cyclone: "Eul's Scepter",
  vladmir: "Vladmir's Offering", mekansm: 'Mekansm', guardian_greaves: 'Guardian Greaves', ghost: 'Ghost Scepter', solar_crest: 'Solar Crest',
};

export type InsightKind = 'lh10' | 'deaths' | 'item' | 'farm' | 'kp' | 'goldLost' | 'wards';
export interface Insight { kind: InsightKind; tone: 'good' | 'bad' | 'info'; v: Record<string, number | string> }

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.max(0, Math.floor(sec % 60))).padStart(2, '0')}`;

/**
 * Выводы для игрока. heroNpc — внутреннее имя его героя (для поиска смертей в kills_log соперников).
 * Возвращает 3–6 пунктов, только по полям, которые есть в матче.
 */
export function analyzeMatch(m: Match, p: MPlayer, heroNpc?: string): Insight[] {
  const out: Insight[] = [];
  const core = isCore(m, p), mins = m.duration / 60;
  const team = m.players.filter(x => isRadiant(x) === isRadiant(p));
  const enemies = m.players.filter(x => isRadiant(x) !== isRadiant(p));

  // 1. Добивание к 10-й минуте (для ядра)
  if (core && p.lh_t && p.lh_t.length > 10) {
    const lh = p.lh_t[10], pct = p.benchmarks?.last_hits_per_min?.pct;
    out.push({ kind: 'lh10', tone: lh >= 45 ? 'good' : lh < 30 ? 'bad' : 'info', v: { lh, ...(pct !== undefined ? { pct: Math.round(pct * 100) } : {}) } });
  }

  // 2. Смерти: сколько, сколько до 10:00, сколько вне командных драк
  if (p.deaths > 0) {
    let early = -1;
    if (heroNpc && enemies.some(e => e.kills_log)) early = enemies.flatMap(e => e.kills_log || []).filter(k => k.key === heroNpc && k.time < 600).length;
    const idx = m.players.indexOf(p);
    let inFights = -1;
    if (m.teamfights && idx >= 0) inFights = m.teamfights.reduce((s, tf) => s + (tf.players[idx]?.deaths || 0), 0);
    const alone = inFights >= 0 ? Math.max(0, p.deaths - inFights) : -1;
    const bad = p.deaths >= Math.max(6, mins / 5) || alone >= 4;
    out.push({ kind: 'deaths', tone: bad ? 'bad' : p.deaths <= 3 ? 'good' : 'info', v: { deaths: p.deaths, early, alone } });
  } else {
    out.push({ kind: 'deaths', tone: 'good', v: { deaths: 0, early: -1, alone: -1 } });
  }

  // 3. Ключевой предмет и время
  const first = (p.purchase_log || []).find(x => KEY_ITEMS[x.key]);
  if (first && core) out.push({ kind: 'item', tone: first.time <= 20 * 60 ? 'good' : first.time > 28 * 60 ? 'bad' : 'info', v: { item: KEY_ITEMS[first.key], time: mmss(first.time) } });

  // 4. Фарм: GPM и процентиль по герою
  const g = p.benchmarks?.gold_per_min;
  if (core && g) out.push({ kind: 'farm', tone: g.pct >= 0.6 ? 'good' : g.pct < 0.35 ? 'bad' : 'info', v: { gpm: Math.round(g.raw), pct: Math.round(g.pct * 100) } });

  // 5. Участие в убийствах
  const teamKills = team.reduce((s, x) => s + x.kills, 0);
  if (teamKills >= 5) {
    const kp = Math.round((p.kills + p.assists) / teamKills * 100);
    out.push({ kind: 'kp', tone: kp >= 60 ? 'good' : kp < 40 ? 'bad' : 'info', v: { kp, ka: p.kills + p.assists, teamKills } });
  }

  // 6. Золото, потерянное на смертях (gold_reasons["1"] — отрицательное)
  const lost = p.gold_reasons?.['1'];
  if (typeof lost === 'number' && lost < 0 && p.deaths > 0) out.push({ kind: 'goldLost', tone: -lost >= 2000 ? 'bad' : 'info', v: { gold: -lost, deaths: p.deaths } });

  // 7. Варды для саппортов
  if (!core && typeof p.obs_placed === 'number') {
    const perTen = p.obs_placed / mins * 10;
    out.push({ kind: 'wards', tone: perTen >= 2 ? 'good' : perTen < 1 ? 'bad' : 'info', v: { obs: p.obs_placed, sen: p.sen_placed ?? 0, dewards: p.observer_kills ?? 0, mins: Math.round(mins) } });
  }

  // Сначала проблемы, потом нейтральное, потом хорошее; не больше 6.
  const rank = { bad: 0, info: 1, good: 2 };
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]).slice(0, 6);
}

export type LoadState = { kind: 'ready'; match: Match } | { kind: 'parsing'; jobId: number | null } | { kind: 'error'; reason: 'notFound' | 'network' | 'timeout' };

export async function getMatch(id: number, fetchFn: typeof fetch = fetch): Promise<Match | 'notFound' | 'network'> {
  try {
    const r = await fetchFn(`${API}/matches/${id}`);
    if (r.status === 404) return 'notFound';
    if (!r.ok) return 'network';
    const m = await r.json() as Match;
    return m && Array.isArray(m.players) && m.players.length ? m : 'notFound';
  } catch { return 'network'; }
}

/**
 * Загрузить разобранный матч. Если не разобран — поставить в очередь (POST /request/{id})
 * и ждать: опрос GET /request/{jobId}, пока задача не исчезнет, затем снова матч.
 */
export async function loadParsed(id: number, opts: { fetchFn?: typeof fetch; onProgress?: (elapsedSec: number) => void; sleep?: (ms: number) => Promise<void>; timeoutSec?: number; pollSec?: number } = {}): Promise<{ ok: true; match: Match } | { ok: false; reason: 'notFound' | 'network' | 'timeout' }> {
  const f = opts.fetchFn || fetch, sleep = opts.sleep || (ms => new Promise(r => setTimeout(r, ms)));
  const poll = (opts.pollSec ?? 5) * 1000, limit = (opts.timeoutSec ?? 360) * 1000;
  let m = await getMatch(id, f);
  if (typeof m === 'string') return { ok: false, reason: m };
  if (isParsed(m)) return { ok: true, match: m };
  let jobId: number | null = null;
  try {
    const r = await f(`${API}/request/${id}`, { method: 'POST' });
    const j = await r.json() as { job?: { jobId?: number } };
    jobId = j?.job?.jobId ?? null;
  } catch { return { ok: false, reason: 'network' }; }
  let elapsed = 0;
  while (elapsed < limit) {
    await sleep(poll); elapsed += poll;
    opts.onProgress?.(Math.round(elapsed / 1000));
    let pending = true;
    if (jobId !== null) {
      try { const r = await f(`${API}/request/${jobId}`); const j = await r.json(); pending = !!j && typeof j === 'object' && Object.keys(j).length > 0; } catch { pending = true; }
    }
    if (!pending || jobId === null || elapsed % (poll * 6) === 0) {
      m = await getMatch(id, f);
      if (typeof m !== 'string' && isParsed(m)) return { ok: true, match: m };
    }
  }
  return { ok: false, reason: 'timeout' };
}

export interface RecentMatch { match_id: number; hero_id: number; player_slot: number; radiant_win: boolean; kills: number; deaths: number; assists: number; start_time: number; duration: number }
export async function recentMatches(account: number, fetchFn: typeof fetch = fetch): Promise<RecentMatch[] | null> {
  try { const r = await fetchFn(`${API}/players/${account}/recentMatches`); return r.ok ? (await r.json() as RecentMatch[]).slice(0, 10) : null; } catch { return null; }
}
export const won = (m: { radiant_win: boolean; player_slot: number }) => m.radiant_win === (m.player_slot < 128);
