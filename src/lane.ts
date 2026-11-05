// «Моя линия» (6.4): вероятные соперники на линии по positions.json и оценка линии.
import { counter, posShare } from './scoring.ts';
import { THREATS } from './items.ts';
import type { Hero, Positions, Tables } from './types.ts';

/** С кем стоишь на линии: pos 1/5 — против вражеских 3/4, pos 2 — против 2, pos 3/4 — против 1/5. */
export const LANE_VS: Record<number, number[]> = { 1: [3, 4], 5: [3, 4], 2: [2], 3: [1, 5], 4: [1, 5] };

/** Распределить врагов по разным позициям с максимальной вероятностью (перебор, ≤ 5 героев). */
export function assignPositions(enemies: Hero[], positions: Positions): Map<number, number> {
  const shares = enemies.map(h => posShare(h, positions).map(v => Math.log(v + 0.01)));
  let best = -Infinity, bestPerm: number[] = [];
  const used = new Array(5).fill(false), cur: number[] = [];
  const go = (k: number, sum: number) => {
    if (k === enemies.length) { if (sum > best) { best = sum; bestPerm = [...cur]; } return; }
    for (let p = 0; p < 5; p++) if (!used[p]) { used[p] = true; cur.push(p + 1); go(k + 1, sum + shares[k][p]); cur.pop(); used[p] = false; }
  };
  go(0, 0);
  return new Map(enemies.map((h, i) => [h.i, bestPerm[i]]));
}

export type LaneLevel = 'easy' | 'mid' | 'hard';
export interface Lane { opponents: { h: Hero; pos: number; adv: number }[]; sum: number; level: LaneLevel }

/** Оценка линии для героя you на позиции pos: сумма его контр-матчапов против соперников. */
export function laneFor(T: Tables, n: number, you: Hero, pos: number, enemies: Hero[], positions: Positions): Lane | null {
  if (!pos || !enemies.length) return null;
  const assigned = assignPositions(enemies, positions);
  const want = LANE_VS[pos];
  const opponents = enemies.filter(e => want.includes(assigned.get(e.i)!))
    .map(e => ({ h: e, pos: assigned.get(e.i)!, adv: T.solo[2 * you.i] ? counter(T, n, you.i, e.i).adv : 0 }))
    .sort((a, b) => a.pos - b.pos);
  if (!opponents.length) return null;
  const sum = opponents.reduce((s, o) => s + o.adv, 0);
  return { opponents, sum, level: sum >= 1 ? 'easy' : sum <= -1 ? 'hard' : 'mid' };
}

export type HintKey = 'hardCore' | 'hardSup' | 'hardMid' | 'easyCore' | 'easySup' | 'easyMid' | 'midCore' | 'midSup' | 'midMid'
  | 'startCore' | 'startSup' | 'startMid' | 'stick' | 'armor' | 'dust' | 'pudge';

/** 2–3 подсказки: по сложности, по старту для позиции, по угрозам соперников. */
export function laneHints(lane: Lane, pos: number): { key: HintKey; hero?: string }[] {
  const group = pos === 2 ? 'Mid' : pos === 4 || pos === 5 ? 'Sup' : 'Core';
  const out: { key: HintKey; hero?: string }[] = [{ key: `${lane.level}${group}` as HintKey }, { key: `start${group}` as HintKey }];
  const names = lane.opponents.map(o => o.h.name);
  const has = (tag: string) => names.find(n => THREATS[n]?.includes(tag as never));
  if (names.includes('Pudge')) out.push({ key: 'pudge', hero: 'Pudge' });
  else if (has('invis') && group === 'Sup') out.push({ key: 'dust', hero: has('invis') });
  else if (has('magic_burst') || has('disable_heavy')) out.push({ key: 'stick', hero: has('magic_burst') || has('disable_heavy') });
  else if (has('physical_burst')) out.push({ key: 'armor', hero: has('physical_burst') });
  return out.slice(0, 3);
}
