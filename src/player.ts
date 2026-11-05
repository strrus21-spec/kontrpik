// «Мои герои» (6.1): разбор Steam ID, профиль OpenDota, личный пул и бонус к счёту.

export const STEAM64_BASE = 76561197960265728n;

export type ParsedId = { ok: true; id: number } | { ok: false; reason: 'empty' | 'bad' | 'vanity' };

/** Steam32, Steam64, [U:1:N], STEAM_0:Y:Z, ссылки Dotabuff/OpenDota/Stratz/Steam → Steam32 (account_id). */
export function parseSteamId(input: string): ParsedId {
  const s = input.trim();
  if (!s) return { ok: false, reason: 'empty' };
  if (/steamcommunity\.com\/id\//i.test(s)) return { ok: false, reason: 'vanity' };
  let m = s.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (m) return from64(m[1]);
  m = s.match(/(?:dotabuff\.com|opendota\.com|stratz\.com)\/(?:\w+\/)?players?\/(\d+)/i);
  if (m) return fromNumber(m[1]);
  m = s.match(/^\[?U:1:(\d+)\]?$/i);
  if (m) return fromNumber(m[1]);
  m = s.match(/^STEAM_[0-5]:([01]):(\d+)$/i);
  if (m) return fromNumber(String(Number(m[2]) * 2 + Number(m[1])));
  if (/^\d+$/.test(s)) return s.length >= 16 ? from64(s) : fromNumber(s);
  return { ok: false, reason: 'bad' };
}
function from64(s: string): ParsedId {
  const v = BigInt(s) - STEAM64_BASE;
  return v > 0n && v < 2n ** 32n ? { ok: true, id: Number(v) } : { ok: false, reason: 'bad' };
}
function fromNumber(s: string): ParsedId {
  const v = Number(s);
  return Number.isSafeInteger(v) && v > 0 && v < 2 ** 32 ? { ok: true, id: v } : { ok: false, reason: 'bad' };
}

/** Минимум игр за 90 дней, чтобы герой попал в пул. */
export const POOL_MIN_GAMES = 5;
/** Сглаживание личного винрейта: K виртуальных игр с винрейтом 50%. */
export const PERSONAL_K = 10;
/** +0.3 п.п. счёта за каждый процент сглаженного личного винрейта выше 50%, не больше +3. Вес — по согласованию с автором. */
export const BONUS_PER_PCT = 0.3, BONUS_MAX = 3;

export const smoothedWr = (games: number, wins: number) => ((wins + PERSONAL_K * 0.5) / (games + PERSONAL_K)) * 100;
export function personalBonus(games: number, wins: number): number {
  if (!games) return 0;
  return Math.min(BONUS_MAX, Math.max(0, BONUS_PER_PCT * (smoothedWr(games, wins) - 50)));
}

export interface MyHero { name: string; games: number; win: number }
export interface Player {
  id: number;
  name: string;
  avatar: string;
  /** rank_tier OpenDota: десятки — медаль 1..8, единицы — звёзды. */
  rank: number | null;
  leaderboard: number | null;
  heroes: MyHero[];
  fetchedAt: number;
}

export type FetchResult = { ok: true; player: Player } | { ok: false; reason: 'closed' | 'notFound' | 'network' };

interface ODProfile { profile?: { personaname?: string; avatarfull?: string; avatarmedium?: string; fh_unavailable?: boolean } | null; rank_tier?: number | null; leaderboard_rank?: number | null }
interface ODHero { hero_id: number | string; games: number; win: number }

/** Загрузить профиль и героев за 90 дней. heroName — сопоставление hero_id → имя. */
export async function fetchPlayer(id: number, heroName: (id: number) => Promise<string | undefined>, fetchFn: typeof fetch = fetch, base = 'https://api.opendota.com/api'): Promise<FetchResult> {
  let prof: ODProfile, list: ODHero[];
  try {
    const [a, b] = await Promise.all([fetchFn(`${base}/players/${id}`), fetchFn(`${base}/players/${id}/heroes?date=90`)]);
    if (!a.ok || !b.ok) return { ok: false, reason: a.status === 404 ? 'notFound' : 'network' };
    prof = await a.json(); list = await b.json();
  } catch { return { ok: false, reason: 'network' }; }
  if (!prof || !prof.profile) return { ok: false, reason: 'notFound' };
  const played = (Array.isArray(list) ? list : []).filter(h => h.games > 0);
  if (!played.length) return { ok: false, reason: 'closed' };
  const heroes: MyHero[] = [];
  for (const h of played) {
    const name = await heroName(Number(h.hero_id));
    if (name) heroes.push({ name, games: h.games, win: h.win });
  }
  heroes.sort((x, y) => y.games - x.games);
  return {
    ok: true,
    player: {
      id, name: prof.profile.personaname || String(id), avatar: prof.profile.avatarfull || prof.profile.avatarmedium || '',
      rank: prof.rank_tier ?? null, leaderboard: prof.leaderboard_rank ?? null, heroes, fetchedAt: Date.now(),
    },
  };
}

/** Пул: герои с ≥ 5 играми за 90 дней + отмеченные звёздочкой. */
export function poolNames(player: Player | null, stars: Set<string>): Set<string> {
  const out = new Set(stars);
  for (const h of player?.heroes || []) if (h.games >= POOL_MIN_GAMES) out.add(h.name);
  return out;
}

/** «Легенда 4», «Титан #120», null — без ранга. medals: 8 названий медалей. */
export function rankLabel(rank: number | null, leaderboard: number | null, medals: string[]): string | null {
  if (!rank) return null;
  const medal = Math.floor(rank / 10), stars = rank % 10;
  if (medal < 1 || medal > 8) return null;
  if (medal === 8) return medals[7] + (leaderboard ? ` #${leaderboard}` : '');
  return `${medals[medal - 1]}${stars ? ' ' + stars : ''}`;
}
