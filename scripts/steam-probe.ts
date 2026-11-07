// Проверка ключа Steam Web API: последние матчи и формат данных. Ключ в вывод не попадает.
const KEY = process.env.STEAM_API_KEY || '';
const B = 'https://api.steampowered.com/IDOTA2Match_570';
const get = async (p: string) => {
  const t = Date.now(); const r = await fetch(`${B}${p}${p.includes('?') ? '&' : '?'}key=${KEY}`);
  const txt = await r.text(); return { status: r.status, ms: Date.now() - t, body: txt };
};
if (!/^[A-F0-9]{32}$/i.test(KEY)) { console.log('Ключ не задан или неверного вида, длина', KEY.length); process.exit(1); }
const h = await get('/GetMatchHistory/v1/?matches_requested=5');
console.log('GetMatchHistory', h.status, h.ms + 'ms', h.body.slice(0, 300));
let seq = 0;
try { seq = JSON.parse(h.body).result.matches[0].match_seq_num; } catch { /* */ }
console.log('latest seq', seq);
if (seq) {
  let ranked = 0, total = 0, slow = 0;
  for (let i = 0; i < 5; i++) {
    const s = await get(`/GetMatchHistoryBySequenceNum/v1/?start_at_match_seq_num=${seq - 200000 + i * 100}&matches_requested=100`);
    console.log('BySeq', i, s.status, s.ms + 'ms'); slow += s.ms;
    try {
      const ms = JSON.parse(s.body).result.matches as any[]; total += ms.length;
      for (const m of ms) if (m.lobby_type === 7 && [2, 22].includes(m.game_mode) && m.human_players === 10) ranked++;
      if (i === 0) { const m = ms[0]; console.log('keys', Object.keys(m).join(',')); console.log('player keys', Object.keys(m.players[0]).join(',')); console.log('sample', JSON.stringify({ id: m.match_id, seq: m.match_seq_num, rw: m.radiant_win, lt: m.lobby_type, gm: m.game_mode, hp: m.human_players, d: m.duration, st: m.start_time, p: m.players.map((p: any) => [p.player_slot, p.team_number, p.hero_id]) })); }
    } catch (e) { console.log('parse fail', (e as Error).message, s.body.slice(0, 200)); }
  }
  console.log(`total ${total}, ranked AP/CM 10 humans ${ranked}, avg ${Math.round(slow / 5)}ms/req`);
}
