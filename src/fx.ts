// Огненные эффекты: искры у тлеющих кнопок (при наведении) и над «Pick» на главной.
// Искры рисуются в отдельном слое поверх страницы — разметку кнопок не трогаем.
// У тех, кто просил меньше анимации (prefers-reduced-motion), эффекты выключены.

/** Кнопки, которые «тлеют» при наведении: стили — .ember-* в styles.css. */
export const EMBER_SEL = '.cta,.me-go,.addbtn,.share,.more-btn,.install,.hd-enemy,#match-recent,.nav.topbar .tabs-nav a';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let layer: HTMLElement | null = null;
function fxLayer() {
  if (!layer) { layer = document.createElement('div'); layer.className = 'fx-layer'; layer.setAttribute('aria-hidden', 'true'); document.body.append(layer); }
  return layer;
}
function spark(x: number, y: number, dx: number, dy: number, dur: number, cls = 'fx-spark') {
  const s = document.createElement('span');
  s.className = cls; s.style.left = x + 'px'; s.style.top = y + 'px';
  s.style.setProperty('--x', dx + 'px'); s.style.setProperty('--y', dy + 'px'); s.style.setProperty('--d', dur + 's');
  s.addEventListener('animationend', () => s.remove());
  fxLayer().append(s);
}

export function bindFx() {
  // тлеющие кнопки: пока курсор на кнопке — искры от нижнего края
  let timer = 0, cur: Element | null = null;
  const stop = () => { clearInterval(timer); timer = 0; cur = null; };
  const emit = () => {
    if (!cur || !cur.isConnected) return stop();
    const r = cur.getBoundingClientRect(); if (!r.width) return;
    const n = Math.random() < .5 ? 2 : 1;
    for (let i = 0; i < n; i++) spark(r.left + 6 + Math.random() * (r.width - 12), r.bottom - 4, Math.random() * 24 - 12, -(24 + Math.random() * 34), .7 + Math.random() * .6);
  };
  document.addEventListener('pointerover', e => {
    if (reduced() || (e as PointerEvent).pointerType === 'touch') return;
    const b = (e.target as Element).closest?.(EMBER_SEL);
    if (b === cur) return;
    stop(); if (!b) return;
    cur = b; emit(); timer = window.setInterval(emit, 85);
  });
  document.addEventListener('pointerout', e => { if (cur && !cur.contains((e as PointerEvent).relatedTarget as Node)) stop(); });
  addEventListener('scroll', stop, { passive: true });

  // «Pick» на главной: редкие искры, только пока главная на экране и вкладка видима
  setInterval(() => {
    if (reduced() || document.hidden || document.body.dataset.tab !== 'home') return;
    const w = document.querySelector('.landing h1.brand .h1b')?.getBoundingClientRect();
    if (!w || !w.width || w.bottom < 0) return;
    spark(w.left + Math.random() * w.width, w.top + w.height * .3, Math.random() * 30 - 10, -(40 + Math.random() * 60), 1.4 + Math.random(), 'fx-spark fx-ash');
  }, 150);
}
