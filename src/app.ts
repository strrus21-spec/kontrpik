// Сайт внутри Android-приложения DotaPick и работа без интернета.
// Приложение добавляет в User-Agent метку «DotaPickApp» и мост window.DotaPickApp (android/…/MainActivity.kt).
import { dateOne, LANG, t } from './i18n.ts';

interface Bridge { share(text: string, url: string): void; saveImage(base64: string, name: string): void; setTheme(theme: string): void; version(): string }
const bridge = (): Bridge | null => (globalThis as { DotaPickApp?: Bridge }).DotaPickApp ?? null;

export const inApp = /DotaPickApp\//.test(navigator.userAgent);
if (inApp) document.documentElement.classList.add('in-app');
/** Сборка из Google Play: без донатов и публичной таблицы лидеров (правила магазина). */
export const inPlay = /DotaPickPlay/.test(navigator.userAgent);
if (inPlay) document.documentElement.classList.add('in-play');

/** Поделиться ссылкой: в приложении — системное меню Android, иначе — меню браузера; false — не получилось. */
export async function shareLink(text: string, url: string): Promise<boolean> {
  const b = bridge(); if (b) { b.share(text, url); return true; }
  if (navigator.share) { try { await navigator.share({ text, url }); return true; } catch { return false; } }
  return false;
}

/** Картинка: в приложении — в Галерею и меню «Поделиться». */
export async function saveImage(blob: Blob, name: string): Promise<boolean> {
  const b = bridge(); if (!b) return false;
  const data = await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(blob); });
  b.saveImage(data, name); return true;
}

/** Цвет системных панелей Android под тему сайта. */
export function appTheme(theme: string) { bridge()?.setTheme(theme); }

/* ---------- без интернета ---------- */
let statsDate = 0;
export function setStatsDate(ts: number) { statsDate = ts; renderOffline(); }
export const isOffline = () => !navigator.onLine;

function renderOffline() {
  let el = document.getElementById('offline-bar');
  if (navigator.onLine) { el?.remove(); document.documentElement.classList.remove('offline'); return; }
  document.documentElement.classList.add('offline');
  if (!el) { el = document.createElement('div'); el.id = 'offline-bar'; el.setAttribute('role', 'status'); document.body.append(el); }
  el.textContent = t().offBar(statsDate ? dateOne(LANG, statsDate) : '');
}
addEventListener('online', () => { renderOffline(); document.dispatchEvent(new Event('kp-online')); });
addEventListener('offline', renderOffline);

/* ---------- разборы, открытые раньше: доступны без интернета ---------- */
const SEEN = 'kontrpik-seen-matches';
export interface Seen { id: number; slot: number | null; hero: number; win: boolean; at: number }
export function rememberMatch(s: Seen) {
  try {
    const list = (JSON.parse(localStorage.getItem(SEEN) || '[]') as Seen[]).filter(x => x.id !== s.id);
    localStorage.setItem(SEEN, JSON.stringify([s, ...list].slice(0, 12)));
  } catch { /* ignore */ }
}
export function seenMatches(): Seen[] { try { return JSON.parse(localStorage.getItem(SEEN) || '[]'); } catch { return []; } }

/** Версия приложения внизу страницы (только в приложении). */
export function showAppVersion() {
  let v = ''; try { v = bridge()?.version() ?? ''; } catch { /* старое приложение */ }
  const el = document.getElementById('app-ver'); if (!el || !v) return;
  document.getElementById('app-ver-n')!.textContent = v;
  el.hidden = false;
}
