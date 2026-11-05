// Викторина (6.7): «Угадай контрпик» и «Знаешь ли ты фишку?». 10 вопросов из данных и фишек.
import { counter } from './scoring.ts';
import type { Hero, Stats, Tip } from './types.ts';

export type Question =
  | { kind: 'counter'; enemy: Hero; options: Hero[]; answer: number }
  | { kind: 'tip'; tip: Tip; options: Tip[]; answer: number };

/** Детерминированный ГСЧ (mulberry32) — для тестов и одинаковых вопросов по ссылке. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = <T>(a: T[], r: () => number) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/**
 * Контрпик-вопрос: враг — из 60 самых популярных героев; правильный ответ — сильнейший контр
 * (преимущество ≥ 2 п.п.), три неверных — герои, которые проигрывают этому врагу (≤ −1 п.п.).
 */
function counterQ(stats: Stats, heroes: Hero[], r: () => number, used: Set<number>): Question | null {
  const T = stats.pub.all, n = stats.n;
  const popular = heroes.filter(h => T.solo[2 * h.i]).sort((a, b) => T.solo[2 * b.i] - T.solo[2 * a.i]).slice(0, 60);
  for (let tries = 0; tries < 30; tries++) {
    const e = popular[Math.floor(r() * popular.length)];
    if (used.has(e.i)) continue;
    const adv = popular.filter(h => h.i !== e.i).map(h => ({ h, a: counter(T, n, h.i, e.i).adv })).sort((x, y) => y.a - x.a);
    const best = adv[0], bad = adv.filter(x => x.a <= -1);
    if (best.a < 2 || bad.length < 3) continue;
    used.add(e.i);
    const opts = shuffle([best.h, ...shuffle(bad, r).slice(0, 3).map(x => x.h)], r);
    return { kind: 'counter', enemy: e, options: opts, answer: opts.indexOf(best.h) };
  }
  return null;
}

/** Фишка-вопрос: заголовок → верное описание среди 4 (неверные — по возможности из той же темы). */
function tipQ(tips: Tip[], r: () => number, used: Set<string>): Question | null {
  const free = tips.filter(t => !used.has(t.t)); if (free.length < 1 || tips.length < 4) return null;
  const tip = free[Math.floor(r() * free.length)]; used.add(tip.t);
  const same = shuffle(tips.filter(t => t !== tip && t.c === tip.c), r), other = shuffle(tips.filter(t => t !== tip && t.c !== tip.c), r);
  const opts = shuffle([tip, ...[...same, ...other].slice(0, 3)], r);
  return { kind: 'tip', tip, options: opts, answer: opts.indexOf(tip) };
}

export function makeQuiz(stats: Stats, heroes: Hero[], tips: Tip[], seed: number, count = 10): Question[] {
  const r = rng(seed), usedH = new Set<number>(), usedT = new Set<string>(), out: Question[] = [];
  for (let i = 0; out.length < count && i < count * 3; i++) {
    const q = i % 2 === 0 ? counterQ(stats, heroes, r, usedH) : tipQ(tips, r, usedT);
    if (q) out.push(q);
  }
  return out;
}

const BEST = 'kontrpik-quiz-best';
export const loadBest = () => { try { return Number(localStorage.getItem(BEST)) || 0; } catch { return 0; } };
export const saveBest = (v: number) => { try { if (v > loadBest()) localStorage.setItem(BEST, String(v)); } catch { /* ignore */ } };
