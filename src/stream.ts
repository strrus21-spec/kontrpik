// Стрим (6.7): состояние оверлея, голосование из чата Twitch, обмен через BroadcastChannel.
export interface OverlayHero { name: string; img: string }
export interface OverlayPick extends OverlayHero { score: number; verdict: string }
export interface Vote { open: boolean; options: string[]; counts: number[]; total: number }
export interface OverlayState { lang: 'ru' | 'en'; enemy: OverlayHero[]; top: OverlayPick[]; vote: Vote | null; labels: { enemies: string; picks: string; vote: string; voteHint: string } }

export const CHANNEL = 'kontrpik-overlay';
export const STORE = 'kontrpik-overlay-state';

/** Разбор строки IRC: PRIVMSG от пользователя → { user, text }. */
export function parsePrivmsg(line: string): { user: string; text: string } | null {
  const m = line.match(/^(?:@\S+ )?:([^!\s]+)!\S+ PRIVMSG #\S+ :(.*)$/);
  return m ? { user: m[1].toLowerCase(), text: m[2].trim() } : null;
}

/** Голос: «!1», «!2», «!3» (с текстом после — тоже). Один голос на зрителя, последний засчитывается. */
export function voteOf(text: string, n: number): number | null {
  const m = text.match(/^!([1-9])\b/);
  if (!m) return null;
  const v = Number(m[1]) - 1;
  return v < n ? v : null;
}

export class Tally {
  private by = new Map<string, number>();
  constructor(public n: number) {}
  add(user: string, option: number) { this.by.set(user, option); }
  counts(): number[] { const c = new Array(this.n).fill(0); for (const v of this.by.values()) c[v]++; return c; }
  get total() { return this.by.size; }
  clear() { this.by.clear(); }
}

export const percents = (counts: number[]) => { const t = counts.reduce((a, b) => a + b, 0); return counts.map(c => (t ? Math.round(c / t * 100) : 0)); };

/** Анонимное чтение чата Twitch (justinfan) через WebSocket — без токена и сервера. */
export function twitchChat(channel: string, onMsg: (user: string, text: string) => void, onStatus?: (s: 'open' | 'closed') => void): () => void {
  let ws: WebSocket | null = null, stopped = false, retry = 0;
  const connect = () => {
    ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    ws.onopen = () => {
      retry = 0;
      ws!.send('PASS SCHMOOPIIE'); ws!.send(`NICK justinfan${10000 + Math.floor(Math.random() * 80000)}`); ws!.send(`JOIN #${channel.toLowerCase()}`);
      onStatus?.('open');
    };
    ws.onmessage = e => {
      for (const line of String(e.data).split('\r\n')) {
        if (line.startsWith('PING')) { ws!.send('PONG :tmi.twitch.tv'); continue; }
        const p = parsePrivmsg(line); if (p) onMsg(p.user, p.text);
      }
    };
    ws.onclose = () => { onStatus?.('closed'); if (!stopped) setTimeout(connect, Math.min(30000, 1000 * 2 ** retry++)); };
  };
  connect();
  return () => { stopped = true; ws?.close(); };
}

/** Канал Twitch из имени или ссылки twitch.tv/имя. */
export function parseChannel(s: string): string | null {
  const m = s.trim().match(/^(?:https?:\/\/)?(?:www\.)?(?:twitch\.tv\/)?([a-zA-Z0-9_]{3,25})\/?$/);
  return m ? m[1].toLowerCase() : null;
}
