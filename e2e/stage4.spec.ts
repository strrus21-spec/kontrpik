import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const stats = JSON.parse(readFileSync('public/data/stats.json', 'utf8'));
const names: string[] = stats.heroes.map((h: unknown[]) => h[0]);
const snap = (date: string, k: number) => ({
  date, heroes: names,
  solo: Object.fromEntries((['all', 'low', 'mid', 'high'] as const).map(g => [g, stats.pub[g].solo.map((v: number, i: number) => i % 2 ? Math.round(v * k) : v)]).concat([['pro', stats.pro.solo]])),
});
async function mockHistory(page: Page) {
  await page.route('**/data/history/index.json', r => r.fulfill({ json: ['2026-10-29', '2026-11-01', '2026-11-05'] }));
  await page.route('**/data/history/2026-11-05.json', r => r.fulfill({ json: snap('2026-11-05', 1) }));
  await page.route('**/data/history/2026-10-29.json', r => r.fulfill({ json: snap('2026-10-29', 0.98) }));
}

test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('kontrpik-lang', 'ru')); });

test('Тир-лист: тиры, 30 строк и «показать всех», сортировка, поиск, позиция', async ({ page }) => {
  await page.goto('/#meta');
  const rows = page.locator('.tier-table tbody tr');
  await expect(rows).toHaveCount(30);
  await expect(rows.first().locator('.tier')).toHaveText('S');
  await page.locator('[data-mall]').click();
  await expect(rows).toHaveCount(127);
  await expect(rows.last().locator('.tier')).toHaveText('C');
  await page.locator('[data-msort="pick"]').click();
  await expect(rows.first().locator('.hlink')).toHaveText('Pudge');
  await expect(page.locator('th[aria-sort="descending"]')).toContainText('Пики');
  await page.locator('[data-msort="name"]').click();
  await expect(rows.first().locator('.hlink')).toHaveText('Abaddon');
  await page.fill('#meta-q', 'фантомка');
  await expect(rows).toHaveCount(1);
  await page.fill('#meta-q', '');
  await page.locator('#meta-pos [data-mpos="5"]').click();
  await expect(page.locator('.tier-table .hlink', { hasText: 'Anti-Mage' })).toHaveCount(0);
  await page.locator('#meta-src').selectOption('pro');
  await page.reload();
  await expect(page.locator('#meta-src')).toHaveValue('pro');
  await expect(page.locator('#meta-pos [data-mpos="5"]')).toHaveAttribute('aria-pressed', 'true');
});

test('Без истории — понятная пометка; с историей — ▲ и дата', async ({ page }) => {
  await page.goto('/#meta');
  await expect(page.locator('#meta-note')).toContainText('появится, когда накопится 7 дней');
  await expect(page.locator('.tier-table .tr-none').first()).toHaveText('—');
  await mockHistory(page);
  await page.reload();
  await expect(page.locator('#meta-note')).toContainText('изменение винрейта с 29 октября 2026');
  await expect(page.locator('.tier-table .tr-up').first()).toBeVisible();
});

test('Патч: 6 пунктов и ссылка на официальные заметки, в обоих языках', async ({ page }) => {
  await page.goto('/#meta');
  await expect(page.locator('#patch h2')).toHaveText('Что изменилось в патче 7.41');
  await expect(page.locator('#patch li')).toHaveCount(6);
  await expect(page.locator('#patch a')).toHaveAttribute('href', 'https://www.dota2.com/patches/7.41');
  await page.locator('.lang [data-lang="en"]').click();
  await expect(page.locator('#patch h2')).toHaveText('What changed in patch 7.41');
  await expect(page.locator('#patch li').first()).toHaveText('Facets are removed from the game.');
});

test('Клик по герою в тир-листе открывает карточку', async ({ page }) => {
  await page.goto('/#meta');
  const first = page.locator('.tier-table .hlink').first();
  const name = await first.textContent();
  await first.click();
  await expect(page.locator('#hero-title')).toHaveText(name!);
});

for (const width of [400, 1440]) for (const lang of ['ru', 'en']) {
  test(`мета без горизонтальной прокрутки: ${lang} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(l => localStorage.setItem('kontrpik-lang', l), lang);
    await mockHistory(page);
    await page.goto('/#meta');
    await expect(page.locator('.tier-table .tr-up').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.locator('#meta').screenshot({ path: `test-results/shots/meta-${lang}-${width}.png` });
  });
}
