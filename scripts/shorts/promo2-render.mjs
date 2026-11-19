// Сборка короткого ролика по сценарию: кадры promo2-capture.mjs + «камера» (наезд на блок) + палец + субтитры.
// node scripts/shorts/promo2-render.mjs <папка съёмки> [ru|en]
// → dotapick-short-<lang>.mp4 (с субтитрами), dotapick-short-<lang>-clean.mp4 (без), voiceover-<lang>.txt
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [dir, lang = 'ru'] = process.argv.slice(2);
const ROOT = resolve(import.meta.dirname, '../..');
const TL = JSON.parse(readFileSync(join(dir, 'timeline.json'), 'utf8'));
const { fps: FPS, w: W, h: H } = TL;

const VO = {
  ru: {
    s1: 'Враг взял Пуджа, Снайпера и Инвокера. Кого пикать тебе?',
    s2: 'DotaPick сразу покажет лучшие контрпики — по статистике миллиона матчей.',
    s3: 'Учтёт твою позицию, союзников и ранг.',
    s4: 'Нажми на героя — сборка, позиции и кого он контрит.',
    s5: 'Во вкладке «Мета» — кто силён в патче 7.42.',
    s6: 'Проиграл? Вставь номер матча — разбор покажет, где просела игра.',
    s7: 'А в «Фишках» — приёмы, которые знают не все.',
    s8: 'Бесплатно, на сайте и в приложении для Android. DotaPick точка про.',
  },
  en: {
    s1: 'The enemy picked Pudge, Sniper and Invoker. What do you pick?',
    s2: 'DotaPick instantly shows the best counterpicks, based on a million matches.',
    s3: 'It accounts for your position, allies and rank.',
    s4: "Tap a hero: item build, positions and who he counters.",
    s5: "The Meta tab shows who's strong in patch 7.42.",
    s6: 'Lost a game? Paste the match ID and see where it slipped.',
    s7: 'And Tips has tricks not everyone knows.',
    s8: 'Free, on the web and as an Android app. dotapick.pro',
  },
}[lang];
// Субтитры: имена героев — как в игре.
const SUB = { ...VO, ...(lang === 'ru' ? { s1: 'Враг взял Pudge, Sniper и Invoker. Кого пикать тебе?', s8: 'Бесплатно, на сайте и в приложении для Android.' } : { s8: 'Free, on the web and as an Android app.' }) };
const CTA = lang === 'ru' ? ['Бесплатно · RU / EN', 'Приложение для Android'] : ['Free · RU / EN', 'Android app'];

let t = 0;
const clips = TL.clips.map(c => { const dur = c.type === 'seq' ? c.srcs.length / FPS : c.dur; const o = { ...c, start: t, dur }; t += dur; return o; });
const DUR = t;
const scenes = TL.scenes.map((s, i) => ({ key: s.key, a: clips[s.at].start, b: TL.scenes[i + 1] ? clips[TL.scenes[i + 1].at].start : DUR }));
const fmt = x => `${Math.floor(x / 60)}:${(x % 60).toFixed(1).padStart(4, '0')}`;
writeFileSync(join(dir, `voiceover-${lang}.txt`), scenes.map((s, i) => `${i + 1}. ${fmt(s.a)}–${fmt(s.b)}  ${VO[s.key]}`).join('\n') + '\n');
console.log(scenes.map(s => `${fmt(s.a)} ${s.key}`).join('  '), '| длительность', DUR.toFixed(1));

const font = f => 'file://' + join(ROOT, 'node_modules/@fontsource', f);
const logo = readFileSync(join(ROOT, 'index.html'), 'utf8').match(/<svg class="logo-ic"[\s\S]*?<\/svg>/)[0].replace('class="logo-ic" width="40" height="40"', 'width="100%" height="100%"');
const bg = 'file://' + join(ROOT, 'src/assets/bg-art-m.jpg');
const shot = f => 'file://' + join(dir, 'shots', f);

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:C;font-weight:700;src:url(${font('cormorant-sc/files/cormorant-sc-cyrillic-700-normal.woff2')});unicode-range:U+0400-04FF}
@font-face{font-family:C;font-weight:700;src:url(${font('cormorant-sc/files/cormorant-sc-latin-700-normal.woff2')})}
@font-face{font-family:G;font-weight:700;src:url(${font('golos-text/files/golos-text-cyrillic-700-normal.woff2')});unicode-range:U+0400-04FF}
@font-face{font-family:G;font-weight:700;src:url(${font('golos-text/files/golos-text-latin-700-normal.woff2')})}
@font-face{font-family:G;font-weight:600;src:url(${font('golos-text/files/golos-text-cyrillic-600-normal.woff2')});unicode-range:U+0400-04FF}
@font-face{font-family:G;font-weight:600;src:url(${font('golos-text/files/golos-text-latin-600-normal.woff2')})}
*{box-sizing:border-box;margin:0}
body{width:${W}px;height:${H}px;overflow:hidden;background:#0b0d10;position:relative;font-family:G,sans-serif;color:#efe7d3}
.lay{position:absolute;inset:0;overflow:hidden}
.lay img{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0}
.gold{background:linear-gradient(180deg,#fff3cc,#e9b64e 55%,#a8731d);-webkit-background-clip:text;background-clip:text;color:transparent}
#cta{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0;
  background:linear-gradient(180deg,rgba(11,13,16,.55),rgba(11,13,16,.92) 55%,#0b0d10),url(${bg}) center/cover}
#cta::before{content:"";position:absolute;inset:12px;border:1px solid rgba(217,178,91,.45)}
#cta .lg{width:140px;height:140px;filter:drop-shadow(0 0 26px rgba(217,178,91,.5));margin-bottom:26px}
#cta .dom{font:700 56px/1.1 C;letter-spacing:.05em}
#cta .s1{font:600 21px G;color:#9fd38e;margin-top:16px}
#cta .s2{font:600 18px G;color:#b8ad96;margin-top:8px}
#sub{position:absolute;left:22px;right:22px;top:640px;display:flex;justify-content:center;opacity:0}
#sub span{font:700 27px/1.25 G;color:#fff;text-align:center;padding:10px 16px;background:rgba(8,9,11,.78);border-radius:10px;
  text-shadow:0 2px 0 #000;box-shadow:0 8px 24px rgba(0,0,0,.5);-webkit-box-decoration-break:clone;box-decoration-break:clone}
#sub b{color:#f0c35a}
#finger{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,255,255,.3);border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.6);opacity:0}
#ripple{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #f0c35a;opacity:0}
#hl{position:absolute;border:2px solid rgba(240,195,90,.9);border-radius:6px;box-shadow:0 0 0 2000px rgba(0,0,0,.0),0 0 22px rgba(240,195,90,.5);opacity:0}
body.clean #sub{display:none}
</style></head><body>
<div class="lay" id="LA"><img id="A"></div><div class="lay" id="LB"><img id="B"></div>
<div id="hl"></div>
<div id="cta"><div class="lg">${logo}</div><p class="gold dom">DOTAPICK.PRO</p><p class="s1">${CTA[0]}</p><p class="s2">${CTA[1]}</p></div>
<div id="sub"><span></span></div>
<div id="ripple"></div><div id="finger"></div>
<script>
const clips = ${JSON.stringify(clips.map(c => ({ ...c, src: c.src && shot(c.src), srcs: c.srcs?.map(shot) })))};
const scenes = ${JSON.stringify(scenes)}, SUB = ${JSON.stringify(SUB)};
const FPS = ${FPS}, W = ${W}, H = ${H}, XF = 0.18;
const $ = s => document.querySelector(s);
const cl = x => Math.min(1, Math.max(0, x));
const io = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const out = x => 1 - Math.pow(1 - x, 3);
const imgOf = (c, lt) => c.type === 'still' ? c.src : c.type === 'seq' ? c.srcs[Math.min(c.srcs.length - 1, Math.floor(lt * FPS))] : null;
const lastImg = i => { for (let j = i; j >= 0; j--) if (clips[j].type !== 'card') return imgOf(clips[j], clips[j].dur); return null; };
// камера: наезд на блок focus, сохраняем пропорции кадра
function cam(c, lt) {
  if (c.type !== 'still' || !c.focus) return { s: 1, x: 0, y: 0, k: 0 };
  const f = c.focus, pad = 18;
  const s = Math.min(2.1, (W - 2 * pad) / f.w, (H * 0.5) / f.h);
  if (s <= 1.05) return { s: 1, x: 0, y: 0, k: 1 };
  const k = io(cl(lt / 0.55)) * (1 - io(cl((lt - c.dur + 0.3) / 0.3)));
  const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
  let x = W / 2 - cx * s, y = H * 0.36 - cy * s;
  x = Math.min(0, Math.max(W - W * s, x)); y = Math.min(0, Math.max(H - H * s, y));
  return { s: 1 + (s - 1) * k, x: x * k, y: y * k, k };
}
const setCam = (el, m) => { el.style.transform = 'translate(' + m.x + 'px,' + m.y + 'px) scale(' + m.s + ')'; };
let lastTap = { x: 270, y: 760 };
const load = (el, src) => new Promise(r => { if (!src) return r(); if (el.dataset.s === src) return r(); el.dataset.s = src; el.src = src; el.decode().then(r, r); });
window.setT = async t => {
  let i = clips.findIndex(c => t >= c.start && t < c.start + c.dur); if (i < 0) i = clips.length - 1;
  const c = clips[i], lt = t - c.start, prev = clips[i - 1];
  const cur = c.type === 'card' ? lastImg(i - 1) : imgOf(c, lt);
  const bef = prev && prev.type !== 'card' ? imgOf(prev, prev.dur) : null;
  const k = prev && c.type !== 'card' && prev.type !== 'card' ? cl(lt / XF) : 1;
  await Promise.all([load($('#B'), cur), load($('#A'), bef)]);
  $('#LB').style.opacity = k; $('#LA').style.opacity = k < 1 ? 1 : 0;
  const mc = cam(c, lt); setCam($('#B'), mc);
  if (prev) setCam($('#A'), cam(prev, prev.dur));
  // финал
  const cta = $('#cta');
  if (c.type === 'card') {
    const a = out(cl(lt / 0.4)); cta.style.opacity = a;
    cta.querySelector('.dom').style.transform = 'scale(' + (0.88 + 0.12 * out(cl(lt / 0.7))) + ')';
    cta.querySelectorAll('p:not(.dom)').forEach((p, n) => { const q = out(cl((lt - 0.4 - n * 0.2) / 0.4)); p.style.opacity = q; p.style.transform = 'translateY(' + (1 - q) * 14 + 'px)'; });
  } else cta.style.opacity = 0;
  // палец
  const f = $('#finger'), r = $('#ripple');
  if (c.type === 'still' && c.tap) {
    const m = io(cl(lt / (c.tap.at * 0.85)));
    const x = lastTap.x + (c.tap.x - lastTap.x) * m, y = lastTap.y + (c.tap.y - lastTap.y) * m;
    const press = cl(1 - Math.abs(lt - c.tap.at) / 0.1);
    f.style.left = x + 'px'; f.style.top = y + 'px';
    f.style.opacity = cl(lt / 0.12) * (1 - cl((lt - c.tap.at - 0.2) / 0.15));
    f.style.transform = 'scale(' + (1 - 0.25 * press) + ')';
    const rp = cl((lt - c.tap.at) / 0.4);
    r.style.left = c.tap.x + 'px'; r.style.top = c.tap.y + 'px';
    r.style.opacity = lt >= c.tap.at ? 1 - rp : 0; r.style.transform = 'scale(' + (1 + 1.5 * rp) + ')';
    if (lt >= c.dur - 1.5 / FPS) lastTap = { x: c.tap.x, y: c.tap.y };
  } else { f.style.opacity = 0; r.style.opacity = 0; }
  // субтитры по сценам (последняя сцена — без субтитров поверх логотипа: их заменяет текст заставки)
  const sc = scenes.find(s => t >= s.a && t < s.b) || scenes[scenes.length - 1], sub = $('#sub');
  if (sc && sc.key !== 's8') {
    const sp = sub.querySelector('span'); if (sp.dataset.k !== sc.key) { sp.dataset.k = sc.key; sp.textContent = SUB[sc.key]; }
    const a = out(cl((t - sc.a) / 0.25)), z = 1 - cl((t - sc.b + 0.15) / 0.15);
    sub.style.opacity = Math.min(a, z); sub.style.transform = 'translateY(' + (1 - a) * 16 + 'px)';
    // субтитр не должен закрывать то, на что смотрит камера
    sub.style.top = (mc.k > 0.5 ? 760 : 640) + 'px';
  } else sub.style.opacity = 0;
};
window.ready = document.fonts.ready;
</script></body></html>`;
const htmlPath = join(dir, `short-${lang}.html`);
writeFileSync(htmlPath, html);

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
await p.goto('file://' + htmlPath); await p.evaluate(() => window.ready);
const enc = file => spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
const fSub = join(dir, `dotapick-short-${lang}.mp4`), fClean = join(dir, `dotapick-short-${lang}-clean.mp4`);
const A = enc(fSub), B = enc(fClean);
const put = async (ff, buf) => { if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); };
const total = Math.round(DUR * FPS);
for (let f = 0; f < total; f++) {
  await p.evaluate(x => window.setT(x), f / FPS);
  await p.evaluate(() => document.body.classList.remove('clean'));
  const s1 = await p.screenshot({ type: 'jpeg', quality: 90 });
  await put(A, s1);
  await p.evaluate(() => document.body.classList.add('clean'));
  await put(B, await p.screenshot({ type: 'jpeg', quality: 90 }));
  if (process.env.PEEK && f % 45 === 0) writeFileSync(join(dir, `peek-${String(f).padStart(4, '0')}.jpg`), s1);
}
A.stdin.end(); B.stdin.end();
await Promise.all([A, B].map(ff => new Promise(r => ff.on('close', r))));
await b.close();
console.log('ok', fSub, fClean);
