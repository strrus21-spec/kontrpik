export type Attr = 'str' | 'agi' | 'int' | 'all';
export type SrcKey = 'all' | 'low' | 'mid' | 'high' | 'pro';
export type PubKey = Exclude<SrcKey, 'pro'>;

/** Пары (x,y): [2·(x·n+y)] игры, +1 победы. solo: [2·x] игры, +1 победы. */
export interface Tables { vs: number[]; with?: number[]; solo: number[] }

export interface Stats {
  heroes: [name: string, attr: Attr, roles: string[], icon: string][];
  n: number;
  counts: Record<PubKey, number>;
  pub: Record<PubKey, Required<Tables>>;
  pro: Tables;
  from: number;
  to: number;
  updated: number;
}

export interface Hero { i: number; name: string; attr: Attr; roles: string[]; img: string }

/** {имя: [игры на pos1..pos5]} */
export type Positions = Record<string, number[]>;

export interface Tip {
  c: 'line' | 'farm' | 'map' | 'control' | 'items' | 'heroes' | 'draft';
  l: 1 | 2 | 3;
  r: string;
  p?: boolean;
  t: string; d: string; te: string; de: string;
  h?: string[];
}
