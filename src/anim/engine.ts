// Мини-движок анимированных схем к фишкам: canvas 280×140, цикл 4,2 с, стиль мини-карты.
import { LANG } from '../i18n.ts';

export const AW = 280, AH = 140, APERIOD = 4200;
export const IMG: Record<string, HTMLImageElement> = {};
export function preloadIcons(heroes: { name: string; img: string }[]) {
  for (const h of heroes) { const im = new Image(); im.src = h.img; IMG[h.name] = im; }
}

export const cl = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const seg = (t: number, a: number, b: number) => cl((t - a) / (b - a));
export const lp = (a: number, b: number, k: number) => a + (b - a) * k;
export const ez = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
export const COL = { rad: '#6ad05a', dire: '#e2553f', gold: '#e8b84a', neu: '#d9b25b', blue: '#5ab0f0', violet: '#a07ae8', white: '#f3ead2', grey: '#7d858e' };

type Team = 'rad' | 'dire' | 'neutral';
export type Pt = [number, number];

export function G(c: CanvasRenderingContext2D) {
  const g = {
    c,
    T: (ru: string, en: string) => (LANG === 'en' ? en : ru),
    bg(river?: boolean) {
      c.fillStyle = '#16241b'; c.fillRect(0, 0, AW, AH);
      c.globalAlpha = .07; c.strokeStyle = '#fff'; c.lineWidth = 1;
      for (let x = 0; x < AW; x += 20) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, AH); c.stroke(); }
      for (let y = 0; y < AH; y += 20) { c.beginPath(); c.moveTo(0, y); c.lineTo(AW, y); c.stroke(); }
      c.globalAlpha = 1;
      if (river) { c.fillStyle = 'rgba(70,130,170,.28)'; c.beginPath(); c.moveTo(AW * .42, 0); c.lineTo(AW * .58, 0); c.lineTo(AW * .5, AH); c.lineTo(AW * .36, AH); c.fill(); }
    },
    trees(pts: number[][]) {
      pts.forEach(([x, y, r]) => { c.fillStyle = '#0f3a1c'; c.beginPath(); c.arc(x, y, r || 9, 0, 7); c.fill(); c.fillStyle = '#185a2a'; c.beginPath(); c.arc(x - 2, y - 2, (r || 9) * .6, 0, 7); c.fill(); });
    },
    circle(x: number, y: number, r: number, stroke: string | null, fill: string | null, a = 1, w = 2, dash?: number[] | null) {
      c.save(); c.globalAlpha = a; if (dash) c.setLineDash(dash); c.beginPath(); c.arc(x, y, Math.max(0, r), 0, 7);
      if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = w; c.stroke(); } c.restore();
    },
    hero(name: string, x: number, y: number, team: Team, o: { r?: number; a?: number; grey?: boolean } = {}) {
      const r = o.r || 12, a = o.a ?? 1; c.save(); c.globalAlpha = a;
      c.beginPath(); c.arc(x, y, r + 2, 0, 7); c.fillStyle = team === 'rad' ? COL.rad : team === 'dire' ? COL.dire : COL.gold; c.fill();
      c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = '#0b0e12'; c.fill(); c.clip();
      const im = IMG[name]; if (im && im.complete && im.naturalWidth) c.drawImage(im, x - r, y - r, r * 2, r * 2);
      if (o.grey) { c.fillStyle = 'rgba(120,130,140,.55)'; c.fillRect(x - r, y - r, r * 2, r * 2); } c.restore();
    },
    creep(x: number, y: number, team: Team, a = 1) { c.save(); c.globalAlpha = a; c.fillStyle = team === 'rad' ? COL.rad : COL.dire; c.beginPath(); c.arc(x, y, 4.5, 0, 7); c.fill(); c.strokeStyle = '#000'; c.lineWidth = 1; c.stroke(); c.restore(); },
    neutral(x: number, y: number, a = 1) { c.save(); c.globalAlpha = a; c.fillStyle = COL.neu; c.fillRect(x - 4, y - 4, 8, 8); c.strokeStyle = '#000'; c.strokeRect(x - 4, y - 4, 8, 8); c.restore(); },
    tower(x: number, y: number, team: Team, hp = 1, a = 1) {
      c.save(); c.globalAlpha = a; c.fillStyle = '#3a4048'; c.fillRect(x - 8, y - 12, 16, 22); c.fillStyle = team === 'rad' ? COL.rad : COL.dire; c.fillRect(x - 10, y - 16, 20, 6);
      c.fillStyle = '#000'; c.fillRect(x - 12, y + 14, 24, 4); c.fillStyle = hp < .1 ? COL.gold : (team === 'rad' ? COL.rad : COL.dire); c.fillRect(x - 12, y + 14, 24 * hp, 4); c.restore();
    },
    line(x1: number, y1: number, x2: number, y2: number, col: string, w = 2, dash?: number[] | null, a = 1) {
      c.save(); c.globalAlpha = a; if (dash) c.setLineDash(dash); c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.restore();
    },
    dot(x: number, y: number, r: number, col: string, a = 1) { c.save(); c.globalAlpha = a; c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 8; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.restore(); },
    text(s: string, x: number, y: number, col = COL.white, size = 11, align: CanvasTextAlign = 'center', a = 1, bold = true) {
      c.save(); c.globalAlpha = a; c.font = `${bold ? '700 ' : ''}${size}px "Golos Text",system-ui,sans-serif`; c.textAlign = align; c.textBaseline = 'middle';
      c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.75)'; c.strokeText(s, x, y); c.fillStyle = col; c.fillText(s, x, y); c.restore();
    },
    bar(x: number, y: number, w: number, h: number, f: number, col: string, bg = '#000') { c.fillStyle = bg; c.fillRect(x, y, w, h); c.fillStyle = col; c.fillRect(x, y, w * cl(f), h); },
    stars(x: number, y: number, t: number) { for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; g.dot(x + Math.cos(a) * 9, y - 14 + Math.sin(a) * 3, 2, COL.gold); } },
    item(x: number, y: number, label: string, col = COL.gold, a = 1, w = 58) {
      c.save(); c.globalAlpha = a; c.fillStyle = '#0b0e12'; c.strokeStyle = col; c.lineWidth = 1.5; c.fillRect(x - w / 2, y - 12, w, 24); c.strokeRect(x - w / 2, y - 12, w, 24); c.restore();
      g.text(label, x, y, col, 9.5, 'center', a);
    },
    key(x: number, y: number, k: string, pressed: boolean) { c.fillStyle = pressed ? COL.gold : '#2a3038'; c.fillRect(x - 14, y - 14, 28, 28); c.strokeStyle = '#000'; c.strokeRect(x - 14, y - 14, 28, 28); g.text(k, x, y, pressed ? '#111' : COL.white, 13); },
    cross(x: number, y: number, s: number, col = COL.dire) { g.line(x - s, y - s, x + s, y + s, col, 3); g.line(x + s, y - s, x - s, y + s, col, 3); },
    check(x: number, y: number, s: number, col = COL.rad) { c.save(); c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.moveTo(x - s, y); c.lineTo(x - s / 3, y + s * .7); c.lineTo(x + s, y - s * .7); c.stroke(); c.restore(); },
  };
  return g;
}
export type Gfx = ReturnType<typeof G>;
export type Scene = (g: Gfx, t: number) => void;
