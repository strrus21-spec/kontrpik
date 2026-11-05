// Вкладки: каждый раздел — отдельная страница. Адрес вкладки — хеш (#meta), работает и на GitHub Pages, и в файле.
import { bindAnims } from './anim/player.ts';
import { replaceUrl } from './nav.ts';

export const TABS = ['home', 'counterpick', 'meta', 'match', 'tips-block'] as const;
export type Tab = typeof TABS[number];
const isTab = (s: string): s is Tab => (TABS as readonly string[]).includes(s);

let current: Tab = 'home';
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
  document.body.dataset.tab = tab;
  // Ушли с разбора — убираем из адреса /match/{id}, иначе после обновления страница снова откроет разбор.
  const base = import.meta.env.BASE_URL;
  if (tab !== 'match' && location.pathname.startsWith(base + 'match/')) replaceUrl(null, base + '#' + tab);
  bindAnims();   // анимации только видимой вкладки
  if (opts.scroll !== false) window.scrollTo({ top: 0, behavior: 'auto' });   // новая вкладка — с начала страницы
}

/** Вкладка из адреса (#meta); без адреса — главная (экран-меню). */
export function initialTab(): Tab {
  const h = location.hash.slice(1);
  if (isTab(h)) return h;
  // ссылка на разбор /match/{id} без вкладки в адресе — открываем разбор
  return location.pathname.startsWith(import.meta.env.BASE_URL + 'match/') ? 'match' : 'home';
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
