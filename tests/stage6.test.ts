import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseChannel, parsePrivmsg, percents, Tally, voteOf } from '../src/stream.ts';
import { makeQuiz, rng } from '../src/quiz.ts';
import { heroesFrom } from '../src/data.ts';
import { counter } from '../src/scoring.ts';
import type { Stats, Tip } from '../src/types.ts';

describe('голосование из чата', () => {
  it('разбор IRC', () => {
    expect(parsePrivmsg('@badge-info=;color=#FF0000 :Viewer1!viewer1@viewer1.tmi.twitch.tv PRIVMSG #finik :!2 точно')).toEqual({ user: 'viewer1', text: '!2 точно' });
    expect(parsePrivmsg(':tmi.twitch.tv 001 justinfan123 :Welcome')).toBeNull();
  });
  it('голос: !1..!3, один на зрителя, последний считается', () => {
    expect(voteOf('!1', 3)).toBe(0); expect(voteOf('!3 gg', 3)).toBe(2); expect(voteOf('!4', 3)).toBeNull(); expect(voteOf('1', 3)).toBeNull(); expect(voteOf('!12', 3)).toBeNull();
    const t = new Tally(3);
    t.add('a', 0); t.add('b', 0); t.add('a', 2); t.add('c', 1);
    expect(t.counts()).toEqual([1, 1, 1]); expect(t.total).toBe(3);
    expect(percents([1, 1, 2])).toEqual([25, 25, 50]); expect(percents([0, 0, 0])).toEqual([0, 0, 0]);
  });
  it('канал из ссылки', () => {
    expect(parseChannel('https://www.twitch.tv/FINIK')).toBe('finik');
    expect(parseChannel('finik')).toBe('finik');
    expect(parseChannel('https://youtube.com/x')).toBeNull();
  });
});

describe('викторина', () => {
  const stats: Stats = JSON.parse(readFileSync('tests/fixtures/stats-2026-11-02.json', 'utf8'));
  const tips: Tip[] = JSON.parse(readFileSync('public/data/tips.json', 'utf8'));
  const heroes = heroesFrom(stats);
  it('10 вопросов, по 4 варианта, правильный ответ на месте', () => {
    const q = makeQuiz(stats, heroes, tips, 42);
    expect(q).toHaveLength(10);
    expect(q.filter(x => x.kind === 'counter').length).toBe(5);
    for (const x of q) {
      expect(x.options).toHaveLength(4);
      if (x.kind === 'counter') {
        const T = stats.pub.all, right = x.options[x.answer];
        const advs = x.options.map(o => counter(T, stats.n, o.i, x.enemy.i).adv);
        expect(Math.max(...advs)).toBe(advs[x.answer]);
        expect(advs[x.answer]).toBeGreaterThanOrEqual(2);
        expect(right.i).not.toBe(x.enemy.i);
      } else {
        expect(x.options[x.answer]).toBe(x.tip);
        expect(new Set(x.options.map(o => o.t)).size).toBe(4);
      }
    }
  });
  it('один сид — одни вопросы; разные сиды — разные', () => {
    const a = makeQuiz(stats, heroes, tips, 7), b = makeQuiz(stats, heroes, tips, 7), c = makeQuiz(stats, heroes, tips, 8);
    const key = (q: typeof a) => q.map(x => x.kind === 'counter' ? x.enemy.name : x.tip.t).join('|');
    expect(key(a)).toBe(key(b)); expect(key(a)).not.toBe(key(c));
    expect(rng(1)()).toBe(rng(1)());
  });
});
