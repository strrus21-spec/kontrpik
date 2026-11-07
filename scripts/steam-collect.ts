// Ночная порция матчей Steam в запас (data/steam/), на случай если OpenDota упадёт.
// node scripts/steam-collect.ts [--out public]. Ошибка не мешает остальному обновлению.
import { steamCollect, steamWebApi } from './lib/steam.ts';

const args = process.argv.slice(2);
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'public';
const key = process.env.STEAM_API_KEY || '', t0 = Date.now();
if (!/^[A-F0-9]{32}$/i.test(key)) { console.log('STEAM_API_KEY не задан — пропускаю.'); process.exit(0); }
try {
  await steamCollect({ api: steamWebApi(key), root: out, log: m => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`) });
} catch (e) {
  console.error('Steam: порция не собрана:', (e as Error).message);
  process.exit(1);
}
