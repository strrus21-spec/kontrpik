// Протокол комнаты стрима и таблицы лидеров. Общий для фронтенда и worker/ (без DOM и без Workers API).

/** Код комнаты: 6 символов без похожих (0/O, 1/I). */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const isRoomCode = (s: string) => /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(s);
export const normalizeCode = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

export type Role = 'control' | 'overlay' | 'viewer';
export const isRole = (s: string | null): s is Role => s === 'control' || s === 'overlay' || s === 'viewer';

/** Сообщения по WebSocket. */
export type ToRoom = { type: 'state'; state: unknown };
export type FromRoom = { type: 'state'; state: unknown } | { type: 'vote'; voter: string; option: number };

/** Ограничения. */
export const MAX_STATE_BYTES = 32 * 1024;
export const MAX_VOTERS_PER_IP = 10; // мобильные операторы выводят многих зрителей под одним IP
export const QUIZ_MAX = 10;
export const BOARD_SIZE = 20;

/** Имя в таблице лидеров: без управляющих символов и разметки, 2–20 символов. */
export function cleanName(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const v = s.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f<>]/g, '').replace(/\s+/g, ' ').trim();
  return v.length >= 2 && v.length <= 20 ? v : null;
}
export const validScore = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= QUIZ_MAX;
export const validVoter = (s: unknown): s is string => typeof s === 'string' && /^[a-z0-9]{8,32}$/.test(s);

export interface BoardEntry { name: string; score: number; at: number }
/** Вставить результат: лучшие сверху, при равенстве — кто раньше. Один игрок (имя) — одна строка с лучшим результатом. */
export function insertScore(board: BoardEntry[], e: BoardEntry, size = BOARD_SIZE): BoardEntry[] {
  const key = e.name.toLowerCase();
  const prev = board.find(b => b.name.toLowerCase() === key);
  if (prev && prev.score >= e.score) return board;
  return [...board.filter(b => b.name.toLowerCase() !== key), e]
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, size);
}

/** Голос с веб-страницы: проверить, что голосование открыто и вариант существует. */
export function acceptVote(state: unknown, option: unknown): boolean {
  const v = (state as { vote?: { open?: boolean; options?: unknown[] } } | null)?.vote;
  return !!v && v.open === true && Array.isArray(v.options) && Number.isInteger(option) && (option as number) >= 0 && (option as number) < v.options.length;
}
