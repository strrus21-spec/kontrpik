// Ежедневная выгрузка данных: node scripts/build-data.ts [--positions] [--out public]
// При любой ошибке выходит с кодом 1 и ничего не перезаписывает — сайт остаётся на вчерашних данных.
import { build, openDotaApi } from './lib/build.ts';
import { steamCollect, steamFallback, steamWebApi } from './lib/steam.ts';

const args = process.argv.slice(2);
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'public';
const t0 = Date.now();
try {
  if (args.includes('--steam')) throw new Error('принудительно запасной путь (--steam)');
  const { stats, positionsUpdated, itemsUpdated } = await build({
    api: openDotaApi(),
    root: out,
    positions: args.includes('--positions') ? true : undefined,
    items: args.includes('--items') ? true : undefined,
    log: m => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`),
  });
  console.log(`OK: ${stats.counts.all} матчей; позиции ${positionsUpdated ? 'обновлены' : 'без изменений'}; сборки ${itemsUpdated ? 'обновлены' : 'без изменений'}; ${((Date.now() - t0) / 60000).toFixed(1)} мин`);
} catch (e) {
  console.error('OpenDota: сборка данных не удалась:', (e as Error).message);
  // Запасной путь: паблики из накопленных за неделю матчей Steam, группы рангов — по снимку OpenDota.
  try {
    const st = await steamFallback({ root: out, log: m => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`) });
    console.log(`OK (Steam): ${st.counts.all} матчей`);
  } catch (e2) {
    console.error('Steam: запасная сборка не удалась:', (e2 as Error).message, '— данные остаются вчерашними.');
    process.exit(1);
  }
}
