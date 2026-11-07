// Контрпик: слоты драфта, пул героев, рекомендации, баны, фишки против пика.
import { t, LANG, dateOne, dateRange } from '../i18n.ts';
import { banSuggestions, mainPos, rankPicks, verdictIndex, type PairRow, type PickRow } from '../scoring.ts';
import { heroMatch } from '../search.ts';
import { saveState, toggle, where, type DraftState, type Mode, type Side } from '../state.ts';
import { bonusFor, me, mineLine, pool, renderMe, toggleStar } from '../me.ts';
import { itemAdvice, roleForPos } from '../items.ts';
import { draftQuery } from '../share.ts';
import type { AppData } from '../data.ts';
import type { Hero, Tables } from '../types.ts';
import { animCanvas, bindAnims } from '../anim/player.ts';
import { tipTitle, tipText } from './tips.ts';
import { $, esc, fmt, sign } from './html.ts';
import { heroLink } from './hero.ts';
import { buildLine } from './build.ts';
import { laneFor, laneHints } from '../lane.ts';
import { setOverlayPicks } from './stream.ts';
import { compact, setCompactTop } from '../compact.ts';

export interface Ctx { data: AppData; state: DraftState }

let topPick: Hero | null = null;
const LIM: Partial<Record<Side, number>> = { enemy: 5, ally: 4 };
const ic = (h: Hero) => `<img class="ic" src="${esc(h.img)}" alt="" width="22" height="22">`;

const tables = ({ data, state }: Ctx): Tables => (state.src === 'pro' ? data.stats.pro : data.stats.pub[state.src]);
const save = (x: Ctx) => saveState(x.state, x.data.heroes);

const posBadges = (x: Ctx, h: Hero) =>
  mainPos(h, x.data.positions).slice(0, 2).map(p => `<span class="posb${x.state.pos == p ? ' on' : ''}">Pos ${p}</span>`).join('');

export function renderSlots(x: Ctx) {
  const H = x.data.heroes, s = x.state, L = t();
  const tile = (side: Side, id: number) =>
    `<span class="slot"><span class="por">${ic(H[id])}</span>${heroLink(H[id], 'sname hlink')}<button class="x" data-rm="${side}:${id}" aria-label="${L.remove} ${esc(H[id].name)}">×</button></span>`;
  for (const side of ['enemy', 'ally', 'ban'] as Side[]) {
    let html = '';
    if (side === 'ally') {
      const sug = topPick;
      html += `<span class="slot you">${sug ? `<span class="por ghost">${ic(sug)}</span><span class="sname">${esc(sug.name)}?</span>` : `<span class="por q">?</span><span class="sname">${L.you}</span>`}<span class="you-tag">${L.youTag}</span></span>`;
    }
    html += s[side].map(id => tile(side, id)).join('');
    for (let i = 0; i < (LIM[side] || 0) - s[side].length; i++) html += `<span class="slot empty"><span class="por"></span><span class="sname">${L.empty}</span></span>`;
    if (side === 'ban' && !s.ban.length) html = `<span class="slot empty ban-empty">${L.noBans}</span>`;
    $('slots-' + side).innerHTML = html;
  }
  $('exampleTag').hidden = !s.example;
}

export function renderPool(x: Ctx) {
  const q = x.state.q.trim().toLowerCase(), L = t();
  let html = '';
  for (const a of ['str', 'agi', 'int', 'all'] as const) {
    const list = x.data.heroes.filter(h => h.attr === a && heroMatch(h, q));
    if (!list.length) continue;
    html += `<div class="attr-group g-${a}"><div class="attr-label"><span class="dot ${a}"></span>${L.attr[a]}</div><div class="grid">` +
      list.map(h => {
        const w = where(x.state, h.i), star = me.stars.has(h.name);
        const pressed = x.state.mode === 'star' ? star : !!w;
        return `<button title="${esc(L.heroPoolTitle)}" class="hero a-${h.attr} ${w ? 'is-' + w : ''}${star ? ' is-star' : ''}" data-id="${h.i}" aria-pressed="${pressed}">${ic(h)}${esc(h.name)}${star ? '<span class="star" aria-hidden="true">★</span>' : ''}</button>`;
      }).join('') +
      `</div></div>`;
  }
  // Компактный режим: пул показываем только по поиску.
  if (compact && !q) html = '';
  $('pool').innerHTML = html || (compact && !q ? '' : `<p class="empty-state">${L.noHero}</p>`);
}

function renderMeta(x: Ctx) {
  const pro = x.state.src === 'pro', L = t(), st = x.data.stats;
  $('legend').innerHTML = `<span>${L.legend(!pro)}</span>`;
  const g = fmt(st.counts[x.state.src as Exclude<typeof x.state.src, 'pro'>]), range = dateRange(LANG, st.from, st.to);
  $('note').textContent = (pro ? L.notePro(dateOne(LANG, st.rankSnap ?? st.updated))
    : st.source === 'steam' ? L.notePubSteam(g, range, dateOne(LANG, st.rankSnap ?? st.updated), x.state.src !== 'all')
    : L.notePub(g, range)) + L.notePos;
}

function renderBans(x: Ctx) {
  const box = $('bans'), s = x.state, L = t(), H = x.data.heroes;
  if (!s.ally.length) { box.hidden = true; return; }
  const list = banSuggestions(tables(x), x.data.stats.n, H, s);
  box.hidden = false;
  box.innerHTML = `<div class="bans-head"><h3>${L.bansH}</h3><span>${L.bansS}</span></div><div class="ban-list">${list.map(b =>
    `<button class="ban-chip" data-ban="${b.h.i}" title="${L.bansT} ${esc(H[b.worst.a].name)} (${sign(b.worst.adv)})"><img class="ic" src="${esc(b.h.img)}" alt="" width="22" height="22"><span>${esc(b.h.name)}</span><b>${sign(b.s)}</b></button>`).join('')}</div><p class="bans-note">${L.bansN}</p>`;
}

export function renderVsTips(x: Ctx) {
  const box = $('vs-tips'), L = t();
  const names = new Set(x.state.enemy.map(i => x.data.heroes[i].name));
  const list = x.data.tips.filter(tp => tp.h && tp.h.some(n => names.has(n))).slice(0, 3);
  if (!list.length) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = `<h3>${L.vsTipsH}</h3>` + list.map(tp => `<div class="vt">${animCanvas(tp.t, 'anim vt-anim')}<strong>${esc(tipTitle(tp))}</strong><p>${esc(tipText(tp))}</p></div>`).join('') +
    `<a href="#tips-block" class="vt-more">${L.allTips}</a>`;
  bindAnims();
}

export function renderLane(x: Ctx) {
  const box = $('lane'), s = x.state, L = t(), H = x.data.heroes;
  const you = s.you !== null && s.ally.includes(s.you) ? H[s.you] : topPick;
  const lane = you && s.pos ? laneFor(tables(x), x.data.stats.n, you, s.pos, s.enemy.map(i => H[i]), x.data.positions) : null;
  if (!lane || !you) { box.hidden = true; return; }
  const names = lane.opponents.map(o => `${heroLink(o.h)} <span class="posb">Pos ${o.pos}</span>`);
  const list = names.length > 1 ? names.slice(0, -1).join(', ') + L.and + names[names.length - 1] : names[0];
  box.hidden = false;
  box.className = `bans lane lane-${lane.level}`;
  box.innerHTML = `<div class="bans-head"><h3>${L.laneH}</h3><span>${L.laneFor(esc(you.name))}</span></div>
    <p class="lane-vs">${L.laneVs(list)} · <b class="lane-level">${L.laneLevel[lane.level]}</b> <span class="lane-sum">${sign(lane.sum)}</span></p>
    <ul class="lane-hints">${laneHints(lane, s.pos).map(hn => `<li>${esc(L.laneHint[hn.key].replace('{h}', hn.hero || ''))}</li>`).join('')}</ul>`;
}

export function renderBuy(x: Ctx) {
  const box = $('buy'), L = t(), s = x.state;
  if (!s.enemy.length) { box.hidden = true; return; }
  const names = s.enemy.map(i => x.data.heroes[i].name);
  const list = itemAdvice(names, s.pos);
  const role = roleForPos(s.pos);
  const joinNames = (hs: string[]) => { const b = hs.map(h => `<b>${esc(h)}</b>`); return b.length > 1 ? b.slice(0, -1).join(', ') + L.and + b[b.length - 1] : b[0]; };
  box.hidden = false;
  box.innerHTML = `<div class="bans-head"><h3>${L.buyH}</h3><span>${role === 'support' ? L.buySup : L.buyCore}</span></div>` + (list.length
    ? `<ul class="buy-list">${list.map(a => `<li><strong>${esc(a.item)}</strong> — ${a.reasons.map(r => {
        const what = r.heroes.length === 1 && L.threatSpecial[r.heroes[0] + ':' + r.tag] || L.threat[r.tag];
        return L.buyReason(joinNames(r.heroes), what);
      }).join('; ')}</li>`).join('')}</ul>`
    : `<p class="bans-note">${L.buyNone}</p>`);
}

export function renderResults(x: Ctx) {
  const out = $('out'), s = x.state, L = t(), H = x.data.heroes;
  renderMeta(x); renderBans(x); renderBuy(x); renderVsTips(x);
  if (!s.enemy.length && !s.ally.length) {
    out.innerHTML = `<p class="empty-state">${L.noPick}</p>`;
    if (topPick) { topPick = null; renderSlots(x); }
    setOverlayPicks(x, []); setCompactTop([]);
    renderLane(x);
    return;
  }
  const pro = s.src === 'pro';
  let rows = rankPicks({ T: tables(x), n: x.data.stats.n, heroes: H, positions: x.data.positions, draft: s, pos: s.pos, role: s.role, pro });
  if (me.only) {
    // «Только мои герои»: статистический счёт + бонус за личный винрейт (алгоритм раздела 4 не меняется).
    const mine = pool();
    rows = rows.filter(r => mine.has(r.h.name)).map(r => ({ ...r, score: r.score + bonusFor(r.h.name) })).sort((a, b) => b.score - a.score);
    if (!rows.length) {
      out.innerHTML = `<p class="empty-state">${mine.size ? L.meNoFit : L.meEmpty}</p>`;
      if (topPick) { topPick = null; renderSlots(x); }
      setOverlayPicks(x, []); setCompactTop([]);
      renderLane(x);
      return;
    }
  }
  const mineP = (r: PickRow, cls: string) => { const m = mineLine(r.h.name); return m ? `<p class="${cls}">${esc(m)}</p>` : ''; };
  const bars = (list: PairRow[], label: string) => list.length ? `<div class="bars"><span class="bars-label">${label}</span>${list.map(p => {
    const w = Math.min(100, Math.abs(p.adv) / 5 * 100), low = p.g < (pro ? 20 : 200) ? ' low' : '';
    return `<div class="bar-row${low}" title="${fmt(p.g)} ${L.games}${p.raw != null ? ', ' + L.pairWr + ' ' + p.raw.toFixed(1) + '%' : ''}">${ic(H[p.e])}<span class="bar-name">${esc(H[p.e].name)}</span><span class="bar-track"><span class="bar-mid"></span><span class="bar ${p.adv >= 0 ? 'up' : 'dn'}" style="width:${w / 2}%;${p.adv >= 0 ? 'left:50%' : 'right:50%'}"></span></span><b class="${p.adv >= 0 ? 'up' : 'dn'}">${sign(p.adv)}</b></div>`;
  }).join('')}</div>` : '';
  const why = (r: PickRow) => {
    const all = [...r.cs, ...r.ss].sort((a, b) => b.adv - a.adv);
    const best = all.filter(p => p.adv > 0.5).slice(0, 2), worst = all.filter(p => p.adv < -0.5).slice(-1);
    const vsB = best.filter(p => !r.ss.includes(p)).map(p => '<b>' + esc(H[p.e].name) + '</b>');
    const wB = best.filter(p => r.ss.includes(p)).map(p => '<b>' + esc(H[p.e].name) + '</b>');
    const parts: string[] = [];
    if (vsB.length) parts.push(L.vs + vsB.join(L.and));
    if (wB.length) parts.push(L.with + wB.join(L.and));
    let txt = parts.length ? L.strongest + parts.join(L.alsoJoin) : L.even;
    if (worst.length) txt += L.careful + '<b>' + esc(H[worst[0].e].name) + '</b>';
    return txt + '.';
  };
  const verdict = (v: number) => L.verdict[verdictIndex(v)];
  const top = rows.slice(0, 3), rest = rows.slice(3, 15);
  setOverlayPicks(x, rows); setCompactTop(rows);
  const prevTop = topPick; topPick = top[0] ? top[0].h : null;
  if (prevTop !== topPick) renderSlots(x);
  renderLane(x);
  const take = (r: PickRow) => (s.ally.length < 4 ? `<button class="addbtn" data-take="${r.h.i}">${L.take}</button>` : '');
  out.innerHTML = `<div class="podium">${top.map((r, i) => `<article class="top">
      <div class="top-head"><img class="ic-big" src="${esc(r.h.img)}" alt="" width="44" height="44"><div class="top-name"><span class="place">${L.place(i + 1)}</span><strong>${heroLink(r.h)}</strong><span class="roles">${posBadges(x, r.h)}</span></div>
      <div class="score big ${r.score >= 0 ? 'pos' : 'neg'}">${sign(r.score)}<small>${verdict(r.score)}</small></div></div>
      <p class="why">${why(r)}</p>${mineP(r, 'mine')}
      ${bars(r.cs, L.vsEnemies)}${bars(r.ss, L.withAllies)}
      ${buildLine(x.data.items, r.h.name)}
      ${take(r)}</article>`).join('')}</div>
    ${rest.length ? `<h3 class="more">${L.more}</h3><ol class="picks" start="4">${rest.map((r, i) => `<li class="pick"><span class="rank">${i + 4}</span>
      <div class="pname">${ic(r.h)}${heroLink(r.h)} <span class="roles">${posBadges(x, r.h)}</span></div>
      <div class="score ${r.score >= 0 ? 'pos' : 'neg'}">${sign(r.score)}</div>
      <p class="why small">${why(r)}</p>${mineP(r, 'mine small')}
      ${take(r)}</li>`).join('')}</ol>` : ''}`;
}

export function renderPosChips(x: Ctx) {
  const L = t();
  // одна полоса: Любая · Pos 1…5 · ★ Мои (переключатель «Только мои герои»)
  $('poschips').innerHTML = `<button data-pos="0" aria-pressed="${!x.state.pos}" title="${esc(L.anyPos)}">${L.posShort}</button>` +
    [1, 2, 3, 4, 5].map(p => `<button class="pc-${p}" data-pos="${p}" aria-pressed="${x.state.pos == p}" title="Pos ${p} · ${esc(L.posn[p])}">Pos ${p}</button>`).join('') +
    `<label class="mine-tab" id="mine-tab" title="${esc(L.meOnly)}"><input type="checkbox" id="me-only" ${me.only ? 'checked' : ''} aria-label="${esc(L.meOnly)}"><span>★ ${L.meTab}</span></label>`;
  const lg = document.getElementById('pos-legend'); if (lg) lg.textContent = L.posLegend;
  renderMe();
}

export function renderSelects(x: Ctx) {
  const L = t();
  const src = $<HTMLSelectElement>('src');
  src.innerHTML = (['all', 'low', 'mid', 'high', 'pro'] as const).map(k => `<option value="${k}">${L.src[k]}</option>`).join('');
  src.value = x.state.src;
  const role = $<HTMLSelectElement>('role');
  role.innerHTML = `<option value="">${L.allRoles}</option>` + Object.entries(L.role).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  role.value = x.state.role;
}

export function renderDraft(x: Ctx) {
  document.querySelectorAll<HTMLButtonElement>('.mode button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === x.state.mode)));
  renderSlots(x); renderPool(x); renderResults(x);
}

let shareTimer = 0;
async function copyLink(x: Ctx, btn: HTMLButtonElement) {
  const L = t();
  const url = location.origin + location.pathname + '?' + draftQuery(x.state, x.data.heroes);
  const msg = $('share-msg');
  try { await navigator.clipboard.writeText(url); msg.textContent = L.copied; }
  catch { msg.innerHTML = `${L.copyFail} <input class="share-url" readonly value="${esc(url)}" aria-label="${esc(L.copyLink)}">`; (msg.querySelector('input') as HTMLInputElement).select(); }
  msg.hidden = false; btn.setAttribute('aria-describedby', 'share-msg');
  clearTimeout(shareTimer); shareTimer = window.setTimeout(() => { if (msg.textContent === L.copied) msg.hidden = true; }, 2500);
}

export function bindDraft(x: Ctx) {
  const s = x.state;
  const commit = () => { save(x); renderDraft(x); };
  $('bans').addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-ban]'); if (!b) return;
    e.stopPropagation(); const id = +b.dataset.ban!;
    if (!where(s, id)) { s.ban.push(id); commit(); }
  });
  $('poschips').addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-pos]'); if (!b) return;
    e.stopPropagation(); s.pos = +b.dataset.pos!; save(x); renderPosChips(x); renderResults(x);
  });
  $<HTMLSelectElement>('role').addEventListener('change', e => { s.role = (e.target as HTMLSelectElement).value; save(x); renderResults(x); });
  $<HTMLSelectElement>('src').addEventListener('change', e => { s.src = (e.target as HTMLSelectElement).value as DraftState['src']; save(x); renderResults(x); });
  $<HTMLInputElement>('q').addEventListener('input', e => { s.q = (e.target as HTMLInputElement).value; renderPool(x); });
  document.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button'); if (!b) return;
    const d = b.dataset;
    if (d.mode) { s.mode = d.mode as Mode; commit(); }
    else if (d.id && s.mode === 'star') { toggleStar(x.data.heroes[+d.id].name); renderMe(); renderPool(x); renderResults(x); }
    else if (d.id) { toggle(s, +d.id); commit(); }
    else if (d.share !== undefined) { copyLink(x, b); }
    else if (d.rm) { const [side, id] = d.rm.split(':'); s[side as Side] = s[side as Side].filter(v => v !== +id); if (s.you === +id) s.you = null; commit(); }
    else if (d.clear) { s[d.clear as Side] = []; if (d.clear === 'enemy') s.example = false; if (d.clear === 'ally') s.you = null; commit(); }
    else if (d.take) { const id = +d.take; if (!where(s, id) && s.ally.length < 4) { s.ally.push(id); s.you = id; commit(); } }
  });
}
