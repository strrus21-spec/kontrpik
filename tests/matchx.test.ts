// Расширенный разбор на реальном разобранном матче 9076499476 (OpenDota, 5 ноября 2026).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { advantage, damage, fights, itemTimeline, laneOpponents, mapData, objectives, opponentByPos, phaseOf, positionOf, smartTips, vsPro } from '../src/matchx.ts';
import type { Match } from '../src/match.ts';

const m: Match = JSON.parse(readFileSync('tests/fixtures/match-9076499476.json', 'utf8'));
const shaman = m.players.find(p => p.hero_id === 27)!;    // Shadow Shaman, pos 5 Сил Света
const spectre = m.players.find(p => p.hero_id === 67)!;   // Spectre, pos 1

describe('расширенный разбор', () => {
  it('позиции и соперники', () => {
    expect(positionOf(m, shaman)).toBe(5);
    expect(positionOf(m, spectre)).toBe(1);
    expect(opponentByPos(m, spectre)?.hero_id).toBe(18);           // Sven — pos 1 Тьмы
    expect(laneOpponents(m, spectre).map(p => p.hero_id).sort()).toEqual([135, 53].sort());
  });
  it('график преимущества — по минутам, со знаком своей команды', () => {
    const a = advantage(m, shaman), b = advantage(m, m.players.find(p => p.hero_id === 14)!);
    expect(a.gold.length).toBeGreaterThan(40);
    expect(a.gold[10]).toBe(-b.gold[10]);
  });
  it('драки: потери сторон и участие', () => {
    const f = fights(m, shaman);
    expect(f).toHaveLength(16);
    for (const x of f) expect(x.ourDeaths + x.theirDeaths).toBeGreaterThan(0);
    expect(f.filter(x => x.me.in).length).toBeGreaterThan(5);
  });
  it('события, урон, карта', () => {
    const o = objectives(m, shaman);
    expect(o.some(x => x.kind === 'roshan')).toBe(true);
    expect(o.filter(x => x.kind === 'tower').length).toBeGreaterThan(5);
    const d = damage(shaman);
    expect(d.dealt[0][0]).toMatch(/^npc_dota_hero_/); expect(d.dealt[0][1]).toBeGreaterThan(d.dealt[1][1]);
    const md = mapData(m, shaman);
    expect(md.myWards.length).toBeGreaterThan(10); expect(md.path.length).toBeGreaterThan(20);
    for (const w of md.myWards) { expect(w.x).toBeGreaterThan(60); expect(w.x).toBeLessThan(200); }
  });
  it('предметы: лента и сравнение с про', () => {
    expect(phaseOf(-10)).toBe('start'); expect(phaseOf(599)).toBe('early'); expect(phaseOf(1500)).toBe('late');
    const tl = itemTimeline(spectre, k => ['radiance', 'manta', 'blink', 'power_treads', 'phase_boots'].includes(k));
    expect(tl.length).toBeGreaterThan(0);
    expect(tl.every((x, i) => i === 0 || x.time >= tl[i - 1].time)).toBe(true);
    const build = { start: [], early: ['phase_boots'], mid: ['radiance'], late: ['butterfly'] };
    expect(vsPro('radiance', 1700, build)).toBe('late');
    expect(vsPro('radiance', 900, build)).toBe('same');
    expect(vsPro('radiance', 500, build)).toBe('early');
    expect(vsPro('aegis', 500, build)).toBeNull();
  });
  it('советы: конкретные, с цифрами, не больше 6', () => {
    const tips = smartTips(m, shaman, { heroName: k => k.replace('npc_dota_hero_', ''), heroById: id => String(id), isAssembled: () => true });
    expect(tips.length).toBeGreaterThan(1); expect(tips.length).toBeLessThanOrEqual(6);
    expect(tips.map(t => t.key)).toContain('earlyWards');
    expect(tips.find(t => t.key === 'deathBurst')?.v).toEqual({ n: 4, from: '18:11', to: '24:22' });
    const sf = m.players.find(p => p.hero_id === 16)!;
    const t2 = smartTips(m, sf, { heroName: k => k.replace('npc_dota_hero_', ''), heroById: id => String(id), isAssembled: () => true });
    expect(t2.find(t => t.key === 'streak')?.v).toEqual({ n: 3, from: '12:32', to: '20:32', hero: 'leshrac' });
  });
});
