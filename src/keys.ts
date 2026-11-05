// Горячие клавиши на ПК: / — поиск, 1–5 — позиция, 0 — любая, E/A/B — режим. По e.code: работают и в русской раскладке.
export interface KeyActions { search(): void; pos(p: number): void; mode(m: 'enemy' | 'ally' | 'ban'): void }

export function keyAction(e: Pick<KeyboardEvent, 'code' | 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>, target: EventTarget | null): ['search'] | ['pos', number] | ['mode', 'enemy' | 'ally' | 'ban'] | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  const el = target as HTMLElement | null;
  if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return null;
  if (e.code === 'Slash' || e.key === '/') return ['search'];
  const d = e.code.match(/^(?:Digit|Numpad)([0-5])$/);
  if (d) return ['pos', Number(d[1])];
  if (e.code === 'KeyE') return ['mode', 'enemy'];
  if (e.code === 'KeyA') return ['mode', 'ally'];
  if (e.code === 'KeyB') return ['mode', 'ban'];
  return null;
}

export function bindKeys(a: KeyActions) {
  document.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]')) return;
    const act = keyAction(e, e.target);
    if (!act) return;
    e.preventDefault();
    if (act[0] === 'search') a.search();
    else if (act[0] === 'pos') a.pos(act[1]);
    else a.mode(act[1]);
  });
}
