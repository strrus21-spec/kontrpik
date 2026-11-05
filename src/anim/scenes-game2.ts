// Сцены «как в игре», часть 2: против героев и предметы.
import { cl, ez, lp, seg } from './engine.ts';
import { G2 } from './game.ts';
import { def } from './scenes-game.ts';

export const GAME2 = Object.fromEntries([
  def('Echo Slam сильнее от каждого юнита', 6000, .7, (g0, t) => {
    const g = G2(g0), T = g0.T, x = 140, y = 76;
    g.ground({ lane: y });
    const pts: [number, number, 'h' | 'c'][] = [[96, 56, 'h'], [186, 58, 'h'], [104, 100, 'c'], [178, 98, 'c'], [140, 40, 'h'], [72, 82, 'c'], [208, 82, 'c']];
    const n = Math.min(pts.length, Math.floor(seg(t, .05, .45) * (pts.length + 1)));
    const slam = seg(t, .55, .8);
    pts.slice(0, n).forEach(([px, py, k], i) => {
      const hit = slam > 0 && Math.hypot(px - x, py - y) < slam * 120;
      k === 'h' ? g.unit('Phantom Lancer', px, py, true, { r: 10, hp: hit ? .3 : .9, tint: i ? 'rgba(90,150,255,.25)' : undefined }) : g.creep(px, py, true, { hp: hit ? .1 : .8 });
      if (hit) g.floater('-' + (90 + n * 25), px, py - 14, seg(t, .6 + i * .01, .9));
    });
    g.unit('Earthshaker', x, y, false, { r: 15, hp: .8, label: true });
    if (slam > 0) { g.ring(x, y, slam * 120, '#ffcf6e', 1 - slam, 3); g.ring(x, y, slam * 80, '#ffcf6e', (1 - slam) * .6, 2); }
    g.icon('abilities/earthshaker_echo_slam', 244, 34, { pop: seg(t, .47, .55), fallback: 'SLAM', color: '#a07a3a' });
    g0.text(`×${n}`, 40, 118, '#ffcf6e', 16, 'center', cl(n), true);
    if (t < .5) g.toast(T('Каждый юнит рядом с Earthshaker…', 'Every unit near Earthshaker…'), seg(t, .02, .5));
    else if (t < .82) g.toast(T('…добавляет урон Echo Slam', '…adds damage to Echo Slam'), seg(t, .5, .82), '#ffcf6e');
    else g.toast(T('Не стой толпой с крипами и иллюзиями', 'Don’t stack with creeps and illusions'), seg(t, .82, 1.05), '#ffe7a3');
  }),

  def('Ульта Zeus бьёт по всей карте', 5600, .5, (g0, t) => {
    const g = G2(g0), T = g0.T;
    g.ground({ river: 140, trees: true });
    for (const [x, y] of [[40, 42], [56, 50], [44, 58], [228, 96], [244, 104], [232, 112]]) g.tree(x, y, 9);
    const strike = seg(t, .4, .48), dead = t > .5;
    const hs: [string, number, number][] = [['Lion', 48, 50], ['Crystal Maiden', 236, 104], ['Sniper', 150, 80]];
    hs.forEach(([n, x, y], i) => {
      const run = i === 2 ? lp(0, -30, seg(t, 0, .4)) : 0;
      g.unit(n, x + run, y, true, { r: 10, hp: dead ? 0 : .12, grey: dead, a: i < 2 ? .85 : 1 });
      if (strike > 0 && strike < 1) g.bolt(x + run, y, 1 - strike * .5);
      g.floater('-' + (300 + i * 20), x + run, y - 14, seg(t, .46, .75));
    });
    g.icon('abilities/zuus_thundergods_wrath', 252, 26, { pop: seg(t, .2, .3), fallback: 'ZEUS', color: '#3a6ab0' });
    if (t < .38) g.toast(T('Мало здоровья — спрятался в лесу?', 'Low HP — hiding in the trees?'), seg(t, .02, .38));
    else if (t < .7) g.toast(T('Ульта Zeus бьёт всех врагов на карте', 'Zeus’s ult hits every enemy on the map'), seg(t, .38, .7), '#bfe3ff');
    else g.toast(T('Беги к фонтану или лечись сразу', 'Go to the fountain or heal right away'), seg(t, .7, 1.05), '#ffe7a3');
  }),

  def("Смерть от Reaper's Scythe дольше", 5600, .7, (g0, t) => {
    const g = G2(g0), T = g0.T, c = g0.c, y = 64;
    g.ground({ lane: y });
    const hit = seg(t, .2, .32), dead = t > .32;
    g.unit('Necrophos', 210, y, false, { r: 14, hp: .9, label: true });
    g.unit('Sven', 90, y, true, { r: 14, hp: dead ? 0 : .25, grey: dead, label: true });
    if (hit > 0 && hit < 1) { c.save(); c.globalAlpha = 1 - hit; c.strokeStyle = '#b07aff'; c.shadowColor = '#b07aff'; c.shadowBlur = 14; c.lineWidth = 3; c.beginPath(); c.arc(90, y - 6, 22, Math.PI * 1.1, Math.PI * 1.1 + hit * Math.PI * 1.2); c.stroke(); c.restore(); }
    g.icon('abilities/necrolyte_reapers_scythe', 252, y - 28, { pop: seg(t, .1, .2), fallback: 'SCYTHE', color: '#5a3a8a' });
    // таймер возрождения: обычный и после Scythe
    const k = seg(t, .4, .75);
    g0.text(T('Возрождение', 'Respawn'), 30, 104, '#f3ead2', 9, 'left', cl(k * 3), true);
    g.hpBar(190, 100, 110, lp(0, .55, k), true, cl(k * 3)); g0.text(T('обычно', 'normal'), 100, 103, '#8d949c', 8.5, 'left', cl(k * 3), false);
    c.save(); c.globalAlpha = cl(k * 3); c.fillStyle = '#05070a'; c.fillRect(134, 115, 112, 5); c.fillStyle = '#b07aff'; c.fillRect(135, 116, 110 * lp(0, .85, k), 3); c.restore();
    g0.text('Scythe', 100, 119, '#b07aff', 8.5, 'left', cl(k * 3), true);
    g.icon('', 262, 120, { pop: seg(t, .78, .86), fallback: '$', color: '#c8962a', label: T('выкуп', 'buyback') });
    if (t < .35) g.toast(T('Necrophos добивает ультой', 'Necrophos finishes with his ult'), seg(t, .02, .35));
    else if (t < .76) g.toast(T('Возрождение после Scythe дольше', 'Respawn after Scythe is longer'), seg(t, .35, .76), '#d8b4ff');
    else g.toast(T('Держи золото на выкуп', 'Keep gold for buyback'), seg(t, .76, 1.05), '#ffe7a3');
  }),

  def('Sentry Ward видит мины', 5600, .7, (g0, t) => {
    const g = G2(g0), T = g0.T, y = 76;
    g.ground({ lane: y });
    g.tower(40, y - 4, true, .8);
    const ward = seg(t, .25, .3), vis = ez(seg(t, .3, .45)), R = 70 * vis;
    if (ward > 0) g.ward(150, y, true, R);
    const mines: [number, number][] = [[118, 64], [176, 90], [160, 56], [112, 96], [196, 70]];
    mines.forEach(([x, yy], i) => { const inR = Math.hypot(x - 150, yy - y) < R; g.mine(x, yy, inR ? 1 : 0); if (inR && t > .6 + i * .05) g.burst(x, yy, seg(t, .6 + i * .05, .72 + i * .05), '#ff8a6a', 8); });
    g.unit('Lion', lp(70, 128, ez(seg(t, .05, .25))), y + 4, true, { r: 11, hp: .8, label: true });
    g.icon('items/ward_sentry', 230, 32, { pop: seg(t, .18, .26), fallback: 'SENTRY', color: '#2a5a8a', label: 'Sentry Ward' });
    if (t < .3) g.toast(T('Мины Techies невидимы', 'Techies’ mines are invisible'), seg(t, .02, .3));
    else if (t < .6) g.toast(T('Sentry Ward показывает их', 'A Sentry Ward reveals them'), seg(t, .3, .6), '#bfe3ff');
    else g.toast(T('Видимые мины можно сломать', 'Visible mines can be destroyed'), seg(t, .6, 1.05), '#ffe7a3');
  }),

  def('Break снимает пассивки', 5600, .75, (g0, t) => {
    const g = G2(g0), T = g0.T, c = g0.c, y = 74, bx = 176;
    g.ground({ lane: y });
    const broken = t > .5, hits = [.22, .32, .62, .72, .82];
    // щит игл за спиной
    if (!broken) { c.save(); c.strokeStyle = '#e8d29a'; c.lineWidth = 2; c.shadowColor = '#e8d29a'; c.shadowBlur = 6; for (let i = 0; i < 9; i++) { const a = -Math.PI / 3 + i * (Math.PI * 2 / 3) / 8; c.beginPath(); c.moveTo(bx + 18 * Math.cos(a), y + 18 * Math.sin(a)); c.lineTo(bx + 26 * Math.cos(a), y + 26 * Math.sin(a)); c.stroke(); } c.restore(); }
    g.unit('Bristleback', bx, y, false, { r: 15, hp: lp(1, .3, seg(t, .5, .95)), label: true });
    const sx = lp(60, 126, ez(seg(t, 0, .18)));
    g.unit('Slark', sx, y, true, { r: 12, hp: .8, label: true });
    hits.forEach(h => g.floater(h < .5 ? '-28' : '-95', bx + 4, y - 22, seg(t, h, h + .2), h < .5 ? '#c9a16a' : '#ff5a40'));
    if (broken) g0.text('BREAK', bx, y - 44, '#ff5a40', 13, 'center', cl(seg(t, .5, .56) * 2), true);
    g.icon('items/silver_edge', 60, 30, { pop: seg(t, .42, .5), fallback: 'SILVER', color: '#4a6a8a', label: 'Silver Edge' });
    if (t < .42) g.toast(T('Иглы на спине режут урон', 'Back quills cut the damage'), seg(t, .02, .42));
    else if (t < .7) g.toast(T('Silver Edge выключает пассивку', 'Silver Edge turns the passive off'), seg(t, .42, .7), '#bfe3ff');
    else g.toast(T('Урон проходит полностью', 'Full damage goes through'), seg(t, .7, 1.05), '#ffe7a3');
  }),

  def('Иллюзии — урон по площади', 5600, .62, (g0, t) => {
    const g = G2(g0), T = g0.T, c = g0.c, y = 72;
    g.ground({ lane: y });
    const pts: [number, number][] = [[176, 48], [206, 72], [168, 98], [222, 104], [230, 44], [190, 76]];
    const real = 5, zap = seg(t, .35, .55);
    pts.forEach(([x, yy], i) => {
      const dead = i !== real && zap > (i + 1) / 7;
      if (!dead) g.unit('Phantom Lancer', x, yy, false, { r: 11, hp: i === real ? .7 : .5, tint: i !== real ? 'rgba(90,150,255,.18)' : undefined });
      else g.burst(x, yy, seg(t, .35 + (i + 1) / 7 * .2, .5 + (i + 1) / 7 * .2), '#9ad7ff', 8);
    });
    g.unit('Juggernaut', 70, y, true, { r: 13, hp: .8, label: true });
    if (zap > 0 && zap < 1) { c.save(); c.strokeStyle = '#bfe3ff'; c.shadowColor = '#7ab8ff'; c.shadowBlur = 12; c.lineWidth = 2; c.beginPath(); c.moveTo(80, y); for (const [x, yy] of pts.slice(0, 1 + Math.floor(zap * 6))) c.lineTo(x, yy); c.stroke(); c.restore(); }
    g.icon('items/mjollnir', 70, 30, { pop: seg(t, .26, .34), fallback: 'MJOL', color: '#3a6ab0', label: 'Mjollnir' });
    if (t < .32) g.toast(T('Phantom Lancer и куча иллюзий', 'Phantom Lancer and lots of illusions'), seg(t, .02, .32));
    else if (t < .62) g.toast(T('Иллюзии получают больше урона', 'Illusions take extra damage'), seg(t, .32, .62), '#bfe3ff');
    else g.toast(T('Бей по области — останется настоящий', 'Hit an area: only the real one is left'), seg(t, .62, 1.05), '#ffe7a3');
  }),

  def('Lotus Orb отражает ульту', 5600, .62, (g0, t) => {
    const g = G2(g0), T = g0.T, y = 72, lx = 48, cx = 216;
    g.ground({ lane: y });
    const shell = t > .14, go = seg(t, .3, .5), back = seg(t, .5, .7), hexed = t > .7;
    if (shell) g.ring(cx, y, 20, '#ff9de0', .9, 2, 'rgba(255,157,224,.14)');
    g.unit('Crystal Maiden', cx, y, true, { r: 13, hp: .6, label: true });
    if (!hexed) g.unit('Lion', lx, y, false, { r: 13, hp: .9, label: true });
    else { const c = g0.c; g.shadow(lx, y, 9); c.save(); c.fillStyle = '#6fbf4a'; c.beginPath(); c.ellipse(lx, y, 10, 7, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(lx - 4, y - 5, 2.2, 0, 7); c.arc(lx + 4, y - 5, 2.2, 0, 7); c.fill(); c.restore(); g0.text('HEX', lx, y - 22, '#9be27e', 11, 'center', 1, true); }
    if (go > 0 && go < 1) g.missile(lx + 14, y, lp(lx + 14, cx - 20, go), y, '#9be27e', 4);
    if (back > 0 && back < 1) g.missile(cx - 20, y, lp(cx - 20, lx + 14, back), y, '#ff9de0', 4);
    g.icon('items/lotus_orb', cx, y - 40, { pop: seg(t, .08, .16), fallback: 'LOTUS', color: '#8a3a6a', label: 'Lotus Orb' });
    g.icon('abilities/lion_voodoo', lx, y - 40, { pop: seg(t, .22, .3), fallback: 'HEX', color: '#3a7a3a', a: 1 - seg(t, .66, .7) });
    if (t < .3) g.toast(T('Повесь Lotus Orb на союзника', 'Put Lotus Orb on your ally'), seg(t, .02, .3));
    else if (t < .7) g.toast(T('Hex летит в него…', 'The hex flies at them…'), seg(t, .3, .7), '#ffcaf0');
    else g.toast(T('…и отражается в того, кто кастовал', '…and bounces back to the caster'), seg(t, .7, 1.05), '#ffe7a3');
  }),

  def('Linken ломай дешёвым заклинанием', 5600, .78, (g0, t) => {
    const g = G2(g0), T = g0.T, y = 72, lx = 48, ax = 214;
    g.ground({ lane: y });
    const s1 = seg(t, .18, .38), pop = t > .38, s2 = seg(t, .55, .72), landed = t > .72;
    if (!pop) g.ring(ax, y, 20, '#7ab8ff', .9, 2, 'rgba(122,184,255,.14)');
    g.burst(ax, y, seg(t, .38, .52), '#7ab8ff', 12);
    g.unit('Anti-Mage', ax, y, false, { r: 13, hp: .9, label: true });
    g.unit('Lion', lx, y, true, { r: 13, hp: .8, label: true });
    if (s1 > 0 && s1 < 1) g.missile(lx + 14, y, lp(lx + 14, ax - 20, s1), y, '#f3ead2', 3);
    if (s2 > 0 && s2 < 1) g.missile(lx + 14, y, lp(lx + 14, ax - 14, s2), y, '#9be27e', 5);
    if (landed) g0.text('HEX', ax, y - 26, '#9be27e', 12, 'center', 1, true);
    g.icon('items/sphere', ax + 38, y - 34, { pop: seg(t, .0, .08), fallback: 'LINKEN', color: '#3a6ab0', crossed: seg(t, .38, .45), a: 1 - seg(t, .9, 1) });
    g.icon('abilities/lion_mana_drain', lx - 22, y - 42, { size: 18, pop: seg(t, .1, .18), fallback: '1', color: '#4a4a8a', label: T('дешёвое', 'cheap') });
    g.icon('abilities/lion_voodoo', lx + 32, y - 42, { size: 18, pop: seg(t, .48, .56), fallback: '2', color: '#3a7a3a', label: T('главное', 'main') });
    if (t < .4) g.toast(T('Сначала — любое слабое целевое заклинание', 'First: any weak targeted spell'), seg(t, .02, .4));
    else if (t < .72) g.toast(T('Сфера сработала впустую', 'The sphere is wasted'), seg(t, .4, .72), '#bfe3ff');
    else g.toast(T('Теперь сильная способность проходит', 'Now your big spell goes through'), seg(t, .72, 1.05), '#ffe7a3');
  }),

  def('Refresher больше не обновляет предметы', 5200, .62, (g0, t) => {
    const g = G2(g0), T = g0.T, c = g0.c;
    g.ground({ trees: false });
    c.save(); c.fillStyle = 'rgba(8,10,13,.75)'; c.fillRect(30, 40, 220, 76); c.strokeStyle = 'rgba(217,178,91,.5)'; c.strokeRect(30.5, 40.5, 219, 75); c.restore();
    const press = seg(t, .35, .45), after = t > .45;
    g0.text(T('Способности', 'Abilities'), 80, 54, '#bfe3ff', 9, 'center', 1, true);
    g0.text(T('Предметы', 'Items'), 198, 54, '#ffcf6e', 9, 'center', 1, true);
    g.icon('abilities/sven_storm_bolt', 62, 82, { cd: after ? 0 : .7, fallback: 'Q', color: '#3a6ab0' });
    g.icon('abilities/sven_gods_strength', 98, 82, { cd: after ? 0 : .85, fallback: 'R', color: '#8a3a3a' });
    g.icon('items/black_king_bar', 180, 82, { cd: .8, fallback: 'BKB', color: '#8a6d33' });
    g.icon('items/blink', 216, 82, { cd: .6, fallback: 'BLINK', color: '#3a5a8a' });
    if (after) { g0.check(80, 106, 6); g0.cross(198, 106, 5); }
    g.icon('items/refresher', 140, 82, { size: 24, pop: 1, fallback: 'REFR', color: '#3a8a6a', label: 'Refresher' });
    g.burst(140, 82, press, '#7affc8', 14);
    if (t < .35) g.toast(T('Всё на перезарядке', 'Everything is on cooldown'), seg(t, .02, .35));
    else if (t < .7) g.toast(T('Refresher обновил только способности', 'Refresher reset abilities only'), seg(t, .35, .7), '#7affc8');
    else g.toast(T('Второго BKB через Refresher нет', 'No second BKB through Refresher'), seg(t, .7, 1.05), '#ffe7a3');
  }),

  def("Shiva's Guard теперь про радиус", 5200, .6, (g0, t) => {
    const g = G2(g0), T = g0.T, x = 120, y = 76;
    g.ground({ lane: y });
    const k = ez(seg(t, .3, .55));
    g.ring(x, y, 34, '#8d949c', 1 - k * .6, 1.2, undefined, [3, 3]);
    g.ring(x, y, lp(34, 58, k), '#7ab8ff', .9, 2, 'rgba(122,184,255,.10)');
    g.unit('Witch Doctor', x, y, true, { r: 13, hp: .8, label: true });
    g.unit('Sven', 212, 70, false, { r: 12, hp: .5 });
    g.floater('+120', 212, 54, seg(t, .62, .9), '#7fe05f');
    g.icon('items/shivas_guard', 44, 34, { pop: seg(t, .18, .28), fallback: 'SHIVA', color: '#3a6ab0', label: "Shiva's Guard" });
    if (t < .3) g.toast(T('Shiva в 7.41…', 'Shiva in 7.41…'), seg(t, .02, .3));
    else if (t < .6) g.toast(T('…увеличивает радиус способностей', '…increases your ability radius'), seg(t, .3, .6), '#bfe3ff');
    else g.toast(T('…и больше не режет лечение врагов', '…and no longer cuts enemy healing'), seg(t, .6, 1.05), '#ffe7a3');
  }),

  def('Blade Mail теперь через Splintmail', 5200, .97, (g0, t) => {
    const g = G2(g0), T = g0.T, c = g0.c;
    g.ground({ trees: false });
    c.save(); c.fillStyle = 'rgba(8,10,13,.75)'; c.fillRect(24, 34, 232, 86); c.strokeStyle = 'rgba(217,178,91,.5)'; c.strokeRect(24.5, 34.5, 231, 85); c.restore();
    const k1 = ez(seg(t, .15, .4)), k2 = ez(seg(t, .5, .75));
    const row = (y: number, a: string, af: string, b: string, bf: string, r: string, rf: string, k: number, labA: string, labB: string, labR: string) => {
      g.icon('items/' + a, lp(54, 120, k), y, { a: 1 - seg(k, .85, 1), fallback: af, color: '#5a5a6a', label: k < .1 ? labA : undefined });
      g0.text('+', 90, y, '#d9b25b', 14, 'center', 1 - k, true);
      g.icon('items/' + b, lp(118, 120, k), y, { a: 1 - seg(k, .85, 1), fallback: bf, color: '#5a5a6a', label: k < .1 ? labB : undefined });
      g0.text('→', 160, y, '#d9b25b', 14, 'center', 1, true);
      g.icon('items/' + r, 210, y, { pop: seg(k, .8, 1), fallback: rf, color: '#8a6d33', label: labR });
    };
    row(62, 'splintmail', 'SPLINT', 'broadsword', 'SWORD', 'blade_mail', 'BLADE', k1, 'Splintmail', 'Broadsword', 'Blade Mail');
    row(100, 'wizard_hat', 'HAT', 'boots', 'BOOTS', 'arcane_boots', 'ARCANE', k2, 'Wizard Hat', 'Boots', 'Arcane Boots');
    g.toast(T('Новые рецепты 7.41', 'New 7.41 recipes'), seg(t, .02, 1.05), '#ffe7a3');
  }),
]);
