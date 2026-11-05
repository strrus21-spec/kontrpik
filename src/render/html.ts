export const esc = (s: unknown) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
export const sign = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(1);
export const fmt = (n: number) => n.toLocaleString('ru-RU');
export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
