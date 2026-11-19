// Вкладки: каждый раздел — отдельная страница. Адрес вкладки — хеш (#meta), работает и на GitHub Pages, и в файле.
import { bindAnims } from './anim/player.ts';
import { replaceUrl } from './nav.ts';
import { inApp } from './app.ts';

export const TABS = ['home', 'counterpick', 'meta', 'match', 'tips-block', 'about'] as const;
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
  // В приложении вкладки не копятся в истории: «Назад» не перебирает все открытые раньше вкладки.
  if (inApp) document.addEventListener('click', e => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]'); if (!a) return;
    const h = a.getAttribute('href')!.slice(1); if (!isTab(h)) return;
    e.preventDefault();
    replaceUrl(history.state, import.meta.env.BASE_URL + '#' + h);
    showTab(h);
  }, true);
  document.querySelector('.nav')!.addEventListener('click', e => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]'); if (!a) return;
    const h = a.getAttribute('href')!.slice(1);
    if (isTab(h) && h === current && location.hash === '#' + h) { e.preventDefault(); showTab(h); }
  });
}

/**
 * Кнопка «Назад» Android (вызывает приложение): закрыть открытое окно → на главную → выйти.
 * true — обработано на сайте, false — приложение закрывается.
 */
export function appBack(): boolean {
  const hero = document.getElementById('hero') as HTMLDialogElement | null;
  if (hero?.open) { hero.dispatchEvent(new Event('cancel', { cancelable: true })); return true; }
  const quiz = document.getElementById('quiz') as HTMLDialogElement | null;
  if (quiz?.open) { quiz.close(); return true; }
  const me = document.getElementById('me');
  if (me && !me.hidden) { me.hidden = true; document.getElementById('prof-btn')?.setAttribute('aria-expanded', 'false'); return true; }
  if (current !== 'home') { replaceUrl(null, import.meta.env.BASE_URL + '#home'); showTab('home'); return true; }
  return false;
}
(globalThis as { dpBack?: () => boolean }).dpBack = appBack;
