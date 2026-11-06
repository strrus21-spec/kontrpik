import { defineConfig, type Plugin } from 'vitest/config';
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

// GitHub Pages отдаёт 404.html на неизвестные пути: копия index.html делает рабочими прямые ссылки /hero/pudge.
// Полный адрес сайта для превью ссылок (og:image должен быть абсолютным). В деплое задаётся из GitHub Pages.
const SITE_URL = (process.env.VITE_SITE_URL || 'https://strrus21-spec.github.io/kontrpik/').replace(/\/?$/, '/');
const siteUrl = (): Plugin => ({ name: 'site-url', transformIndexHtml: html => html.replaceAll('%SITE_URL%', SITE_URL) });
// Счётчик посетителей Cloudflare Web Analytics: без cookie и без регистрации посетителей.
// Включается, только если при сборке задан токен (переменная CF_BEACON_TOKEN в настройках GitHub).
const CF_BEACON = (process.env.VITE_CF_BEACON || '').trim();
const analytics = (): Plugin => ({
  name: 'analytics',
  // оверлей для OBS не считаем: он открыт часами и исказил бы статистику
  transformIndexHtml: (html, ctx) => !/^[a-f0-9]{32}$/i.test(CF_BEACON) || process.env.STANDALONE || /overlay/.test(ctx.filename) ? html
    : html.replace('</body>', `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${CF_BEACON}"}'></script>\n</body>`),
});

const spaFallback = (): Plugin => ({
  name: 'spa-404',
  apply: 'build',
  closeBundle() { copyFileSync(join('dist', 'index.html'), join('dist', '404.html')); },
});

export default defineConfig({
  // Абсолютный base нужен для адресов /hero/… . В деплое задаётся путь сайта (например /kontrpik/).
  base: process.env.VITE_BASE || '/',
  plugins: process.env.STANDALONE ? [siteUrl()] : [siteUrl(), analytics(), spaFallback()],
  build: { target: 'es2022', assetsInlineLimit: 0, rollupOptions: { input: process.env.STANDALONE ? { main: 'index.html' } : { main: 'index.html', overlay: 'overlay/index.html', vote: 'vote/index.html' } } },
  test: { include: ['tests/**/*.test.ts'] },
});
