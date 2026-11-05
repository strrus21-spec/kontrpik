// История игрока (пункт 7): последние 20 матчей и самые неудобные противники за 90 дней.
const API = 'https://api.opendota.com/api';

export interface HistMatch { match_id: number; hero_id: number; player_slot: number; radiant_win: boolean; kills: number; deaths: number; assists: number; gold_per_min?: number; last_hits?: number; duration: number; start_time: number }
export interface Against { hero_id: number; against_games: number; against_win: number }
export interface History { matches: HistMatch[]; against: Against[] }

const won = (m: HistMatch) => m.radiant_win === (m.player_slot < 128);

export async function loadHistory(account: number, f: typeof fetch = fetch): Promise<History | null> {
  const fields = ['hero_id', 'kills', 'deaths', 'assists', 'gold_per_min', 'last_hits', 'duration', 'start_time', 'radiant_win', 'player_slot'];
  try {
    const [a, b] = await Promise.all([
      f(`${API}/players/${account}/matches?limit=20&${fields.map(x => 'project=' + x).join('&')}`),
      f(`${API}/players/${account}/heroes?date=90`),
    ]);
    if (!a.ok || !b.ok) return null;
    return { matches: await a.json(), against: await b.json() };
  } catch { return null; }
}

export interface HistSummary {
  games: number; wins: number; kda: [number, number, number]; gpm: number; trend: 'up' | 'down' | 'flat';
  heroes: { hero_id: number; games: number; wins: number }[];
  worst: { hero_id: number; games: number; wr: number }[];
  form: boolean[];
}

/** Итоги: винрейт, средние K/D/A и GPM, тренд (последние 10 против предыдущих 10), герои, неудобные противники. */
export function summarize(h: History): HistSummary {
  const ms = h.matches, n = ms.length || 1;
  const avg = (f: (m: HistMatch) => number, list = ms) => list.reduce((s, m) => s + f(m), 0) / (list.length || 1);
  const recent = ms.slice(0, 10), older = ms.slice(10);
  const wr = (l: HistMatch[]) => l.filter(won).length / (l.length || 1);
  const d = older.length >= 5 ? wr(recent) - wr(older) : 0;
  const byHero = new Map<number, { games: number; wins: number }>();
  for (const m of ms) { const x = byHero.get(m.hero_id) || { games: 0, wins: 0 }; x.games++; if (won(m)) x.wins++; byHero.set(m.hero_id, x); }
  return {
    games: ms.length, wins: ms.filter(won).length,
    kda: [avg(m => m.kills), avg(m => m.deaths), avg(m => m.assists)].map(v => Math.round(v * 10) / 10) as [number, number, number],
    gpm: Math.round(avg(m => m.gold_per_min ?? 0)),
    trend: d > 0.1 ? 'up' : d < -0.1 ? 'down' : 'flat',
    heroes: [...byHero.entries()].map(([hero_id, v]) => ({ hero_id, ...v })).sort((a, b) => b.games - a.games).slice(0, 5),
    worst: h.against.filter(a => a.against_games >= 4).map(a => ({ hero_id: a.hero_id, games: a.against_games, wr: a.against_win / a.against_games }))
      .sort((a, b) => a.wr - b.wr || b.games - a.games).slice(0, 5),
    form: ms.slice(0, 20).map(won),
  };
  void n;
}
