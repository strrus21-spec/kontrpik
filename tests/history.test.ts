import { describe, expect, it } from 'vitest';
import { summarize, type HistMatch } from '../src/history.ts';

const mk = (i: number, win: boolean, hero = 1): HistMatch => ({ match_id: i, hero_id: hero, player_slot: 0, radiant_win: win, kills: 5, deaths: 4, assists: 10, gold_per_min: 500, last_hits: 100, duration: 2400, start_time: 1e9 - i });
describe('история игрока', () => {
  it('винрейт, средние, тренд, герои, неудобные противники', () => {
    const matches = [...Array.from({ length: 10 }, (_, i) => mk(i, true, i < 6 ? 8 : 14)), ...Array.from({ length: 10 }, (_, i) => mk(10 + i, i < 3, 14))];
    const s = summarize({ matches, against: [
      { hero_id: 44, against_games: 10, against_win: 2 }, { hero_id: 2, against_games: 6, against_win: 5 }, { hero_id: 5, against_games: 2, against_win: 0 },
    ] });
    expect(s.games).toBe(20); expect(s.wins).toBe(13);
    expect(s.kda).toEqual([5, 4, 10]); expect(s.gpm).toBe(500);
    expect(s.trend).toBe('up');
    expect(s.heroes[0]).toEqual({ hero_id: 14, games: 14, wins: 7 });
    expect(s.worst.map(w => w.hero_id)).toEqual([44, 2]);          // меньше 4 игр — не считается
    expect(s.form.slice(0, 3)).toEqual([true, true, true]);
  });
});
