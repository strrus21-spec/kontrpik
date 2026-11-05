// Сборки предметов: иконки с CDN Valve, при ошибке загрузки — название.
import { t } from '../i18n.ts';
import type { HeroBuild, ItemsData } from '../data.ts';
import { esc } from './html.ts';

const CDN = 'https://cdn.cloudflare.steamstatic.com';
export const PHASES = ['start', 'early', 'mid', 'late'] as const;

export function itemIcon(items: ItemsData, k: string, size = 'md') {
  const it = items.items[k]; if (!it) return '';
  const name = esc(it.n);
  return `<span class="it it-${size}" title="${name}"><img src="${CDN}${esc(it.i)}" alt="${name}" loading="lazy" onerror="this.parentElement.classList.add('noimg')"><span class="it-n">${name}</span></span>`;
}

/** Полная сборка по фазам — в карточку героя. */
export function buildBlock(items: ItemsData | null, hero: string): string {
  const b: HeroBuild | undefined = items?.heroes[hero];
  if (!items || !b) return '';
  const L = t();
  return `<section class="hd-build"><h3>${L.buildH}</h3>${PHASES.filter(p => b[p].length).map(p =>
    `<div class="b-row"><span class="b-ph">${L.buildPh[p]}</span><div class="b-items">${b[p].map(k => itemIcon(items, k)).join('')}</div></div>`).join('')}
    <p class="note">${L.buildNote}</p></section>`;
}

/** Коротко: 3 ключевых предмета середины игры — под рекомендацией. */
export function buildLine(items: ItemsData | null, hero: string): string {
  const b = items?.heroes[hero]; if (!items || !b) return '';
  const core = (b.mid.length ? b.mid : b.late).slice(0, 3);
  if (!core.length) return '';
  return `<div class="b-line"><span class="b-ph">${t().buildCore}</span>${core.map(k => itemIcon(items, k, 'sm')).join('')}</div>`;
}
