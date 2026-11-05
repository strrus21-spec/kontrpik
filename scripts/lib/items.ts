// Сборки предметов героев (про-матчи OpenDota): /heroes/{id}/itemPopularity + /constants/items.
export type Phase = 'start' | 'early' | 'mid' | 'late';
export interface ItemConst { id?: number; dname?: string; cost?: number | null; qual?: string; img?: string; components?: string[] | null }
export interface HeroBuild { start: string[]; early: string[]; mid: string[]; late: string[] }
export interface ItemsFile { updated: number; items: Record<string, { n: string; c: number; i: string; a?: number }>; ids?: Record<string, string>; heroes: Record<string, HeroBuild> }

export type Popularity = Record<'start_game_items' | 'early_game_items' | 'mid_game_items' | 'late_game_items', Record<string, number>>;

const PHASES: [Phase, keyof Popularity][] = [['start', 'start_game_items'], ['early', 'early_game_items'], ['mid', 'mid_game_items'], ['late', 'late_game_items']];
/** Цельные предметы без рецепта, которые всё равно стоит показывать. */
const STANDALONE = new Set(['blink', 'aghanims_shard']);
/** Расходники и мелочь, которые засоряют сборку после старта. */
const SKIP_LATER = new Set(['tpscroll', 'ward_observer', 'ward_sentry', 'ward_dispenser', 'dust', 'smoke_of_deceit', 'tango', 'flask', 'clarity', 'enchanted_mango', 'faerie_fire', 'blood_grenade', 'branches', 'tome_of_knowledge', 'cheese', 'aegis', 'refresher_shard', 'aghanims_shard_roshan', 'ultimate_scepter_roshan']);

/** Лучшие предметы по фазам: старт — всё, дальше — без расходников и дешёвых компонентов. */
export function heroBuild(pop: Popularity, byId: Map<number, string>, consts: Record<string, ItemConst>, n = 6): HeroBuild {
  const out = {} as HeroBuild;
  const used = new Set<string>();
  for (const [phase, key] of PHASES) {
    const list = Object.entries(pop[key] || {})
      .map(([id, c]) => [byId.get(Number(id)), c] as const)
      .filter((x): x is readonly [string, number] => !!x[0] && !x[0].startsWith('recipe_'))
      .filter(([k]) => {
        if (phase === 'start') return true;
        if (SKIP_LATER.has(k) || used.has(k)) return false;
        const c = consts[k]; if (!c || !c.cost) return false;          // предмета уже нет в игре
        // после старта — только собранные предметы (не компоненты вроде Ogre Axe, Point Booster)
        return (!!c.components?.length || STANDALONE.has(k)) && c.cost >= (phase === 'early' ? 400 : 1000);
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k]) => k);
    if (phase !== 'start') list.forEach(k => used.add(k));
    out[phase] = list;
  }
  return out;
}
