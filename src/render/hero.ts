// Карточка героя (6.3) в <dialog>, адрес /hero/{slug}.
import { pushUrl, replaceUrl } from '../nav.ts';
import { t } from '../i18n.ts';
import { heroProfile, type Matchup } from '../hero.ts';
import { itemAdvice } from '../items.ts';
import { slug } from '../slug.ts';
import { saveState, where } from '../state.ts';
import type { Hero } from '../types.ts';
import { animCanvas, bindAnims } from '../anim/player.ts';
import { tipText, tipTitle } from './tips.ts';
import { buildBlock } from './build.ts';
import { $, esc, sign } from './html.ts';
import type { Ctx } from './draft.ts';

const BASE = import.meta.env.BASE_URL;
let current: Hero | null = null;
let pushed = false;
let baseTitle = '';

export const heroLink = (h: Hero, cls = 'hlink') =>
  `<button class="${cls}" data-hero="${h.i}" title="${esc(t().heroOpen)}">${esc(h.name)}</button>`;

/** Слаг героя из адреса /…/hero/{slug} или null. */
export function slugFromPath(path = location.pathname): string | null {
  const m = path.slice(BASE.length - 1).match(/^\/hero\/([a-z0-9-]+)\/?$/);
  return m ? m[1] : null;
}

function rows(x: Ctx, list: Matchup[]) {
  const H = x.data.heroes;
  return `<div class="bars">${list.map(p => {
    const w = Math.min(100, Math.abs(p.adv) / 5 * 100);
    return `<div class="bar-row"><img class="ic" src="${esc(p.h.img)}" alt="" width="20" height="20">${heroLink(H[p.h.i], 'hlink bar-name')}<span class="bar-track"><span class="bar-mid"></span><span class="bar ${p.adv >= 0 ? 'up' : 'dn'}" style="width:${w / 2}%;${p.adv >= 0 ? 'left:50%' : 'right:50%'}"></span></span><b class="${p.adv >= 0 ? 'up' : 'dn'}">${sign(p.adv)}</b></div>`;
  }).join('')}</div>`;
}

export function renderHero(x: Ctx) {
  const h = current; if (!h) return;
  const L = t(), s = x.state;
  const p = heroProfile(x.data.stats, x.data.heroes, x.data.positions, h, s.src);
  const tips = x.data.tips.filter(tp => tp.h?.includes(h.name));
  const buy = itemAdvice([h.name], s.pos);
  const w = where(s, h.i);
  baseTitle ||= document.title;
  document.title = `${h.name} — ${L.st.title}`;
  $('hero-body').innerHTML = `
    <div class="hd-head">
      <img class="hd-ic" src="${esc(h.img)}" alt="" width="56" height="56">
      <div class="hd-name"><h2 id="hero-title">${esc(h.name)}</h2>
        <span class="roles"><span class="dot ${h.attr}"></span> ${L.attr[h.attr]} · ${h.roles.map(r => L.role[r] || r).join(', ')}</span></div>
      <button class="hd-x" data-hero-close aria-label="${L.heroClose}">×</button>
    </div>
    <div class="hd-actions">
      ${w !== 'enemy' ? `<button class="hd-enemy" data-hero-act="enemy">${L.heroEnemy}</button>` : ''}
      ${w !== 'ally' && s.ally.length < 4 ? `<button class="addbtn" data-hero-act="ally">${L.take}</button>` : ''}
    </div>
    <div class="hd-grid">
      <section><h3>${L.heroPos}</h3><div class="hd-pos">${p.pos.map(o => `<div class="hd-posrow pc-${o.p}"><span>Pos ${o.p}</span><span class="hd-track"><span style="width:${(o.share * 100).toFixed(1)}%"></span></span><b>${Math.round(o.share * 100)}%</b></div>`).join('')}</div></section>
      <section><h3>${L.heroWr}</h3><table class="hd-wr"><tbody>${p.wr.map(r => `<tr${r.src === s.src ? ' class="on"' : ''}><th>${L.src[r.src]}</th><td>${r.wr === null ? L.heroNoGames : r.wr.toFixed(1) + '%'}</td><td>${r.g ? r.g.toLocaleString('ru-RU') + ' ' + L.games : ''}</td></tr>`).join('')}</tbody></table></section>
      <section><h3>${L.heroBeats}</h3>${rows(x, p.beats)}</section>
      <section><h3>${L.heroLoses}</h3>${rows(x, p.losesTo)}</section>
      ${p.bestWith.length ? `<section><h3>${L.heroWith}</h3>${rows(x, p.bestWith)}</section>` : ''}
      ${buy.length ? `<section><h3>${L.heroBuy}</h3><ul class="buy-list">${buy.map(a => `<li><strong>${esc(a.item)}</strong> — ${a.reasons.map(r => esc(L.threatSpecial[h.name + ':' + r.tag] || L.threat[r.tag])).join('; ')}</li>`).join('')}</ul></section>` : ''}
    </div>
    <p class="note">${L.heroSrc(L.src[s.src])}</p>
    ${buildBlock(x.data.items, h.name)}
    ${tips.length ? `<section class="hd-tips"><h3>${L.heroTips}</h3>${tips.map(tp => `<div class="vt">${animCanvas(tp.t, 'anim vt-anim')}<strong>${esc(tipTitle(tp))}</strong><p>${esc(tipText(tp))}</p></div>`).join('')}</section>` : ''}`;
  bindAnims();
}

export function openHero(x: Ctx, id: number, push = true) {
  const h = x.data.heroes[id]; if (!h) return;
  current = h;
  renderHero(x);
  const dlg = $<HTMLDialogElement>('hero');
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
  const url = BASE + 'hero/' + slug(h.name);
  if (push && location.pathname !== url && pushUrl({ hero: h.name }, url)) pushed = true;
}

function hide() {
  const dlg = $<HTMLDialogElement>('hero');
  if (dlg.open) dlg.close();
  current = null;
  if (baseTitle) document.title = baseTitle;
}

/** Закрыть: если карточку открыли кликом — назад по истории, если по прямой ссылке — на главную. */
export function closeHero() {
  if (!current) return;
  if (pushed && history.state?.hero) { history.back(); return; }
  hide();
  if (slugFromPath()) replaceUrl(null, BASE);
}

/** Открыть по адресу (прямая ссылка или «назад/вперёд»). */
export function syncHeroFromPath(x: Ctx) {
  const sl = slugFromPath();
  if (!sl) { hide(); return; }
  const h = x.data.heroes.find(o => slug(o.name) === sl);
  if (h) openHero(x, h.i, false);
  else { replaceUrl(null, BASE); }
}

export function bindHero(x: Ctx, onDraftChange: () => void) {
  const dlg = $<HTMLDialogElement>('hero');
  baseTitle = document.title;
  // Ссылки на героя: имена в слотах, рекомендациях, линии и внутри карточки.
  document.addEventListener('click', e => {
    const el = (e.target as Element).closest<HTMLElement>('[data-hero]'); if (!el) return;
    e.preventDefault(); e.stopPropagation(); openHero(x, +el.dataset.hero!);
  }, true);
  // Пул: правый клик и долгое нажатие.
  const pool = $('pool');
  pool.addEventListener('contextmenu', e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-id]'); if (!b) return;
    e.preventDefault(); openHero(x, +b.dataset.id!);
  });
  let timer = 0, longFired = false;
  pool.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    const b = (e.target as Element).closest<HTMLElement>('[data-id]'); if (!b) return;
    longFired = false;
    timer = window.setTimeout(() => { longFired = true; openHero(x, +b.dataset.id!); }, 500);
  });
  const cancel = () => clearTimeout(timer);
  pool.addEventListener('pointerup', cancel); pool.addEventListener('pointermove', cancel); pool.addEventListener('pointercancel', cancel);
  pool.addEventListener('click', e => { if (longFired) { longFired = false; e.stopPropagation(); e.preventDefault(); } }, true);

  dlg.addEventListener('click', e => {
    const tgt = e.target as Element;
    if (tgt === dlg || tgt.closest('[data-hero-close]')) { closeHero(); return; }
    const act = tgt.closest<HTMLElement>('[data-hero-act]'); if (!act || !current) return;
    const s = x.state, id = current.i, side = act.dataset.heroAct as 'enemy' | 'ally';
    for (const k of ['enemy', 'ally', 'ban'] as const) s[k] = s[k].filter(v => v !== id);
    if (side === 'enemy') { if (s.enemy.length >= 5) s.enemy.shift(); s.enemy.push(id); s.example = false; }
    else { s.ally.push(id); s.you = id; }
    saveState(s, x.data.heroes);
    closeHero(); onDraftChange();
  });
  dlg.addEventListener('cancel', e => { e.preventDefault(); closeHero(); });
  window.addEventListener('popstate', () => syncHeroFromPath(x));
}

/** Перерисовать открытую карточку (смена языка или источника). */
export const refreshHero = (x: Ctx) => { if (current) renderHero(x); };
