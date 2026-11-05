// Одноразово: иконки героев из base64 в stats.json → public/icons/{slug}.png
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { slug } from '../src/slug.ts';

const file = 'public/data/stats.json';
const data = JSON.parse(readFileSync(file, 'utf8'));
mkdirSync('public/icons', { recursive: true });
let n = 0;
for (const h of data.heroes) {
  const img: string = h[3] || '';
  const m = img.match(/^data:image\/png;base64,(.+)$/);
  const path = `icons/${slug(h[0])}.png`;
  if (m) { writeFileSync('public/' + path, Buffer.from(m[1], 'base64')); n++; }
  h[3] = path;
}
writeFileSync(file, JSON.stringify(data));
console.log(`icons: ${n}, heroes: ${data.heroes.length}`);
