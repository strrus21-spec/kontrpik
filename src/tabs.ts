// Вкладки: каждый раздел — отдельная страница. Адрес вкладки — хеш (#meta), работает и на GitHub Pages, и в файле.
import { bindAnims } from './anim/player.ts';

export const TABS = ['counterpick', 'meta', 'match', 'tips-block'] as const;
export type Tab = typeof TABS[number];
const KEY = 'kontrpik-tab';
const isTab = (s: string): s is Tab => (TABS as readonly string[]).includes(s);

let current: Tab = 'counterpick';
export const currentTab = () => current;

export function showTab(tab: Tab, opts: { scroll?: boolean } = {}) {
  current = tab;
  for (const id of TABS) {
    const el = document.getElementById(id);
    if (el) el.hidden = id !== tab;
  }
  document.querySelectorAll<HTMLAnchorElement>('.nav a[href^="#"]:not(.logo)').forEach(a => {
    if (a.getAttribute('href') === '#' + tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  try { localStorage.setItem(KEY, tab); } catch { /* ignore */ }
  bindAnims();   // анимации только видимой вкладки
  if (opts.scroll !== false) window.scrollTo({ top: 0, behavior: 'auto' });   // новая вкладка — с начала страницы
}

/** Вкладка из адреса (#meta) или последняя открытая. */
export function initialTab(): Tab {
  const h = location.hash.slice(1);
  if (isTab(h)) return h;
  try { const v = localStorage.getItem(KEY) || ''; if (isTab(v)) return v; } catch { /* ignore */ }
  return 'counterpick';
}

export function bindTabs() {
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (isTab(h)) showTab(h); });
  // клик по уже открытой вкладке: хеш не меняется — просто наверх
  document.querySelector('.nav')!.addEventListener('click', e => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]'); if (!a) return;
    const h = a.getAttribute('href')!.slice(1);
    if (isTab(h) && h === current && location.hash === '#' + h) { e.preventDefault(); showTab(h); }
  });
}
