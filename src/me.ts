// «Мои герои»: профиль, звёздочки, режим «Только мои герои». Хранится в localStorage.
import { t } from './i18n.ts';
import { fetchPlayer, parseSteamId, personalBonus, poolNames, rankLabel, type MyHero, type Player } from './player.ts';
import type { Hero } from './types.ts';
import { odHeroes } from './odHeroes.ts';
import { $, esc, sign } from './render/html.ts';

const KEY = 'kontrpik-me';
interface Saved { player: Player | null; stars: string[]; only: boolean; input: string }

export const me = { player: null as Player | null, stars: new Set<string>(), only: false, input: '', busy: false, error: '' };

export function loadMe() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null') as Saved | null;
    if (v) { me.player = v.player || null; me.stars = new Set(v.stars || []); me.only = !!v.only; me.input = v.input || ''; }
  } catch { /* ignore */ }
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ player: me.player, stars: [...me.stars], only: me.only, input: me.input } satisfies Saved)); } catch { /* ignore */ } };

export const pool = () => poolNames(me.player, me.stars);
export const myHero = (name: string): MyHero | undefined => me.player?.heroes.find(h => h.name === name);
export function toggleStar(name: string) { if (me.stars.has(name)) me.stars.delete(name); else me.stars.add(name); save(); }
/** Бонус к счёту в режиме «Только мои герои». */
export const bonusFor = (name: string) => { const h = myHero(name); return h ? personalBonus(h.games, h.win) : 0; };

/** Строка под героем: «у тебя N игр, винрейт X% · +1.2 за личный винрейт». */
export function mineLine(name: string): string {
  const h = myHero(name), L = t();
  if (!h) return me.stars.has(name) ? L.meStar : '';
  let s = L.meGames(h.games, Math.round(h.win / h.games * 100));
  const b = personalBonus(h.games, h.win);
  if (me.only && b > 0.05) s += ' · ' + L.meBonus(sign(b));
  return s;
}

/** hero_id OpenDota → имя. Берём из данных; если в данных нет id — справочник OpenDota. */
function heroResolver(heroes: Hero[]) {
  const byId = new Map(heroes.filter(h => h.odId).map(h => [h.odId!, h.name]));
  return async (id: number) => {
    if (byId.has(id)) return byId.get(id);
    try { return (await odHeroes()).get(id)?.name; } catch { return undefined; }
  };
}

export function renderMe() {
  const box = $('me'), L = t(), p = me.player;
  const err = me.error ? `<p class="me-err" role="alert">${esc(me.error)}</p>` : '';
  let body: string;
  if (p) {
    const rank = rankLabel(p.rank, p.leaderboard, L.medals) || L.meNoRank;
    const top = p.heroes.slice(0, 6).map(h => `<span class="me-hero">${esc(h.name)} <b>${h.games}</b></span>`).join('');
    body = `<div class="me-prof">${p.avatar ? `<img class="me-ava" src="${esc(p.avatar)}" alt="" width="40" height="40" referrerpolicy="no-referrer">` : ''}
      <div class="me-who"><strong>${esc(p.name)}</strong><span>${esc(rank)}</span></div>
      <button class="clear" data-me="change">${L.meChange}</button></div>
      <div class="me-top">${top}</div>`;
  } else {
    body = `<form class="me-form" data-me="form"><input id="me-id" type="text" inputmode="text" autocomplete="off" spellcheck="false" value="${esc(me.input)}" placeholder="${esc(L.st.meInput)}" aria-label="${esc(L.st.meInput)}">
      <button type="submit" class="me-go" ${me.busy ? 'disabled' : ''}>${me.busy ? L.meLoading : L.meLoad}</button></form>
      <p class="bans-note">${L.meHint}</p>`;
  }
  const n = pool().size;
  box.innerHTML = `<div class="bans-head"><h3>${L.meH}</h3><span>${L.meS}</span></div>${body}${err}
    <label class="me-only"><input type="checkbox" id="me-only" ${me.only ? 'checked' : ''}> <span>${L.meOnly}</span></label>
    ${n ? `<p class="bans-note">${L.mePool(n)}</p>` : ''}`;
}

export function bindMe(heroes: Hero[], onChange: () => void) {
  const resolve = heroResolver(heroes);
  const box = $('me');
  box.addEventListener('submit', async e => {
    e.preventDefault();
    const input = ($('me-id') as HTMLInputElement).value;
    me.input = input; me.error = '';
    const id = parseSteamId(input), L = t();
    if (!id.ok) { me.error = id.reason === 'vanity' ? L.meVanity : L.meBad; save(); renderMe(); return; }
    me.busy = true; renderMe();
    const r = await fetchPlayer(id.id, resolve);
    me.busy = false;
    if (r.ok) { me.player = r.player; me.only = true; }
    else me.error = r.reason === 'closed' ? L.meClosed : r.reason === 'notFound' ? L.meNotFound : L.meNet;
    save(); renderMe(); onChange();
  });
  box.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-me="change"]'); if (!b) return;
    e.stopPropagation();
    me.player = null; me.error = ''; save(); renderMe(); onChange();
    ($('me-id') as HTMLInputElement | null)?.focus();
  });
  box.addEventListener('change', e => {
    if ((e.target as HTMLElement).id !== 'me-id' && (e.target as HTMLInputElement).id === 'me-only') {
      me.only = (e.target as HTMLInputElement).checked; save(); onChange();
    }
  });
  box.addEventListener('input', e => { if ((e.target as HTMLElement).id === 'me-id') me.input = (e.target as HTMLInputElement).value; });
}
