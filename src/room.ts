// Клиент бэкенда стрима (worker/). Адрес задаётся при сборке: VITE_ROOM_API. Без него функции скрыты.
import { normalizeCode, isRoomCode, type BoardEntry, type FromRoom, type Role } from './room-protocol.ts';

export const ROOM_API: string = String(import.meta.env.VITE_ROOM_API || '').replace(/\/$/, '');
export const roomEnabled = !!ROOM_API;

export interface RoomKey { code: string; key: string }
const KEY = 'kontrpik-room';
export const loadRoom = (): RoomKey | null => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && isRoomCode(v.code) ? v : null; } catch { return null; } };
export const saveRoom = (r: RoomKey | null) => { try { if (r) localStorage.setItem(KEY, JSON.stringify(r)); else localStorage.removeItem(KEY); } catch { /* ignore */ } };
export const codeFromQuery = (search = location.search) => { const c = normalizeCode(new URLSearchParams(search).get('room') || ''); return isRoomCode(c) ? c : null; };

/** Постоянный анонимный id зрителя для голосования. */
export function voterId(): string {
  try {
    let v = localStorage.getItem('kontrpik-voter');
    if (!v || !/^[a-z0-9]{16}$/.test(v)) { v = [...crypto.getRandomValues(new Uint8Array(16))].map(b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join(''); localStorage.setItem('kontrpik-voter', v); }
    return v;
  } catch { return 'anon' + Math.random().toString(36).slice(2, 14).padEnd(12, '0'); }
}

export async function createRoom(): Promise<RoomKey | null> {
  try { const r = await fetch(ROOM_API + '/room', { method: 'POST' }); return r.ok ? await r.json() : null; } catch { return null; }
}

export interface RoomConn { send(obj: unknown): void; close(): void; readonly open: boolean }
/** WebSocket с переподключением. onStatus('gone') — комнаты больше нет. */
export function connectRoom(code: string, role: Role, key: string | null, onMsg: (m: FromRoom) => void, onStatus?: (s: 'open' | 'closed' | 'gone') => void): RoomConn {
  let ws: WebSocket | null = null, stopped = false, retry = 0, opened = false, queued: string | null = null;
  const url = ROOM_API.replace(/^http/, 'ws') + `/room/${code}/ws?role=${role}` + (key ? `&key=${encodeURIComponent(key)}` : '');
  const go = () => {
    opened = false;
    ws = new WebSocket(url);
    ws.onopen = () => { opened = true; retry = 0; onStatus?.('open'); if (queued) { ws!.send(queued); queued = null; } };
    ws.onmessage = e => { try { onMsg(JSON.parse(String(e.data))); } catch { /* мусор */ } };
    ws.onclose = () => {
      const was = opened; opened = false; onStatus?.('closed');
      if (stopped) return;
      // не открылось ни разу три раза подряд — вероятно, комнаты нет
      if (!was && ++retry >= 3) { onStatus?.('gone'); return; }
      setTimeout(go, Math.min(30000, 1000 * 2 ** retry));
    };
  };
  go();
  return {
    send(obj) { const s = JSON.stringify(obj); if (opened && ws?.readyState === WebSocket.OPEN) ws.send(s); else queued = s; },
    close() { stopped = true; ws?.close(); },
    get open() { return opened; },
  };
}

export async function postVote(code: string, option: number): Promise<'ok' | 'closed' | 'limit' | 'error'> {
  try {
    const r = await fetch(`${ROOM_API}/room/${code}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voter: voterId(), option }) });
    if (r.ok) return 'ok';
    const j = await r.json().catch(() => ({}));
    return j.error === 'closed' ? 'closed' : j.error === 'limit' ? 'limit' : 'error';
  } catch { return 'error'; }
}

export async function getBoard(): Promise<BoardEntry[] | null> {
  try { const r = await fetch(ROOM_API + '/leaderboard'); return r.ok ? (await r.json()).top : null; } catch { return null; }
}
export async function postScore(name: string, score: number): Promise<BoardEntry[] | 'rate' | null> {
  try {
    const r = await fetch(ROOM_API + '/leaderboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, score }) });
    if (r.status === 429) return 'rate';
    return r.ok ? (await r.json()).top : null;
  } catch { return null; }
}
