// Сборка промо-ролика из кадров promo-capture.mjs: заставки разделов, «палец» с нажатием, подписи, переходы.
// node scripts/shorts/promo-render.mjs <папка съёмки> [ru|en]  →  <папка>/dotapick-promo-<lang>.mp4 + voiceover-<lang>.txt
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [dir, lang = 'ru'] = process.argv.slice(2);
const ROOT = resolve(import.meta.dirname, '../..');
const TL = JSON.parse(readFileSync(join(dir, 'timeline.json'), 'utf8'));
const { fps: FPS, w: W, h: H } = TL;
const XF = 0.22;   // перекрёстное затухание между клипами, с

const T = {
  ru: {
    cards: {
      intro: ['Проигрываешь<br>ещё на пике?', 'DOTAPICK.PRO'],
      cp: ['01', 'Контрпик', 'подбор героя под пик врага'],
      meta: ['02', 'Мета', 'кто силён в патче'],
      match: ['03', 'Разбор матча', 'что пошло не так'],
      tips: ['04', 'Фишки', 'приёмы и викторина'],
      cta: ['DOTAPICK.PRO', 'Бесплатно · RU / EN', 'Есть приложение для Android'],
    },
    callouts: { cp: 'Отметь героев врага', picks: 'Лучшие пики под этот состав', pos: 'Выбери свою позицию', meta: 'Тир-лист и патч 7.42', match: 'Вставь номер матча', tips: 'Проверь себя в викторине' },
    vo: {
      intro: 'Проигрываешь ещё на стадии пика? Есть DotaPick.',
      cp: 'Открой вкладку «Контрпик» и отметь героев врага. Пики всегда видны сверху, даже когда листаешь список.',
      picks: 'Ниже — лучшие пики: на сколько процентов чаще герой побеждает этот состав и что ему собирать.',
      pos: 'Выбери свою позицию — подбор учтёт её.',
      meta: 'Во вкладке «Мета» — кто силён прямо сейчас, и что изменилось в патче 7.42.',
      match: 'Вставь номер своего матча — и получишь разбор: где просела игра и что улучшить.',
      tips: 'В «Фишках» — приёмы, которые знают не все, и викторина.',
      cta: 'Всё бесплатно, на русском и английском, есть приложение для Android. Заходи на dotapick.pro.',
    },
  },
  en: {
    cards: {
      intro: ['Losing games<br>in the draft?', 'DOTAPICK.PRO'],
      cp: ['01', 'Counterpick', 'the right hero for the enemy draft'],
      meta: ['02', 'Meta', "who's strong this patch"],
      match: ['03', 'Match review', 'what went wrong'],
      tips: ['04', 'Tips', 'tricks and a quiz'],
      cta: ['DOTAPICK.PRO', 'Free · RU / EN', 'Android app available'],
    },
    callouts: { cp: 'Mark the enemy heroes', picks: 'Best picks for this draft', pos: 'Choose your position', meta: 'Tier list and patch 7.42', match: 'Paste a match ID', tips: 'Test yourself in the quiz' },
    vo: {
      intro: 'Losing games already in the draft? Meet DotaPick.',
      cp: 'Open Counterpick and mark the enemy heroes. Your picks stay on top while you scroll.',
      picks: 'Below are the best picks: how much more often each hero beats this draft, and what to build.',
      pos: 'Choose your position and the picks adapt.',
      meta: "The Meta tab shows who's strong right now and what changed in patch 7.42.",
      match: 'Paste your match ID and get a review: where the game slipped and what to improve.',
      tips: 'Tips has tricks not everyone knows, plus a quiz.',
      cta: "It's free, in Russian and English, with an Android app. Go to dotapick.pro.",
    },
  },
}[lang];

// Времена клипов
let t = 0;
const clips = TL.clips.map(c => {
  const dur = c.type === 'seq' ? c.srcs.length / FPS : c.dur;
  const o = { ...c, start: t, dur }; t += dur; return o;
});
const DUR = t;
const sceneAt = TL.scenes.map(s => ({ key: s.key, t: clips[s.at]?.start ?? DUR }));
// Подписи-выноски: с начала сцены (после заставки раздела) на 2,4 с
const callouts = sceneAt.filter(s => T.callouts[s.key]).map(s => {
  const first = clips.find(c => c.start >= s.t && c.type !== 'card' && !c.tap);
  return { text: T.callouts[s.key], a: (first?.start ?? s.t) + 0.25, b: (first?.start ?? s.t) + 2.65 };
});
// Текст для озвучки с тайм-кодами
const fmt = x => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
const vo = sceneAt.map((s, i) => `${fmt(s.t)}–${fmt(sceneAt[i + 1]?.t ?? DUR)}  ${T.vo[s.key]}`).join('\n');
writeFileSync(join(dir, `voiceover-${lang}.txt`), vo + '\n');
console.log(vo, '\nдлительность', DUR.toFixed(1), 'с');

const font = f => 'file://' + join(ROOT, 'node_modules/@fontsource', f);
const logo = readFileSync(join(ROOT, 'index.html'), 'utf8').match(/<svg class="logo-ic"[\s\S]*?<\/svg>/)[0].replace('class="logo-ic" width="40" height="40"', 'width="100%" height="100%"');
const bg = 'file://' + join(ROOT, 'src/assets/bg-art-m.jpg');
const shot = f => 'file://' + join(dir, 'shots', f);
const cardHtml = c => {
  const v = T.cards[c.key];
  if (c.key === 'intro') return `<div class="card intro"><div class="lg">${logo}</div><h1>${v[0]}</h1><p class="gold dom">${v[1]}</p></div>`;
  if (c.key === 'cta') return `<div class="card cta"><div class="lg">${logo}</div><p class="gold dom">${v[0]}</p><p class="s1">${v[1]}</p><p class="s2">${v[2]}</p></div>`;
  return `<div class="card sec"><span class="num">${v[0]}</span><h2 class="gold">${v[1]}</h2><p>${v[2]}</p></div>`;
};

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:C;font-weight:700;src:url(${font('cormorant-sc/files/cormorant-sc-cyrillic-700-normal.woff2')});unicode-range:U+0400-04FF}
@font-face{font-family:C;font-weight:700;src:url(${font('cormorant-sc/files/cormorant-sc-latin-700-normal.woff2')})}
@font-face{font-family:G;font-weight:600;src:url(${font('golos-text/files/golos-text-cyrillic-600-normal.woff2')});unicode-range:U+0400-04FF}
@font-face{font-family:G;font-weight:600;src:url(${font('golos-text/files/golos-text-latin-600-normal.woff2')})}
*{box-sizing:border-box;margin:0}
body{width:${W}px;height:${H}px;overflow:hidden;background:#0b0d10;position:relative;font-family:G,sans-serif;color:#efe7d3}
.img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform-origin:50% 40%}
.gold{background:linear-gradient(180deg,#fff3cc,#e9b64e 55%,#a8731d);-webkit-background-clip:text;background-clip:text;color:transparent}
.card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0;
  background:linear-gradient(180deg,rgba(11,13,16,.6),rgba(11,13,16,.92) 55%,#0b0d10),url(${bg}) center/cover}
.card::before{content:"";position:absolute;inset:12px;border:1px solid rgba(217,178,91,.45)}
.card .lg{width:132px;height:132px;filter:drop-shadow(0 0 26px rgba(217,178,91,.5));margin-bottom:28px}
.intro h1{font:700 52px/1.08 C;letter-spacing:.03em;color:#f6eedb;text-shadow:0 3px 0 #000}
.dom{font:700 50px/1.1 C;letter-spacing:.06em;margin-top:22px}
.sec .num{font:700 30px C;color:#d9b25b;letter-spacing:.3em}
.sec h2{font:700 66px/1.05 C;letter-spacing:.04em;margin:6px 0 12px}
.sec p{font:600 19px G;color:#9fd38e;letter-spacing:.06em;text-transform:uppercase}
.cta .s1{font:600 21px G;color:#9fd38e;margin-top:14px}
.cta .s2{font:600 18px G;color:#b8ad96;margin-top:8px}
#call{position:absolute;left:24px;right:24px;bottom:150px;display:flex;justify-content:center;opacity:0}
#call span{font:700 31px/1.15 C;letter-spacing:.03em;color:#fff3cc;background:linear-gradient(180deg,rgba(20,16,10,.94),rgba(10,9,7,.94));border:1px solid rgba(217,178,91,.75);
  box-shadow:0 10px 30px rgba(0,0,0,.6),0 0 24px rgba(217,178,91,.25);padding:12px 22px;text-align:center}
#finger{position:absolute;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(255,255,255,.28);border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.6);opacity:0}
#ripple{position:absolute;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:3px solid #f0c35a;opacity:0}
#flash{position:absolute;inset:0;background:#000;opacity:0}
</style></head><body>
<img class="img" id="A"><img class="img" id="B">
${clips.filter(c => c.type === 'card').map((c, i) => cardHtml(c).replace('class="card', `id="card${clips.indexOf(c)}" class="card`)).join('')}
<div id="call"><span></span></div>
<div id="ripple"></div><div id="finger"></div>
<script>
const clips = ${JSON.stringify(clips.map(c => ({ ...c, src: c.src && shot(c.src), srcs: c.srcs?.map(shot) })))};
const calls = ${JSON.stringify(callouts)};
const FPS = ${FPS}, XF = ${XF};
const $ = s => document.querySelector(s);
const cl = x => Math.min(1, Math.max(0, x));
const io = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const out = x => 1 - Math.pow(1 - x, 3);
// картинка клипа в момент lt
function imgOf(c, lt) {
  if (c.type === 'still') return c.src;
  if (c.type === 'seq') return c.srcs[Math.min(c.srcs.length - 1, Math.floor(lt * FPS))];
  return null;
}
// ближайший кадр сайта (для фона под заставкой)
function lastImg(i) { for (let j = i; j >= 0; j--) if (clips[j].type !== 'card') return imgOf(clips[j], clips[j].dur); return null; }
function nextImg(i) { for (let j = i; j < clips.length; j++) if (clips[j].type !== 'card') return imgOf(clips[j], 0); return null; }
let lastTap = { x: 270, y: 900 };
const load = (el, src) => new Promise(r => { if (!src) { el.style.opacity = 0; return r(); } if (el.dataset.s === src) return r(); el.dataset.s = src; el.src = src; el.decode().then(r, r); });
window.setT = async t => {
  let i = clips.findIndex(c => t >= c.start && t < c.start + c.dur); if (i < 0) i = clips.length - 1;
  const c = clips[i], lt = t - c.start, prev = clips[i - 1];
  // слой B — текущий кадр, A — предыдущий (затухание)
  const cur = c.type === 'card' ? (i === 0 ? nextImg(i) : lastImg(i - 1)) : imgOf(c, lt);
  const bef = prev ? (prev.type === 'card' ? lastImg(i - 1) || nextImg(i) : imgOf(prev, prev.dur)) : null;
  const k = prev && c.type !== 'card' && prev.type !== 'card' ? cl(lt / XF) : 1;
  await Promise.all([load($('#B'), cur), load($('#A'), bef)]);
  $('#B').style.opacity = k; $('#A').style.opacity = k < 1 ? 1 : 0;
  // лёгкий «наезд» камеры на стоп-кадрах
  const z = c.type === 'still' ? 1 + 0.025 * (lt / c.dur) : 1;
  $('#B').style.transform = 'scale(' + z + ')';
  // заставки
  document.querySelectorAll('.card').forEach(e => e.style.opacity = 0);
  for (let j = Math.max(0, i - 1); j <= i; j++) {
    const cc = clips[j]; if (cc.type !== 'card') continue;
    const e = $('#card' + j), a = t - cc.start, d = cc.dur, fin = j === clips.length - 1;
    const vin = j === 0 ? 1 : out(cl(a / 0.35)), vout = fin ? 1 : 1 - io(cl((a - d + 0.35) / 0.35));
    if (a < 0 || a > d + 0.01) continue;
    e.style.opacity = Math.min(vin, vout);
    const h = e.querySelector('h1,h2,.dom'); if (h) h.style.transform = 'scale(' + (0.9 + 0.1 * out(cl(a / 0.6))) + ')';
    e.querySelectorAll('p,.num').forEach((p, n) => { const q = out(cl((a - 0.25 - n * 0.15) / 0.4)); p.style.opacity = q; p.style.transform = 'translateY(' + (1 - q) * 14 + 'px)'; });
  }
  // палец и нажатие
  const f = $('#finger'), r = $('#ripple');
  if (c.type === 'still' && c.tap) {
    const m = io(cl(lt / (c.tap.at * 0.85)));
    const x = lastTap.x + (c.tap.x - lastTap.x) * m, y = lastTap.y + (c.tap.y - lastTap.y) * m;
    const press = cl(1 - Math.abs(lt - c.tap.at) / 0.12);
    f.style.left = x + 'px'; f.style.top = y + 'px';
    f.style.opacity = cl(lt / 0.15) * (1 - cl((lt - c.tap.at - 0.25) / 0.2));
    f.style.transform = 'scale(' + (1 - 0.25 * press) + ')';
    const rp = cl((lt - c.tap.at) / 0.45);
    r.style.left = c.tap.x + 'px'; r.style.top = c.tap.y + 'px';
    r.style.opacity = lt >= c.tap.at ? 1 - rp : 0; r.style.transform = 'scale(' + (1 + 1.6 * rp) + ')';
  } else { f.style.opacity = 0; r.style.opacity = 0; }
  if (c.type === 'still' && c.tap && lt >= c.dur - 1 / FPS) lastTap = { x: c.tap.x, y: c.tap.y };
  // выноска
  const cb = calls.find(q => t >= q.a && t <= q.b), box = $('#call');
  if (cb) {
    box.querySelector('span').textContent = cb.text;
    const a = out(cl((t - cb.a) / 0.3)), z = 1 - io(cl((t - cb.b + 0.3) / 0.3));
    box.style.opacity = Math.min(a, z); box.style.transform = 'translateY(' + (1 - a) * 24 + 'px)';
  } else box.style.opacity = 0;
};
window.ready = document.fonts.ready;
</script></body></html>`;
const htmlPath = join(dir, `promo-${lang}.html`);
writeFileSync(htmlPath, html);

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
await p.goto('file://' + htmlPath); await p.evaluate(() => window.ready);
const file = join(dir, `dotapick-promo-${lang}.mp4`);
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
const total = Math.round(DUR * FPS);
for (let f = 0; f < total; f++) {
  await p.evaluate(x => window.setT(x), f / FPS);
  const buf = await p.screenshot({ type: 'jpeg', quality: 90 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (process.env.PEEK && f % 90 === 0) writeFileSync(join(dir, `peek-${String(f).padStart(4, '0')}.jpg`), buf);
}
ff.stdin.end(); await new Promise(r => ff.on('close', r));
await b.close();
console.log('ok', file);
