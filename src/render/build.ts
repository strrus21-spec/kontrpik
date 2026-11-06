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
  // как инвентарь: 6 слотов — сапоги из ранней фазы + собранные предметы середины и конца игры
  const it = items.items, BOOTS = /boots|treads|travel/;
  const asm = (k: string) => !!it[k] && (k === 'blink' || k === 'aghanims_shard' || (!!it[k].a && it[k].c >= 1000));
  const boots = b.early.find(k => BOOTS.test(k) && asm(k));
  const rest = [...b.mid, ...b.late].filter(k => asm(k) && !BOOTS.test(k));
  const core = [...new Set([...(boots ? [boots] : []), ...rest])].slice(0, 6);
  if (!core.length) return '';
  const slots = core.map(k => itemIcon(items, k, 'sm')).concat(Array(6 - core.length).fill('<span class="it it-sm empty"></span>'));
  return `<div class="b-line"><span class="b-ph">${t().buildCore}</span><span class="b-inv">${slots.join('')}</span></div>`;
}
