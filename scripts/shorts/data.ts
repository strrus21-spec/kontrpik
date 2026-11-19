// Данные для шортсов «Против X — кого пикать»: топ-контрпики по статистике сайта.
// Запуск: npx vite-node scripts/shorts/data.ts -- <папка с stats.json, positions.json, od-heroes.json> [герои через запятую]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { heroProfile } from '../../src/hero.ts';
import { heroesFrom } from '../../src/data.ts';
import { mainPos } from '../../src/scoring.ts';
import type { Positions, Stats } from '../../src/types.ts';

const dir = process.argv[2];
const stats: Stats = JSON.parse(readFileSync(join(dir, 'stats.json'), 'utf8'));
const positions: Positions = JSON.parse(readFileSync(join(dir, 'positions.json'), 'utf8'));
const od: Record<string, { name: string }> = JSON.parse(readFileSync(join(dir, 'od-heroes.json'), 'utf8'));
const heroes = heroesFrom(stats);
const T = stats.pub.all;
const games = (i: number) => T.solo[2 * i];
const slugOf = (odId: number) => od[odId]?.name.replace('npc_dota_hero_', '') ?? '';

// По умолчанию — самые частые герои пабликов: против них чаще всего ищут контрпик.
const wanted = process.argv[3]?.split(',').map(s => s.trim().toLowerCase());
const list = wanted
  ? heroes.filter(h => wanted.includes(h.name.toLowerCase()))
  : [...heroes].sort((a, b) => games(b.i) - games(a.i)).slice(0, 10);

const out = list.map(h => {
  const p = heroProfile(stats, heroes, positions, h, 'all');
  return {
    enemy: { name: h.name, render: slugOf(h.odId), games: games(h.i) },
    counters: p.losesTo.filter(m => m.g >= 1500).slice(0, 3).map(m => ({ name: m.h.name, render: slugOf(m.h.odId), adv: +m.adv.toFixed(1), g: m.g, pos: mainPos(m.h, positions)[0] })),
  };
});
const total = Object.values(stats.counts).reduce((a, b) => Math.max(a, b), 0);
writeFileSync(join(dir, 'shorts.json'), JSON.stringify({ total, updated: stats.updated, shorts: out }, null, 1));
for (const s of out) console.log(s.enemy.name, '←', s.counters.map(c => `${c.name} +${c.adv} (${c.g})`).join(', '));
