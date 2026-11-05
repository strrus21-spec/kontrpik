import { describe, expect, it } from 'vitest';
import { keyAction } from '../src/keys.ts';

const k = (code: string, key = '', mods: Partial<KeyboardEvent> = {}) => ({ code, key, ctrlKey: false, metaKey: false, altKey: false, ...mods });
const div = { tagName: 'DIV', isContentEditable: false } as unknown as HTMLElement;
const input = { tagName: 'INPUT', isContentEditable: false } as unknown as HTMLElement;

describe('горячие клавиши', () => {
  it('поиск, позиции, режимы — и в русской раскладке', () => {
    expect(keyAction(k('Slash', '.'), div)).toEqual(['search']);
    expect(keyAction(k('Digit3', '3'), div)).toEqual(['pos', 3]);
    expect(keyAction(k('Numpad0', '0'), div)).toEqual(['pos', 0]);
    expect(keyAction(k('KeyE', 'у'), div)).toEqual(['mode', 'enemy']);
    expect(keyAction(k('KeyA', 'ф'), div)).toEqual(['mode', 'ally']);
    expect(keyAction(k('KeyB', 'и'), div)).toEqual(['mode', 'ban']);
  });
  it('не мешают вводу текста и сочетаниям', () => {
    expect(keyAction(k('KeyE', 'e'), input)).toBeNull();
    expect(keyAction(k('KeyA', 'a', { ctrlKey: true }), div)).toBeNull();
    expect(keyAction(k('Digit7', '7'), div)).toBeNull();
    expect(keyAction(k('KeyQ', 'q'), div)).toBeNull();
  });
});
