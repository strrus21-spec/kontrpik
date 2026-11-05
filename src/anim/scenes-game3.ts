// Сцены «как в игре», часть 3: карта, линия, фарм.
import { cl, ez, lp, seg } from './engine.ts';
import { G2 } from './game.ts';
import { def } from './scenes-game.ts';

export const GAME3 = Object.fromEntries([
  def('Денай свою башню', 5600, .7, (g0, t) => {
    const g = G2(g0), T = g0.T, y = 70, tx = 140;
    g.ground({ lane: y });
    const hp = lp(.35, .07, seg(t, .05, .45)), denied = t > .6;
    if (!denied) g.tower(tx, y, true, hp); else { g.burst(tx, y - 4, seg(t, .6, .8), '#ffd76e', 16); g.tower(tx, y, true, 0, 1 - seg(t, .6, .75)); }
    const sv = [.12, .22, .32, .42].map(h => g.floater('-60', tx + 22, y - 22, seg(t, h, h + .15)));
    void sv;
    g.unit('Sven', 214, y + 6, false, { r: 13, hp: .8, label: true });
    g.unit('Lion', 70, y + 14, true, { r: 12, hp: .7, label: true });
    if (t > .48 && t < .6) g.missile(84, y + 10, lp(84, tx - 8, seg(t, .48, .6)), lp(y + 10, y, seg(t, .48, .6)), '#9be27e', 3);
    if (hp < .1 && !denied) g0.text('<10%', tx + 26, y - 28, '#ffe07a', 10, 'left', 1, true);
    if (denied) { g0.text('!', tx, y - 30, '#ffe07a', 22, 'center', 1, true); g.floater(T('золото врагу: меньше', 'enemy gold: less'), 214, y - 20, seg(t, .64, .98), '#ffcf6e'); }
    if (t < .45) g.toast(T('Башню ломают', 'Your tower is falling'), seg(t, .02, .45));
    else if (t < .62) g.toast(T('Меньше 10% — добей сам', 'Under 10%: finish it yourself'), seg(t, .45, .62), '#9be27e');
    else g.toast(T('Денай: враги получают меньше золота', 'Denied: the enemy gets less gold'), seg(t, .62, 1.05), '#ffe7a3');
  }),

  def('Аегис можно денайнуть', 5600, .72, (g0, t) => {
    const g = G2(g0), T = g0.T, c = g0.c, ax = 140, ay = 76;
    g.ground({ trees: true });
    c.save(); c.fillStyle = 'rgba(30,24,18,.7)'; c.beginPath(); c.ellipse(ax, ay, 46, 30, 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(120,100,70,.6)'; c.lineWidth = 2; c.stroke(); c.restore();
    const gone = t > .6;
    g.aegis(ax, ay, gone ? 1 - seg(t, .6, .7) : 1, t);
    g.burst(ax, ay, seg(t, .6, .78), '#ffd76e', 16);
    g.unit('Slark', lp(250, 186, ez(seg(t, 0, .6))), ay - 4, false, { r: 12, hp: .8, label: true });
    g.unit('Lion', 92, ay + 18, true, { r: 12, hp: .6, label: true });
    for (const h of [.35, .45, .55]) if (t > h && t < h + .08) g.missile(104, ay + 14, lp(104, ax - 6, seg(t, h, h + .08)), lp(ay + 14, ay + 2, seg(t, h, h + .08)), '#9be27e', 3);
    g0.text('Aegis', ax, ay - 20, '#ffd76e', 9, 'center', gone ? 1 - seg(t, .6, .7) : 1, true);
    if (t < .32) g.toast(T('Враги бегут за Аегисом', 'The enemy runs for the Aegis'), seg(t, .02, .32));
    else if (t < .62) g.toast(T('Не успеваешь забрать — бей его', 'Can’t pick it up? Attack it'), seg(t, .32, .62), '#9be27e');
    else g.toast(T('Аегис уничтожен — второй жизни у них нет', 'Aegis destroyed: no second life for them'), seg(t, .62, 1.05), '#ffe7a3');
  }),

  def('Стан прерывает телепорт', 5200, .66, (g0, t) => {
    const g = G2(g0), T = g0.T, y = 72, sx = 206;
    g.ground({ lane: y });
    const ch = seg(t, .05, .75), stunned = t > .55;
    if (!stunned) { g.channel(sx, y, ch, '#7ab8ff', 22); g0.text('TP', sx, y - 34, '#7ab8ff', 10, 'center', 1, true); }
    g.unit('Sniper', sx, y, false, { r: 13, hp: .25, label: true });
    if (stunned) { g.stun(sx, y, t); g.burst(sx, y, seg(t, .55, .7), '#ffe07a', 12); }
    const hx = lp(70, sx - 16, seg(t, .35, .55));
    if (t > .35 && t < .55) g.missile(70, y, hx, y, '#7ab8ff', 5);
    g.unit('Sven', 56, y, true, { r: 13, hp: .8, label: true });
    g.icon('items/tpscroll', sx + 34, y - 30, { pop: seg(t, .02, .1), fallback: 'TP', color: '#3a6ab0', crossed: seg(t, .56, .62) });
    g.icon('abilities/sven_storm_bolt', 56, y - 38, { pop: seg(t, .28, .36), fallback: 'STUN', color: '#3a6ab0' });
    if (t < .35) g.toast(T('Враг телепортируется', 'The enemy is teleporting'), seg(t, .02, .35));
    else if (t < .6) g.toast(T('Оглуши до конца канала', 'Stun before the channel ends'), seg(t, .35, .6), '#bfe3ff');
    else g.toast(T('Телепорт сорван — он остался', 'TP cancelled: he stays'), seg(t, .6, 1.05), '#ffe7a3');
  }),

  def('Корень прерывает Twin Gates', 5600, .7, (g0, t) => {
    const g = G2(g0), T = g0.T, c = g0.c, px = 196, py = 72;
    g.ground({ trees: true });
    // портал
    c.save(); const pg = c.createRadialGradient(px, py, 4, px, py, 30); pg.addColorStop(0, 'rgba(200,170,255,.6)'); pg.addColorStop(1, 'rgba(120,80,220,0)'); c.fillStyle = pg; c.beginPath(); c.arc(px, py, 30, 0, 7); c.fill(); c.restore();
    g.ring(px, py, 26, '#b49aff', .9, 2);
    const ch = seg(t, .05, .8), rooted = t > .5;
    if (!rooted) g.channel(px, py, ch, '#d8b4ff', 18);
    g.unit('Slark', px, py, false, { r: 12, hp: .3, label: true });
    g.roots(px, py, ez(seg(t, .5, .6)));
    if (t > .32 && t < .5) g.missile(76, py, lp(76, px - 14, seg(t, .32, .5)), py, '#7bc75f', 4);
    g.unit('Treant Protector', 62, py, true, { r: 13, hp: .8, label: true });
    g.icon('abilities/treant_overgrowth', 62, py - 38, { pop: seg(t, .25, .33), fallback: 'ROOT', color: '#3a7a3a' });
    if (t < .32) g.toast(T('Враг уходит через Twin Gates', 'The enemy warps through Twin Gates'), seg(t, .02, .32));
    else if (t < .6) g.toast(T('С 7.41e рут во время перехода…', 'Since 7.41e a root during the warp…'), seg(t, .32, .6), '#9be27e');
    else g.toast(T('…отменяет телепорт. Лови у портала', '…cancels it. Catch them at the portal'), seg(t, .6, 1.05), '#ffe7a3');
  }),

  def('Смок слетает рядом с врагом', 5600, .72, (g0, t) => {
    const g = G2(g0), T = g0.T, ex = 220, ey = 72, R = 54;
    g.ground({ trees: true });
    g.ring(ex, ey, R, '#e2553f', .6, 1.2, 'rgba(226,85,63,.06)', [4, 4]);
    g.unit('Sniper', ex, ey, false, { r: 12, hp: .9, label: true });
    const x = lp(48, 176, seg(t, .0, .7)), inR = ex - x < R + 8, sm = !inR;
    g.unit('Pudge', x - 10, ey - 10, true, { r: 10, hp: .9, a: sm ? .55 : 1 });
    g.unit('Lion', x + 8, ey + 10, true, { r: 10, hp: .9, a: sm ? .55 : 1 });
    if (sm) g.smoke(x, ey, 26, .9);
    else g.burst(x, ey, seg(t, .64, .82), '#b4a8e0', 18);
    g.icon('items/smoke_of_deceit', 30, 30, { pop: seg(t, .0, .08), fallback: 'SMOKE', color: '#5a4a7a', crossed: inR ? 1 : 0 });
    if (t < .4) g.toast(T('Идёте под смоком — вас не видно', 'Smoked up: nobody can see you'), seg(t, .02, .4));
    else if (t < .66) g.toast(T('Рядом с вражеским героем или башней…', 'Near an enemy hero or tower…'), seg(t, .4, .66), '#ffb19f');
    else g.toast(T('…смок слетает. Обходи их стороной', '…the smoke breaks. Walk around them'), seg(t, .66, 1.05), '#ffe7a3');
  }),

  def('Агр крипов: ударь и отойди', 5600, .72, (g0, t) => {
    const g = G2(g0), T = g0.T, c = g0.c, y = 74;
    g.ground({ lane: y });
    g.tower(26, y - 6, true, 1);
    const back = ez(seg(t, .3, .75)), hit = t > .12 && t < .3;
    const lx = lp(150, 82, back);
    const cr: [number, number][] = [[190, y - 12], [196, y + 4], [186, y + 18]];
    cr.forEach(([x, yy], i) => {
      const cx = t > .3 ? lp(x, lx + 26 + i * 9, back) : x, cy = t > .3 ? lp(yy, y - 16 + i * 16, back) : yy;
      if (t > .28) { c.save(); c.globalAlpha = .55; c.strokeStyle = '#ff5a40'; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(cx, cy); c.lineTo(lx, y + 4); c.stroke(); c.restore(); }
      g.creep(cx, cy, false, { hp: .9 });
    });
    [0, 1].forEach(i => g.creep(112 + i * 14, y - 22 + i * 46, true, { hp: .8 }));
    g.unit('Sniper', 224, y + 2, false, { r: 12, hp: hit ? .75 : .8, label: true });
    g.unit('Lion', lx, y + 4, true, { r: 12, hp: .8, label: true });
    if (hit) g.missile(lx + 12, y + 4, lp(lx + 12, 212, seg(t, .12, .3)), y + 2, '#9be27e', 3);
    g0.text(T('агр!', 'aggro!'), 190, y - 30, '#ff5a40', 11, 'center', cl(seg(t, .28, .34) * 3) * (1 - seg(t, .7, .8)), true);
    if (t < .3) g.toast(T('Ударь вражеского героя…', 'Hit the enemy hero…'), seg(t, .02, .3));
    else if (t < .75) g.toast(T('…и сразу отойди: крипы идут за тобой', '…and step back: the creeps follow you'), seg(t, .3, .75), '#ffb19f');
    else g.toast(T('Линия сдвинулась к твоей башне', 'The lane moved toward your tower'), seg(t, .75, 1.05), '#ffe7a3');
  }),

  def('Сброс агра — атака по своему крипу', 5200, .7, (g0, t) => {
    const g = G2(g0), T = g0.T, c = g0.c, y = 74, lx = 108, ax = 150, ay = 54;
    g.ground({ lane: y });
    const sw = t > .45;
    const cr: [number, number][] = [[200, y - 14], [210, y + 2], [198, y + 18]];
    cr.forEach(([x, yy]) => { c.save(); c.globalAlpha = .6; c.strokeStyle = '#ff5a40'; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(x, yy); c.lineTo(sw ? ax : lx, sw ? ay : y); c.stroke(); c.restore(); g.creep(x, yy, false, { hp: .9 }); });
    g.creep(ax, ay, true, { hp: sw ? .6 : .9 });
    g.unit('Lion', lx, y, true, { r: 12, hp: sw ? .45 : lp(.8, .45, seg(t, .05, .45)), label: true });
    g.cursor(ax + 2, ay + 2, true, cl(seg(t, .3, .38) * 3) * (1 - seg(t, .6, .7)));
    if (t > .38 && t < .5) g.missile(lx + 10, y - 4, lp(lx + 10, ax - 6, seg(t, .38, .5)), lp(y - 4, ay + 2, seg(t, .38, .5)), '#9be27e', 2.5);
    if (sw) g0.text(T('агр сброшен', 'aggro dropped'), lx, y + 38, '#9be27e', 10, 'center', 1, true);
    if (t < .3) g.toast(T('По тебе бьют вражеские крипы', 'Enemy creeps are hitting you'), seg(t, .02, .3));
    else if (t < .5) g.toast(T('Дай команду атаки по своему крипу', 'Order an attack on your own creep'), seg(t, .3, .5), '#ffb19f');
    else g.toast(T('Агр слетает мгновенно', 'The aggro resets instantly'), seg(t, .5, 1.05), '#ffe7a3');
  }),

  def('Отдай танго союзнику', 5200, .72, (g0, t) => {
    const g = G2(g0), T = g0.T, c = g0.c, y = 74;
    g.ground({ lane: y });
    g.unit('Crystal Maiden', 66, y, true, { r: 13, hp: .8, label: true });
    g.unit('Anti-Mage', 212, y, true, { r: 13, hp: .35, label: true });
    const k = ez(seg(t, .2, .6));
    if (k > 0 && k < 1) { c.save(); c.translate(lp(80, 198, k), y - Math.sin(k * Math.PI) * 34); c.rotate(k * 6); g.icon('items/tango', 0, 0, { size: 16, fallback: 'T', color: '#3a7a3a' }); c.restore(); }
    g.icon('items/tango', 66, y - 38, { pop: seg(t, .05, .14), fallback: 'TANGO', color: '#3a7a3a', label: 'Tango', a: 1 - seg(t, .2, .26) });
    if (t > .6) { g.icon('items/tango', 212, y - 38, { pop: seg(t, .6, .7), fallback: 'TANGO', color: '#3a7a3a' }); g.floater('+1 Tango', 250, y - 14, seg(t, .6, .9), '#9be27e'); }
    if (t < .2) g.toast(T('Керри забыл реген', 'Your carry forgot regen'), seg(t, .02, .2));
    else if (t < .62) g.toast(T('Используй танго на союзника', 'Use a tango on your ally'), seg(t, .2, .62), '#9be27e');
    else g.toast(T('Он получит его в инвентарь', 'It goes into their inventory'), seg(t, .62, 1.05), '#ffe7a3');
  }),

  def('Стак на :53', 6000, .45, (g0, t) => {
    const g = G2(g0), T = g0.T, c = g0.c, campX = 150, campY = 62;
    g.ground({ trees: true });
    for (const [x, y] of [[110, 40], [190, 38], [104, 86], [196, 88]]) g.tree(x, y, 11);
    const sec = Math.floor(lp(48, 62, t)) % 60, hot = sec >= 53 && sec <= 55;
    g.clock(`0:${String(sec).padStart(2, '0')}`, hot);
    c.save(); c.strokeStyle = 'rgba(255,224,122,.5)'; c.setLineDash([3, 3]); c.strokeRect(campX - 26, campY - 18, 52, 36); c.restore();
    const pull = ez(seg(t, .38, .7)), spawn = t > .86;
    [0, 1, 2].forEach(i => g.neutral(lp(campX - 10 + i * 10, 70 + i * 10, pull), lp(campY, 112, pull), { hp: .9 }));
    g.unit('Lion', lp(campX + 30, 40, ez(seg(t, .38, .7))), lp(campY + 26, 118, ez(seg(t, .38, .7))), true, { r: 10, hp: .8 });
    if (t > .3 && t < .4) g.missile(campX + 26, campY + 20, campX + 4, campY + 4, '#9be27e', 2.5);
    if (spawn) { [0, 1, 2].forEach(i => g.neutral(campX - 10 + i * 10, campY, { a: seg(t, .86, .92) })); g0.text('×2', campX + 40, campY, '#ffe07a', 16, 'center', 1, true); }
    if (t < .36) g.toast(T('Жди :53–:55', 'Wait for :53–:55'), seg(t, .02, .36), '#ffe07a', 34);
    else if (t < .8) g.toast(T('Ударь лагерь и уведи нейтралов', 'Hit the camp and pull the neutrals'), seg(t, .36, .8), '#ffe07a', 34);
    else g.toast(T('В :00 появится вторая пачка', 'A second group spawns at :00'), seg(t, .8, 1.05), '#ffe7a3', 34);
  }),

  def('Стак древних для AoE-керри', 6000, .74, (g0, t) => {
    const g = G2(g0), T = g0.T, cx = 140, cy = 70;
    g.ground({ trees: true });
    const st = 1 + Math.min(2, Math.floor(seg(t, .02, .45) * 3)), cleave = seg(t, .55, .75), dead = t > .75;
    for (let i = 0; i < st * 3; i++) if (!dead) g.neutral(cx - 30 + (i % 5) * 15, cy - 14 + Math.floor(i / 5) * 18, { big: true, hp: cleave > 0 ? 1 - cleave : undefined });
    if (dead) { g.burst(cx, cy, seg(t, .75, .9), '#d8b4ff', 18); g.floater(T('+уровень', '+level'), cx, cy - 20, seg(t, .78, 1), '#ffe07a'); }
    g0.text('×' + st, 232, 48, '#d8b4ff', 18, 'center', 1, true);
    g.unit('Sven', lp(60, 108, ez(seg(t, .45, .55))), cy + 34, true, { r: 13, hp: .9, label: true });
    if (cleave > 0 && cleave < 1) g.ring(lp(60, 108, 1), cy + 34, 20 + cleave * 50, '#ff8a6a', 1 - cleave, 3);
    if (t < .46) g.toast(T('Саппорт стакает древних', 'The support stacks the ancients'), seg(t, .02, .46), '#d8b4ff');
    else if (t < .76) g.toast(T('Отдай стак герою с уроном по площади', 'Give it to an AoE hero'), seg(t, .46, .76), '#ffb19f');
    else g.toast(T('Быстрые уровни и предмет раньше врага', 'Fast levels and an earlier item'), seg(t, .76, 1.05), '#ffe7a3');
  }),
]);
