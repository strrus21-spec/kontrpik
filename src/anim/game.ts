// Графика «как в игре» для анимаций фишек: местность, юниты с полосками здоровья, иконки способностей и
// предметов с сервера Valve (с запасной отрисовкой), снаряды, эффекты, всплывающий урон, подписи.
import { AH, AW, COL, IMG, cl, lp, type Gfx } from './engine.ts';

// ---------- картинки с CDN Valve ----------
const CDN = 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/';
const cdnCache = new Map<string, HTMLImageElement>();
let onAsset: () => void = () => {};
export const setAssetListener = (fn: () => void) => { onAsset = fn; };
/** Иконка способности (`abilities/pudge_meat_hook`) или предмета (`items/manta`). null, пока не загрузилась. */
export function cdn(path: string): HTMLImageElement | null {
  let im = cdnCache.get(path);
  if (!im) {
    im = new Image();
    im.decoding = 'async';
    im.onload = () => onAsset();
    im.src = CDN + path + '.png';
    cdnCache.set(path, im);
  }
  return im.complete && im.naturalWidth ? im : null;
}

// ---------- местность (кэш по размеру) ----------
let terrainCache: HTMLCanvasElement | null = null;
function rnd(seed: number) { return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }
function terrain(): HTMLCanvasElement {
  if (terrainCache) return terrainCache;
  const cv = document.createElement('canvas'); cv.width = AW * 2; cv.height = AH * 2;
  const c = cv.getContext('2d')!; c.scale(2, 2);
  const g = c.createLinearGradient(0, 0, 0, AH); g.addColorStop(0, '#1f2d17'); g.addColorStop(1, '#17230f');
  c.fillStyle = g; c.fillRect(0, 0, AW, AH);
  const r = rnd(7);
  for (let i = 0; i < 900; i++) { // травинки и камешки
    const x = r() * AW, y = r() * AH, s = r();
    c.fillStyle = s < .7 ? `rgba(70,100,45,${.15 + r() * .25})` : `rgba(20,30,12,${.3 + r() * .3})`;
    c.fillRect(x, y, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  terrainCache = cv; return cv;
}

export function G2(g: Gfx) {
  const c = g.c;
  const h = {
    ...g,
    /** Фон: земля, линия (y-центр), река (x-центр), деревья по краям, виньетка. */
    ground(o: { lane?: number; river?: number; trees?: boolean } = {}) {
      c.drawImage(terrain(), 0, 0, AW, AH);
      if (o.lane !== undefined) {
        const y = o.lane;
        const lg = c.createLinearGradient(0, y - 22, 0, y + 22);
        lg.addColorStop(0, 'rgba(86,72,48,0)'); lg.addColorStop(.25, 'rgba(96,80,54,.85)'); lg.addColorStop(.75, 'rgba(86,72,48,.85)'); lg.addColorStop(1, 'rgba(86,72,48,0)');
        c.fillStyle = lg; c.fillRect(0, y - 22, AW, 44);
        c.fillStyle = 'rgba(0,0,0,.12)'; for (let x = 6; x < AW; x += 23) c.fillRect(x, y - 1 + ((x * 7) % 9) - 4, 6, 2);
      }
      if (o.river !== undefined) {
        const x = o.river;
        const rg = c.createLinearGradient(x - 26, 0, x + 26, 0);
        rg.addColorStop(0, 'rgba(40,80,95,0)'); rg.addColorStop(.3, 'rgba(45,95,115,.75)'); rg.addColorStop(.7, 'rgba(45,95,115,.75)'); rg.addColorStop(1, 'rgba(40,80,95,0)');
        c.fillStyle = rg; c.fillRect(x - 26, 0, 52, AH);
      }
      if (o.trees !== false) {
        const r = rnd(3);
        for (let i = 0; i < 26; i++) {
          const top = i % 2 === 0, x = (i / 26) * AW + r() * 10, y = top ? 6 + r() * 10 : AH - 6 - r() * 10, s = 7 + r() * 5;
          h.tree(x, y, s);
        }
      }
      const v = c.createRadialGradient(AW / 2, AH / 2, AH * .45, AW / 2, AH / 2, AW * .62);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
      c.fillStyle = v; c.fillRect(0, 0, AW, AH);
    },
    tree(x: number, y: number, s: number) {
      c.save();
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x + 2, y + s * .5, s * .9, s * .35, 0, 0, 7); c.fill();
      const tg = c.createRadialGradient(x - s * .3, y - s * .4, 1, x, y, s);
      tg.addColorStop(0, '#3f7a35'); tg.addColorStop(1, '#173d17');
      c.fillStyle = tg; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill();
      c.restore();
    },
    shadow(x: number, y: number, r: number) { c.save(); c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(x + 1, y + r * .85, r * 1.05, r * .4, 0, 0, 7); c.fill(); c.restore(); },
    hpBar(x: number, y: number, w: number, hp: number, ally: boolean, a = 1) {
      c.save(); c.globalAlpha = a;
      c.fillStyle = '#05070a'; c.fillRect(x - w / 2 - 1, y - 1, w + 2, 5);
      const col = ally ? ['#7fe05f', '#2f8f1f'] : ['#ff6a4d', '#a82612'];
      const gr = c.createLinearGradient(0, y, 0, y + 3); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]);
      c.fillStyle = gr; c.fillRect(x - w / 2, y, w * cl(hp), 3);
      c.fillStyle = 'rgba(0,0,0,.45)'; for (let i = 1; i < 5; i++) c.fillRect(x - w / 2 + (w / 5) * i, y, .6, 3);
      c.restore();
    },
    /** Герой: тень, кольцо цвета команды со свечением, портрет, полоска здоровья, имя. */
    unit(name: string, x: number, y: number, ally: boolean, o: { r?: number; a?: number; hp?: number; grey?: boolean; label?: boolean; tint?: string; glow?: string } = {}) {
      const r = o.r ?? 13, a = o.a ?? 1, ring = ally ? '#6ad05a' : '#e2553f';
      c.save(); c.globalAlpha = a;
      h.shadow(x, y, r);
      c.shadowColor = o.glow || ring; c.shadowBlur = o.glow ? 14 : 6;
      c.beginPath(); c.arc(x, y, r + 2, 0, 7); c.fillStyle = ring; c.fill();
      c.shadowBlur = 0;
      c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = '#0b0e12'; c.fill();
      c.save(); c.clip();
      const im = IMG[name]; if (im && im.complete && im.naturalWidth) c.drawImage(im, x - r, y - r, r * 2, r * 2);
      if (o.grey) { c.globalCompositeOperation = 'saturation'; c.fillStyle = '#888'; c.fillRect(x - r, y - r, r * 2, r * 2); c.globalCompositeOperation = 'source-over'; c.fillStyle = 'rgba(80,60,140,.35)'; c.fillRect(x - r, y - r, r * 2, r * 2); }
      if (o.tint) { c.fillStyle = o.tint; c.fillRect(x - r, y - r, r * 2, r * 2); }
      c.restore();
      c.restore();
      if (o.hp !== undefined) h.hpBar(x, y - r - 8, r * 2.4, o.hp, ally, a);
      if (o.label) g.text(name, x, y + r + 9, '#e8e2d0', 8.5, 'center', a, true);
    },
    /** Крип: щит с объёмом и полоской здоровья. */
    creep(x: number, y: number, ally: boolean, o: { hp?: number; a?: number } = {}) {
      const a = o.a ?? 1;
      c.save(); c.globalAlpha = a;
      h.shadow(x, y, 6);
      const body = c.createRadialGradient(x - 2, y - 2, 1, x, y, 7);
      body.addColorStop(0, ally ? '#b5e89a' : '#ffb19f'); body.addColorStop(1, ally ? '#3f8a2a' : '#9a2a17');
      c.fillStyle = body; c.beginPath(); c.moveTo(x, y - 7); c.lineTo(x + 6, y - 3); c.lineTo(x + 5, y + 4); c.lineTo(x, y + 7); c.lineTo(x - 5, y + 4); c.lineTo(x - 6, y - 3); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 1; c.stroke();
      c.restore();
      if (o.hp !== undefined) h.hpBar(x, y - 13, 14, o.hp, ally, a);
    },
    /** Иконка как на панели игры: картинка с CDN или запасная отрисовка; pop — 0..1 появление; cd — 0..1 перезарядка. */
    icon(path: string, x: number, y: number, o: { size?: number; pop?: number; cd?: number; fallback?: string; color?: string; label?: string; crossed?: number; a?: number } = {}) {
      const s = o.size ?? 22, pop = o.pop ?? 1, a = (o.a ?? 1) * cl(pop * 1.5);
      if (a <= 0) return;
      const k = pop < 1 ? .6 + .4 * Math.sin(pop * Math.PI / 2) + Math.sin(pop * Math.PI) * .15 : 1;
      c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(k, k);
      c.shadowColor = 'rgba(0,0,0,.8)'; c.shadowBlur = 6;
      c.fillStyle = '#0b0e12'; c.fillRect(-s / 2 - 2, -s / 2 - 2, s + 4, s + 4);
      c.shadowBlur = 0;
      const im = cdn(path);
      if (im) c.drawImage(im, -s / 2, -s / 2, s, s);
      else {
        const gr = c.createLinearGradient(0, -s / 2, 0, s / 2); gr.addColorStop(0, o.color || '#4a6a8a'); gr.addColorStop(1, '#141a20');
        c.fillStyle = gr; c.fillRect(-s / 2, -s / 2, s, s);
        g.text(o.fallback || '?', 0, 0, '#f3ead2', s * .32, 'center', 1, true);
      }
      if (o.cd !== undefined && o.cd > 0) { c.fillStyle = 'rgba(0,0,0,.6)'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, s, -Math.PI / 2, -Math.PI / 2 + o.cd * Math.PI * 2); c.closePath(); c.save(); c.beginPath(); c.rect(-s / 2, -s / 2, s, s); c.clip(); c.fill(); c.restore(); }
      c.strokeStyle = '#d9b25b'; c.lineWidth = 1.2; c.strokeRect(-s / 2 - .5, -s / 2 - .5, s + 1, s + 1);
      if (o.crossed && o.crossed > 0) { c.globalAlpha = a * cl(o.crossed); c.strokeStyle = '#ff4a35'; c.lineWidth = 3; c.beginPath(); c.moveTo(-s / 2, -s / 2); c.lineTo(s / 2, s / 2); c.moveTo(s / 2, -s / 2); c.lineTo(-s / 2, s / 2); c.stroke(); }
      c.restore();
      if (o.label) g.text(o.label, x, y + s / 2 + 8, '#f3ead2', 8, 'center', a, true);
    },
    /** Светящийся снаряд со шлейфом от (x0,y0) к (x,y). */
    missile(x0: number, y0: number, x: number, y: number, col: string, r = 4) {
      const dx = x - x0, dy = y - y0, len = Math.hypot(dx, dy) || 1;
      const tx = x - dx / len * Math.min(len, 40), ty = y - dy / len * Math.min(len, 40);
      const tg = c.createLinearGradient(tx, ty, x, y); tg.addColorStop(0, 'rgba(255,255,255,0)'); tg.addColorStop(1, col);
      c.save(); c.strokeStyle = tg; c.lineWidth = r * 1.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(tx, ty); c.lineTo(x, y); c.stroke();
      c.shadowColor = col; c.shadowBlur = 14; c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r * .6, 0, 7); c.fill();
      c.fillStyle = col; c.globalAlpha = .7; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.restore();
    },
    /** Цепь хука из звеньев. */
    chain(x0: number, y0: number, x: number, y: number) {
      const dx = x - x0, dy = y - y0, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
      c.save(); c.translate(x0, y0); c.rotate(ang);
      for (let d = 4; d < len - 4; d += 5) { c.strokeStyle = (d / 5) % 2 < 1 ? '#b9a98a' : '#8a7a5e'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(d, 0, 3, 1.6, 0, 0, 7); c.stroke(); }
      c.translate(len, 0); c.fillStyle = '#d8d0c0'; c.strokeStyle = '#3a3226'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(6, 0); c.lineTo(-2, -5); c.quadraticCurveTo(1, 0, -2, 5); c.closePath(); c.fill(); c.stroke();
      c.restore();
    },
    /** Вспышка/искры. */
    burst(x: number, y: number, k: number, col: string, n = 10) {
      if (k <= 0 || k >= 1) return;
      c.save(); c.globalAlpha = 1 - k;
      c.shadowColor = col; c.shadowBlur = 10; c.fillStyle = col;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + i, d = 4 + k * 22; c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.6 * (1 - k) + .5, 0, 7); c.fill(); }
      c.globalAlpha = (1 - k) * .5; c.beginPath(); c.arc(x, y, 4 + k * 12, 0, 7); c.fill();
      c.restore();
    },
    /** Всплывающее число, как урон в игре. k — 0..1 время жизни. */
    floater(s: string, x: number, y: number, k: number, col = '#ff5a40') {
      if (k <= 0 || k >= 1) return;
      g.text(s, x, y - k * 16, col, 10 + (k < .15 ? (1 - k / .15) * 4 : 0), 'center', k > .7 ? (1 - k) / .3 : 1, true);
    },
    /** Подпись-тост сверху, как оповещение в игре. */
    toast(s: string, k: number, col = '#f3ead2', y = 14) {
      if (k <= 0) return;
      const a = cl(k * 4) * cl((1 - k) * 4 + (k < 1 ? 1 : 0));
      c.save(); c.globalAlpha = a; c.font = '700 10px "Golos Text",system-ui,sans-serif';
      const w = c.measureText(s).width + 16;
      c.fillStyle = 'rgba(8,10,13,.82)'; c.fillRect(AW / 2 - w / 2, y - 9, w, 18);
      c.strokeStyle = 'rgba(217,178,91,.7)'; c.lineWidth = 1; c.strokeRect(AW / 2 - w / 2 + .5, y - 8.5, w - 1, 17);
      c.restore();
      g.text(s, AW / 2, y, col, 10, 'center', a, true);
    },
    lp, COL,
  };
  return h;
}
export type Gfx2 = ReturnType<typeof G2>;
