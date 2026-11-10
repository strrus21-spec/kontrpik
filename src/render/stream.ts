// Панель «Для стрима»: ссылка на оверлей, чат Twitch, голосование. Состояние уходит в оверлей.
import { LANG, t } from '../i18n.ts';
import { verdictIndex, type PickRow } from '../scoring.ts';
import { CHANNEL, STORE, Tally, parseChannel, percents, twitchChat, voteOf, type OverlayState, type Vote } from '../stream.ts';
import type { Hero } from '../types.ts';
import { connectRoom, createRoom, loadRoom, roomEnabled, saveRoom, type RoomConn, type RoomKey } from '../room.ts';
import { $, esc } from './html.ts';
import type { Ctx } from './draft.ts';

const bc = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL) : null;
let top: PickRow[] = [];
let enemy: Hero[] = [];
let vote: Vote | null = null;
let tally: Tally | null = null;
let chat: { channel: string; stop: () => void; open: boolean } | null = null;
let err = '';
let room: RoomKey | null = null, conn: RoomConn | null = null, roomOnline = false, roomBusy = false;
const abs = (u: string) => new URL(u, location.href).href;
/** Вид оверлея: угол экрана, размер, подложка. Запоминается и попадает в ссылку для OBS. */
const OV_KEY = 'kontrpik-ov-look';
type Look = { pos: 'tl' | 'tr' | 'bl' | 'br'; scale: string; bg: 'solid' | 'glass' | 'none' };
let look: Look = { pos: 'tl', scale: '1', bg: 'solid' };
try { look = { ...look, ...JSON.parse(localStorage.getItem(OV_KEY) || '{}') }; } catch { /* ignore */ }
const lookQuery = () => { const q = new URLSearchParams(); if (look.pos !== 'tl') q.set('pos', look.pos); if (look.scale !== '1') q.set('scale', look.scale); if (look.bg !== 'solid') q.set('bg', look.bg); const s = q.toString(); return s ? '?' + s : ''; };
const opt = (v: string, cur: string, label: string) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${label}</option>`;

export function overlayState(): OverlayState {
  const L = t();
  return {
    lang: LANG,
    enemy: enemy.map(h => ({ name: h.name, img: abs(h.img) })),
    top: top.slice(0, 3).map(r => ({ name: r.h.name, img: abs(r.h.img), score: Math.round(r.score * 10) / 10, verdict: L.verdict[verdictIndex(r.score)] })),
    vote, labels: { enemies: L.ovEnemies, picks: L.ovPicks, vote: L.ovVote, voteHint: L.stVoteHint },
  };
}
let pending = 0;
function publish() {
  if (pending) return;
  pending = requestAnimationFrame(() => {
    pending = 0;
    const s = overlayState();
    try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* ignore */ }
    bc?.postMessage(s);
    conn?.send({ type: 'state', state: s });
  });
}

/** Вызывается из рекомендаций при каждом пересчёте. */
export function setOverlayPicks(x: Ctx, rows: PickRow[]) {
  top = rows.slice(0, 3);
  enemy = x.state.enemy.map(i => x.data.heroes[i]);
  if (vote?.open) { /* во время голосования варианты не меняем */ }
  publish();
}

/** Голос из чата (tw:ник) или со страницы (web:id): один на зрителя, засчитывается последний. */
function addVote(voter: string, v: number) {
  if (!vote?.open || !tally || v < 0 || v >= vote.options.length) return;
  tally.add(voter, v); vote.counts = tally.counts(); vote.total = tally.total;
  renderStream(); publish();
}

function openRoom(r: RoomKey) {
  room = r; conn?.close();
  conn = connectRoom(r.code, 'control', r.key, m => { if (m.type === 'vote') addVote('web:' + m.voter, m.option); }, st => {
    if (st === 'gone') { conn?.close(); conn = null; room = null; saveRoom(null); err = t().rmGone; }
    roomOnline = st === 'open';
    if (st === 'open') publish();
    renderStream();
  });
}

function roomHtml(): string {
  if (!roomEnabled) return '';
  const L = t();
  if (!room) return `<div class="st-room"><h3 class="m-h">${L.rmH}</h3><div class="st-row"><button class="share" data-st="room" ${roomBusy ? 'disabled' : ''}>${roomBusy ? L.rmCreating : L.rmCreate}</button></div></div>`;
  const base = import.meta.env.BASE_URL;
  const q = lookQuery(), ov = abs(base + 'overlay/?room=' + room.code + (q ? '&' + q.slice(1) : '')), vt = abs(base + 'vote/?room=' + room.code);
  return `<div class="st-room"><h3 class="m-h">${L.rmH}</h3>
    <p class="st-code"><span>${L.rmCode}</span> <b>${room.code}</b> <span class="st-chat ${roomOnline ? 'on' : ''}">${roomOnline ? L.rmOnline : L.rmOffline}</span></p>
    <p class="bans-note">${L.rmHow}</p>
    <label class="st-lab">${L.rmOverlay}<input class="share-url" readonly value="${esc(ov)}"></label>
    <label class="st-lab">${L.rmVote}<input class="share-url" readonly value="${esc(vt)}"></label>
    <div class="st-row"><button class="share obs-btn" data-st="obs" data-url="${esc(ov)}">${L.stObs}</button><span class="bans-note">${L.stObsHow}</span></div>
    <div class="st-row"><button class="clear" data-st="roomclose">${L.rmClose}</button></div></div>`;
}

export function renderStream() {
  const L = t(), body = $('stream-body');
  $('stream').querySelector('summary')!.textContent = L.stH;
  const url = abs(import.meta.env.BASE_URL + 'overlay/') + lookQuery();
  const pc = vote ? percents(vote.counts) : [];
  body.innerHTML = `<p class="bans-note">${L.stHow}</p>
    <div class="st-look">
      <label>${L.stPos}<select data-look="pos">${opt('tl', look.pos, L.stPosN.tl)}${opt('tr', look.pos, L.stPosN.tr)}${opt('bl', look.pos, L.stPosN.bl)}${opt('br', look.pos, L.stPosN.br)}</select></label>
      <label>${L.stSize}<select data-look="scale">${['0.75', '1', '1.25', '1.5'].map(v => opt(v, look.scale, Math.round(+v * 100) + '%')).join('')}</select></label>
      <label>${L.stBg}<select data-look="bg">${opt('solid', look.bg, L.stBgN.solid)}${opt('glass', look.bg, L.stBgN.glass)}${opt('none', look.bg, L.stBgN.none)}</select></label>
    </div>
    <div class="st-prev" aria-label="${esc(L.stPreview)}"><iframe src="${esc(url)}" title="${esc(L.stPreview)}" tabindex="-1" loading="lazy"></iframe><span>${L.stPreview} · 1920×1080</span></div>
    <div class="st-row"><input class="share-url" readonly value="${esc(url)}" aria-label="${esc(L.stOverlay)}"><button class="share" data-st="copy">${L.stCopy}</button><span class="share-msg" id="st-msg" role="status"></span></div>
    <form class="me-form" data-st="chat">${chat ? `<span class="st-chat ${chat.open ? 'on' : ''}">${L.stConnected(esc(chat.channel))}</span><button type="button" class="clear" data-st="disconnect">${L.stDisconnect}</button>`
      : `<input id="st-channel" type="text" autocomplete="off" placeholder="${esc(L.stChannel)}" aria-label="${esc(L.stChannel)}"><button type="submit" class="me-go">${L.stConnect}</button>`}</form>
    ${err ? `<p class="me-err" role="alert">${esc(err)}</p>` : ''}
    ${roomHtml()}
    ${chat || room ? `<div class="st-row">${vote?.open ? `<button class="hd-enemy" data-st="stop">${L.stVoteStop}</button>` : `<button class="addbtn" data-st="start">${L.stVoteStart}</button>`}<span class="bans-note">${L.stVoteHint}</span></div>` : ''}
    ${vote ? `<ol class="st-vote">${vote.options.map((o, i) => `<li><b>!${i + 1}</b> ${esc(o)} <span class="st-bar"><span style="width:${pc[i]}%"></span></span> <span class="st-pc">${pc[i]}%</span></li>`).join('')}</ol><p class="bans-note">${L.stVotes(vote.total)}</p>` : ''}`;
  fitPreview();
}

/** Файл коллекции сцен OBS: одна сцена «DotaPick» с источником «Браузер» 1920×1080 на ссылку оверлея. */
export function obsScene(url: string) {
  const uid = () => crypto.randomUUID();
  const src = uid(), scene = uid();
  return {
    name: 'DotaPick', current_scene: 'DotaPick', current_program_scene: 'DotaPick',
    scene_order: [{ name: 'DotaPick' }], groups: [], quick_transitions: [], transitions: [], current_transition: 'Fade', transition_duration: 300,
    sources: [
      { versioned_id: 'browser_source', id: 'browser_source', name: 'DotaPick overlay', uuid: src, enabled: true, flags: 0, mixers: 0, volume: 1, muted: false,
        settings: { url, width: 1920, height: 1080, fps: 30, shutdown: false, restart_when_active: false, reroute_audio: false,
          css: 'body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }' } },
      { versioned_id: 'scene', id: 'scene', name: 'DotaPick', uuid: scene, enabled: true, flags: 0, mixers: 0, volume: 1, muted: false,
        settings: { id_counter: 1, custom_size: false, items: [{ name: 'DotaPick overlay', source_uuid: src, visible: true, locked: false, id: 1,
          pos: { x: 0, y: 0 }, rot: 0, scale: { x: 1, y: 1 }, alignment: 5, bounds_type: 0, bounds_alignment: 0, bounds: { x: 0, y: 0 }, crop_left: 0, crop_top: 0, crop_right: 0, crop_bottom: 0 }] } },
    ],
  };
}
function obsDownload(url: string) {
  const blob = new Blob([JSON.stringify(obsScene(url), null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'DotaPick-OBS.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function fitPreview() {
  const p = document.querySelector<HTMLElement>('.st-prev'); if (p) p.style.setProperty('--k', String(p.clientWidth / 1920));
}
addEventListener('resize', fitPreview);

export function bindStream() {
  const box = $('stream');
  box.addEventListener('submit', e => {
    e.preventDefault();
    const ch = parseChannel(($('st-channel') as HTMLInputElement).value);
    if (!ch) { err = t().stBadChannel; renderStream(); return; }
    err = '';
    const c = { channel: ch, open: false, stop: () => {} };
    c.stop = twitchChat(ch, (user, text) => {
      if (!vote?.open) return;
      const v = voteOf(text, vote.options.length); if (v !== null) addVote('tw:' + user, v);
    }, st => { c.open = st === 'open'; renderStream(); });
    chat = c; renderStream();
  });
  box.addEventListener('change', e => {
    const sel = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-look]'); if (!sel) return;
    look = { ...look, [sel.dataset.look!]: sel.value } as Look;
    try { localStorage.setItem(OV_KEY, JSON.stringify(look)); } catch { /* ignore */ }
    renderStream();
  });
  box.addEventListener('click', async e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-st]'); if (!b || b.tagName === 'FORM') return;
    e.stopPropagation();
    const a = b.dataset.st;
    if (a === 'copy') {
      const msg = $('st-msg'), url = (box.querySelector('.share-url') as HTMLInputElement).value;
      try { await navigator.clipboard.writeText(url); msg.textContent = t().copied; } catch { (box.querySelector('.share-url') as HTMLInputElement).select(); }
    } else if (a === 'disconnect') { chat?.stop(); chat = null; if (!room) { vote = null; tally = null; } publish(); }
    else if (a === 'room') {
      roomBusy = true; err = ''; renderStream();
      const r = await createRoom();
      roomBusy = false;
      if (r) { saveRoom(r); openRoom(r); } else err = t().rmFail;
    } else if (a === 'obs') { obsDownload(b.dataset.url || ''); return; }
    else if (a === 'roomclose') { conn?.close(); conn = null; room = null; roomOnline = false; saveRoom(null); }
    else if (a === 'start') {
      if (!top.length) { err = t().stNeedPicks; renderStream(); return; }
      err = ''; tally = new Tally(Math.min(3, top.length));
      vote = { open: true, options: top.slice(0, 3).map(r => r.h.name), counts: new Array(tally.n).fill(0), total: 0 };
      publish();
    } else if (a === 'stop' && vote) { vote.open = false; publish(); }
    renderStream();
  });
  if (roomEnabled) { const r = loadRoom(); if (r) openRoom(r); }
  // Оверлей, открытый позже, просит текущее состояние.
  bc?.addEventListener('message', e => { if (e.data === 'hello') publish(); });
}
