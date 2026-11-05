// Сцены «как в игре», часть 4: управление и драфт.
import { cl, ez, lp, seg } from './engine.ts';
import { G2 } from './game.ts';
import { def } from './scenes-game.ts';

export const GAME4 = Object.fromEntries([
  def('Двойное нажатие — каст на себя', 5200, .62, (g0, t) => {
    const g = G2(g0), T = g0.T, c = g0.c, x = 180, y = 70;
    g.ground({ lane: y });
    const p1 = t > .22 && t < .3, p2 = t > .36 && t < .44, on = t > .44;
    g.key(64, 88, 'G', p1 || p2, 30);
    g0.text('×2', 64, 114, '#ffe07a', 13, 'center', cl(seg(t, .36, .44) * 3), true);
    g.icon('items/glimmer_cape', 64, 46, { fallback: 'GLIMMER', color: '#5a7a9a', label: 'Glimmer Cape', cd: on ? 1 - seg(t, .44, 1) : 0 });
    if (on) { c.save(); c.globalAlpha = .5 + Math.sin(t * 40) * .1; g.ring(x, y, 20, '#b6d8ff', 1, 2, 'rgba(182,216,255,.18)'); c.restore(); }
    g.unit('Crystal Maiden', x, y, true, { r: 13, hp: .5, a: on ? .45 : 1, label: true });
    g.unit('Sven', 254, y - 6, false, { r: 11, hp: .9 });
    if (on) g0.text('?', 238, y - 30, '#ff7a62', 14, 'center', 1, true);
    if (t < .22) g.toast(T('Нужно кинуть предмет на себя', 'You need to use an item on yourself'), seg(t, .02, .22));
    else if (t < .46) g.toast(T('Нажми клавишу предмета дважды', 'Press the item key twice'), seg(t, .22, .46), '#ffe07a');
    else g.toast(T('Каст на себя — без поиска себя мышкой', 'Self-cast without aiming at yourself'), seg(t, .46, 1.05), '#ffe7a3');
  }),

  def('Shift ставит команды в очередь', 6000, .55, (g0, t) => {
    const g = G2(g0), T = g0.T, c = g0.c;
    g.ground({ river: 150 });
    const P: [number, number][] = [[46, 108], [110, 52], [176, 96], [236, 46]];
    const plan = seg(t, .04, .34), go = seg(t, .38, .92);
    for (let i = 0; i < 3; i++) {
      const a = cl(plan * 3 - i);
      g0.line(P[i][0], P[i][1], P[i + 1][0], P[i + 1][1], '#ffe07a', 1.5, [4, 4], a * .9);
      if (a > 0) { g.ring(P[i + 1][0], P[i + 1][1], 6, '#ffe07a', a, 1.5); g0.text(String(i + 1), P[i + 1][0], P[i + 1][1] - 14, '#ffe07a', 11, 'center', a, true); }
    }
    const k = go * 3, i = Math.min(2, Math.floor(k)), f = ez(k - i);
    const hx = lp(P[i][0], P[i + 1][0], go > 0 ? f : 0), hy = lp(P[i][1], P[i + 1][1], go > 0 ? f : 0);
    if (go >= 1) g.ward(P[3][0], P[3][1] + 12, false, 30);
    g.unit('Lion', hx, hy, true, { r: 11, hp: .8 });
    c.save(); g.key(30, 26, 'Shift', plan > 0 && plan < 1, 40); c.restore();
    g.icon('items/ward_observer', 252, 112, { pop: seg(t, .25, .34), fallback: 'WARD', color: '#8a7a2a', size: 18 });
    if (t < .36) g.toast(T('Зажми Shift и накликай действия', 'Hold Shift and click your actions'), seg(t, .02, .36), '#ffe07a');
    else g.toast(T('Герой сделает всё сам по порядку', 'The hero does them all in order'), seg(t, .36, 1.05), '#ffe7a3');
  }),

  def('Alt-клик пишет команде', 5200, .6, (g0, t) => {
    const g = G2(g0), T = g0.T;
    g.ground({ trees: false });
    const press = t > .2 && t < .34;
    g.key(70, 52, 'Alt', press, 40);
    g.icon('abilities/enigma_black_hole', 140, 52, { size: 30, fallback: 'B.HOLE', color: '#4a2a7a', cd: .62 });
    g.cursor(146, 58, false, cl(seg(t, .12, .2) * 3));
    g.chat(T('[Enigma] Black Hole: через 23 с', '[Enigma] Black Hole: ready in 23s'), 100, cl(seg(t, .32, .4) * 3));
    g.chat(T('[Enigma] Blink Dagger: готов', '[Enigma] Blink Dagger: ready'), 120, cl(seg(t, .6, .68) * 3));
    g.icon('items/blink', 210, 52, { size: 24, fallback: 'BLINK', color: '#3a5a8a' });
    if (t > .5 && t < .64) g.key(70, 52, 'Alt', true, 40);
    if (t < .32) g.toast(T('Alt + клик по способности или предмету', 'Alt + click an ability or item'), seg(t, .02, .32));
    else g.toast(T('Команда видит, готово ли и сколько ждать', 'Your team sees if it’s ready and how long'), seg(t, .32, 1.05), '#9be27e');
  }),

  def('Blink не дальше радиуса', 6000, .4, (g0, t) => {
    const g = G2(g0), T = g0.T, x = 70, y = 74, R = 70;
    g.ground({ lane: y });
    g.ring(x, y, R, '#7ab8ff', .7, 1.2, 'rgba(122,184,255,.06)', [4, 4]);
    const second = t > .5, k = seg(t, second ? .62 : .14, second ? .7 : .22);
    const target: [number, number] = second ? [118, 60] : [214, 74];
    const land: [number, number] = second ? target : [x + R - 4, 74];
    g0.cross(target[0], target[1], 5, '#ffe07a');
    g.cursor(target[0] + 2, target[1] + 2, false, 1);
    if (k > 0 && k < 1) g.burst(x, y, k, '#7ab8ff', 8);
    g.unit('Anti-Mage', k >= 1 || (second && t > .7) ? land[0] : x, k >= 1 || (second && t > .7) ? land[1] : y, true, { r: 11, hp: .8 });
    g.icon('items/blink', 30, 30, { size: 20, fallback: 'BLINK', color: '#3a5a8a', label: 'Blink' });
    if (!second) g.toast(T('Клик за кругом — прыжок короче', 'Click outside: a shorter jump'), seg(t, .02, .5), '#ff9a85');
    else g.toast(T('Клик внутри круга — точно в точку', 'Click inside: exactly on the spot'), seg(t, .5, 1.05), '#9be27e');
  }),

  def('Бери контрпик последним', 6000, .86, (g0, t) => {
    const g = G2(g0), T = g0.T;
    g.ground({ trees: false });
    g0.text(T('Силы Тьмы', 'The Dire'), 140, 34, '#ff7a62', 10, 'center', 1, true);
    g0.text(T('Силы Света', 'The Radiant'), 140, 84, '#8fe27b', 10, 'center', 1, true);
    const en = ['Phantom Assassin', 'Pudge', 'Invoker', 'Axe', 'Crystal Maiden'], al = ['Lion', 'Juggernaut', 'Tidehunter', 'Puck'];
    const n = Math.min(5, Math.floor(seg(t, .04, .6) * 6));
    en.forEach((h, i) => g.slot(i < n ? h : null, 56 + i * 42, 56, false));
    al.forEach((h, i) => g.slot(h, 56 + i * 42, 106, true));
    const last = t > .7;
    g.slot(last ? 'Earth Spirit' : null, 56 + 4 * 42, 106, true);
    if (!last) g0.text('?', 56 + 4 * 42, 106, '#ffe07a', 16, 'center', .6 + Math.sin(t * 30) * .3, true);
    else { g0.text('+9.1', 56 + 4 * 42 + 26, 106, '#7fe05f', 11, 'left', 1, true); g.burst(56 + 4 * 42, 106, seg(t, .7, .85), '#ffe07a', 12); }
    if (t < .6) g.toast(T('Чем больше врагов выбрано…', 'The more enemies are picked…'), seg(t, .02, .6));
    else g.toast(T('…тем точнее контрпик последним', '…the sharper your last-pick counter'), seg(t, .6, 1.05), '#ffe7a3');
  }),

  def('Первым — гибкого героя', 6000, .7, (g0, t) => {
    const g = G2(g0), T = g0.T;
    g.ground({ trees: false });
    g.unit('Pangolier', 66, 74, true, { r: 18, hp: 1, label: true });
    (['Pos 1', 'Pos 2', 'Pos 3'] as const).forEach((p, i) => {
      const a = seg(t, .1 + i * .12, .2 + i * .12), y = 40 + i * 34;
      g0.line(88, 74, 150, y, '#ffe07a', 1.5, [3, 3], a);
      g.icon('', 172, y, { size: 22, pop: a, fallback: p.replace('Pos ', ''), color: ['#e5843c', '#4fa3d9', '#e04a35'][i], label: undefined });
      g0.text(p, 200, y, '#f3ead2', 10, 'left', a, true);
    });
    g0.text('?', 252, 74, '#ff7a62', 26, 'center', cl(seg(t, .6, .7) * 3), true);
    g.unit('Pudge', 252, 108, false, { r: 10, hp: 1, a: cl(seg(t, .6, .7) * 3) });
    if (t < .5) g.toast(T('Ранний пик — герой на несколько позиций', 'Early pick: a hero for several roles'), seg(t, .02, .5));
    else g.toast(T('Врагу сложнее ответить', 'Harder for the enemy to answer'), seg(t, .5, 1.05), '#ffe7a3');
  }),
]);
