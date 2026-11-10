// Оверлей DotaPick для OBS: прозрачный фон, вражеский пик, топ-3 контрпика, голосование чата.
// Параметры ссылки: pos (tl/tr/bl/br), scale (0.75–1.5), bg (solid/glass/none).
import '@fontsource/cormorant-sc/700.css';
import '@fontsource/golos-text/500.css';
import '@fontsource/golos-text/600.css';
import './overlay.css';
import { CHANNEL, STORE, percents, type OverlayState } from './stream.ts';
import { codeFromQuery, connectRoom, roomEnabled } from './room.ts';

const el = document.getElementById('ov')!;
const esc = (s: unknown) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const sign = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(1);
const q = new URLSearchParams(location.search);
document.documentElement.style.setProperty('--ov-scale', String(Math.min(3, Math.max(0.5, Number(q.get('scale')) || 1))));
if (q.get('pos')) el.dataset.pos = q.get('pos')!;
if (q.get('bg')) el.dataset.bg = q.get('bg')!;
let lastKey = '', shown = false;

function render(s: OverlayState | null) {
  if (!s || (!s.enemy.length && !s.top.length)) { el.innerHTML = ''; lastKey = ''; shown = false; return; }
  document.documentElement.lang = s.lang;
  // анимация появления — только когда сменился пик или рекомендации, а не при каждом голосе
  const key = s.enemy.map(h => h.name).join() + '|' + s.top.map(p => p.name).join();
  const enter = key !== lastKey; lastKey = key;
  const pc = s.vote ? percents(s.vote.counts) : [];
  const voteFor = (name: string) => (s.vote ? s.vote.options.indexOf(name) : -1);
  el.innerHTML = `<div class="ov-card ${!shown ? 'ov-show' : ''} ${enter ? 'ov-in' : ''}">
    <div class="ov-brand"><b>Dota<span>Pick</span></b><span>${s.lang === 'ru' ? 'контрпик' : 'counterpick'}</span></div>
    ${s.enemy.length ? `<div class="ov-sec"><span class="ov-h dire">${esc(s.labels.enemies)}</span><div class="ov-enemy">${s.enemy.map((h, i) => `<img src="${esc(h.img)}" alt="${esc(h.name)}" title="${esc(h.name)}" style="--i:${i}">`).join('')}</div></div>` : ''}
    ${s.top.length ? `<div class="ov-sec"><span class="ov-h">${esc(s.labels.picks)}</span><ol class="ov-top">${s.top.map((p, i) => {
      const k = voteFor(p.name);
      return `<li class="m${i + 1}" style="--i:${i + 5}"><img src="${esc(p.img)}" alt=""><span class="ov-name">${esc(p.name)}</span><b class="${p.score >= 0 ? 'up' : 'dn'}">${sign(p.score)}</b>${k >= 0 ? `<span class="ov-vote"><span class="ov-bar"><span style="width:${pc[k]}%"></span></span><span class="ov-pc">!${k + 1} · ${pc[k]}%</span></span>` : ''}</li>`;
    }).join('')}</ol></div>` : ''}
    ${s.vote?.open ? `<div class="ov-hint">${esc(s.labels.vote)}: ${esc(s.labels.voteHint)}</div>` : ''}
  </div>`;
  shown = true;
}

let state: OverlayState | null = null;
const roomCode = roomEnabled ? codeFromQuery() : null;
if (roomCode) {
  // Режим комнаты: состояние приходит с сервера — оверлей может быть на любом устройстве.
  connectRoom(roomCode, 'overlay', null, m => { if (m.type === 'state') { state = m.state as OverlayState; render(state); } });
} else {
try { state = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch { /* ignore */ }
render(state);
}
if (!roomCode && 'BroadcastChannel' in window) {
  const bc = new BroadcastChannel(CHANNEL);
  bc.onmessage = e => { if (e.data && typeof e.data === 'object') { state = e.data; render(state); } };
  bc.postMessage('hello');
}
// запасной путь: изменения localStorage из другой вкладки того же браузера
if (!roomCode) window.addEventListener('storage', e => { if (e.key === STORE && e.newValue) { try { state = JSON.parse(e.newValue); render(state); } catch { /* ignore */ } } });
