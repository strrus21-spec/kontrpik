// Ежедневная выгрузка данных: node scripts/build-data.ts [--positions] [--out public]
// При любой ошибке выходит с кодом 1 и ничего не перезаписывает — сайт остаётся на вчерашних данных.
import { build, openDotaApi } from './lib/build.ts';

const args = process.argv.slice(2);
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'public';
const t0 = Date.now();
try {
  const { stats, positionsUpdated } = await build({
    api: openDotaApi(),
    root: out,
    positions: args.includes('--positions') ? true : undefined,
    log: m => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`),
  });
  console.log(`OK: ${stats.counts.all} матчей; позиции ${positionsUpdated ? 'обновлены' : 'без изменений'}; ${((Date.now() - t0) / 60000).toFixed(1)} мин`);
} catch (e) {
  console.error('Сборка данных не удалась:', (e as Error).message);
  process.exit(1);
}
