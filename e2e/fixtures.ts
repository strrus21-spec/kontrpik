// Поддельные ответы OpenDota для e2e.
import type { Page } from '@playwright/test';

export const OD_HEROES = [
  { id: 1, localized_name: 'Anti-Mage', name: 'npc_dota_hero_antimage' }, { id: 2, localized_name: 'Axe', name: 'npc_dota_hero_axe' },
  { id: 5, localized_name: 'Crystal Maiden', name: 'npc_dota_hero_crystal_maiden' }, { id: 8, localized_name: 'Juggernaut', name: 'npc_dota_hero_juggernaut' },
  { id: 14, localized_name: 'Pudge', name: 'npc_dota_hero_pudge' }, { id: 26, localized_name: 'Lion', name: 'npc_dota_hero_lion' },
  { id: 44, localized_name: 'Phantom Assassin', name: 'npc_dota_hero_phantom_assassin' }, { id: 74, localized_name: 'Invoker', name: 'npc_dota_hero_invoker' },
  { id: 13, localized_name: 'Puck', name: 'npc_dota_hero_puck' }, { id: 18, localized_name: 'Sven', name: 'npc_dota_hero_sven' },
  ...Array.from({ length: 100 }, (_, i) => ({ id: 200 + i, localized_name: `X${i}`, name: `npc_x${i}` })),
];
const ids = [8, 13, 2, 26, 5, 44, 74, 14, 18, 1];
export function fakeMatch(id: number, parsed: boolean) {
  return {
    match_id: id, version: parsed ? 21 : null, duration: 2400, radiant_win: false, start_time: 1793600000,
    players: ids.map((hero_id, i) => ({
      player_slot: i < 5 ? i : 128 + i - 5, hero_id, account_id: i === 0 ? 86745912 : null, personaname: i === 0 ? 'FINIK' : null,
      kills: i === 0 ? 4 : 3, deaths: i === 0 ? 8 : 4, assists: i === 0 ? 5 : 6, net_worth: i < 3 ? 20000 - i * 1000 : 5000,
      ...(parsed ? {
        lh_t: i === 0 ? [0, 3, 6, 9, 12, 14, 17, 20, 22, 25, 27] : Array(11).fill(30),
        purchase_log: i === 0 ? [{ time: 1800, key: 'black_king_bar' }] : [],
        kills_log: i === 5 ? [{ time: 300, key: 'npc_dota_hero_juggernaut' }] : [],
        benchmarks: { gold_per_min: { raw: 401, pct: 0.28 }, last_hits_per_min: { raw: 4, pct: 0.2 } },
        gold_reasons: i === 0 ? { '1': -2600 } : {}, obs_placed: i === 4 ? 9 : 0, sen_placed: 4, observer_kills: 1,
      } : {}),
    })),
    teamfights: parsed ? [{ players: ids.map((_, i) => ({ deaths: i === 0 ? 2 : 0 })) }] : null,
  };
}

/** mode: parsed — матч уже разобран; queue — сначала не разобран, разбирается после двух опросов. */
export async function mockOD(page: Page, mode: 'parsed' | 'queue' = 'parsed') {
  let polls = 0;
  await page.route('https://api.opendota.com/api/**', async r => {
    const u = new URL(r.request().url()), path = u.pathname.replace('/api', '');
    if (path === '/heroes') return r.fulfill({ json: OD_HEROES });
    if (path === '/request/8000000001' && r.request().method() === 'POST') return r.fulfill({ json: { job: { jobId: 77 } } });
    if (path === '/request/77') { polls++; return r.fulfill({ json: polls >= 2 ? null : { jobId: 77 } }); }
    const m = path.match(/^\/matches\/(\d+)$/);
    if (m) { if (m[1].startsWith('404')) return r.fulfill({ status: 404, json: { error: 'Not Found' } }); return r.fulfill({ json: fakeMatch(+m[1], mode === 'parsed' || polls >= 2) }); }
    if (path.endsWith('/recentMatches')) return r.fulfill({ json: [
      { match_id: 8000000001, hero_id: 8, player_slot: 0, radiant_win: false, kills: 4, deaths: 8, assists: 5, start_time: 1793600000, duration: 2400 },
      { match_id: 8000000002, hero_id: 8, player_slot: 0, radiant_win: false, kills: 4, deaths: 8, assists: 5, start_time: 1793500000, duration: 2000 },
    ] });
    if (path.endsWith('/heroes') && u.searchParams.get('date')) return r.fulfill({ json: [{ hero_id: 8, games: 10, win: 6 }] });
    if (/^\/players\/\d+$/.test(path)) return r.fulfill({ json: { profile: { personaname: 'FINIK', avatarfull: '' }, rank_tier: 54 } });
    return r.fulfill({ status: 404, json: {} });
  });
}
