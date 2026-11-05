import { describe, expect, it } from 'vitest';
import { heroBuild, type ItemConst } from '../scripts/lib/items.ts';

const consts: Record<string, ItemConst> = {
  tango: { id: 44, cost: 90 }, branches: { id: 16, cost: 50 }, tpscroll: { id: 46, cost: 90 },
  boots: { id: 29, cost: 500 }, power_treads: { id: 63, cost: 1400, components: ['boots'] },
  ogre_axe: { id: 22, cost: 1000 }, blink: { id: 1, cost: 2250 },
  black_king_bar: { id: 116, cost: 4050, components: ['ogre_axe', 'mithril_hammer'] },
  bfury: { id: 145, cost: 4100, components: ['broadsword'] }, recipe_bfury: { id: 144, cost: 0 },
  removed_item: { id: 999, cost: null, components: ['x'] },
};
const byId = new Map(Object.entries(consts).map(([k, v]) => [v.id!, k]));

describe('сборки предметов', () => {
  it('старт — всё; дальше — только собранные предметы и Blink, без расходников, рецептов и повторов', () => {
    const b = heroBuild({
      start_game_items: { 44: 50, 16: 40, 46: 10 },
      early_game_items: { 29: 90, 63: 80, 46: 70, 44: 60 },
      mid_game_items: { 22: 70, 1: 60, 116: 50, 144: 40, 63: 30, 999: 20 },
      late_game_items: { 116: 40, 145: 30 },
    }, byId, consts);
    expect(b.start).toEqual(['tango', 'branches', 'tpscroll']);
    expect(b.early).toEqual(['power_treads']);
    expect(b.mid).toEqual(['blink', 'black_king_bar']);
    expect(b.late).toEqual(['bfury']);
  });
});
