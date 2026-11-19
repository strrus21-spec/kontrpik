// Шортс «Против X — кого пикать» (1080×1920, 30 к/с). Кадры снимает Chromium, склеивает ffmpeg.
// node scripts/shorts/render.mjs <папка данных (shorts.json)> <папка вывода> [номер|all] [ru|en]
import { chromium } from 'playwright';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [dataDir, outDir, which = '0', lang = 'ru'] = process.argv.slice(2);
const ROOT = resolve(import.meta.dirname, '../..');
const D = JSON.parse(readFileSync(join(dataDir, 'shorts.json'), 'utf8'));
const media = join(dataDir, 'media'); mkdirSync(media, { recursive: true }); mkdirSync(outDir, { recursive: true });
const FPS = 30, DUR = 17, W = 540, H = 960;

const CDN = 'https://cdn.cloudflare.steamstatic.com/apps/dota2';
function fetchMedia(slug) {
  const v = join(media, slug + '.webm'), p = join(media, slug + '.png');
  if (!existsSync(v)) execFileSync('curl', ['-sfL', '-o', v, `${CDN}/videos/dota_react/heroes/renders/${slug}.webm`]);
  if (!existsSync(p)) execFileSync('curl', ['-sfL', '-o', p, `${CDN}/images/dota_react/heroes/${slug}.png`]);
  return { v: 'file://' + v, p: 'file://' + p };
}

const POS = {
  ru: ['', 'Керри', 'Мид', 'Офлейн', 'Саппорт', 'Полный саппорт'],
  en: ['', 'Carry', 'Mid', 'Offlane', 'Support', 'Hard support'],
};
const L = {
  ru: {
    vs: 'Против', ask: 'кого пикать?', top: '3 лучших контрпика', adv: n => `к винрейту против ${n}`,
    games: g => `${g.toLocaleString('ru-RU')} матчей`, num: x => x.toFixed(1).replace('.', ','),
    cta1: 'Контрпик под весь пик врага —', cta2: 'бесплатно, по статистике пабликов', cta3: 'есть приложение для Android',
    src: (n, p) => `${(n / 1e6).toFixed(1).replace('.', ',')} млн матчей · патч ${p}`,
  },
  en: {
    vs: 'Against', ask: 'what to pick?', top: 'top 3 counterpicks', adv: n => `win rate vs ${n}`,
    games: g => `${g.toLocaleString('en-US')} games`, num: x => x.toFixed(1),
    cta1: 'Counter the whole enemy draft at', cta2: 'free, based on public match stats', cta3: 'Android app available',
    src: (n, p) => `${(n / 1e6).toFixed(1)}M matches · patch ${p}`,
  },
}[lang];
const patch = JSON.parse(readFileSync(join(ROOT, 'public/data/patch.json'), 'utf8')).version;
const font = f => 'file://' + join(ROOT, 'node_modules/@fontsource', f);
const logo = readFileSync(join(ROOT, 'index.html'), 'utf8').match(/<svg class="logo-ic"[\s\S]*?<\/svg>/)[0]
  .replace('class="logo-ic" width="40" height="40"', 'width="100%" height="100%"');
const bg = 'file://' + join(ROOT, 'src/assets/bg-art-m.jpg');

function page(s) {
  const e = fetchMedia(s.enemy.render), cs = s.counters.map(c => ({ ...c, m: fetchMedia(c.render) }));
  const card = (c, i) => `
    <div class="card" id="c${i}">
      <div class="rend"><video src="${c.m.v}" muted playsinline preload="auto"></video></div>
      <div class="info">
        <div class="rank">#${i + 1}</div>
        <div class="name">${c.name}</div>
        <div class="adv">+${L.num(c.adv)}%</div>
        <div class="why">${L.adv(s.enemy.name)}</div>
        <div class="meta">Pos ${c.pos} · ${POS[lang][c.pos]} · ${L.games(c.g)}</div>
      </div>
    </div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:C;font-weight:700;src:url(${font('cormorant-sc/files/cormorant-sc-cyrillic-700-normal.woff2')});unicode-range:U+0400-04FF}
@font-face{font-family:C;font-weight:700;src:url(${font('cormorant-sc/files/cormorant-sc-latin-700-normal.woff2')})}
@font-face{font-family:G;font-weight:500;src:url(${font('golos-text/files/golos-text-cyrillic-500-normal.woff2')});unicode-range:U+0400-04FF}
@font-face{font-family:G;font-weight:500;src:url(${font('golos-text/files/golos-text-latin-500-normal.woff2')})}
@font-face{font-family:G;font-weight:600;src:url(${font('golos-text/files/golos-text-cyrillic-600-normal.woff2')});unicode-range:U+0400-04FF}
@font-face{font-family:G;font-weight:600;src:url(${font('golos-text/files/golos-text-latin-600-normal.woff2')})}
*{box-sizing:border-box;margin:0}
body{width:${W}px;height:${H}px;overflow:hidden;background:#0b0d10;color:#e9e2d0;font-family:G,sans-serif;position:relative}
.bg{position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,13,16,.55),rgba(11,13,16,.88) 45%,#0b0d10 80%),url(${bg}) center top/cover;filter:saturate(.9)}
.frame{position:absolute;inset:12px;border:1px solid rgba(217,178,91,.45);pointer-events:none}
.frame::after{content:"";position:absolute;inset:4px;border:1px solid rgba(217,178,91,.18)}
.brand{position:absolute;top:30px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:10px;font:700 20px C;letter-spacing:.18em;color:#d9b25b}
.brand i{width:30px;height:30px;display:block}
.foot{position:absolute;bottom:30px;left:0;right:0;text-align:center;font:500 13px G;color:#9a917f;letter-spacing:.04em}
.gold{background:linear-gradient(180deg,#fff3cc,#e9b64e 55%,#a8731d);-webkit-background-clip:text;background-clip:text;color:transparent}
/* сцена 1 */
#s1{position:absolute;inset:0}
#s1 .t1{position:absolute;top:110px;left:0;right:0;text-align:center;font:700 34px C;letter-spacing:.3em;color:#d9b25b}
#s1 .t2{position:absolute;top:150px;left:0;right:0;text-align:center;font:700 74px/1 C;color:#ff6a4d;text-shadow:0 0 28px rgba(224,74,53,.65),0 3px 0 #000;letter-spacing:.04em}
#s1 .hero{position:absolute;left:10px;right:10px;top:250px;height:520px;display:flex;justify-content:center}
#s1 .hero video{height:100%;filter:drop-shadow(0 0 30px rgba(224,74,53,.45))}
#s1 .glow{position:absolute;left:50%;top:640px;width:420px;height:80px;margin-left:-210px;border-radius:50%;background:radial-gradient(rgba(224,74,53,.45),transparent 70%)}
#s1 .t3{position:absolute;top:790px;left:0;right:0;text-align:center;font:700 44px C;letter-spacing:.06em}
#s1 .t4{position:absolute;top:846px;left:0;right:0;text-align:center;font:600 17px G;color:#9fd38e;letter-spacing:.12em;text-transform:uppercase}
/* сцена 2 */
#s2{position:absolute;inset:0}
.head{position:absolute;top:84px;left:28px;right:28px;display:flex;align-items:center;gap:14px}
.head img{width:92px;height:52px;object-fit:cover;border:2px solid #e04a35;box-shadow:0 0 16px rgba(224,74,53,.5)}
.head b{display:block;font:700 15px C;letter-spacing:.3em;color:#d9b25b}
.head strong{display:block;font:700 36px/1 C;color:#ff6a4d;letter-spacing:.03em}
.card{position:absolute;left:24px;right:24px;height:214px;display:flex;background:linear-gradient(90deg,rgba(32,48,28,.92),rgba(18,22,26,.94) 55%);border:1px solid rgba(217,178,91,.5);box-shadow:0 10px 30px rgba(0,0,0,.6),inset 0 0 0 1px rgba(0,0,0,.6)}
#c0{top:170px} #c1{top:400px} #c2{top:630px}
.card .rend{width:190px;flex:none;overflow:hidden;position:relative;border-right:1px solid rgba(217,178,91,.3);background:radial-gradient(circle at 50% 40%,rgba(94,196,74,.25),transparent 70%)}
.card video{position:absolute;width:300px;height:300px;left:-55px;top:-10px}
.card .info{padding:16px 16px 14px 18px;display:flex;flex-direction:column;min-width:0}
.rank{font:700 16px C;color:#d9b25b;letter-spacing:.2em}
.name{font:700 34px/1.05 C;color:#f3ecd9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.adv{font:700 54px/1.05 C;color:#7ee05f;text-shadow:0 0 22px rgba(94,196,74,.55);margin-top:4px}
.why{font:500 15px G;color:#c9c0ac}
.meta{margin-top:auto;font:500 13px G;color:#8f8775}
/* сцена 3 */
#s3{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,rgba(217,178,91,.18),transparent 60%),#0b0d10f2;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 30px}
#s3 .lg{width:150px;height:150px;margin-bottom:26px;filter:drop-shadow(0 0 24px rgba(217,178,91,.45))}
#s3 .a{font:600 22px G;color:#e9e2d0}
#s3 .b{font:700 54px/1.1 C;letter-spacing:.05em;margin:10px 0 18px}
#s3 .c{font:500 17px G;color:#9fd38e}
#s3 .d{font:500 16px G;color:#9a917f;margin-top:8px}
</style></head><body>
<div class="bg"></div>
<div id="s1">
  <div class="t1">${L.vs.toUpperCase()}</div>
  <div class="t2">${s.enemy.name.toUpperCase()}</div>
  <div class="glow"></div>
  <div class="hero"><video src="${e.v}" muted playsinline preload="auto"></video></div>
  <div class="t3 gold">${L.ask}</div>
  <div class="t4">${L.top}</div>
</div>
<div id="s2">
  <div class="head"><img src="${e.p}" alt=""><div><b>${L.vs.toUpperCase()}</b><strong>${s.enemy.name}</strong></div></div>
  ${cs.map(card).join('')}
</div>
<div id="s3">
  <div class="lg">${logo}</div>
  <div class="a">${L.cta1}</div>
  <div class="b gold">DOTAPICK.PRO</div>
  <div class="c">${L.cta2}</div>
  <div class="d">${L.cta3}</div>
</div>
<div class="brand"><i>${logo}</i>DOTAPICK.PRO</div>
<div class="foot">${L.src(D.total, patch)}</div>
<div class="frame"></div>
<script>
const $ = s => document.querySelector(s);
const cl = x => Math.min(1, Math.max(0, x));
const io = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;   // плавно
const out = x => 1 - Math.pow(1 - x, 3);
const k = (t, a, b) => cl((t - a) / (b - a));
const vids = [...document.querySelectorAll('video')];
window.ready = Promise.all([...vids.map(v => new Promise(r => { if (v.readyState >= 2) r(); else v.addEventListener('loadeddata', r, { once: true }); v.load(); })), document.fonts.ready]);
window.setT = async t => {
  // сцена 1: 0–3.2 с
  const s1in = out(k(t, 0, .6)), s1out = io(k(t, 2.8, 3.3));
  $('#s1').style.opacity = 1 - s1out;
  $('#s1 .t1').style.transform = 'translateY(' + (1 - s1in) * -30 + 'px)';
  $('#s1 .t2').style.transform = 'scale(' + (1.25 - .25 * s1in) + ')';
  $('#s1 .t2').style.opacity = s1in;
  $('#s1 .hero').style.transform = 'scale(' + (0.9 + .1 * out(k(t, 0, 1.2)) + .15 * s1out) + ')';
  const q = out(k(t, .9, 1.5));
  $('#s1 .t3').style.opacity = q; $('#s1 .t3').style.transform = 'translateY(' + (1 - q) * 30 + 'px)';
  $('#s1 .t4').style.opacity = out(k(t, 1.3, 1.9));
  // сцена 2: 3.1–13.4 с, карточки по одной
  const s2 = out(k(t, 3.1, 3.6)) * (1 - io(k(t, 13.1, 13.6)));
  $('#s2').style.opacity = s2;
  $('.head').style.transform = 'translateY(' + (1 - out(k(t, 3.1, 3.7))) * -40 + 'px)';
  [3.5, 6.4, 9.3].forEach((a, i) => {
    const c = $('#c' + i); if (!c) return;
    const p = out(k(t, a, a + .55));
    c.style.opacity = p; c.style.transform = 'translateX(' + (1 - p) * 420 + 'px)';
    const pop = k(t, a + .35, a + .9), adv = c.querySelector('.adv');
    adv.style.transform = 'scale(' + (1 + .25 * Math.sin(Math.PI * pop)) + ')'; adv.style.transformOrigin = 'left center';
  });
  // сцена 3: 13.3–17 с
  const s3 = out(k(t, 13.3, 13.9));
  $('#s3').style.opacity = s3;
  $('#s3 .b').style.transform = 'scale(' + (0.85 + .15 * out(k(t, 13.5, 14.3))) + ')';
  $('.brand').style.opacity = 1 - s3; $('.foot').style.opacity = 1;
  // видео: у каждого своё время, крутятся по кругу
  await Promise.all(vids.map((v, i) => {
    const want = ((t + i * 1.3) % (v.duration || 10));
    if (Math.abs(v.currentTime - want) < 1e-3) return;
    return new Promise(r => { v.addEventListener('seeked', r, { once: true }); v.currentTime = want; });
  }));
};
</script></body></html>`;
}

const b = await chromium.launch();
const items = which === 'all' ? D.shorts.map((_, i) => i) : which.split(',').map(Number);
for (const n of items) {
  const s = D.shorts[n];
  const file = join(outDir, `kontrpik-${s.enemy.render}-${lang}.mp4`);
  const htmlPath = join(dataDir, `short-${n}-${lang}.html`);
  writeFileSync(htmlPath, page(s));
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await p.goto('file://' + htmlPath); await p.evaluate(() => window.ready);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = 0; f < FPS * DUR; f++) {
    await p.evaluate(t => window.setT(t), f / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f === 45 || f === 300 || f === 450) writeFileSync(file.replace('.mp4', `-f${f}.jpg`), buf);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  await p.close();
  console.log('ok', file);
}
await b.close();
