// Страница голосования для зрителей: /vote/?room=КОД. Голос уходит на сервер комнаты, стример видит его вместе с чатом.
import '@fontsource/cormorant-sc/700.css';
import '@fontsource/golos-text/400.css';
import '@fontsource/golos-text/600.css';
import '@fontsource/jetbrains-mono/500.css';
import './styles.css';
import { initialLang, LANG, saveLang, setLang, t, type Lang } from './i18n.ts';
import { codeFromQuery, connectRoom, postVote, roomEnabled, type RoomConn } from './room.ts';
import { normalizeCode, isRoomCode } from './room-protocol.ts';
import { percents, type OverlayState } from './stream.ts';
import { $, esc } from './render/html.ts';

setLang(initialLang());
document.addEventListener('submit', e => e.preventDefault());
let code = codeFromQuery();
let state: OverlayState | null = null, mine: number | null = null, msg = '', gone = false, conn: RoomConn | null = null;

function render() {
  const L = t();
  document.documentElement.lang = LANG;
  document.title = `${L.vtH} — ${L.st.title}`;
  $('vt-title').textContent = L.vtH;
  document.querySelectorAll<HTMLElement>('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === LANG)));
  const body = $('vt-body');
  if (!roomEnabled) { body.innerHTML = `<p class="empty-state">${L.rmFail}</p>`; return; }
  if (!code || gone) {
    body.innerHTML = `<form class="me-form" id="vt-form"><input id="vt-code" type="text" autocomplete="off" autocapitalize="characters" maxlength="8" placeholder="${esc(L.vtCode)}" aria-label="${esc(L.vtCode)}"><button class="me-go" type="submit">${L.vtJoin}</button></form>${msg || gone ? `<p class="me-err" role="alert">${esc(gone ? L.vtGone : msg)}</p>` : ''}`;
    return;
  }
  const v = state?.vote;
  if (!v || !v.open) { body.innerHTML = `<p class="vt-code">${code}</p><p class="empty-state">${L.vtWait}</p>`; return; }
  const pc = percents(v.counts);
  const img = (n: string) => state!.top.find(p => p.name === n)?.img || '';
  body.innerHTML = `<p class="vt-code">${code}</p><h2 class="vt-q">${L.vtPick}</h2>
    <div class="vt-opts">${v.options.map((o, i) => `<button class="vt-opt${mine === i ? ' on' : ''}" data-v="${i}" aria-pressed="${mine === i}">
      ${img(o) ? `<img src="${esc(img(o))}" alt="" width="48" height="48">` : '<span></span>'}<span class="vt-name"><b>!${i + 1}</b> ${esc(o)}</span>
      <span class="vt-bar"><span style="width:${pc[i]}%"></span></span><span class="vt-pc">${pc[i]}%</span></button>`).join('')}</div>
    <p class="bans-note">${L.vtTotal(v.total)}</p>${msg ? `<p class="vt-msg" role="status">${esc(msg)}</p>` : ''}`;
}

function join(c: string) {
  code = c; gone = false; msg = ''; state = null; mine = null;
  history.replaceState(null, '', '?room=' + c);
  conn?.close();
  conn = connectRoom(c, 'viewer', null, m => {
    if (m.type !== 'state') return;
    const prev = JSON.stringify(state?.vote?.options);
    state = m.state as OverlayState;
    if (JSON.stringify(state.vote?.options) !== prev) mine = null;   // новое голосование
    render();
  }, st => { if (st === 'gone') { gone = true; render(); } });
  render();
}

$('vt-body').addEventListener('submit', () => {
  const c = normalizeCode(($('vt-code') as HTMLInputElement).value);
  gone = false;
  if (!isRoomCode(c)) { conn?.close(); conn = null; code = null; state = null; msg = t().vtBadCode; render(); return; }
  join(c);
});
$('vt-body').addEventListener('click', async e => {
  const b = (e.target as Element).closest<HTMLElement>('[data-v]'); if (!b || !code || !state?.vote) return;
  const i = +b.dataset.v!, L = t();
  const r = await postVote(code, i);
  if (r === 'ok') { mine = i; msg = L.vtDone(state.vote.options[i]); }
  else msg = r === 'closed' ? L.vtClosed : r === 'limit' ? L.vtLimit : L.vtErr;
  render();
});
document.querySelector('.lang')!.addEventListener('click', e => {
  const b = (e.target as Element).closest<HTMLElement>('[data-lang]'); if (!b) return;
  setLang(b.dataset.lang as Lang); saveLang(LANG); render();
});
if (code) join(code); else render();
