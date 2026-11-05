// Раздел «Разбор матча» (6.6). Адрес для «Поделиться»: /match/{id}?p={slot}.
import { replaceUrl } from '../nav.ts';
import { LANG, dateOne, t } from '../i18n.ts';
import { analyzeMatch, isRadiant, loadParsed, parseMatchId, recentMatches, won, type Match, type MPlayer, type RecentMatch } from '../match.ts';
import { odHeroes, type OdHero } from '../odHeroes.ts';
import { me } from '../me.ts';
import type { Hero } from '../types.ts';
import { $, esc } from './html.ts';
import type { Ctx } from './draft.ts';

const BASE = import.meta.env.BASE_URL;
let current: { match: Match; slot: number | null } | null = null;
let recent: RecentMatch[] | null = null;
let od: Map<number, OdHero> | null = null;
let runId = 0;

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const matchFromPath = (path = location.pathname) => { const m = path.slice(BASE.length - 1).match(/^\/match\/(\d{6,12})\/?$/); return m ? Number(m[1]) : null; };

function heroOf(x: Ctx, heroId: number): Hero | undefined {
  const byOd = x.data.heroes.find(h => h.odId === heroId);
  if (byOd) return byOd;
  const name = od?.get(heroId)?.name;
  return name ? x.data.heroes.find(h => h.name === name) : undefined;
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
  list.innerHTML = recent ? `<h3 class="m-h">${L.mRecentH}</h3><div class="m-recent">${recent.map(r => {
    const h = heroOf(x, r.hero_id);
    return `<button class="m-rec ${won(r) ? 'w' : 'l'}" data-mid="${r.match_id}" data-slot="${r.player_slot}">${icon(h)}<span>${esc(h?.name || '?')}</span><b>${r.kills}/${r.deaths}/${r.assists}</b><small>${won(r) ? L.mWin : L.mLoss} · ${dateOne(LANG, r.start_time)}</small></button>`;
  }).join('')}</div>` : '';
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
    <ol class="m-ins">${ins.map(i => `<li class="t-${i.tone}"><p class="m-fact">${esc((L.ins[i.kind] as (v: unknown) => string)(i.v))}</p>${L.adv[i.kind][i.tone] ? `<p class="m-adv">${esc(L.adv[i.kind][i.tone])}</p>` : ''}</li>`).join('')}</ol>
    <div class="m-foot"><button class="share" data-mshare>${L.mShare}</button><button class="clear" data-mother>${L.mOther}</button>
      <a class="vt-more" href="https://www.opendota.com/matches/${m.match_id}" target="_blank" rel="noopener">${L.mOnOD}</a><span id="m-share-msg" class="share-msg" role="status"></span></div>`;
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
  if (push) updateUrl(); 
  $('match').scrollIntoView({ block: 'start' });
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
    recent = await recentMatches(me.player.id);
    status(recent ? null : t().mNet, !recent);
    renderMatch(x);
  });
  $('match').addEventListener('click', async e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-mid],[data-pslot],[data-mshare],[data-mother]'); if (!b) return;
    e.stopPropagation();
    if (b.dataset.mid) { ($('match-id') as HTMLInputElement).value = b.dataset.mid; void analyze(x, +b.dataset.mid, +b.dataset.slot!); }
    else if (b.dataset.pslot && current) { current.slot = +b.dataset.pslot; renderMatch(x); updateUrl(); }
    else if (b.dataset.mother !== undefined && current) { current.slot = null; renderMatch(x); updateUrl(); }
    else if (b.dataset.mshare !== undefined && current) {
      updateUrl();
      const url = location.origin + location.pathname + location.search, msg = $('m-share-msg');
      try { await navigator.clipboard.writeText(url); msg.textContent = t().copied; } catch { msg.textContent = url; }
    }
  });
}

/** Прямая ссылка /match/{id}?p={slot}. */
export function syncMatchFromPath(x: Ctx) {
  const id = matchFromPath(); if (!id) return;
  const p = new URLSearchParams(location.search).get('p');
  ($('match-id') as HTMLInputElement).value = String(id);
  void analyze(x, id, p !== null && /^\d+$/.test(p) ? +p : null, false);
}
