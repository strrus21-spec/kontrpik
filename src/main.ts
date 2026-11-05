import { replaceUrl } from './nav.ts';
import '@fontsource/cormorant-sc/600.css';
import '@fontsource/cormorant-sc/700.css';
import '@fontsource/tektur/500.css';
import '@fontsource/tektur/700.css';
import '@fontsource/golos-text/400.css';
import '@fontsource/golos-text/500.css';
import '@fontsource/golos-text/600.css';
import '@fontsource/jetbrains-mono/500.css';
import './styles.css';

import { initialLang, saveLang, setLang, t, LANG, type Lang } from './i18n.ts';
import { loadData } from './data.ts';
import { loadState, saveState } from './state.ts';
import { applyDraftQuery, hasDraftQuery } from './share.ts';
import { bindMe, loadMe, renderMe } from './me.ts';
import { IMG, preloadIcons } from './anim/engine.ts';
import { redrawAll, startAnims } from './anim/player.ts';
import { bindDraft, renderDraft, renderPosChips, renderResults, renderSelects, type Ctx } from './render/draft.ts';
import { bindTips, renderFeatured, renderTipFilters, renderTips } from './render/tips.ts';
import { $ } from './render/html.ts';
import { bindHero, refreshHero, syncHeroFromPath } from './render/hero.ts';
import { bindMeta, renderMeta } from './render/meta.ts';
import { bindMatch, renderMatch, syncMatchFromPath } from './render/match.ts';
import { bindStream, renderStream } from './render/stream.ts';
import { bindQuiz, refreshQuiz } from './render/quiz.ts';
import { applyCompact, bindCompact } from './compact.ts';
import { bindKeys } from './keys.ts';
import { bindTabs, initialTab, showTab } from './tabs.ts';

setLang(initialLang());
// Все формы работают через JS: до загрузки данных отправка не должна перезагружать страницу.
document.addEventListener('submit', e => e.preventDefault());

/** Статичные строки: data-t → текст, data-tp → placeholder, data-ta → aria-label. */
function applyStatic() {
  const S = t().st;
  document.documentElement.lang = LANG;
  document.title = S.title;
  document.querySelectorAll<HTMLElement>('[data-t]').forEach(el => { if (S[el.dataset.t!] != null) el.textContent = S[el.dataset.t!]; });
  document.querySelectorAll<HTMLInputElement>('[data-tp]').forEach(el => { el.placeholder = S[el.dataset.tp!]; });
  document.querySelectorAll<HTMLElement>('[data-ta]').forEach(el => { el.setAttribute('aria-label', S[el.dataset.ta!]); });
  document.querySelectorAll<HTMLElement>('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === LANG)));
}
applyStatic();

async function start() {
  $('out').innerHTML = `<p class="empty-state">${t().loading}</p>`;
  let data;
  try { data = await loadData(import.meta.env.BASE_URL); }
  catch (e) { console.error(e); $('out').innerHTML = `<p class="empty-state">${t().loadError}</p>`; return; }

  const x: Ctx = { data, state: loadState(data.heroes) };
  // Ссылка на драфт: применяем и убираем из адреса, дальше драфт живёт в localStorage.
  if (hasDraftQuery(location.search)) {
    applyDraftQuery(x.state, location.search, data.heroes);
    saveState(x.state, data.heroes);
    replaceUrl(null, location.pathname + location.hash);
  }
  loadMe();
  preloadIcons(data.heroes);
  // после загрузки иконок перерисовать стоп-кадры анимаций
  let pending = 0;
  for (const im of Object.values(IMG)) im.addEventListener('load', () => { if (!pending) pending = requestAnimationFrame(() => { pending = 0; redrawAll(); }); }, { once: true });

  const renderAll = () => {
    applyStatic(); renderSelects(x); renderPosChips(x); renderTipFilters(); renderFeatured(); renderMe(); renderDraft(x); renderMeta(x); renderMatch(x); renderStream(); renderTips(); refreshHero(x); refreshQuiz(); applyCompact();
  };
  bindDraft(x); bindTips(data.tips);
  bindMe(data.heroes, () => { renderMe(); renderDraft(x); });
  bindHero(x, () => renderDraft(x));
  bindMeta(x);
  bindMatch(x);
  bindStream();
  bindQuiz(data);
  bindCompact(() => { x.state.mode = 'enemy'; saveState(x.state, data.heroes); renderDraft(x); });
  bindKeys({
    search: () => { showTab('counterpick', { scroll: false }); const q = $<HTMLInputElement>('q'); q.scrollIntoView({ block: 'center' }); q.focus(); q.select(); },
    pos: p => { showTab('counterpick', { scroll: false }); x.state.pos = p; saveState(x.state, data.heroes); renderPosChips(x); renderResults(x); },
    mode: m => { showTab('counterpick', { scroll: false }); x.state.mode = m; saveState(x.state, data.heroes); renderDraft(x); },
  });
  document.querySelector('.lang')!.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-lang]'); if (!b) return;
    e.stopPropagation(); setLang(b.dataset.lang as Lang); saveLang(LANG); renderAll();
  });
  renderAll();
  bindTabs();
  showTab(initialTab(), { scroll: false });
  // ссылка с #вкладкой не должна проматывать мимо шапки
  if (!location.pathname.includes('/match/') && !location.pathname.includes('/hero/')) window.scrollTo(0, 0);
  syncHeroFromPath(x);
  syncMatchFromPath(x);
  document.documentElement.dataset.ready = '1';   // приложение готово (используют e2e-тесты)
  startAnims();
}
start();

// PWA: service worker только в сборке; установка — по событию браузера.
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => { navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js', { scope: import.meta.env.BASE_URL }).catch(() => {}); });
}
let installEvt: (Event & { prompt(): Promise<void> }) | null = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e as typeof installEvt; $('install').hidden = false; });
window.addEventListener('appinstalled', () => { installEvt = null; $('install').hidden = true; });
$('install').addEventListener('click', async e => { e.stopPropagation(); if (!installEvt) return; await installEvt.prompt(); installEvt = null; $('install').hidden = true; });
