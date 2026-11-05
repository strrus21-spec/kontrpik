// Рисуем только видимые canvas; при prefers-reduced-motion — стоп-кадр.
import { AH, APERIOD, AW, G } from './engine.ts';
import { SCENES } from './scenes.ts';
import { esc } from '../render/html.ts';

type Cv = HTMLCanvasElement & { __b?: 1; __vis?: boolean };
let canvases: Cv[] = [];
const io = 'IntersectionObserver' in window
  ? new IntersectionObserver(es => es.forEach(e => { (e.target as Cv).__vis = e.isIntersecting; }), { rootMargin: '100px' })
  : null;
const RM = !!window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const animCanvas = (key: string, cls = 'anim') =>
  SCENES[key] ? `<canvas class="${cls}" data-scene="${esc(key)}" width="${AW * 2}" height="${AH * 2}" role="img" aria-label="${esc(key)}"></canvas>` : '';

function draw(cv: Cv, t: number) {
  const c = cv.getContext('2d'); if (!c) return;
  c.setTransform(2, 0, 0, 2, 0, 0);
  try { SCENES[cv.dataset.scene!](G(c), t); } catch { /* сцена не должна ломать страницу */ }
}

export function bindAnims() {
  canvases = [...document.querySelectorAll<Cv>('canvas[data-scene]')];
  for (const cv of canvases) {
    if (!cv.__b) { cv.__b = 1; cv.__vis = !io; io?.observe(cv); }
    draw(cv, RM ? .8 : (performance.now() % APERIOD) / APERIOD);
  }
}

/** Перерисовать все кадры (например, после загрузки иконок или смены языка). */
export const redrawAll = () => canvases.forEach(cv => cv.isConnected && draw(cv, RM ? .8 : (performance.now() % APERIOD) / APERIOD));

function loop(now: number) {
  if (!RM) for (const cv of canvases) if (cv.__vis && cv.isConnected) draw(cv, (now % APERIOD) / APERIOD);
  requestAnimationFrame(loop);
}
export const startAnims = () => requestAnimationFrame(loop);
