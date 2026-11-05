// Фишки: фишка дня, прогресс, фильтры, карточки с анимациями.
import { LANG, t } from '../i18n.ts';
import { loadKnown, saveKnown } from '../state.ts';
import type { Tip } from '../types.ts';
import { animCanvas, bindAnims } from '../anim/player.ts';
import { $, esc } from './html.ts';

export const tipTitle = (x: Tip) => (LANG === 'en' && x.te ? x.te : x.t);
export const tipText = (x: Tip) => (LANG === 'en' && x.de ? x.de : x.d);
const splitLead = (d: string) => { const m = d.match(/^(.+?[.!?])\s(.+)$/); return m ? `<span class="lead">${esc(m[1])}</span> ${esc(m[2])}` : esc(d); };

const tState = { cat: '', lvl: '', q: '', hide: false };
let known = new Set<string>();
let TIPS: Tip[] = [];

/** Фишка дня: одна на сутки, по кругу. */
export const tipOfDay = (tips: Tip[], now = Date.now()) => tips[Math.floor(now / 864e5) % tips.length];

export function renderFeatured() {
  const x = tipOfDay(TIPS), L = t();
  $('featured').innerHTML = `<span class="eyebrow">${L.tipOfDay} · ${L.tcat[x.c]}</span><h3>${esc(tipTitle(x))}</h3><p>${esc(tipText(x))}</p>` + animCanvas(x.t, 'anim feat-anim');
  bindAnims();
}

export function renderTips() {
  const q = tState.q.trim().toLowerCase(), L = t();
  const list = TIPS.map((x, i) => ({ ...x, i })).filter(x =>
    (!tState.cat || x.c === tState.cat) && (!tState.lvl || String(x.l) === tState.lvl) &&
    (!q || (tipTitle(x) + ' ' + tipText(x)).toLowerCase().includes(q)) && !(tState.hide && known.has(x.t)));
  $('tip-count').textContent = list.length + L.of + TIPS.length;
  const k = TIPS.filter(x => known.has(x.t)).length;
  $('prog').style.width = (k / TIPS.length * 100) + '%';
  $('prog-text').textContent = k ? L.learned(k, TIPS.length) : L.learnHint;
  $('tips').innerHTML = list.length ? list.map(x => {
    const kn = known.has(x.t);
    return `<article class="tip c-${x.c}${kn ? ' known' : ''}"><div class="tip-tags"><span class="tag cat-${x.c}">${L.tcat[x.c]}</span><span class="lvl lvl-${x.l}">${L.tlvl[x.l]}</span>${x.r !== 'Все' ? `<span class="tag-role">${esc(L.troles[x.r] || x.r)}</span>` : ''}${x.p ? '<span class="patch">7.41</span>' : ''}</div>${animCanvas(x.t)}<h3>${esc(tipTitle(x))}</h3><p>${splitLead(tipText(x))}</p><div class="tip-foot"><button class="known-btn" data-known="${x.i}" aria-pressed="${kn}">${kn ? '✓ ' + L.known : L.known}</button></div></article>`;
  }).join('') : `<p class="empty-state">${L.noTips}</p>`;
  bindAnims();
  document.querySelectorAll<HTMLElement>('#tip-cats button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === tState.cat)));
  document.querySelectorAll<HTMLElement>('#tip-lvls button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lvl === tState.lvl)));
}

export function renderTipFilters() {
  const L = t();
  $('tip-cats').innerHTML = `<button data-cat="">${L.allCats}</button>` + Object.entries(L.tcat).map(([k, v]) => `<button data-cat="${k}">${v}</button>`).join('');
  $('tip-lvls').innerHTML = `<button data-lvl="">${L.anyLvl}</button>` + Object.entries(L.tlvl).map(([k, v]) => `<button data-lvl="${k}">${v}</button>`).join('');
}

export function bindTips(tips: Tip[]) {
  TIPS = tips; known = loadKnown();
  $('tips').addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-known]'); if (!b) return;
    const k = TIPS[+b.dataset.known!].t;
    if (known.has(k)) known.delete(k); else known.add(k);
    saveKnown(known); renderTips();
  });
  $<HTMLInputElement>('hide-known').addEventListener('change', e => { tState.hide = (e.target as HTMLInputElement).checked; renderTips(); });
  $('tip-cats').addEventListener('click', e => { const b = (e.target as Element).closest<HTMLElement>('button'); if (b) { tState.cat = b.dataset.cat!; renderTips(); } });
  $('tip-lvls').addEventListener('click', e => { const b = (e.target as Element).closest<HTMLElement>('button'); if (b) { tState.lvl = b.dataset.lvl!; renderTips(); } });
  $<HTMLInputElement>('tq').addEventListener('input', e => { tState.q = (e.target as HTMLInputElement).value; renderTips(); });
}
