// Один файл kontrpik.html, который открывается двойным щелчком (file://), без сервера.
// Внутри: код, стили, шрифты (woff2), иконки героев и данные. Запуск: npm run standalone
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'dist-standalone';
execSync(`npx vite build --outDir ${OUT} --emptyOutDir`, { stdio: 'inherit', env: { ...process.env, STANDALONE: '1', VITE_BASE: './' } });

const read = (p: string) => readFileSync(join(OUT, p));
const dataUri = (p: string, mime: string) => `data:${mime};base64,${read(p).toString('base64')}`;
let html = readFileSync(join(OUT, 'index.html'), 'utf8');

// CSS: шрифты → data URI (только woff2, запасные .woff убираем)
html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/g, (_, p: string) => {
  let css = read(p).toString('utf8');
  css = css.replace(/,\s*url\(\.\/[^)]+\.woff\)\s*format\("woff"\)/g, '');
  css = css.replace(/url\(\.\/([^)]+\.woff2)\)/g, (_m, f: string) => `url(${dataUri('assets/' + f, 'font/woff2')})`);
  css = css.replace(/url\(\.\/([^)]+\.svg)\)/g, (_m, f: string) => `url(${dataUri('assets/' + f, 'image/svg+xml')})`);
  css = css.replace(/url\(\.\/([^)]+\.jpe?g)\)/g, (_m, f: string) => `url(${dataUri('assets/' + f, 'image/jpeg')})`);
  return `<style>${css}</style>`;
});
// JS: модуль целиком в страницу
const scripts: string[] = [];
html = html.replace(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/g, (_, p: string) => {
  scripts.push(read(p).toString('utf8').replace(/<\/script/gi, '<\\/script'));
  return '';
});
html = html.replace(/<link rel="modulepreload"[^>]*>/g, '').replace(/<link rel="manifest"[^>]*>/g, '');
// Иконки страницы
html = html.replace(/href="\.\/icon\.svg"/, `href="${dataUri('icon.svg', 'image/svg+xml')}"`)
  .replace(/href="\.\/favicon\.png"/, `href="${dataUri('favicon.png', 'image/png')}"`)
  .replace(/href="\.\/apple-touch-icon\.png"/, `href="${dataUri('apple-touch-icon.png', 'image/png')}"`);

// Данные: иконки героев → data URI
const stats = JSON.parse(read('data/stats.json').toString('utf8'));
for (const h of stats.heroes) h[3] = dataUri(h[3], 'image/png');
const data = { stats, positions: JSON.parse(read('data/positions.json').toString()), tips: JSON.parse(read('data/tips.json').toString()), patch: JSON.parse(read('data/patch.json').toString()), items: (() => { try { return JSON.parse(read('data/items.json').toString()); } catch { return undefined; } })() };
const json = JSON.stringify(data).replace(/</g, '\\u003c');

html = html.replace('</head>', `<script>window.__KP_DATA__=${json};</script>\n</head>`)
  .replace('</body>', scripts.map(s => `<script type="module">${s}</script>`).join('\n') + '\n</body>');

const left = html.match(/(?:src|href)="\.\/[^"]+"/g);
if (left) throw new Error('Не вшиты: ' + left.join(', '));
const target = process.argv[2] || 'kontrpik.html';
writeFileSync(target, html);
console.log(`${target}: ${(html.length / 1024 / 1024).toFixed(1)} МБ, файлов ассетов: ${readdirSync(join(OUT, 'assets')).length}`);
