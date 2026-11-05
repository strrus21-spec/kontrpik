// Сцены «как в игре» (графика game.ts), часть 1: Pudge, Manta, BKB.
import { cl, ez, lp, seg, type Scene } from './engine.ts';
import { G2 } from './game.ts';

/** Длительность цикла для сцен, которым нужно больше 4,2 с. */
export const PERIOD: Record<string, number> = {};
/** Кадр-стоп для prefers-reduced-motion: самый понятный момент. */
export const STILL: Record<string, number> = {};

export const def = (key: string, period: number, still: number, fn: Scene) => { PERIOD[key] = period; STILL[key] = still; return [key, fn] as const; };

export const GAME_SCENES: Record<string, Scene> = Object.fromEntries([
  // Pudge: хук летит в Crystal Maiden, но цепляет крипа между ними.
  def('Против Pudge стой за крипами', 6000, .5, (g0, t) => {
    const g = G2(g0), T = g0.T, laneY = 74;
    g.ground({ lane: laneY });
    const pX = 236, pY = laneY - 2, cmX = 58, cmY = laneY + 2, crX = 120;
    const out = seg(t, .14, .42), back = seg(t, .5, .74), hit = t >= .42;
    // линия прицела
    if (t < .42) { g0.line(pX - 14, pY, cmX + 16, cmY, 'rgba(255,90,64,.35)', 1, [3, 4], 1 - seg(t, .3, .42)); }
    // крипы: свой между мной и Pudge, вражеские у Pudge
    const creepX = back > 0 ? lp(crX, pX - 18, ez(back)) : crX;
    const creepAlive = t < .78;
    g.creep(208, laneY + 16, false, { hp: .8 }); g.creep(196, laneY - 14, false, { hp: .6 });
    g.creep(96, laneY + 15, true, { hp: .9 });
    if (creepAlive) g.creep(creepX, laneY, true, { hp: back > .8 ? .15 : .7 });
    g.burst(pX - 18, laneY, seg(t, .76, .88), '#ff5a40', 12);
    g.floater('-180', pX - 22, laneY + 4, seg(t, .74, .95));
    // герои
    g.unit('Crystal Maiden', cmX, cmY, true, { hp: .85, label: true });
    g.unit('Pudge', pX, pY, false, { hp: .9, r: 15, label: true });
    // хук
    if (out > 0 && out < 1) g.chain(pX - 14, pY, lp(pX - 14, crX + 6, ez(out)), lp(pY, laneY, ez(out)));
    if (hit && back < 1) g.chain(pX - 14, pY, creepX + 6, laneY);
    g.burst(crX, laneY, seg(t, .42, .56), '#f3ead2', 12);
    g.floater(T('блок!', 'blocked!'), crX, laneY - 18, seg(t, .42, .7), '#9be27e');
    // иконка способности над Pudge
    g.icon('abilities/pudge_meat_hook', pX - 34, pY - 38, { pop: seg(t, .04, .16), cd: t > .16 ? 1 - seg(t, .16, 1) : 0, fallback: 'HOOK', color: '#8a5a3a', a: 1 - seg(t, .9, 1) });
    // подписи
    if (t < .42) g.toast(T('Pudge кидает хук в тебя…', 'Pudge throws a hook at you…'), seg(t, .02, .42));
    else if (t < .74) g.toast(T('…но хук цепляет первую цель — крипа', '…but the hook grabs the first target: the creep'), seg(t, .42, .74), '#9be27e');
    else g.toast(T('Держи крипа между собой и Pudge', 'Keep a creep between you and Pudge'), seg(t, .74, 1.05), '#ffe7a3');
    if (t > .5) g0.check(cmX, cmY + 26, 6);
  }),

  // Manta: в момент полёта Storm Hammer — снаряд теряет цель.
  def('Manta уворачивает от снарядов', 5600, .55, (g0, t) => {
    const g = G2(g0), T = g0.T, y = 72;
    g.ground({ lane: y });
    const sX = 42, amX = 222;
    const fly = seg(t, .12, .48), split = seg(t, .4, .5), lost = t > .48;
    g.unit('Sven', sX, y, false, { hp: .9, r: 15, label: true });
    g.icon('abilities/sven_storm_bolt', sX, y - 36, { pop: seg(t, .02, .12), cd: t > .12 ? 1 - seg(t, .12, 1) : 0, fallback: 'STUN', color: '#3a6ab0', a: 1 - seg(t, .9, 1) });
    // снаряд: летит к Anti-Mage; после Manta цели нет — гаснет
    const hx = lp(sX + 16, amX - 10, fly);
    if (fly > 0 && !lost) g.missile(sX + 16, y, hx, y, '#7ab8ff', 5);
    g.burst(amX - 10, y, seg(t, .48, .62), '#7ab8ff', 10);
    if (lost) g.floater(T('промах', 'miss'), amX - 56, y + 10, seg(t, .48, .8), '#bfe3ff');
    // Anti-Mage и иллюзии
    if (t < .4) g.unit('Anti-Mage', amX, y, true, { hp: .7, label: true });
    else {
      const k = ez(split);
      // настоящий в центре на миг невидим, затем три фигуры расходятся
      const pts: [number, number, number][] = [[amX, y, 1], [amX - 32, y - 28, .75], [amX + 26, y + 28, .75]];
      pts.forEach(([x, yy, a], i) => g.unit('Anti-Mage', lp(amX, x, k), lp(y, yy, k), true, { hp: .7, a: (split < .3 ? .4 : a), tint: i ? 'rgba(90,150,255,.28)' : undefined }));
    }
    g.icon('items/manta', amX + 34, y - 34, { pop: seg(t, .36, .44), fallback: 'MANTA', color: '#3a7ab0', label: 'Manta', a: 1 - seg(t, .92, 1) });
    if (t < .36) g.toast(T('Sven кидает оглушение', 'Sven throws a stun'), seg(t, .02, .36));
    else if (t < .62) g.toast(T('Жми Manta, пока снаряд в полёте', 'Press Manta while it flies'), seg(t, .36, .62), '#bfe3ff');
    else g.toast(T('Снаряд теряет цель — стана нет', 'The projectile loses its target: no stun'), seg(t, .62, 1.05), '#ffe7a3');
  }),

  // Chronosphere проходит сквозь BKB.
  def('BKB не спасает от этих ульт', 6000, .76, (g0, t) => {
    const g = G2(g0), T = g0.T, c = g0.c, cx = 132, cy = 74;
    g.ground({ river: 150 });
    const bkbOn = t > .08, dome = ez(seg(t, .3, .45)), inside = t > .42;
    // Sven с активным BKB: золотое сияние
    const sx = 118, sy = 76;
    if (bkbOn) {
      c.save(); c.globalAlpha = inside ? .35 : .9;
      const rg = c.createRadialGradient(sx, sy, 10, sx, sy, 26); rg.addColorStop(0, 'rgba(255,215,110,.0)'); rg.addColorStop(.6, 'rgba(255,205,90,.35)'); rg.addColorStop(1, 'rgba(255,205,90,0)');
      c.fillStyle = rg; c.beginPath(); c.arc(sx, sy, 26, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,220,130,.8)'; c.lineWidth = 1.5; c.setLineDash([4, 5]); c.lineDashOffset = -t * 60;
      c.beginPath(); c.arc(sx, sy, 20, 0, 7); c.stroke(); c.restore();
    }
    g.unit('Sven', sx, sy, true, { hp: inside ? lp(.85, .35, seg(t, .55, .9)) : .85, r: 15, grey: inside, label: true, glow: bkbOn && !inside ? '#ffd76e' : undefined });
    // Faceless Void
    const vx = lp(240, 158, ez(seg(t, .5, .62))), vy = lp(66, 58, ez(seg(t, .5, .62)));
    // купол Chronosphere
    if (dome > 0) {
      const R = 52 * dome;
      c.save();
      const dg = c.createRadialGradient(cx, cy, R * .2, cx, cy, R); dg.addColorStop(0, 'rgba(120,90,220,.10)'); dg.addColorStop(.85, 'rgba(140,110,240,.28)'); dg.addColorStop(1, 'rgba(200,180,255,.6)');
      c.fillStyle = dg; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();
      c.strokeStyle = 'rgba(210,195,255,.85)'; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
      // «стрелки часов» и деления
      c.strokeStyle = 'rgba(220,210,255,.5)'; c.lineWidth = 1;
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.beginPath(); c.moveTo(cx + Math.cos(a) * R * .86, cy + Math.sin(a) * R * .86); c.lineTo(cx + Math.cos(a) * R * .96, cy + Math.sin(a) * R * .96); c.stroke(); }
      c.strokeStyle = 'rgba(230,220,255,.4)'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(t * 2) * R * .6, cy + Math.sin(t * 2) * R * .6); c.stroke();
      c.restore();
    }
    g.unit('Faceless Void', vx, vy, false, { hp: .95, r: 14, label: true });
    g.icon('abilities/faceless_void_chronosphere', 240, 34, { pop: seg(t, .2, .3), fallback: 'CHRONO', color: '#6a4ab0', a: 1 - seg(t, .55, .62) });
    // удары по застывшему Sven
    for (const [a, b] of [[.62, .8], [.72, .9], [.82, 1]] as const) g.floater('-' + (140 + Math.round(a * 50)), sx - 30, sy - 4, seg(t, a, b));
    // иконка BKB: активна, затем перечёркнута
    g.icon('items/black_king_bar', 40, 112, { pop: seg(t, .04, .12), fallback: 'BKB', color: '#8a6d33', label: T('BKB активен', 'BKB active'), crossed: seg(t, .44, .52) });
    if (t < .3) g.toast(T('У Sven включён BKB', 'Sven has BKB on'), seg(t, .02, .3));
    else if (t < .6) g.toast(T('Chronosphere проходит сквозь BKB', 'Chronosphere goes through BKB'), seg(t, .3, .6), '#d8cbff');
    else g.toast(T('Против таких ульт нужна позиция, а не кнопка', 'Against these ults you need positioning'), seg(t, .6, 1.05), '#ffe7a3');
    void cl;
  }),
]);
