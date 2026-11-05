import { defineConfig, type Plugin } from 'vitest/config';
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

// GitHub Pages отдаёт 404.html на неизвестные пути: копия index.html делает рабочими прямые ссылки /hero/pudge.
const spaFallback = (): Plugin => ({
  name: 'spa-404',
  apply: 'build',
  closeBundle() { copyFileSync(join('dist', 'index.html'), join('dist', '404.html')); },
});

export default defineConfig({
  // Абсолютный base нужен для адресов /hero/… . В деплое задаётся путь сайта (например /kontrpik/).
  base: process.env.VITE_BASE || '/',
  plugins: [spaFallback()],
  build: { target: 'es2022', assetsInlineLimit: 0 },
  test: { include: ['tests/**/*.test.ts'] },
});
