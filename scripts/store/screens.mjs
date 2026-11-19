// Скриншоты и графика для Google Play: снимаем сайт в режиме приложения (Play-сборка) и оформляем кадры.
// node scripts/store/screens.mjs <папка вывода> [адрес сайта]
// → graphics/screenshots/{ru,en}/01..06.png (1080×1920), graphics/raw/…, graphics/feature-{ru,en}.png (1024×500), graphics/icon-512.png
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [out, SITE = 'http://localhost:4173/'] = process.argv.slice(2);
const ROOT = resolve(import.meta.dirname, '../..');
const W = 540, H = 960;
const fx = readFileSync(join(ROOT, 'tests/fixtures/match-9076499476.json'), 'utf8');
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36 DotaPickApp/1.1.1 DotaPickPlay';

const CAP = {
  ru: ['Контрпик по статистике реальных матчей', 'Лучшие пики против состава врага', 'Сборка, позиции и матчапы героя', 'Тир-лист патча по твоему рангу', 'Разбор твоего матча', 'Фишки с анимациями и викторина'],
  en: ['Counterpicks from real match stats', 'Best picks against the enemy draft', 'Hero builds, positions and matchups', 'Patch tier list for your rank', 'A review of your match', 'Animated tips and a quiz'],
};
const FEAT = {
  ru: ['Контрпик для Dota 2', 'Лучшие пики против врага, мета патча и разбор матча'],
  en: ['Dota 2 counterpicks', 'Best picks vs the enemy, patch meta and match review'],
};

const b = await chromium.launch();
async function raw(lang) {
  const dir = join(out, 'graphics/raw', lang); mkdirSync(dir, { recursive: true });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, serviceWorkers: 'block', userAgent: UA, isMobile: true, hasTouch: true });
  await ctx.addInitScript(l => { try { localStorage.setItem('kontrpik-lang', l); localStorage.setItem('kontrpik-theme', 'dark'); } catch { /* */ } }, lang);
  await ctx.route('**/api.opendota.com/api/matches/9076499476*', r => r.fulfill({ contentType: 'application/json', body: fx }));
  const p = await ctx.newPage();
  const shot = n => p.screenshot({ path: join(dir, n + '.png') });
  const go = async h => { await p.goto(SITE + h); await p.waitForSelector('html[data-ready]'); await p.waitForTimeout(1200); };
  const top = async sel => { await p.evaluate(s => { const e = document.querySelector(s), bar = document.querySelector('.nav.topbar'); scrollTo(0, e.getBoundingClientRect().top + scrollY - (bar ? bar.getBoundingClientRect().bottom : 0) - 8); }, sel); await p.waitForTimeout(500); };

  await go(''); await shot('01');
  await go('#counterpick');
  await p.click('[data-clear="enemy"]'); await p.click('[data-clear="ally"]');
  for (const name of ['Pudge', 'Sniper', 'Invoker', 'Phantom Assassin', 'Lion']) { await p.fill('#q', name); await p.waitForTimeout(200); await p.locator(`#pool [data-id]:has-text("${name}")`).first().click(); }
  await p.fill('#q', ''); await p.waitForTimeout(500);
  await top('#out'); await p.evaluate(() => scrollBy(0, -96)); await p.waitForTimeout(300); await shot('02');
  await p.locator('#out article.top [data-hero]').first().click(); await p.waitForTimeout(900); await shot('03');
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  await go('#meta'); await top('.tier-table'); await shot('04');
  await go('match/9076499476?p=0'); await p.waitForTimeout(1500); await shot('05');
  await go('#tips-block'); await top('.tip'); await p.waitForTimeout(1500); await shot('06');
  await ctx.close();
  return dir;
}

const font = f => 'file://' + join(ROOT, 'node_modules/@fontsource', f);
const logo = readFileSync(join(ROOT, 'index.html'), 'utf8').match(/<svg class="logo-ic"[\s\S]*?<\/svg>/)[0].replace('class="logo-ic" width="40" height="40"', 'width="100%" height="100%"');
const FONTS = `
@font-face{font-family:C;font-weight:700;src:url(${font('cormorant-sc/files/cormorant-sc-cyrillic-700-normal.woff2')});unicode-range:U+0400-04FF}
@font-face{font-family:C;font-weight:700;src:url(${font('cormorant-sc/files/cormorant-sc-latin-700-normal.woff2')})}
@font-face{font-family:G;font-weight:600;src:url(${font('golos-text/files/golos-text-cyrillic-600-normal.woff2')});unicode-range:U+0400-04FF}
@font-face{font-family:G;font-weight:600;src:url(${font('golos-text/files/golos-text-latin-600-normal.woff2')})}
*{box-sizing:border-box;margin:0}
.gold{background:linear-gradient(180deg,#fff3cc,#e9b64e 55%,#a8731d);-webkit-background-clip:text;background-clip:text;color:transparent}`;
// страницы открываем как файлы: с about:blank локальные картинки и шрифты не грузятся
const TMP = join(out, '.tmp.html');
const show = async (p, html) => { writeFileSync(TMP, html); await p.goto('file://' + TMP); };
const BG = 'background:radial-gradient(ellipse at 50% 0%,rgba(217,178,91,.22),transparent 60%),linear-gradient(180deg,#14181e,#0b0d10)';

async function framed(lang, rawDir) {
  const dir = join(out, 'graphics/screenshots', lang); mkdirSync(dir, { recursive: true });
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  for (let i = 0; i < 6; i++) {
    const n = String(i + 1).padStart(2, '0');
    await show(p, `<style>${FONTS}
body{width:${W}px;height:${H}px;overflow:hidden;${BG};position:relative}
body::before{content:"";position:absolute;inset:10px;border:1px solid rgba(217,178,91,.4)}
h1{position:absolute;top:44px;left:30px;right:30px;text-align:center;font:700 38px/1.12 C;letter-spacing:.02em}
.ph{position:absolute;left:50%;top:170px;width:418px;height:743px;margin-left:-209px;border-radius:22px;overflow:hidden;border:3px solid #2a2f37;
  box-shadow:0 0 0 1px rgba(217,178,91,.55),0 24px 60px rgba(0,0,0,.7)}
.ph img{width:100%;height:100%;display:block}
</style><h1 class="gold">${CAP[lang][i]}</h1><div class="ph"><img src="file://${join(rawDir, n + '.png')}"></div>`);
    await p.waitForFunction(() => document.fonts.ready.then(() => [...document.images].every(im => im.complete)));
    await p.screenshot({ path: join(dir, n + '.png') });
  }
  await p.close();
}

async function feature(lang) {
  const p = await b.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  const shotSrc = 'file://' + join(out, 'graphics/raw', lang, '02.png');
  await show(p, `<style>${FONTS}
body{width:1024px;height:500px;overflow:hidden;${BG};position:relative;font-family:G}
body::before{content:"";position:absolute;inset:12px;border:1px solid rgba(217,178,91,.45)}
.lg{position:absolute;left:64px;top:92px;width:120px;height:120px;filter:drop-shadow(0 0 22px rgba(217,178,91,.45))}
h1{position:absolute;left:64px;top:232px;font:700 76px/1 C;letter-spacing:.05em}
h2{position:absolute;left:66px;top:322px;width:520px;font:700 30px/1.15 C;color:#f2ead6}
p{position:absolute;left:66px;top:372px;width:520px;font:600 19px/1.35 G;color:#9fd38e}
.ph{position:absolute;right:70px;top:46px;width:300px;height:533px;border-radius:20px;overflow:hidden;border:3px solid #2a2f37;transform:rotate(4deg);
  box-shadow:0 0 0 1px rgba(217,178,91,.55),0 24px 60px rgba(0,0,0,.7)}
.ph img{width:100%;height:100%;display:block}
</style><div class="lg">${logo}</div><h1 class="gold">DotaPick</h1><h2>${FEAT[lang][0]}</h2><p>${FEAT[lang][1]}</p><div class="ph"><img src="${shotSrc}"></div>`);
  await p.waitForFunction(() => document.fonts.ready.then(() => [...document.images].every(im => im.complete)));
  await p.screenshot({ path: join(out, `graphics/feature-${lang}.png`) });
  await p.close();
}

for (const lang of ['ru', 'en']) { const r = await raw(lang); await framed(lang, r); await feature(lang); console.log('ok', lang); }
rmSync(TMP, { force: true });
await b.close();
