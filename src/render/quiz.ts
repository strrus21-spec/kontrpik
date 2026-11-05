// Викторина в <dialog>: 10 вопросов, рекорд в localStorage.
import { t } from '../i18n.ts';
import { loadBest, makeQuiz, saveBest, type Question } from '../quiz.ts';
import { counter } from '../scoring.ts';
import type { AppData } from '../data.ts';
import { tipText, tipTitle } from './tips.ts';
import { $, esc, sign } from './html.ts';
import { getBoard, postScore, roomEnabled } from '../room.ts';
import { cleanName, type BoardEntry } from '../room-protocol.ts';

let board: BoardEntry[] | null = null, lbMsg = '', saved = false;
const NAME = 'kontrpik-quiz-name';
const savedName = () => { try { return localStorage.getItem(NAME) || ''; } catch { return ''; } };
function boardHtml() {
  if (!roomEnabled) return '';
  const L = t();
  return `<section class="lb"><h3>${L.lbH}</h3>
    ${saved ? '' : `<form class="me-form" id="lb-form"><input id="lb-name" type="text" maxlength="20" autocomplete="nickname" value="${esc(savedName())}" placeholder="${esc(L.lbName)}" aria-label="${esc(L.lbName)}"><button class="me-go" type="submit">${L.lbSave}</button></form>`}
    ${lbMsg ? `<p class="bans-note" role="status">${esc(lbMsg)}</p>` : ''}
    ${board ? (board.length ? `<ol class="lb-list">${board.slice(0, 10).map(b => `<li><span>${esc(b.name)}</span><b>${b.score}</b></li>`).join('')}</ol>` : `<p class="bans-note">${L.lbEmpty}</p>`) : ''}</section>`;
}

let qs: Question[] = [], i = 0, score = 0, picked: number | null = null;
let data: AppData;

function render() {
  const L = t(), body = $('quiz-body');
  const close = `<button class="hd-x" data-qz="close" aria-label="${L.heroClose}">×</button>`;
  if (i >= qs.length) {
    saveBest(score);
    body.innerHTML = `<div class="hd-head qz-head"><span></span><div class="hd-name"><h2 id="quiz-title">${L.qzFinish}</h2></div>${close}</div>
      <p class="qz-score">${L.qzScore(score, qs.length)}</p><p class="bans-note">${L.qzBest(loadBest())}</p>
      <div class="hd-actions"><button class="addbtn" data-qz="again">${L.qzAgain}</button></div>${boardHtml()}`;
    return;
  }
  const q = qs[i];
  const title = q.kind === 'counter' ? L.qzCounter(q.enemy.name) : L.qzTip(tipTitle(q.tip));
  const opt = (k: number) => {
    const cls = picked === null ? '' : k === q.answer ? ' right' : k === picked ? ' wrong' : ' dim';
    if (q.kind === 'counter') {
      const h = q.options[k];
      const adv = picked !== null ? ` <b class="${k === q.answer ? 'up' : 'dn'}">${sign(counter(data.stats.pub.all, data.stats.n, h.i, q.enemy.i).adv)}</b>` : '';
      return `<button class="qz-opt${cls}" data-qa="${k}" ${picked !== null ? 'disabled' : ''}><img class="ic" src="${esc(h.img)}" alt="" width="22" height="22"><span>${esc(h.name)}</span>${adv}</button>`;
    }
    return `<button class="qz-opt${cls}" data-qa="${k}" ${picked !== null ? 'disabled' : ''}><span>${esc(tipText(q.options[k]))}</span></button>`;
  };
  body.innerHTML = `<div class="hd-head qz-head">${q.kind === 'counter' ? `<img class="hd-ic" src="${esc(q.enemy.img)}" alt="" width="56" height="56">` : '<span></span>'}
      <div class="hd-name"><span class="place">${L.qzOf(i + 1, qs.length)} · ${L.qzScore(score, qs.length)}</span><h2 id="quiz-title">${esc(title)}</h2></div>${close}</div>
    <div class="qz-opts">${q.options.map((_, k) => opt(k)).join('')}</div>
    ${picked !== null ? `<p class="qz-res ${picked === q.answer ? 'ok' : 'no'}" role="status">${picked === q.answer ? L.qzRight : L.qzWrong}</p><div class="hd-actions"><button class="addbtn" data-qz="next">${L.qzNext}</button></div>` : ''}`;
}

function start() { board = null; lbMsg = ''; saved = false; qs = makeQuiz(data.stats, data.heroes, data.tips, Date.now() % 2147483647); i = 0; score = 0; picked = null; render(); }

export function bindQuiz(d: AppData) {
  data = d;
  const dlg = $<HTMLDialogElement>('quiz');
  dlg.addEventListener('submit', async e => {
    if ((e.target as HTMLElement).id !== 'lb-form') return;
    e.preventDefault();
    const L = t(), name = cleanName(($('lb-name') as HTMLInputElement).value);
    if (!name) { lbMsg = L.lbBadName; render(); return; }
    try { localStorage.setItem(NAME, name); } catch { /* ignore */ }
    const r = await postScore(name, score);
    if (r === 'rate') lbMsg = L.lbRate;
    else if (!r) lbMsg = L.lbErr;
    else { board = r; saved = true; lbMsg = L.lbSaved; }
    render();
  });
  $('quiz-open').addEventListener('click', e => { e.stopPropagation(); start(); dlg.showModal(); });
  dlg.addEventListener('click', e => {
    const tg = e.target as Element;
    if (tg === dlg || tg.closest('[data-qz="close"]')) { dlg.close(); return; }
    const a = tg.closest<HTMLElement>('[data-qa]');
    if (a && picked === null) { picked = +a.dataset.qa!; if (picked === qs[i].answer) score++; render(); (dlg.querySelector('[data-qz="next"]') as HTMLElement | null)?.focus(); return; }
    if (tg.closest('[data-qz="next"]')) {
      i++; picked = null; render();
      if (i >= qs.length && roomEnabled) void getBoard().then(b => { board = b; if (!b) lbMsg = t().lbErr; render(); });
      return;
    }
    if (tg.closest('[data-qz="again"]')) start();
  });
}
export const refreshQuiz = () => { if ($<HTMLDialogElement>('quiz').open) render(); };
