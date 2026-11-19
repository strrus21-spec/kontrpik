// Съёмка промо-ролика: проходим по живому сайту как пользователь и сохраняем кадры + точки нажатий.
// node scripts/shorts/promo-capture.mjs <папка вывода> [ru|en]
// Результат: <папка>/shots/*.jpg и timeline.json — его собирает promo-render.mjs.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [outDir, lang = 'ru'] = process.argv.slice(2);
const ROOT = resolve(import.meta.dirname, '../..');
const SITE = process.env.SITE || 'https://dotapick.pro/';
const W = 540, H = 960, FPS = 30;
const shots = join(outDir, 'shots'); mkdirSync(shots, { recursive: true });
const fx = readFileSync(join(ROOT, 'tests/fixtures/match-9076499476.json'), 'utf8');

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, serviceWorkers: 'block', hasTouch: true, isMobile: true });
await ctx.addInitScript(l => {
  try { localStorage.setItem('kontrpik-lang', l); localStorage.setItem('kontrpik-theme', 'dark'); } catch { /* */ }
}, lang);
await ctx.route('**/api.opendota.com/api/matches/9076499476*', r => r.fulfill({ contentType: 'application/json', body: fx }));
const p = await ctx.newPage();
// Без анимаций прокрутки сайта: плавность делаем сами.
await p.addInitScript(() => { document.documentElement.style.scrollBehavior = 'auto'; });

let n = 0;
const clips = [];          // { type, ... }
const scenes = [];         // { key, at: индекс клипа }
const snap = async () => { const f = `s${String(n++).padStart(4, '0')}.jpg`; await p.screenshot({ path: join(shots, f), type: 'jpeg', quality: 90 }); return f; };
const settle = (ms = 500) => p.waitForTimeout(ms);
const scene = key => scenes.push({ key, at: clips.length });
const still = async (dur, extra = {}) => clips.push({ type: 'still', src: await snap(), dur, ...extra });
const card = (key, dur) => clips.push({ type: 'card', key, dur });

/** Нажатие: кадр «до» с курсором, потом само действие. */
async function tap(sel, dur = 0.9, opts = {}) {
  const el = p.locator(sel).first();
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await settle(150);
  const bx = await el.boundingBox();
  const x = bx.x + bx.width / 2, y = bx.y + bx.height / 2;
  clips.push({ type: 'still', src: await snap(), dur, tap: { x, y, at: dur * 0.55 } });
  if (opts.type) await el.fill(opts.type); else await el.click();
  await settle(opts.wait ?? 600);
}
/** Плавная прокрутка — кадр за кадром. */
async function scrollTo(target, dur = 1.6) {
  const from = await p.evaluate(() => scrollY);
  const to = typeof target === 'number' ? target : await p.evaluate(s => {
    const e = document.querySelector(s); const bar = document.querySelector('.nav.topbar');
    return Math.max(0, e.getBoundingClientRect().top + scrollY - (bar ? bar.getBoundingClientRect().bottom : 0) - 12);
  }, target);
  const frames = Math.round(dur * FPS), srcs = [];
  for (let i = 1; i <= frames; i++) {
    const k = i / frames, e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    await p.evaluate(y => scrollTo(0, y), from + (to - from) * e);
    if (i % 1 === 0) srcs.push(await snap());
  }
  await settle(250);
  clips.push({ type: 'seq', srcs });
}

await p.goto(SITE); await p.waitForSelector('html[data-ready]'); await settle(1200);

// 0. Заставка
scene('intro'); card('intro', 2.6);
await still(1.0);

// 1. Контрпик
scene('cp'); card('cp', 1.4);
await tap('.tabs-nav a[href="#counterpick"]', 0.9, { wait: 900 });
await still(1.0);
await tap('[data-clear="enemy"]', 0.9);
// герои прямо в пуле: прокручиваем к каждому, сверху видна закреплённая полоска пиков
const heroBtn = name => `#pool [data-id]:text-is("${name}"), #pool [data-id]:has(:text-is("${name}"))`;
const centerOf = async name => p.evaluate(sel => { const e = document.querySelector(sel); return e.getBoundingClientRect().top + scrollY - innerHeight * 0.55; }, await p.locator(heroBtn(name)).first().evaluate(e => { e.id ||= 'h' + e.dataset.id; return '#' + e.id; }));
for (const name of ['Pudge', 'Sniper', 'Phantom Assassin', 'Invoker', 'Lion']) {
  await scrollTo(await centerOf(name), 0.7);
  await tap(heroBtn(name), 0.75, { wait: 500 });
}
await still(1.0);
scene('picks');
await scrollTo('#results, .results', 1.6);
await still(5.0);

// 2. Позиция
scene('pos');
await scrollTo('#poschips', 1.0);
await tap('#poschips [data-pos="2"]', 0.9, { wait: 700 });
await still(2.4);

// 3. Мета
scene('meta'); card('meta', 1.4);
await tap('.tabs-nav a[href="#meta"]', 0.9, { wait: 1200 });
await still(1.2);
await scrollTo('.tier-table', 1.4);
await still(1.2);
await scrollTo('#patch', 1.4);
await still(2.2);

// 4. Разбор матча
scene('match'); card('match', 1.4);
await tap('.tabs-nav a[href="#match"]', 0.9, { wait: 1000 });
await tap('#match-id', 0.8, { type: '9076499476', wait: 300 });
await still(0.8);
await tap('#match-form button[type="submit"], #match-form button', 0.8, { wait: 2500 });
await still(1.2);
await tap('.m-pick [data-pslot]', 0.9, { wait: 2500 });
await still(2.0);
await scrollTo(await p.evaluate(() => scrollY + 700), 2.0);


// 5. Фишки и викторина
scene('tips'); card('tips', 1.4);
await tap('.tabs-nav a[href="#tips-block"]', 0.9, { wait: 1000 });
await still(1.0);
await scrollTo(await p.evaluate(() => scrollY + 600), 1.4);
await still(2.0);
await tap('#quiz-open', 0.9, { wait: 900 });
await still(2.4);

// 6. Финал
scene('cta'); card('cta', 7);

writeFileSync(join(outDir, 'timeline.json'), JSON.stringify({ fps: FPS, w: W, h: H, lang, clips, scenes }, null, 1));
console.log('кадров:', n, 'клипов:', clips.length);
await b.close();
