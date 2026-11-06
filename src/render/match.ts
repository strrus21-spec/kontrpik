import { currentTab, showTab } from '../tabs.ts';
// Раздел «Разбор матча» (6.6). Адрес для «Поделиться»: /match/{id}?p={slot}.
import { replaceUrl } from '../nav.ts';
import { LANG, dateOne, t } from '../i18n.ts';
import { analyzeMatch, isRadiant, loadParsed, parseMatchId, recentMatches, won, type Match, type MPlayer, type RecentMatch } from '../match.ts';
import { odHeroes, type OdHero } from '../odHeroes.ts';
import { me } from '../me.ts';
import type { Hero } from '../types.ts';
import { $, esc } from './html.ts';
import { positionOf } from '../matchx.ts';
import { damageBlock, deathsBlock, fightsBlock, historyBlock, itemsBlock, laneBlock, posBlock, shareCard, statsBlock, summaryBlock, teamsBlock, tipsBlock, type MxCtx } from './matchx.ts';
import { loadHistory, summarize, type HistSummary } from '../history.ts';
import type { Ctx } from './draft.ts';

const BASE = import.meta.env.BASE_URL;
let current: { match: Match; slot: number | null } | null = null;
let recent: RecentMatch[] | null = null;
let od: Map<number, OdHero> | null = null;
let runId = 0;
let hist: HistSummary | null = null;

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const matchFromPath = (path = location.pathname) => { const m = path.slice(BASE.length - 1).match(/^\/match\/(\d{6,12})\/?$/); return m ? Number(m[1]) : null; };

function heroOf(x: Ctx, heroId: number): Hero | undefined {
  const byOd = x.data.heroes.find(h => h.odId === heroId);
  if (byOd) return byOd;
  const name = od?.get(heroId)?.name;
  return name ? x.data.heroes.find(h => h.name === name) : undefined;
}
function heroByNpc(x: Ctx, npc: string): Hero | undefined {
  for (const h of od?.values() || []) if (h.npc === npc) return x.data.heroes.find(y => y.name === h.name);
  return undefined;
}
const icon = (h: Hero | undefined, size = 22) => h ? `<img class="ic" src="${esc(h.img)}" alt="" width="${size}" height="${size}">` : '';

function status(text: string | null, err = false) {
  const el = $('match-status'); el.hidden = !text; el.textContent = text || ''; el.classList.toggle('err', err);
}

export function renderMatch(x: Ctx) {
  const L = t();
  const rb = $<HTMLButtonElement>('match-recent');
  rb.textContent = L.mRecent;
  const list = $('match-recent-list');
  const mx: MxCtx = { heroOf: id => heroOf(x, id), heroByNpc: npc => heroByNpc(x, npc), items: x.data.items };
  list.innerHTML = (hist ? historyBlock(hist, mx) : '') + (recent ? `<h3 class="m-h">${L.mRecentH}</h3><div class="m-recent">${recent.map(r => {
    const h = heroOf(x, r.hero_id);
    return `<button class="m-rec ${won(r) ? 'w' : 'l'}" data-mid="${r.match_id}" data-slot="${r.player_slot}">${icon(h)}<span>${esc(h?.name || '?')}</span><b>${r.kills}/${r.deaths}/${r.assists}</b><small>${won(r) ? L.mWin : L.mLoss} · ${dateOne(LANG, r.start_time)}</small></button>`;
  }).join('')}</div>` : '');
  const out = $('match-out');
  if (!current) { out.innerHTML = ''; return; }
  const m = current.match;
  const p = current.slot !== null ? m.players.find(pl => pl.player_slot === current!.slot) : undefined;
  if (!p) {
    out.innerHTML = `<p class="bans-note">${L.mWho}</p><div class="m-pick">${m.players.map(pl => {
      const h = heroOf(x, pl.hero_id);
      return `<button class="m-rec ${isRadiant(pl) ? 'rad' : 'dire'}" data-pslot="${pl.player_slot}">${icon(h)}<span>${esc(h?.name || '?')}</span><b>${pl.kills}/${pl.deaths}/${pl.assists}</b></button>`;
    }).join('')}</div>`;
    return;
  }
  const h = heroOf(x, p.hero_id);
  const win = m.radiant_win === isRadiant(p);
  const ins = analyzeMatch(m, p, od?.get(p.hero_id)?.npc);
  out.innerHTML = `<div class="m-head ${win ? 'w' : 'l'}">${icon(h, 44).replace('class="ic"', 'class="ic-big"')}
      <div class="m-title"><span class="place">${win ? L.mWin : L.mLoss} · ${mmss(m.duration)} · ${dateOne(LANG, m.start_time)}</span>
      <strong>${L.mFor(esc(h?.name || '?'))}</strong><span class="roles">${p.kills}/${p.deaths}/${p.assists}${p.personaname ? ' · ' + esc(p.personaname) : ''}</span></div></div>
    ${tipsBlock(m, p, mx, `<ol class="m-ins m-base">${ins.map(i => `<li class="t-${i.tone}"><p class="m-fact">${esc((L.ins[i.kind] as (v: unknown) => string)(i.v))}</p>${L.adv[i.kind][i.tone] ? `<p class="m-adv">${esc(L.adv[i.kind][i.tone])}</p>` : ''}</li>`).join('')}</ol>`)}
    ${summaryBlock(m, p, mx)}${statsBlock(m, p)}${laneBlock(m, p, mx)}${posBlock(m, p, mx)}${itemsBlock(p, mx)}
    ${deathsBlock(m, p, mx)}${fightsBlock(m, p, mx)}${damageBlock(p, mx)}${teamsBlock(m, p, mx)}
    <div class="m-stick" id="m-stick" aria-hidden="true"><div class="in">${icon(h, 30)}<span class="res ${win ? 'w' : 'l'}">${win ? L.mWin : L.mLoss}</span><b class="nm">${esc(h?.name || '?')}</b><span class="kda">${p.kills}/${p.deaths}/${p.assists}</span>
      <span class="sw" role="group" aria-label="${esc(L.mx.stickPick)}"><span class="lb">${L.mx.stickPick}</span>${[true, false].map(rad => `<span class="tm ${rad ? 'rad' : 'dire'}">${m.players.filter(pl => isRadiant(pl) === rad).sort((a, b) => (positionOf(m, a) ?? 9) - (positionOf(m, b) ?? 9)).map(pl => {
        const hh = heroOf(x, pl.hero_id); return `<button class="${pl === p ? 'on' : ''}" data-pslot="${pl.player_slot}" title="${esc(hh?.name || '?')}" tabindex="-1">${icon(hh, 28)}</button>`;
      }).join('')}</span>`).join('')}</span></div></div>
    <div class="m-foot"><button class="share" data-mshare>${L.mShare}</button><button class="share" data-mcard>${L.mx.shareImg}</button><button class="clear" data-mother>${L.mOther}</button>
      <a class="vt-more" href="https://www.opendota.com/matches/${m.match_id}" target="_blank" rel="noopener">${L.mOnOD}</a><span id="m-share-msg" class="share-msg" role="status"></span></div>`;
  requestAnimationFrame(stick);
}

async function analyze(x: Ctx, id: number, slot: number | null, push = true) {
  const L = t(), my = ++runId;
  current = null; renderMatch(x); status(L.mLoading);
  try { od = await odHeroes(); } catch { od = null; }
  const r = await loadParsed(id, { onProgress: s => { if (my === runId) status(t().mParsing(mmss(s))); } });
  if (my !== runId) return;
  if (!r.ok) { status(r.reason === 'notFound' ? L.mNotFound : r.reason === 'timeout' ? L.mTimeout : L.mNet, true); return; }
  status(null);
  const mine = me.player ? r.match.players.find(p => p.account_id === me.player!.id) : undefined;
  current = { match: r.match, slot: slot ?? mine?.player_slot ?? null };
  renderMatch(x);
  // Пока шла загрузка, игрок мог уйти на другую вкладку — не перетаскиваем его обратно.
  if (push && currentTab() === 'match') updateUrl();
}

function updateUrl() {
  if (!current) return;
  const url = BASE + 'match/' + current.match.match_id + (current.slot !== null ? '?p=' + current.slot : '');
  if (location.pathname + location.search !== url) replaceUrl(history.state, url);
}

export function bindMatch(x: Ctx) {
  $('match-form').addEventListener('submit', e => {
    e.preventDefault();
    const id = parseMatchId(($('match-id') as HTMLInputElement).value);
    if (!id) { status(t().mBad, true); return; }
    void analyze(x, id, null);
  });
  $('match-recent').addEventListener('click', async e => {
    e.stopPropagation();
    if (!me.player) { status(t().mNeedMe, true); return; }
    status(t().mLoading);
    try { od = await odHeroes(); } catch { /* иконки по odId из данных */ }
    const [rm, hs] = await Promise.all([recentMatches(me.player.id), loadHistory(me.player.id)]);
    recent = rm; hist = hs ? summarize(hs) : null;
    status(recent ? null : t().mNet, !recent);
    renderMatch(x);
  });
  $('match').addEventListener('click', async e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-mid],[data-pslot],[data-mshare],[data-mother],[data-mcard]'); if (!b) return;
    e.stopPropagation();
    if (b.dataset.mid) { ($('match-id') as HTMLInputElement).value = b.dataset.mid; void analyze(x, +b.dataset.mid, +b.dataset.slot!); }
    else if (b.dataset.pslot && current) {
      current.slot = +b.dataset.pslot; renderMatch(x); updateUrl();
      // из таблицы команд — к началу разбора; из прилипающей полоски — остаёмся на том же месте
      const head = document.querySelector<HTMLElement>('#match-out .m-head');
      if (b.dataset.top !== undefined && head) scrollTo({ top: scrollY + head.getBoundingClientRect().top - (document.getElementById('topbar')?.offsetHeight ?? 0) - 12 });
      stick();
    }
    else if (b.dataset.mcard !== undefined && current) {
      const m = current.match, p = m.players.find(pl => pl.player_slot === current!.slot); if (!p) return;
      const blob = await shareCard(m, p, { heroOf: id => heroOf(x, id), heroByNpc: n => heroByNpc(x, n), items: x.data.items }, m.radiant_win === isRadiant(p));
      if (!blob) return;
      const file = new File([blob], `match-${m.match_id}.png`, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (nav.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch { /* отмена */ } }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      $('m-share-msg').textContent = t().mx.shareImgDone;
    }
    else if (b.dataset.mother !== undefined && current) { current.slot = null; renderMatch(x); updateUrl(); }
    else if (b.dataset.mshare !== undefined && current) {
      updateUrl();
      const url = location.origin + location.pathname + location.search, msg = $('m-share-msg');
      try { await navigator.clipboard.writeText(url); msg.textContent = t().copied; } catch { msg.textContent = url; }
    }
  });
}

/** Прилипающая полоска разбора: видна, когда шапка разбора ушла под меню, а сам разбор ещё на экране. */
function stick() {
  const st = document.getElementById('m-stick'), head = document.querySelector<HTMLElement>('#match-out .m-head'), foot = document.querySelector<HTMLElement>('#match-out .m-foot');
  if (!st || !head || !foot) return;
  const tb = document.getElementById('topbar');
  // меню сжимается при прокрутке с анимацией — пересчитываем отступ, когда она закончится
  if (tb && !tbBound) { tbBound = true; tb.addEventListener('transitionend', () => stick()); }
  const top = Math.max(0, tb?.getBoundingClientRect().bottom ?? 0);
  const on = head.getBoundingClientRect().bottom < top && foot.getBoundingClientRect().top > top + 60 && !$('match').hidden;
  st.style.top = top + 'px';
  if (st.classList.contains('on') !== on) { st.classList.toggle('on', on); st.setAttribute('aria-hidden', String(!on)); st.querySelectorAll('button').forEach(b => b.tabIndex = on ? 0 : -1); }
}
let stickQueued = false, tbBound = false;
addEventListener('scroll', () => { if (!stickQueued) { stickQueued = true; requestAnimationFrame(() => { stickQueued = false; stick(); }); } }, { passive: true });
addEventListener('resize', () => stick());

/** Прямая ссылка /match/{id}?p={slot}. */
export function syncMatchFromPath(x: Ctx) {
  const id = matchFromPath(); if (!id) return;
  const h = location.hash.slice(1);
  if (!h || h === 'match') showTab('match', { scroll: false });
  const p = new URLSearchParams(location.search).get('p');
  ($('match-id') as HTMLInputElement).value = String(id);
  void analyze(x, id, p !== null && /^\d+$/.test(p) ? +p : null, false);
}
