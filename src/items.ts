// «Что купить против этого пика» (6.2): угрозы героев → предметы с причиной.
// Черновик для согласования с автором: метки для 40 самых популярных героев пабликов + герои из фишек.
// Предметы — патч 7.41 (Shiva больше не режет лечение, поэтому против лечения — Spirit Vessel и Eye of Skadi).

export type Threat = 'evasion' | 'invis' | 'illusions' | 'heal' | 'magic_burst' | 'silence' | 'disable_heavy'
  | 'physical_burst' | 'passive_break' | 'summons' | 'mana_burn' | 'pierce_bkb' | 'lifesteal' | 'push';
export type Role = 'core' | 'support';

export const THREATS: Record<string, Threat[]> = {
  'Pudge': ['disable_heavy', 'magic_burst'],
  'Lion': ['disable_heavy', 'magic_burst'],
  'Rubick': ['disable_heavy', 'magic_burst'],
  'Sniper': ['physical_burst'],
  'Juggernaut': ['physical_burst', 'heal'],
  'Witch Doctor': ['magic_burst', 'heal'],
  'Invoker': ['magic_burst', 'disable_heavy'],
  'Ogre Magi': ['disable_heavy', 'magic_burst'],
  'Axe': ['pierce_bkb'],
  'Spirit Breaker': ['disable_heavy'],
  'Windranger': ['evasion', 'physical_burst'],
  'Anti-Mage': ['mana_burn', 'physical_burst'],
  'Earthshaker': ['disable_heavy', 'magic_burst'],
  'Shadow Shaman': ['disable_heavy', 'push'],
  'Legion Commander': ['pierce_bkb', 'physical_burst'],
  'Crystal Maiden': ['magic_burst'],
  'Necrophos': ['heal', 'magic_burst'],
  'Dragon Knight': ['physical_burst', 'push'],
  'Techies': ['magic_burst', 'invis'],
  'Drow Ranger': ['physical_burst', 'silence'],
  'Slark': ['passive_break', 'heal'],
  'Lina': ['magic_burst'],
  'Lifestealer': ['lifesteal', 'passive_break'],
  'Wraith King': ['lifesteal', 'passive_break'],
  'Phantom Assassin': ['evasion', 'physical_burst', 'passive_break'],
  'Zeus': ['magic_burst'],
  'Outworld Devourer': ['magic_burst'],
  'Skywrath Mage': ['magic_burst', 'silence'],
  'Phantom Lancer': ['illusions'],
  'Tidehunter': ['disable_heavy'],
  'Undying': ['heal', 'summons'],
  'Magnus': ['disable_heavy'],
  'Luna': ['physical_burst', 'magic_burst'],
  'Hoodwink': ['evasion', 'physical_burst'],
  'Lich': ['magic_burst'],
  'Sven': ['physical_burst', 'disable_heavy'],
  'Silencer': ['silence'],
  'Mirana': ['invis', 'disable_heavy'],
  'Nyx Assassin': ['invis', 'mana_burn', 'disable_heavy'],
  'Spectre': ['passive_break', 'physical_burst'],
  // из фишек
  'Bristleback': ['passive_break'],
  'Slardar': ['passive_break', 'physical_burst'],
  'Riki': ['invis'],
  'Weaver': ['invis'],
  'Clinkz': ['invis', 'physical_burst'],
  'Naga Siren': ['illusions'],
  'Chaos Knight': ['illusions', 'physical_burst'],
  'Terrorblade': ['illusions'],
  'Broodmother': ['summons', 'push'],
  'Lycan': ['summons', 'push'],
  'Doom': ['pierce_bkb'],
  'Bane': ['pierce_bkb', 'disable_heavy'],
  'Faceless Void': ['pierce_bkb'],
  'Enigma': ['pierce_bkb', 'summons'],
};

/** Ульты сквозь BKB, которые можно заблокировать Linken's или отразить Lotus Orb (целевые). */
const TARGETED_PIERCE = ['Doom', 'Bane', 'Legion Commander'];

interface Counter { item: string; role: Role | 'any'; only?: string[] }
/** Порядок внутри метки = приоритет. */
export const COUNTERS: Record<Threat, Counter[]> = {
  evasion: [{ item: 'Monkey King Bar', role: 'core' }],
  invis: [{ item: 'Dust of Appearance', role: 'any' }, { item: 'Sentry Ward', role: 'support' }],
  illusions: [{ item: 'Mjollnir', role: 'core' }],
  heal: [{ item: 'Spirit Vessel', role: 'support' }, { item: 'Eye of Skadi', role: 'core' }],
  magic_burst: [{ item: 'Black King Bar', role: 'core' }, { item: 'Glimmer Cape', role: 'support' }],
  silence: [{ item: 'Manta Style', role: 'core' }],
  disable_heavy: [{ item: 'Black King Bar', role: 'core' }, { item: 'Lotus Orb', role: 'support' }],
  physical_burst: [{ item: 'Blade Mail', role: 'core' }, { item: 'Ghost Scepter', role: 'support' }, { item: 'Force Staff', role: 'support' }],
  passive_break: [{ item: 'Silver Edge', role: 'core' }],
  summons: [{ item: 'Mjollnir', role: 'core' }],
  mana_burn: [{ item: 'Arcane Boots', role: 'support' }],
  pierce_bkb: [{ item: "Linken's Sphere", role: 'core', only: TARGETED_PIERCE }, { item: 'Lotus Orb', role: 'support', only: TARGETED_PIERCE }],
  lifesteal: [{ item: 'Eye of Skadi', role: 'core' }, { item: 'Spirit Vessel', role: 'support' }],
  push: [],
};

export const roleForPos = (pos: number): Role => (pos === 4 || pos === 5 ? 'support' : 'core');

export interface ItemAdvice { item: string; reasons: { tag: Threat; heroes: string[] }[]; weight: number }

/** 4–6 предметов против врагов: сначала те, что закрывают больше угроз. */
export function itemAdvice(enemies: string[], pos: number, limit = 6): ItemAdvice[] {
  const role = roleForPos(pos);
  const map = new Map<string, ItemAdvice & { order: number }>();
  let order = 0;
  for (const tag of Object.keys(COUNTERS) as Threat[]) {
    for (const c of COUNTERS[tag]) {
      order++;
      if (c.role !== 'any' && c.role !== role) continue;
      const heroes = enemies.filter(e => THREATS[e]?.includes(tag) && (!c.only || c.only.includes(e)));
      if (!heroes.length) continue;
      const cur = map.get(c.item) || { item: c.item, reasons: [], weight: 0, order };
      cur.reasons.push({ tag, heroes });
      cur.weight += heroes.length;
      map.set(c.item, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.weight - a.weight || a.order - b.order).slice(0, limit)
    .map(({ item, reasons, weight }) => ({ item, reasons, weight }));
}
