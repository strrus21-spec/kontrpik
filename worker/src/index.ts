// Бэкенд стрима (ТЗ 6.7): комнаты для оверлея и голосования с другого устройства, таблица лидеров викторины.
// Cloudflare Worker + Durable Objects. Развёртывание: cd worker && npx wrangler deploy.
import { DurableObject } from 'cloudflare:workers';
import {
  CODE_ALPHABET, MAX_STATE_BYTES, MAX_VOTERS_PER_IP, acceptVote, cleanName, insertScore, isRole, isRoomCode,
  validScore, validVoter, type BoardEntry, type FromRoom,
} from '../../src/room-protocol.ts';

export interface Env {
  ROOM: DurableObjectNamespace<Room>;
  BOARD: DurableObjectNamespace<Board>;
  /** Через запятую: сайты, которым разрешён доступ. Пусто — любой. */
  ALLOWED_ORIGINS?: string;
}

const enc = new TextEncoder();
async function sha256(s: string) {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const randomFrom = (alphabet: string, n: number) => { const b = crypto.getRandomValues(new Uint8Array(n)); return [...b].map(x => alphabet[x % alphabet.length]).join(''); };

function cors(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const list = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const allow = !list.length ? '*' : list.includes(origin) ? origin : list[0];
  return { 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' };
}
const json = (body: unknown, status: number, h: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...h } });
const readJson = async (req: Request): Promise<Record<string, unknown> | null> => {
  if (Number(req.headers.get('Content-Length') || 0) > 4096) return null;
  try { const v = await req.json(); return v && typeof v === 'object' ? v as Record<string, unknown> : null; } catch { return null; }
};
const ipOf = (req: Request) => req.headers.get('CF-Connecting-IP') || 'local';

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const h = cors(req, env), url = new URL(req.url), p = url.pathname;
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });

    // Создать комнату: код + ключ управления (ключ хранится только у стримера).
    if (p === '/room' && req.method === 'POST') {
      for (let i = 0; i < 5; i++) {
        const code = randomFrom(CODE_ALPHABET, 6), key = randomFrom('abcdefghijklmnopqrstuvwxyz0123456789', 32);
        if (await env.ROOM.get(env.ROOM.idFromName(code)).init(await sha256(key))) return json({ code, key }, 201, h);
      }
      return json({ error: 'busy' }, 503, h);
    }
    let m = p.match(/^\/room\/([A-Z0-9]{6})\/(ws|vote)$/);
    if (m) {
      if (!isRoomCode(m[1])) return json({ error: 'bad_code' }, 400, h);
      const stub = env.ROOM.get(env.ROOM.idFromName(m[1]));
      if (m[2] === 'ws') {
        if (req.headers.get('Upgrade') !== 'websocket') return json({ error: 'websocket_expected' }, 426, h);
        return stub.fetch(req);
      }
      if (req.method !== 'POST') return json({ error: 'method' }, 405, h);
      const b = await readJson(req);
      if (!b || !validVoter(b.voter) || !Number.isInteger(b.option)) return json({ error: 'bad_vote' }, 400, h);
      const r = await stub.vote(b.voter as string, b.option as number, ipOf(req));
      return json(r, r.ok ? 200 : r.error === 'no_room' ? 404 : 409, h);
    }
    if (p === '/leaderboard') {
      const board = env.BOARD.get(env.BOARD.idFromName('global'));
      if (req.method === 'GET') return json({ top: await board.top() }, 200, { ...h, 'Cache-Control': 'no-store' });
      if (req.method === 'POST') {
        const b = await readJson(req);
        const name = cleanName(b?.name);
        if (!name || !validScore(b?.score)) return json({ error: 'bad_entry' }, 400, h);
        const r = await board.add(name, b!.score as number, ipOf(req));
        return json(r, r.ok ? 200 : 429, h);
      }
      return json({ error: 'method' }, 405, h);
    }
    return json({ error: 'not_found' }, 404, h);
  },
} satisfies ExportedHandler<Env>;

/** Комната: хранит последнее состояние оверлея, раздаёт его оверлеям и зрителям, пересылает голоса стримеру. */
export class Room extends DurableObject<Env> {
  private static IDLE_MS = 24 * 3600 * 1000;

  async init(keyHash: string): Promise<boolean> {
    if (await this.ctx.storage.get('keyHash')) return false;
    await this.ctx.storage.put({ keyHash, created: Date.now() });
    await this.ctx.storage.setAlarm(Date.now() + Room.IDLE_MS);
    return true;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url), role = url.searchParams.get('role');
    const keyHash = await this.ctx.storage.get<string>('keyHash');
    if (!keyHash) return new Response('no room', { status: 404 });
    if (!isRole(role)) return new Response('bad role', { status: 400 });
    if (role === 'control' && (await sha256(url.searchParams.get('key') || '')) !== keyHash) return new Response('forbidden', { status: 403 });
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1], [role]);
    const state = await this.ctx.storage.get('state');
    if (state && role !== 'control') pair[1].send(JSON.stringify({ type: 'state', state } satisfies FromRoom));
    await this.ctx.storage.setAlarm(Date.now() + Room.IDLE_MS);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, msg: string | ArrayBuffer) {
    if (!this.ctx.getTags(ws).includes('control')) return;          // писать может только стример
    if (typeof msg !== 'string' || msg.length > MAX_STATE_BYTES) return;
    let m: { type?: string; state?: unknown };
    try { m = JSON.parse(msg); } catch { return; }
    if (m.type !== 'state' || !m.state || typeof m.state !== 'object') return;
    const prev = await this.ctx.storage.get<{ vote?: { open?: boolean; options?: unknown[] } }>('state');
    // новое голосование — счётчики IP обнуляем
    const prevOpts = JSON.stringify(prev?.vote?.options ?? null), nextVote = (m.state as { vote?: { open?: boolean; options?: unknown[] } }).vote;
    if (nextVote?.open && (!prev?.vote?.open || JSON.stringify(nextVote.options) !== prevOpts)) await this.ctx.storage.delete('ips');
    await this.ctx.storage.put('state', m.state);
    const out = JSON.stringify({ type: 'state', state: m.state } satisfies FromRoom);
    for (const s of [...this.ctx.getWebSockets('overlay'), ...this.ctx.getWebSockets('viewer')]) { try { s.send(out); } catch { /* закрыт */ } }
  }

  async webSocketClose(ws: WebSocket, code: number) { try { ws.close(code, 'bye'); } catch { /* уже закрыт */ } }

  /** Голос зрителя со страницы: ограничение — не больше 3 разных зрителей с одного IP за голосование. */
  async vote(voter: string, option: number, ip: string): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!(await this.ctx.storage.get('keyHash'))) return { ok: false, error: 'no_room' };
    const state = await this.ctx.storage.get('state');
    if (!acceptVote(state, option)) return { ok: false, error: 'closed' };
    const ips = (await this.ctx.storage.get<Record<string, string[]>>('ips')) || {};
    const list = ips[ip] || [];
    if (!list.includes(voter)) {
      if (list.length >= MAX_VOTERS_PER_IP) return { ok: false, error: 'limit' };
      ips[ip] = [...list, voter];
      await this.ctx.storage.put('ips', ips);
    }
    const msg = JSON.stringify({ type: 'vote', voter, option } satisfies FromRoom);
    for (const s of this.ctx.getWebSockets('control')) { try { s.send(msg); } catch { /* закрыт */ } }
    return { ok: true };
  }

  /** Сутки без подключений — комната удаляется. */
  async alarm() {
    if (this.ctx.getWebSockets().length) { await this.ctx.storage.setAlarm(Date.now() + Room.IDLE_MS); return; }
    await this.ctx.storage.deleteAll();
  }
}

/** Таблица лидеров викторины: топ-20, один игрок — лучший результат; не больше 5 записей с IP за 10 минут. */
export class Board extends DurableObject<Env> {
  private hits = new Map<string, number[]>();

  async top(): Promise<BoardEntry[]> { return (await this.ctx.storage.get<BoardEntry[]>('top')) || []; }

  async add(name: string, score: number, ip: string): Promise<{ ok: true; top: BoardEntry[] } | { ok: false; error: string }> {
    const now = Date.now(), recent = (this.hits.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
    if (recent.length >= 5) return { ok: false, error: 'rate_limited' };
    this.hits.set(ip, [...recent, now]);
    const top = insertScore(await this.top(), { name, score, at: now });
    await this.ctx.storage.put('top', top);
    return { ok: true, top };
  }
}
