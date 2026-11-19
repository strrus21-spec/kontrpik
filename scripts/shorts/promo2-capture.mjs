// Съёмка короткого ролика по сценарию script-ru.md: живой сайт, нажатия, «камера» на нужном блоке.
// node scripts/shorts/promo2-capture.mjs <папка вывода> [ru|en]
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
await ctx.addInitScript(l => { try { localStorage.setItem('kontrpik-lang', l); localStorage.setItem('kontrpik-theme', 'dark'); } catch { /* */ } }, lang);
await ctx.route('**/api.opendota.com/api/matches/9076499476*', r => r.fulfill({ contentType: 'application/json', body: fx }));
const p = await ctx.newPage();

let n = 0;
const clips = [], scenes = [];
const snap = async () => { const f = `s${String(n++).padStart(4, '0')}.jpg`; await p.screenshot({ path: join(shots, f), type: 'jpeg', quality: 90 }); return f; };
const settle = (ms = 500) => p.waitForTimeout(ms);
const box = async sel => { const r = await p.locator(sel).first().boundingBox(); return r && { x: r.x, y: r.y, w: r.width, h: r.height }; };
const still = async (dur, extra = {}) => clips.push({ type: 'still', src: await snap(), dur, ...extra });
const card = (key, dur) => clips.push({ type: 'card', key, dur });
/** Сцена: после съёмки добиваем последний стоп-кадр до нужной длины (под голос). */
async function scene(key, target, body) {
  const at = clips.length; scenes.push({ key, at });
  await body();
  const len = clips.slice(at).reduce((s, c) => s + (c.type === 'seq' ? c.srcs.length / FPS : c.dur), 0);
  const last = [...clips].reverse().find(c => c.type !== 'seq');
  if (len < target && last) last.dur += target - len;
}
async function tap(sel, dur = 0.7, opts = {}) {
  const el = p.locator(sel).first();
  await el.scrollIntoViewIfNeeded().catch(() => {}); await settle(120);
  const bx = await el.boundingBox();
  clips.push({ type: 'still', src: await snap(), dur, tap: { x: bx.x + bx.width / 2, y: bx.y + bx.height / 2, at: dur * 0.6 }, ...(opts.focus ? { focus: opts.focus } : {}) });
  if (opts.type) await el.fill(opts.type); else await el.click();
  await settle(opts.wait ?? 550);
}
async function scrollTo(target, dur = 1.0, el = null) {
  const get = () => p.evaluate(e => e ? document.querySelector(e).scrollTop : scrollY, el);
  const from = await get();
  const to = typeof target === 'number' ? target : await p.evaluate(([s, e]) => {
    const x = document.querySelector(s), bar = document.querySelector('.nav.topbar');
    if (e) { const c = document.querySelector(e); return x.getBoundingClientRect().top - c.getBoundingClientRect().top + c.scrollTop - 12; }
    return Math.max(0, x.getBoundingClientRect().top + scrollY - (bar ? bar.getBoundingClientRect().bottom : 0) - 12);
  }, [target, el]);
  const frames = Math.max(2, Math.round(dur * FPS)), srcs = [];
  for (let i = 1; i <= frames; i++) {
    const k = i / frames, e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    await p.evaluate(([y, e]) => { if (e) document.querySelector(e).scrollTop = y; else scrollTo(0, y); }, [from + (to - from) * e, el]);
    srcs.push(await snap());
  }
  await settle(200);
  clips.push({ type: 'seq', srcs });
}

await p.goto(SITE + '#counterpick'); await p.waitForSelector('html[data-ready]'); await settle(1200);
await p.click('[data-clear="enemy"]'); await p.click('[data-clear="ally"]'); await settle(400);
await p.evaluate(() => scrollTo(0, 0)); await settle(300);
const heroBtn = name => `#pool [data-id]:has-text("${name}")`;

// 1. Крючок: три врага прямо в пуле, сверху — закреплённая полоска пиков
await scene('s1', 4.2, async () => {
  for (const name of ['Pudge', 'Sniper', 'Invoker']) {
    const id = await p.locator(heroBtn(name)).first().getAttribute('data-id');
    const y = await p.evaluate(i => { const e = document.querySelector(`#pool [data-id="${i}"]`); return e.getBoundingClientRect().top + scrollY - innerHeight * 0.5; }, id);
    await scrollTo(y, 0.35);
    await tap(`#pool [data-id="${id}"]`, 0.6, { wait: 350 });
  }
  await still(1.0, { focus: await box('#draft-mini') });
});

// 2. Лучшие пики
await scene('s2', 6, async () => {
  await scrollTo('#out', 1.2);
  const top = await box('#out article.top');
  await still(2.2, top ? { focus: top } : {});
});

// 3. Позиция и ранг
await scene('s3', 6, async () => {
  await tap('#poschips [data-pos="1"]', 0.8, { wait: 700 });
  await tap('#src', 0.8, { wait: 300 });
  await p.selectOption('#src', { index: 3 }).catch(() => {}); await settle(700);
  await scrollTo('#out', 0.6);
  await still(1.6, { focus: await box('#out article.top') });
});

// 4. Карточка героя
await scene('s4', 6, async () => {
  await tap('#out article.top [data-hero]', 0.8, { wait: 900 });
  await still(1.2);
  await scrollTo('#hero .hd-build', 1.2, '#hero');
  await still(1.2, { focus: await box('#hero .hd-build') });
  await p.keyboard.press('Escape'); await settle(500);
});

// 5. Мета
await scene('s5', 5, async () => {
  await tap('.tabs-nav a[href="#meta"]', 0.7, { wait: 1200 });
  await scrollTo('.tier-table', 0.9);
  await still(1.2, { focus: await box('.tier-table') });
  await scrollTo('#patch', 0.9);
  await still(1.0);
});

// 6. Разбор матча
await scene('s6', 5, async () => {
  await tap('.tabs-nav a[href="#match"]', 0.6, { wait: 900 });
  await tap('#match-id', 0.5, { type: '9076499476', wait: 200 });
  await tap('#match-form button', 0.6, { wait: 2200 });
  await tap('.m-pick [data-pslot]', 0.6, { wait: 2200 });
  await still(0.8);
  await scrollTo(await p.evaluate(() => scrollY + 620), 0.9);
  await still(0.8);
});

// 7. Фишки
await scene('s7', 4, async () => {
  await tap('.tabs-nav a[href="#tips-block"]', 0.6, { wait: 1000 });
  await scrollTo('.tip', 0.8);
  const tip = await box('.tip');
  for (let i = 0; i < 3; i++) { await settle(450); await still(0.5, tip ? { focus: tip } : {}); }
});

// 8. Финал
await scene('s8', 5, async () => { card('cta', 5); });

writeFileSync(join(outDir, 'timeline.json'), JSON.stringify({ fps: FPS, w: W, h: H, lang, clips, scenes }, null, 1));
console.log('кадров:', n, 'клипов:', clips.length);
await b.close();
