// Расширенный разбор матча: блоки HTML/SVG. Данные — src/matchx.ts.
import { t } from '../i18n.ts';
import { isRadiant, type Match, type MPlayer } from '../match.ts';
import { advantage, damage, fights, itemTimeline, laneOpponents, mapData, objectives, opponentByPos, positionOf, smartTips, teamOf, enemiesOf, vsPro } from '../matchx.ts';
import type { ItemsData } from '../data.ts';
import type { Hero } from '../types.ts';
import type { HistSummary } from '../history.ts';
import { itemIcon } from './build.ts';
import { esc, fmt } from './html.ts';

export interface MxCtx { heroOf: (id: number) => Hero | undefined; heroByNpc: (npc: string) => Hero | undefined; items: ItemsData | null }
const mm = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;
const ic = (h: Hero | undefined, s = 22) => h ? `<img class="ic" src="${esc(h.img)}" alt="${esc(h.name)}" title="${esc(h.name)}" width="${s}" height="${s}">` : '';
const k1 = (v: number) => v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k' : String(Math.round(v));
const sec = (title: string, body: string, cls = '') => `<section class="mx ${cls}"><h3 class="mx-h">${title}</h3>${body}</section>`;

/** Линейный график: серии значений по минутам, ось ноль, подписи минут. */
function lineChart(series: { v: number[]; cls: string; label: string }[], o: { zero?: boolean; marks?: { t: number; cls: string; title: string }[]; h?: number } = {}) {
  const W = 640, H = o.h ?? 180, P = 30;
  const n = Math.max(...series.map(s => s.v.length)); if (n < 2) return '';
  const all = series.flatMap(s => s.v); let lo = Math.min(0, ...all), hi = Math.max(0, ...all);
  if (!o.zero) lo = Math.min(...all);
  if (hi === lo) hi = lo + 1;
  const x = (i: number) => P + (i / (n - 1)) * (W - P - 6), y = (v: number) => 8 + (1 - (v - lo) / (hi - lo)) * (H - 26);
  const grid = Array.from({ length: Math.floor((n - 1) / 10) + 1 }, (_, i) => i * 10).map(min => `<line x1="${x(min)}" x2="${x(min)}" y1="6" y2="${H - 18}" class="g"/><text x="${x(min)}" y="${H - 4}" class="ax">${min}</text>`).join('');
  const zero = o.zero ? `<line x1="${P}" x2="${W - 6}" y1="${y(0)}" y2="${y(0)}" class="z"/>` : '';
  const paths = series.map(s => {
    const d = s.v.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
    const area = o.zero ? `<path class="ar ${s.cls}" d="${d}L${x(s.v.length - 1)} ${y(0)}L${x(0)} ${y(0)}Z"/>` : '';
    return `${area}<path class="ln ${s.cls}" d="${d}"><title>${esc(s.label)}</title></path>`;
  }).join('');
  const marks = (o.marks || []).map(m => `<circle cx="${x(m.t / 60)}" cy="12" r="4.5" class="mk ${m.cls}"><title>${esc(m.title)}</title></circle>`).join('');
  const ylab = `<text x="2" y="14" class="ax l">${k1(hi)}</text><text x="2" y="${H - 22}" class="ax l">${k1(lo)}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${grid}${zero}${paths}${marks}${ylab}</svg>
    <div class="legend-l">${series.map(s => `<span class="lg ${s.cls}">${esc(s.label)}</span>`).join('')}</div>`;
}

export function summaryBlock(m: Match, p: MPlayer, c: MxCtx) {
  const L = t().mx, a = advantage(m, p), f = fights(m, p), ob = objectives(m, p);
  const marks = [
    ...f.map(x => ({ t: x.start, cls: x.won === null ? 'n' : x.won ? 'w' : 'l', title: `${L.fight} ${mm(x.start)}: ${x.theirDeaths}:${x.ourDeaths}` })),
    ...ob.filter(o => o.kind === 'roshan').map(o => ({ t: o.time, cls: o.ours ? 'rw' : 'rl', title: `${L.roshan} ${mm(o.time)}` })),
  ];
  const rad = isRadiant(p);
  const score = rad ? `${m.radiant_score ?? '?'} : ${m.dire_score ?? '?'}` : `${m.dire_score ?? '?'} : ${m.radiant_score ?? '?'}`;
  const pb = (m.picks_bans || []).slice().sort((x, y) => x.order - y.order);
  const side = (pick: boolean, ours: boolean) => pb.filter(x => x.is_pick === pick && (x.team === 0) === (ours ? rad : !rad)).map(x => ic(c.heroOf(x.hero_id), pick ? 26 : 20)).join('');
  const towers = ob.filter(o => o.kind === 'tower');
  return sec(L.overview, `<div class="mx-pills"><span>${L.score} <b>${score}</b></span><span>${L.duration} <b>${mm(m.duration)}</b></span>${m.first_blood_time ? `<span>${L.fb} <b>${mm(m.first_blood_time)}</b></span>` : ''}<span>${L.towers} <b>${towers.filter(x => x.ours).length} : ${towers.filter(x => !x.ours).length}</b></span><span>${L.fightsWon} <b>${f.filter(x => x.won).length} / ${f.length}</b></span></div>
    ${lineChart([{ v: a.gold, cls: 'gold', label: L.goldAdv }, { v: a.xp, cls: 'xp', label: L.xpAdv }], { zero: true, marks, h: 200 })}
    <p class="note">${L.chartNote}</p>
    ${pb.length ? `<div class="mx-draft"><div><span class="b-ph">${L.ourPicks}</span>${side(true, true)}<span class="bans-s">${side(false, true)}</span></div><div><span class="b-ph">${L.theirPicks}</span>${side(true, false)}<span class="bans-s">${side(false, false)}</span></div></div>` : ''}`);
}

export function teamsBlock(m: Match, p: MPlayer, c: MxCtx) {
  const L = t().mx, it = c.items;
  const row = (pl: MPlayer) => {
    const h = c.heroOf(pl.hero_id);
    const slots = ([pl.item_0, pl.item_1, pl.item_2, pl.item_3, pl.item_4, pl.item_5] as (number | undefined)[]).map(id => {
      const k = id && it?.ids?.[String(id)]; return k && it ? itemIcon(it, k, 'xs') : '<span class="it it-xs empty"></span>';
    }).join('');
    const nm = pl === p ? `<span>${esc(h?.name || '?')}</span>` : `<button class="th-pick" data-pslot="${pl.player_slot}" data-top title="${esc(L.pickThis)}">${esc(h?.name || '?')}</button>`;
    return `<tr class="${pl === p ? 'me' : ''}"><td class="th">${ic(h)}${nm}${positionOf(m, pl) ? `<span class="posb">${positionOf(m, pl)}</span>` : ''}</td>
      <td class="n">${pl.kills}/${pl.deaths}/${pl.assists}</td><td class="n">${pl.last_hits ?? '–'}/${pl.denies ?? '–'}</td><td class="n">${pl.gold_per_min ?? '–'}/${pl.xp_per_min ?? '–'}</td>
      <td class="n">${k1(pl.hero_damage ?? 0)}</td><td class="n c-opt">${k1(pl.tower_damage ?? 0)}</td><td class="n c-opt">${k1(pl.hero_healing ?? 0)}</td><td class="its">${slots}</td></tr>`;
  };
  const table = (list: MPlayer[], title: string, cls: string) => `<div class="mx-team ${cls}"><h4>${title}</h4><div class="tw"><table class="mx-table"><thead><tr><th>${L.hero}</th><th>K/D/A</th><th>${L.lhdn}</th><th>${L.gpmxpm}</th><th>${L.dmg}</th><th class="c-opt">${L.tdmg}</th><th class="c-opt">${L.heal}</th><th>${L.items}</th></tr></thead><tbody>${list.sort((a, b) => (positionOf(m, a) ?? 9) - (positionOf(m, b) ?? 9)).map(row).join('')}</tbody></table></div></div>`;
  const rad = isRadiant(p);
  return sec(L.teams, table(teamOf(m, p), rad ? t().st.radiant : t().st.dire, rad ? 'rad' : 'dire') + table(enemiesOf(m, p), rad ? t().st.dire : t().st.radiant, rad ? 'dire' : 'rad'));
}

export function statsBlock(m: Match, p: MPlayer) {
  const L = t().mx, b = p.benchmarks || {};
  const keys: [string, string, (v: number) => string][] = [
    ['gold_per_min', L.bGpm, v => String(Math.round(v))], ['xp_per_min', L.bXpm, v => String(Math.round(v))],
    ['last_hits_per_min', L.bLh, v => v.toFixed(1)], ['hero_damage_per_min', L.bDmg, v => String(Math.round(v))],
    ['kills_per_min', L.bKills, v => v.toFixed(2)], ['hero_healing_per_min', L.bHeal, v => String(Math.round(v))], ['tower_damage', L.bTower, v => k1(v)],
  ];
  const cards = keys.filter(([k]) => b[k]).map(([k, label, f]) => {
    const pct = Math.round(b[k].pct * 100), tone = pct >= 60 ? 'good' : pct < 35 ? 'bad' : 'info';
    return `<div class="sc t-${tone}"><span class="sc-l">${label}</span><b>${f(b[k].raw)}</b><span class="sc-bar"><span style="width:${pct}%"></span></span><small>${L.better(pct)}</small></div>`;
  }).join('');
  const extra = [
    p.stuns ? `<div class="sc"><span class="sc-l">${L.stuns}</span><b>${Math.round(p.stuns)} ${L.sec}</b></div>` : '',
    typeof p.teamfight_participation === 'number' ? `<div class="sc"><span class="sc-l">${L.tfp}</span><b>${Math.round(p.teamfight_participation * 100)}%</b></div>` : '',
    p.camps_stacked ? `<div class="sc"><span class="sc-l">${L.stacks}</span><b>${p.camps_stacked}</b></div>` : '',
  ].join('');
  void m;
  return cards || extra ? sec(L.yourStats, `<div class="sc-grid">${cards}${extra}</div><p class="note">${L.benchNote}</p>`) : '';
}

export function laneBlock(m: Match, p: MPlayer, c: MxCtx) {
  const L = t().mx, opps = laneOpponents(m, p), main = opps.sort((a, b) => (b.lh_t?.[10] ?? 0) - (a.lh_t?.[10] ?? 0))[0];
  if (!p.lh_t || p.lh_t.length < 6) return '';
  const at = (a: number[] | null | undefined, i: number) => (a && a.length > i ? a[i] : '–');
  const vs = main ? ic(c.heroOf(main.hero_id)) + esc(c.heroOf(main.hero_id)?.name || '') : '';
  const rows = [[L.lh5, at(p.lh_t, 5), at(main?.lh_t, 5)], [L.lh10, at(p.lh_t, 10), at(main?.lh_t, 10)], [L.dn10, at(p.dn_t, 10), at(main?.dn_t, 10)], [L.gold10, at(p.gold_t, 10), at(main?.gold_t, 10)]];
  const series = [{ v: (p.lh_t || []).slice(0, 16), cls: 'me', label: L.you }, ...(main?.lh_t ? [{ v: main.lh_t.slice(0, 16), cls: 'opp', label: c.heroOf(main.hero_id)?.name || L.opp }] : [])];
  return sec(L.lane, `<div class="mx-lane"><div>
      ${typeof p.lane_efficiency_pct === 'number' ? `<p class="mx-big">${L.laneEff} <b>${p.lane_efficiency_pct}%</b></p>` : ''}
      ${opps.length ? `<p class="bans-note">${L.laneVs} ${opps.map(o => ic(c.heroOf(o.hero_id)) + esc(c.heroOf(o.hero_id)?.name || '')).join(', ')}</p>` : ''}
      <table class="mx-table sm"><thead><tr><th></th><th>${L.you}</th><th>${vs || L.opp}</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td class="n">${r[1]}</td><td class="n">${r[2]}</td></tr>`).join('')}</tbody></table>
    </div><div><h4 class="mx-sub">${L.lhChart}</h4>${lineChart(series, { h: 150 })}</div></div>`);
}

export function posBlock(m: Match, p: MPlayer, c: MxCtx) {
  const L = t().mx, o = opponentByPos(m, p), pos = positionOf(m, p); if (!o || !pos) return '';
  const rows: [string, number, number, boolean][] = [
    ['K/D/A', p.kills + p.assists - p.deaths, o.kills + o.assists - o.deaths, true],
    [L.bGpm, p.gold_per_min ?? 0, o.gold_per_min ?? 0, true], [L.bXpm, p.xp_per_min ?? 0, o.xp_per_min ?? 0, true],
    [L.lhdn, p.last_hits ?? 0, o.last_hits ?? 0, true], [L.dmg, p.hero_damage ?? 0, o.hero_damage ?? 0, true],
    [L.tdmg, p.tower_damage ?? 0, o.tower_damage ?? 0, true], [L.deaths, p.deaths, o.deaths, false],
  ];
  const nw = p.networth_t && o.networth_t ? lineChart([{ v: p.networth_t, cls: 'me', label: L.you }, { v: o.networth_t, cls: 'opp', label: c.heroOf(o.hero_id)?.name || L.opp }], { h: 150 }) : '';
  return sec(L.vsPos(pos), `<div class="mx-lane"><table class="mx-table sm"><thead><tr><th></th><th>${ic(c.heroOf(p.hero_id))}${L.you}</th><th>${ic(c.heroOf(o.hero_id))}${esc(c.heroOf(o.hero_id)?.name || '')}</th></tr></thead><tbody>${rows.map(([l, a, b, hi]) => {
    const fmtv = (v: number, i: number) => i === 0 ? (i === 0 && l === 'K/D/A' ? (v === a ? `${p.kills}/${p.deaths}/${p.assists}` : `${o.kills}/${o.deaths}/${o.assists}`) : '') : k1(v);
    const better = hi ? a > b : a < b;
    return `<tr><td>${l}</td><td class="n ${a === b ? '' : better ? 'up' : 'dn'}">${l === 'K/D/A' ? `${p.kills}/${p.deaths}/${p.assists}` : k1(a)}</td><td class="n">${l === 'K/D/A' ? `${o.kills}/${o.deaths}/${o.assists}` : k1(b)}</td></tr>`;
    void fmtv;
  }).join('')}</tbody></table><div>${nw ? `<h4 class="mx-sub">${L.nwChart}</h4>${nw}` : ''}</div></div>`);
}

export function itemsBlock(p: MPlayer, c: MxCtx) {
  const L = t().mx, it = c.items; if (!it) return '';
  const h = c.heroOf(p.hero_id), build = h ? it.heroes[h.name] : undefined;
  // собранные предметы (есть рецепт/компоненты) + важные цельные (Blink, Shard)
  const isAsm = (k: string) => !!it.items[k]?.a || ['blink', 'aghanims_shard'].includes(k);
  const tl = itemTimeline(p, isAsm).filter(x => it.items[x.key]);
  if (!tl.length) return '';
  return sec(L.itemsH, `<ol class="mx-items">${tl.map(x => {
    const r = vsPro(x.key, x.time, build);
    return `<li>${itemIcon(it, x.key)}<span class="nm">${esc(it.items[x.key].n)}</span><b class="n">${mm(x.time)}</b>${r ? `<span class="tag-${r}">${L.vsPro[r]}</span>` : ''}</li>`;
  }).join('')}</ol><p class="note">${L.itemsNote}</p>`);
}

/** Мини-карта: схема Dota (река, линии, базы) + варды, смерти в драках, перемещения в первые 10 минут. */
function miniMap(m: Match, p: MPlayer) {
  const d = mapData(m, p), L = t().mx;
  const X = (v: number) => ((v - 64) / 128) * 300, Y = (v: number) => 300 - ((v - 64) / 128) * 300;
  const maxN = Math.max(1, ...d.path.map(q => q.n));
  const path = d.path.map(q => `<circle cx="${X(q.x)}" cy="${Y(q.y)}" r="${1.4 + 2.6 * q.n / maxN}" class="pp"/>`).join('');
  const ward = (w: { x: number; y: number; obs: boolean }, mine: boolean) => `<circle cx="${X(w.x)}" cy="${Y(w.y)}" r="4" class="wd ${w.obs ? 'obs' : 'sen'} ${mine ? 'mine' : 'en'}"/>`;
  const deaths = d.deaths.map(q => `<g transform="translate(${X(q.x)} ${Y(q.y)})" class="dx"><path d="M-5 -5L5 5M5 -5L-5 5"/></g>`).join('');
  return `<svg class="mmap" viewBox="0 0 300 300" role="img" aria-label="${esc(L.map)}">
    <rect width="300" height="300" rx="6" class="bg"/>
    <path d="M0 300 L0 150 Q60 120 110 135 Q150 150 160 190 Q170 240 150 300Z" class="rad-z"/>
    <path d="M300 0 L300 150 Q240 180 190 165 Q150 150 140 110 Q130 60 150 0Z" class="dire-z"/>
    <path d="M0 95 Q140 150 300 210" class="river"/>
    <path d="M24 276 L24 24 L276 24 M24 276 L276 276 L276 24 M30 270 L270 30" class="lanes"/>
    <circle cx="30" cy="270" r="13" class="anc r"/><circle cx="270" cy="30" r="13" class="anc d"/>
    ${path}${d.enemyWards.map(w => ward(w, false)).join('')}${d.myWards.map(w => ward(w, true)).join('')}${deaths}
  </svg>`;
}

export function deathsBlock(m: Match, p: MPlayer, c: MxCtx) {
  const L = t().mx, dl = p.deaths_log || [], bb = new Set((p.buyback_log || []).map(b => Math.floor(b.time / 60)));
  const list = dl.length ? `<div class="tw"><table class="mx-table sm"><thead><tr><th>${L.time}</th><th>${L.killer}</th><th>${L.goldLost}</th><th>${L.dead}</th></tr></thead><tbody>${dl.map(d => {
    const h = c.heroByNpc(d.key);
    return `<tr><td class="n">${mm(d.time)}${bb.has(Math.floor(d.time / 60)) ? ` <span class="tag-bb">${L.bb}</span>` : ''}</td><td>${h ? ic(h) + esc(h.name) : esc(d.key.replace(/^npc_dota_/, ''))}</td><td class="n">${d.gold_lost ?? '–'}</td><td class="n">${d.time_dead ? d.time_dead + ' ' + L.sec : '–'}</td></tr>`;
  }).join('')}</tbody></table></div>` : `<p class="bans-note">${L.noDeaths}</p>`;
  return sec(L.mapDeaths, `<div class="mx-lane"><div>${miniMap(m, p)}<div class="legend-l"><span class="lg w1">${L.myWards}</span><span class="lg w2">${L.enWards}</span><span class="lg dx1">${L.fightDeaths}</span><span class="lg pp1">${L.path10}</span></div></div><div>${list}</div></div>`);
}

export function fightsBlock(m: Match, p: MPlayer, c: MxCtx) {
  const L = t().mx, f = fights(m, p); if (!f.length) return '';
  return sec(L.fightsH, `<div class="tw"><table class="mx-table"><thead><tr><th>${L.time}</th><th>${L.result}</th><th>${L.kills}</th><th>${L.youIn}</th><th class="c-opt">${L.dmg}</th><th class="c-opt">${L.used}</th></tr></thead><tbody>${f.map(x => `<tr class="${x.won === null ? '' : x.won ? 'fw' : 'fl'}">
    <td class="n">${mm(x.start)}–${mm(x.end)}</td><td>${x.won === null ? L.even : x.won ? L.won : L.lost}</td><td class="n">${x.theirDeaths} : ${x.ourDeaths}</td>
    <td>${x.me.in ? `${x.me.kills ? '⚔ ' + x.me.kills : ''}${x.me.deaths ? ' ✖ ' + x.me.deaths : ''}${!x.me.kills && !x.me.deaths ? '✓' : ''}` : `<span class="miss">${L.absent}</span>`}</td>
    <td class="n c-opt">${x.me.damage ? fmt(x.me.damage) : '–'}</td><td class="c-opt">${x.me.items.slice(0, 4).map(k => c.items?.items[k] ? itemIcon(c.items, k, 'xs') : '').join('')}</td></tr>`).join('')}</tbody></table></div>`);
}

export function damageBlock(p: MPlayer, c: MxCtx) {
  const L = t().mx, d = damage(p); if (!d.dealt.length && !d.taken.length) return '';
  const bars = (list: [string, number][], cls: string) => { const mx = Math.max(1, ...list.map(x => x[1])); return list.slice(0, 5).map(([k, v]) => { const h = c.heroByNpc(k); return `<div class="dmg-row">${ic(h)}<span class="nm">${esc(h?.name || k)}</span><span class="bar-track"><span class="bar ${cls}" style="width:${v / mx * 100}%;left:0"></span></span><b class="n">${fmt(v)}</b></div>`; }).join(''); };
  return sec(L.damageH, `<div class="mx-lane"><div><h4 class="mx-sub">${L.dealt}</h4>${bars(d.dealt, 'up')}</div><div><h4 class="mx-sub">${L.taken}</h4>${bars(d.taken, 'dn')}</div></div>`);
}

export function tipsBlock(m: Match, p: MPlayer, c: MxCtx, base = '') {
  const L = t().mx, it = c.items, h = c.heroOf(p.hero_id);
  const tips = smartTips(m, p, {
    heroName: npc => c.heroByNpc(npc)?.name || npc.replace('npc_dota_hero_', ''), heroById: id => c.heroOf(id)?.name || '?',
    isAssembled: k => !!it?.items[k]?.a && (it?.items[k]?.c ?? 0) >= 1500, build: h && it ? it.heroes[h.name] : undefined,
  });
  if (!tips.length && !base) return '';
  return sec(L.tipsH, `<ol class="m-ins m-smart">${tips.map(x => {
    const v = { ...x.v } as Record<string, string | number>; if (x.key === 'itemLate' && it) v.item = it.items[String(v.item)]?.n || v.item;
    const [fact, adv] = (L.tip[x.key] as (v: Record<string, string | number>) => [string, string])(v);
    return `<li class="t-${x.tone}"><p class="m-fact">${esc(fact)}</p><p class="m-adv">${esc(adv)}</p></li>`;
  }).join('')}</ol>${base}`, 'mx-tips');
}

export function historyBlock(s: HistSummary, c: MxCtx) {
  const L = t().mx;
  return sec(L.histH, `<div class="mx-pills"><span>${L.histWr} <b>${s.wins}/${s.games} (${Math.round(s.wins / (s.games || 1) * 100)}%)</b></span><span>${L.histKda} <b>${s.kda.join(' / ')}</b></span><span>${L.bGpm} <b>${s.gpm}</b></span><span>${L.histTrend} <b class="tr-${s.trend}">${L.trend[s.trend]}</b></span></div>
    <div class="form">${s.form.map(w => `<span class="${w ? 'w' : 'l'}" title="${w ? t().mWin : t().mLoss}"></span>`).join('')}</div>
    <div class="mx-lane"><div><h4 class="mx-sub">${L.histHeroes}</h4>${s.heroes.map(x => `<div class="dmg-row">${ic(c.heroOf(x.hero_id))}<span class="nm">${esc(c.heroOf(x.hero_id)?.name || '?')}</span><b class="n">${x.wins}/${x.games}</b></div>`).join('')}</div>
    <div><h4 class="mx-sub">${L.histWorst}</h4>${s.worst.length ? s.worst.map(x => `<div class="dmg-row">${ic(c.heroOf(x.hero_id))}<span class="nm">${esc(c.heroOf(x.hero_id)?.name || '?')}</span><b class="n dn">${Math.round(x.wr * 100)}% · ${x.games} ${t().games}</b></div>`).join('') : `<p class="bans-note">${L.histNoWorst}</p>`}</div></div>`, 'mx-hist');
}

/** Картинка-итог для «Поделиться» (canvas → PNG). */
export async function shareCard(m: Match, p: MPlayer, c: MxCtx, win: boolean): Promise<Blob | null> {
  const L = t().mx, h = c.heroOf(p.hero_id);
  const cv = document.createElement('canvas'); cv.width = 1200; cv.height = 630; const g = cv.getContext('2d'); if (!g) return null;
  const bgImg = await new Promise<HTMLImageElement | null>(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = new URL('./og.jpg', location.origin + import.meta.env.BASE_URL).href; });
  if (bgImg) g.drawImage(bgImg, 0, 0, 1200, 630);
  g.fillStyle = 'rgba(8,10,13,.78)'; g.fillRect(0, 0, 1200, 630);
  const hi = h ? await new Promise<HTMLImageElement | null>(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = h.img; }) : null;
  if (hi) { g.drawImage(hi, 70, 90, 150, 150); g.strokeStyle = win ? '#5ec44a' : '#e04a35'; g.lineWidth = 6; g.strokeRect(70, 90, 150, 150); }
  g.fillStyle = win ? '#8fe27b' : '#ff7a62'; g.font = '700 34px "Cormorant SC", serif'; g.fillText((win ? t().mWin : t().mLoss).toUpperCase() + ' · ' + mm(m.duration), 250, 125);
  g.fillStyle = '#f3ead2'; g.font = '700 72px "Cormorant SC", serif'; g.fillText(h?.name || '?', 250, 200);
  g.fillStyle = '#e8b84a'; g.font = '600 48px "Golos Text", sans-serif'; g.fillText(`${p.kills} / ${p.deaths} / ${p.assists}`, 250, 260);
  const stats: [string, string][] = [[L.bGpm, String(p.gold_per_min ?? '–')], [L.bXpm, String(p.xp_per_min ?? '–')], [L.lhdn, `${p.last_hits ?? '–'}/${p.denies ?? '–'}`], [L.dmg, k1(p.hero_damage ?? 0)]];
  stats.forEach(([l, v], i) => { const x = 70 + i * 275; g.fillStyle = '#8d949c'; g.font = '500 26px "Golos Text", sans-serif'; g.fillText(l, x, 360); g.fillStyle = '#f3ead2'; g.font = '700 54px "Golos Text", sans-serif'; g.fillText(v, x, 420); });
  g.fillStyle = '#d9b25b'; g.font = '700 30px "Cormorant SC", serif'; g.fillText('Dota 2 ' + t().st.h1b + ' · ' + location.host + import.meta.env.BASE_URL, 70, 570);
  return new Promise(r => cv.toBlob(b => r(b), 'image/png'));
}
