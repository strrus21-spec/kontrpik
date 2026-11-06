// Расширенный разбор матча: расчёты из данных разобранного матча OpenDota. Только чистые функции.
import { isCore, isRadiant, type Match, type MPlayer } from './match.ts';

export const teamOf = (m: Match, p: MPlayer) => m.players.filter(x => isRadiant(x) === isRadiant(p));
export const enemiesOf = (m: Match, p: MPlayer) => m.players.filter(x => isRadiant(x) !== isRadiant(p));

/** Позиция 1–5: из position_est OpenDota, иначе по линии и золоту. */
export function positionOf(m: Match, p: MPlayer): number | null {
  if (p.position_est && p.position_est >= 1 && p.position_est <= 5) return p.position_est;
  if (typeof p.lane_role !== 'number') return null;
  const core = isCore(m, p);
  return core ? ({ 1: 1, 2: 2, 3: 3 } as Record<number, number>)[p.lane_role] ?? null : p.lane_role === 1 ? 5 : 4;
}

/** Соперник по той же позиции. */
export function opponentByPos(m: Match, p: MPlayer): MPlayer | null {
  const pos = positionOf(m, p); if (!pos) return null;
  return enemiesOf(m, p).find(e => positionOf(m, e) === pos) ?? null;
}

/** Соперники на линии в первые 10 минут: враги с той же линией (lane: 1 низ, 2 центр, 3 верх). */
export function laneOpponents(m: Match, p: MPlayer): MPlayer[] {
  if (!p.lane || p.lane > 3) return [];
  return enemiesOf(m, p).filter(e => e.lane === p.lane);
}

/** Преимущество по золоту/опыту с точки зрения команды игрока, по минутам. */
export function advantage(m: Match, p: MPlayer): { gold: number[]; xp: number[] } {
  const k = isRadiant(p) ? 1 : -1;
  return { gold: (m.radiant_gold_adv || []).map(v => v * k), xp: (m.radiant_xp_adv || []).map(v => v * k) };
}

export interface FightRow { start: number; end: number; ourDeaths: number; theirDeaths: number; won: boolean | null; ourGold: number; me: { in: boolean; damage: number; deaths: number; kills: number; healing: number; items: string[] } }

/** Командные драки: потери сторон, победитель по изменению золота, участие игрока. */
export function fights(m: Match, p: MPlayer): FightRow[] {
  const idx = m.players.indexOf(p), rad = isRadiant(p);
  return (m.teamfights || []).map(tf => {
    let ourDeaths = 0, theirDeaths = 0, ourGold = 0, theirGold = 0;
    tf.players.forEach((tp, i) => {
      const pl = m.players[i]; if (!pl) return;
      if (isRadiant(pl) === rad) { ourDeaths += tp.deaths; ourGold += tp.gold_delta ?? 0; }
      else { theirDeaths += tp.deaths; theirGold += tp.gold_delta ?? 0; }
    });
    const mine = tf.players[idx] || { deaths: 0 };
    const kills = Object.values(mine.killed || {}).reduce((a, b) => a + b, 0);
    const damage = mine.damage ?? 0, healing = mine.healing ?? 0;
    const items = Object.keys(mine.item_uses || {}).filter(k => !/^(tango|flask|clarity|ward_|tpscroll|famango|enchanted_mango|faerie_fire|dust|smoke_of_deceit|branches|madstone)/.test(k));
    const won = ourDeaths === theirDeaths && Math.abs(ourGold - theirGold) < 300 ? null : ourDeaths !== theirDeaths ? ourDeaths < theirDeaths : ourGold > theirGold;
    return { start: tf.start, end: tf.end, ourDeaths, theirDeaths, won, ourGold: ourGold - theirGold,
      me: { in: damage > 0 || healing > 0 || mine.deaths > 0 || kills > 0, damage, deaths: mine.deaths, kills, healing, items } };
  });
}

export interface ObjMark { time: number; kind: 'roshan' | 'tower' | 'rax' | 'fb'; ours: boolean }
/** Ключевые события на графике: Рошан, башни, бараки, первая кровь. */
export function objectives(m: Match, p: MPlayer): ObjMark[] {
  const rad = isRadiant(p), out: ObjMark[] = [];
  for (const o of m.objectives || []) {
    if (o.type === 'CHAT_MESSAGE_ROSHAN_KILL') out.push({ time: o.time, kind: 'roshan', ours: (o.team === 2) === rad });
    else if (o.type === 'building_kill' && o.key) {
      const lostRad = o.key.includes('goodguys');
      const kind = /tower/.test(o.key) ? 'tower' : /rax|barracks/.test(o.key) ? 'rax' : null;
      if (kind) out.push({ time: o.time, kind, ours: lostRad !== rad });
    } else if (o.type === 'CHAT_MESSAGE_FIRSTBLOOD') out.push({ time: o.time, kind: 'fb', ours: o.player_slot !== undefined && (o.player_slot < 128) === rad });
  }
  return out;
}

/** Урон по героям-врагам (сумма по всем источникам) и урон от героев-врагов. */
export function damage(p: MPlayer): { dealt: [string, number][]; taken: [string, number][] } {
  const dealt: Record<string, number> = {};
  for (const tgt of Object.values(p.damage_targets || {})) for (const [k, v] of Object.entries(tgt)) if (k.startsWith('npc_dota_hero_')) dealt[k] = (dealt[k] || 0) + v;
  const taken = Object.entries(p.damage_taken || {}).filter(([k]) => k.startsWith('npc_dota_hero_'));
  const sort = (a: [string, number][]) => a.sort((x, y) => y[1] - x[1]);
  return { dealt: sort(Object.entries(dealt)), taken: sort(taken) };
}

/** Покупки собранных предметов по времени (без расходников и компонентов — по списку ключей). */
export function itemTimeline(p: MPlayer, isAssembled: (key: string) => boolean): { key: string; time: number }[] {
  const seen = new Set<string>();
  return (p.purchase_log || []).filter(x => x.time > 0 && isAssembled(x.key) && !seen.has(x.key) && !!seen.add(x.key));
}

/** Фаза покупки как у OpenDota itemPopularity: старт < 0, ранняя < 10 мин, середина < 25 мин, поздняя. */
export const phaseOf = (sec: number) => (sec < 0 ? 'start' : sec < 600 ? 'early' : sec < 1500 ? 'mid' : 'late') as 'start' | 'early' | 'mid' | 'late';
const ORDER = { start: 0, early: 1, mid: 2, late: 3 };
/** Сравнение с про-сборкой: раньше/как у про/позже/не в про-сборке. */
export function vsPro(key: string, time: number, build?: { start: string[]; early: string[]; mid: string[]; late: string[] }): 'early' | 'same' | 'late' | null {
  if (!build) return null;
  const proPhase = (['start', 'early', 'mid', 'late'] as const).find(ph => build[ph].includes(key));
  if (!proPhase) return null;
  const d = ORDER[phaseOf(time)] - ORDER[proPhase];
  return d < 0 ? 'early' : d > 0 ? 'late' : 'same';
}

/** Точки мини-карты в координатах OpenDota (≈64…192). */
export interface MapData { myWards: { x: number; y: number; obs: boolean }[]; enemyWards: { x: number; y: number; obs: boolean }[]; deaths: { x: number; y: number }[]; path: { x: number; y: number; n: number }[] }
export function mapData(m: Match, p: MPlayer): MapData {
  const wards = (list: MPlayer[]) => list.flatMap(pl => [...(pl.obs_log || []).map(w => ({ x: w.x, y: w.y, obs: true })), ...(pl.sen_log || []).map(w => ({ x: w.x, y: w.y, obs: false }))]);
  const idx = m.players.indexOf(p);
  const deaths: { x: number; y: number }[] = [];
  for (const tf of m.teamfights || []) for (const [x, ys] of Object.entries(tf.players[idx]?.deaths_pos || {})) for (const [y, n] of Object.entries(ys)) for (let i = 0; i < n; i++) deaths.push({ x: +x, y: +y });
  const path: { x: number; y: number; n: number }[] = [];
  for (const [x, ys] of Object.entries(p.lane_pos || {})) for (const [y, n] of Object.entries(ys)) path.push({ x: +x, y: +y, n });
  return { myWards: wards(teamOf(m, p)), enemyWards: wards(enemiesOf(m, p)), deaths, path };
}

export interface Tip2 { tone: 'bad' | 'info' | 'good'; key: string; v: Record<string, string | number> }
const npcName = (k: string) => k.replace('npc_dota_hero_', '');

/** Конкретные советы со ссылкой на цифры и минуты. heroName — npc → имя героя. */
export function smartTips(m: Match, p: MPlayer, ctx: { heroName: (npc: string) => string; heroById: (id: number) => string; isAssembled: (k: string) => boolean; build?: { start: string[]; early: string[]; mid: string[]; late: string[] } }): Tip2[] {
  const out: Tip2[] = [], core = isCore(m, p);
  // 1) Серия смертей от одного героя в окне 8 минут
  const dl = p.deaths_log || [];
  for (let i = 0; i < dl.length; i++) {
    const win = dl.filter(d => d.time >= dl[i].time && d.time <= dl[i].time + 480);
    const byKiller = new Map<string, number>(); win.forEach(d => byKiller.set(d.key, (byKiller.get(d.key) || 0) + 1));
    const [k, n] = [...byKiller.entries()].sort((a, b) => b[1] - a[1])[0] || ['', 0];
    if (n >= 3) { out.push({ tone: 'bad', key: 'streak', v: { n, from: mm(dl[i].time), to: mm(dl[i].time + 480), hero: ctx.heroName(k) } }); break; }
  }
  // 1б) Много смертей подряд от разных героев
  if (!out.length) for (let i = 0; i < dl.length; i++) {
    const win = dl.filter(d => d.time >= dl[i].time && d.time <= dl[i].time + 480);
    if (win.length >= 4) { out.push({ tone: 'bad', key: 'deathBurst', v: { n: win.length, from: mm(win[0].time), to: mm(win[win.length - 1].time) } }); break; }
  }
  // 2) Линия: добивания к 10-й минуте против соперника по линии
  const opp = laneOpponents(m, p).sort((a, b) => (b.lh_t?.[10] ?? 0) - (a.lh_t?.[10] ?? 0))[0];
  if (core && p.lh_t && p.lh_t.length > 10 && opp?.lh_t && opp.lh_t.length > 10) {
    const a = p.lh_t[10], b = opp.lh_t[10];
    if (Math.abs(a - b) >= 8) out.push({ tone: a > b ? 'good' : 'bad', key: a > b ? 'laneWon' : 'laneLost', v: { a, b, hero: ctx.heroById(opp.hero_id) } });
  }
  // 3) Драки до 25-й минуты
  const f = fights(m, p).filter(x => x.start < 1500 && x.won !== null);
  const lost = f.filter(x => !x.won).length, missed = f.filter(x => !x.me.in).length;
  if (f.length >= 3 && lost >= Math.ceil(f.length * 0.6)) out.push({ tone: 'bad', key: 'fightsLost', v: { lost, all: f.length, missed } });
  else if (f.length >= 3 && missed >= Math.ceil(f.length / 2)) out.push({ tone: 'bad', key: 'fightsMissed', v: { missed, all: f.length } });
  // 4) Ключевой предмет позже, чем у про
  const tl = itemTimeline(p, ctx.isAssembled);
  const late = tl.map(x => ({ ...x, r: vsPro(x.key, x.time, ctx.build) })).find(x => x.r === 'late' && x.time > 900);
  if (core && late) out.push({ tone: 'bad', key: 'itemLate', v: { item: late.key, time: mm(late.time) } });
  // 5) Выкуп и смерть с золотом
  const big = dl.filter(d => (d.gold_lost ?? 0) >= 500).sort((a, b) => (b.gold_lost ?? 0) - (a.gold_lost ?? 0))[0];
  if (big) out.push({ tone: 'bad', key: 'goldDeath', v: { gold: big.gold_lost!, time: mm(big.time), hero: ctx.heroName(big.key) } });
  // 6) Урон по башням у ядра
  if (core && (p.tower_damage ?? 0) < 1000 && m.duration > 1800) out.push({ tone: 'info', key: 'towers', v: { dmg: p.tower_damage ?? 0 } });
  // 7) Саппорт: стаки и варды за первые 10 минут
  if (!core) {
    const early = (p.obs_log || []).filter(w => w.time < 600).length;
    out.push({ tone: early >= 3 ? 'good' : 'bad', key: 'earlyWards', v: { n: early } });
  }
  // 8) Контроль
  if ((p.stuns ?? 0) >= 60) out.push({ tone: 'good', key: 'stuns', v: { s: Math.round(p.stuns!) } });
  return out.slice(0, 6);
}
const mm = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;
export { npcName };

/** Кто это: герой или юнит. Ключи из deaths_log / damage_taken: npc_dota_hero_pudge, creep_badguys_flagbearer, npc_dota_furion_treant… */
export type UnitKind = 'hero' | 'creep' | 'siege' | 'tower' | 'rax' | 'fort' | 'neutral' | 'roshan' | 'ward' | 'summon' | 'other';
export function unitOf(key: string, heroNpcs: string[]): { kind: UnitKind; hero?: string } {
  const k = key.toLowerCase();
  if (k.startsWith('npc_dota_hero_')) return { kind: 'hero', hero: k.slice(14) };
  const rest = k.replace(/^npc_dota_/, '').replace(/^unit_/, '');
  if (/roshan/.test(k)) return { kind: 'roshan' };
  if (/tower/.test(k)) return { kind: 'tower' };
  if (/(^|_)fort/.test(k)) return { kind: 'fort' };
  if (/rax|barracks/.test(k)) return { kind: 'rax' };
  if (/neutral/.test(k)) return { kind: 'neutral' };
  if (/creep.*siege|siege/.test(k)) return { kind: 'siege' };
  if (/creep|flagbearer|goodguys|badguys/.test(k)) return { kind: 'creep' };
  // призванные существа: имя начинается с имени героя (furion_treant, lone_druid_bear, venomancer_plague_ward)
  const owner = heroNpcs.filter(n => rest.startsWith(n + '_')).sort((a, b) => b.length - a.length)[0];
  if (owner) return { kind: 'summon', hero: owner };
  if (/ward/.test(k)) return { kind: 'ward' };
  return { kind: 'other' };
}
