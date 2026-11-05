// Справочник героев OpenDota: hero_id → имя и внутреннее имя (npc_dota_hero_*). Один запрос, кэш в localStorage.
export interface OdHero { id: number; name: string; npc: string }
const KEY = 'kontrpik-odheroes';
let cache: Promise<Map<number, OdHero>> | null = null;

export function odHeroes(fetchFn: typeof fetch = fetch): Promise<Map<number, OdHero>> {
  if (cache) return cache;
  cache = (async () => {
    try {
      const c = JSON.parse(localStorage.getItem(KEY) || 'null') as OdHero[] | null;
      if (c && c.length > 100) return new Map(c.map(h => [h.id, h]));
    } catch { /* ignore */ }
    const r = await fetchFn('https://api.opendota.com/api/heroes');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const list = ((await r.json()) as { id: number; localized_name: string; name: string }[]).map(h => ({ id: h.id, name: h.localized_name, npc: h.name }));
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
    return new Map(list.map(h => [h.id, h]));
  })();
  cache.catch(() => { cache = null; });
  return cache;
}
