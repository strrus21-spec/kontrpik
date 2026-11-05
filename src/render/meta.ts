// Раздел «Мета»: тир-лист, тренд за неделю, главное из патча.
import { LANG, dateOne, t } from '../i18n.ts';
import { pickBaseline, sortRows, tierList, trendMap, type MetaRow, type Snapshot, type SortKey } from '../meta.ts';
import { heroMatch } from '../search.ts';
import type { SrcKey } from '../types.ts';
import { heroLink } from './hero.ts';
import { $, esc, fmt } from './html.ts';
import type { Ctx } from './draft.ts';

interface Patch { version: string; url: string; items: { ru: string; en: string }[] }
const KEY = 'kontrpik-meta';
const ms = { src: 'all' as SrcKey, pos: 0, sort: 'score' as SortKey, dir: -1 as 1 | -1, q: '', all: false };
let trend: { since: string; now: Snapshot; then: Snapshot } | null = null;
let patch: Patch | null = null;

const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ src: ms.src, pos: ms.pos, sort: ms.sort, dir: ms.dir })); } catch { /* ignore */ } };
function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v) {
      if (['all', 'low', 'mid', 'high', 'pro'].includes(v.src)) ms.src = v.src;
      if (Number.isInteger(v.pos) && v.pos >= 0 && v.pos <= 5) ms.pos = v.pos;
      if (['score', 'wr', 'pick', 'trend', 'name'].includes(v.sort)) ms.sort = v.sort;
      if (v.dir === 1 || v.dir === -1) ms.dir = v.dir;
    }
  } catch { /* ignore */ }
}

async function loadExtras(onReady: () => void) {
  const base = import.meta.env.BASE_URL;
  const get = async <T>(p: string): Promise<T | null> => { try { const r = await fetch(base + p); return r.ok ? await r.json() : null; } catch { return null; } };
  const [p, idx] = await Promise.all([get<Patch>('data/patch.json'), get<string[]>('data/history/index.json')]);
  patch = p;
  if (idx && idx.length > 1) {
    const latest = idx[idx.length - 1], since = pickBaseline(idx, latest);
    if (since) {
      const [now, then] = await Promise.all([get<Snapshot>(`data/history/${latest}.json`), get<Snapshot>(`data/history/${since}.json`)]);
      if (now && then) trend = { since, now, then };
    }
  }
  onReady();
}

const trendCell = (v: number | null) => v === null ? '<span class="tr-none">—</span>'
  : `<span class="${v >= 0 ? 'tr-up' : 'tr-dn'}">${v >= 0 ? '▲' : '▼'} ${Math.abs(v).toFixed(1)}</span>`;

export function renderMeta(x: Ctx) {
  const L = t();
  $<HTMLSelectElement>('meta-src').innerHTML = (['all', 'low', 'mid', 'high', 'pro'] as const).map(k => `<option value="${k}"${k === ms.src ? ' selected' : ''}>${L.src[k]}</option>`).join('');
  $('meta-pos').innerHTML = `<button data-mpos="0" aria-pressed="${!ms.pos}">${L.anyPos}</button>` +
    [1, 2, 3, 4, 5].map(p => `<button class="pc-${p}" data-mpos="${p}" aria-pressed="${ms.pos === p}">Pos ${p} · ${L.posn[p]}</button>`).join('');
  const tm = trend ? trendMap(trend.now, trend.then, ms.src) : undefined;
  let rows: MetaRow[] = tierList(x.data.stats, x.data.heroes, x.data.positions, ms.src, ms.pos, tm);
  const q = ms.q.trim().toLowerCase();
  if (q) rows = rows.filter(r => heroMatch(r.h, q));
  if (ms.sort !== 'score') rows = sortRows(rows, ms.sort, ms.dir); else if (ms.dir === 1) rows = [...rows].reverse();
  const total = rows.length, shown = ms.all || q ? rows : rows.slice(0, 30);
  const th = (key: SortKey, label: string, cls = '') => {
    const on = ms.sort === key, aria = on ? (ms.dir === -1 ? 'descending' : 'ascending') : 'none';
    return `<th class="${cls}" aria-sort="${aria}"><button data-msort="${key}" aria-label="${esc(L.sortBy(label))}">${label}${on ? (ms.dir === -1 ? ' ↓' : ' ↑') : ''}</button></th>`;
  };
  $('meta-table').innerHTML = total ? `<table class="tier-table"><colgroup><col class="w-tier"><col><col class="w-num"><col class="w-num"><col class="w-num"><col class="w-games c-games"></colgroup><thead><tr>${th('score', L.metaTier)}${th('name', L.metaHero, 'c-hero')}${th('wr', L.metaWr, 'num')}${th('pick', L.metaPick, 'num')}${th('trend', L.metaTrend, 'num')}<th class="num c-games">${L.metaGames}</th></tr></thead>
    <tbody>${shown.map(r => `<tr><td><span class="tier tier-${r.tier}">${r.tier}</span></td>
      <td class="c-hero"><div><img class="ic" src="${esc(r.h.img)}" alt="" width="22" height="22">${heroLink(r.h)}</div></td>
      <td class="num">${r.wr.toFixed(1)}%</td><td class="num">${r.pick.toFixed(1)}%</td><td class="num">${trendCell(r.trend)}</td><td class="num c-games">${fmt(r.g)}</td></tr>`).join('')}</tbody></table>
    ${total > 30 && !q ? `<button class="more-btn" data-mall>${ms.all ? L.metaLess : L.metaAll(total)}</button>` : ''}`
    : `<p class="empty-state">${L.metaNone}</p>`;
  $('meta-note').textContent = L.metaHow + ' ' + (trend ? L.trendSince(dateOne(LANG, Date.parse(trend.since + 'T00:00:00Z') / 1000)) : L.trendNone);
  const box = $('patch');
  if (patch) {
    box.hidden = false;
    box.innerHTML = `<h2>${L.patchH(esc(patch.version))}</h2><ul class="patch-list">${patch.items.map(i => `<li>${esc(LANG === 'en' ? i.en : i.ru)}</li>`).join('')}</ul>
      <a class="vt-more" href="${esc(patch.url)}" target="_blank" rel="noopener">${L.patchLink}</a>`;
  }
}

export function bindMeta(x: Ctx) {
  load();
  const rerender = () => { save(); renderMeta(x); };
  $<HTMLSelectElement>('meta-src').addEventListener('change', e => { ms.src = (e.target as HTMLSelectElement).value as SrcKey; rerender(); });
  $<HTMLInputElement>('meta-q').addEventListener('input', e => { ms.q = (e.target as HTMLInputElement).value; renderMeta(x); });
  $('meta').addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-mpos],[data-msort],[data-mall]'); if (!b) return;
    e.stopPropagation();
    if (b.dataset.mpos !== undefined) ms.pos = +b.dataset.mpos;
    else if (b.dataset.msort) { const k = b.dataset.msort as SortKey; ms.dir = ms.sort === k ? (ms.dir === -1 ? 1 : -1) : k === 'name' ? 1 : -1; ms.sort = k; }
    else ms.all = !ms.all;
    rerender();
  });
  void loadExtras(() => renderMeta(x));
}
