// Безопасная смена адреса: в файле, открытом с диска (file://), браузер может запретить pushState.
export const standalone = location.protocol === 'file:';
export function pushUrl(state: unknown, url: string): boolean {
  if (standalone) return false;
  try { history.pushState(state, '', url); return true; } catch { return false; }
}
export function replaceUrl(state: unknown, url: string) {
  if (standalone) return;
  try { history.replaceState(state, '', url); } catch { /* ignore */ }
}
