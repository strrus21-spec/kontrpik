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
import { bindDraft, renderDraft, renderPosChips, renderSelects, type Ctx } from './render/draft.ts';
import { bindTips, renderFeatured, renderTipFilters, renderTips } from './render/tips.ts';
import { $ } from './render/html.ts';
import { bindHero, refreshHero, syncHeroFromPath } from './render/hero.ts';

setLang(initialLang());

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
    history.replaceState(null, '', location.pathname + location.hash);
  }
  loadMe();
  preloadIcons(data.heroes);
  // после загрузки иконок перерисовать стоп-кадры анимаций
  let pending = 0;
  for (const im of Object.values(IMG)) im.addEventListener('load', () => { if (!pending) pending = requestAnimationFrame(() => { pending = 0; redrawAll(); }); }, { once: true });

  const renderAll = () => {
    applyStatic(); renderSelects(x); renderPosChips(x); renderTipFilters(); renderFeatured(); renderMe(); renderDraft(x); renderTips(); refreshHero(x);
  };
  bindDraft(x); bindTips(data.tips);
  bindMe(data.heroes, () => { renderMe(); renderDraft(x); });
  bindHero(x, () => renderDraft(x));
  document.querySelector('.lang')!.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-lang]'); if (!b) return;
    e.stopPropagation(); setLang(b.dataset.lang as Lang); saveLang(LANG); renderAll();
  });
  renderAll();
  syncHeroFromPath(x);
  startAnims();
}
start();
