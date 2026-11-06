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

/** Живой фон главной: подгоняем .scene-in под картину (как background-size:cover) и пускаем частицы. */
function bindScene() {
  const land = document.getElementById('landing'), sc = document.getElementById('scene');
  if (!land || !sc) return;
  const fit = () => {
    const W = land.clientWidth, H = land.clientHeight; if (!W || !H) return;
    const k = Math.max(W / 3, H / 2), w = 3 * k, h = 2 * k;
    const py = parseFloat(getComputedStyle(land).getPropertyValue('--scene-y')) || .46;
    Object.assign(sc.style, { width: w + 'px', height: h + 'px', left: (W - w) / 2 + 'px', top: (H - h) * py + 'px' });
  };
  new ResizeObserver(fit).observe(land); fit();
  const p = (cls: string, x: number, y: number, dx: number, dy: number, d: number) => {
    const s = document.createElement('span'); s.className = 'sc-p ' + cls;
    s.style.left = x + '%'; s.style.top = y + '%';
    s.style.setProperty('--x', dx + 'px'); s.style.setProperty('--y', dy + 'px'); s.style.setProperty('--d', d + 's');
    s.addEventListener('animationend', () => s.remove()); sc.append(s);
  };
  setInterval(() => {
    if (reduced() || document.hidden || document.body.dataset.tab !== 'home') return;
    // искры от лавы Тьмы — вверх и чуть вправо
    p('ember', 71 + Math.random() * 7, 27 + Math.random() * 20, Math.random() * 30 - 5, -(50 + Math.random() * 70), 1.6 + Math.random() * 1.2);
    // огоньки Света — от вихря у основания башни, медленно вверх
    if (Math.random() < .55) p('wisp', 22 + Math.random() * 8, 54 + Math.random() * 4, Math.random() * 20 - 10, -(40 + Math.random() * 60), 2.2 + Math.random() * 1.4);
  }, 260);
}

export function bindFx() {
  bindScene();
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
