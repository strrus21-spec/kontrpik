import { describe, expect, it } from 'vitest';
import { I18N, dateRange, dateOne } from '../src/i18n.ts';

const keys = (o: object, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v, p + k + '.') : [p + k]));

describe('i18n', () => {
  it('в словарях RU и EN одинаковые ключи', () => {
    expect(keys(I18N.en).sort()).toEqual(keys(I18N.ru).sort());
  });
  it('диапазон дат', () => {
    const a = Date.UTC(2026, 9, 31) / 1000, b = Date.UTC(2026, 10, 2) / 1000;
    expect(dateRange('ru', a, b)).toBe('31 октября – 2 ноября 2026');
    expect(dateRange('en', a, b)).toBe('October 31 – November 2, 2026');
    expect(dateOne('ru', b)).toBe('2 ноября 2026');
    expect(dateOne('en', b)).toBe('November 2, 2026');
  });
});
