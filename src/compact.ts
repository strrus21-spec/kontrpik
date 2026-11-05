// Компактный режим (телефон): только слоты врагов, поиск и топ-5 крупными кнопками.
import { t } from './i18n.ts';
import type { PickRow } from './scoring.ts';
import { $, esc, sign } from './render/html.ts';

const KEY = 'kontrpik-compact';
export let compact = false;
try { compact = localStorage.getItem(KEY) === '1'; } catch { /* ignore */ }

let lastTop: PickRow[] = [];
export function setCompactTop(rows: PickRow[]) { lastTop = rows.slice(0, 5); if (compact) renderCompactTop(); }

export function renderCompactTop() {
  const box = $('compact-top'), L = t();
  box.hidden = !compact;
  if (!compact) return;
  box.innerHTML = `<h2>${L.cTop}</h2>` + (lastTop.length
    ? `<ol class="c-top">${lastTop.map((r, i) => `<li><button class="c-pick" data-hero="${r.h.i}"><span class="c-n">${i + 1}</span><img src="${esc(r.h.img)}" alt="" width="40" height="40"><span class="c-name">${esc(r.h.name)}</span><b class="${r.score >= 0 ? 'up' : 'dn'}">${sign(r.score)}</b></button></li>`).join('')}</ol>`
    : `<p class="empty-state">${L.cEmpty}</p>`);
}

export function applyCompact() {
  document.body.classList.toggle('compact', compact);
  const b = $('compact-toggle');
  b.setAttribute('aria-pressed', String(compact));
  b.textContent = compact ? t().st.compactOff : t().st.compactOn;
  renderCompactTop();
}

export function bindCompact(onEnter: () => void) {
  $('compact-toggle').addEventListener('click', e => {
    e.stopPropagation();
    compact = !compact;
    try { localStorage.setItem(KEY, compact ? '1' : '0'); } catch { /* ignore */ }
    if (compact) onEnter();
    applyCompact();
    $('counterpick').scrollIntoView({ block: 'start' });
  });
}
