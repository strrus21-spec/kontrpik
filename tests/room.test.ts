import { describe, expect, it } from 'vitest';
import { acceptVote, cleanName, insertScore, isRoomCode, normalizeCode, validScore, validVoter } from '../src/room-protocol.ts';

describe('протокол комнаты', () => {
  it('код комнаты', () => {
    expect(isRoomCode('EZB5P2')).toBe(true);
    expect(isRoomCode('EZB5P0')).toBe(false);   // 0 исключён
    expect(isRoomCode('ezb5p2')).toBe(false);
    expect(normalizeCode(' ezb-5p2 ')).toBe('EZB5P2');
  });
  it('голос принимается только в открытом голосовании и для существующего варианта', () => {
    const s = { vote: { open: true, options: ['A', 'B', 'C'] } };
    expect(acceptVote(s, 2)).toBe(true);
    expect(acceptVote(s, 3)).toBe(false);
    expect(acceptVote(s, 1.5)).toBe(false);
    expect(acceptVote({ vote: { open: false, options: ['A'] } }, 0)).toBe(false);
    expect(acceptVote(null, 0)).toBe(false);
    expect(validVoter('abcd1234')).toBe(true); expect(validVoter('ab')).toBe(false); expect(validVoter('ABCD1234')).toBe(false);
  });
});

describe('таблица лидеров', () => {
  it('имя и очки', () => {
    expect(cleanName('  FINIK  ')).toBe('FINIK');
    expect(cleanName('<b>x</b>y')).toBe('bx/by');
    expect(cleanName('a')).toBeNull();
    expect(cleanName('x'.repeat(21))).toBeNull();
    expect(cleanName(5)).toBeNull();
    expect([0, 10, 11, -1, 2.5].map(validScore)).toEqual([true, true, false, false, false]);
  });
  it('сортировка, лучший результат игрока, размер', () => {
    let b = insertScore([], { name: 'A', score: 5, at: 1 });
    b = insertScore(b, { name: 'B', score: 7, at: 2 });
    b = insertScore(b, { name: 'C', score: 7, at: 1 });
    expect(b.map(x => x.name)).toEqual(['C', 'B', 'A']);
    b = insertScore(b, { name: 'a', score: 4, at: 3 });          // хуже прежнего — не меняется
    expect(b.find(x => x.name === 'A')!.score).toBe(5);
    b = insertScore(b, { name: 'a', score: 9, at: 4 });          // лучше — заменяет
    expect(b[0]).toEqual({ name: 'a', score: 9, at: 4 }); expect(b).toHaveLength(3);
    expect(insertScore(b, { name: 'D', score: 0, at: 5 }, 3)).toHaveLength(3);
  });
});
