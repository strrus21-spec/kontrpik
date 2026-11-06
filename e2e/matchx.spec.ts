import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Расширенный разбор на реальном (урезанном) матче: все секции на месте, без ошибок и горизонтальной прокрутки.
const fx = readFileSync(new URL('../tests/fixtures/match-9076499476.json', import.meta.url), 'utf8');
const heroes = JSON.parse(fx).players.map((p: { hero_id: number }) => ({ id: p.hero_id, localized_name: `H${p.hero_id}`, name: `npc_dota_hero_h${p.hero_id}` }));

for (const w of [400, 1440]) test(`расширенный разбор матча: ${w}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 900 });
  await page.addInitScript(() => localStorage.setItem('kontrpik-lang', 'ru'));
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.route('**/api.opendota.com/**', r => {
    const u = r.request().url();
    if (u.endsWith('/api/heroes')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(heroes) });
    if (u.includes('/matches/9076499476')) return r.fulfill({ contentType: 'application/json', body: fx });
    return r.fulfill({ status: 503, body: '{}' });
  });
  await page.goto('/match/9076499476?p=0');
  await page.waitForSelector('.mx-tips');
  for (const s of ['.m-smart li', '.m-base li', '.chart', '.sc-grid', '.mx-items li', '.mmap', '[data-mcard]']) await expect(page.locator(s).first()).toBeVisible();
  await expect(page.locator('.m-smart')).toContainText('4 смерти за 8 минут: с 18:11 по 24:22.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
  // прилипающая полоска: скрыта вверху, видна в середине разбора, переключает игрока без прыжка
  await expect(page.locator('#m-stick')).not.toHaveClass(/on/);
  await page.locator('.mx-items').scrollIntoViewIfNeeded(); await page.evaluate(() => scrollBy(0, 300));
  await expect(page.locator('#m-stick')).toHaveClass(/on/);
  await page.locator('#m-stick button[data-pslot="132"]').click();
  await expect(page).toHaveURL(/\?p=132$/);
  await expect(page.locator('#m-stick button.on')).toHaveAttribute('data-pslot', '132');
  // клик по герою в таблице команд — разбор за него и возврат к началу
  await page.locator('.mx-team .th-pick').first().click();
  await expect(page.locator('#m-stick')).not.toHaveClass(/on/);
  await expect(page.locator('.m-head')).toBeInViewport();
  expect(errs).toEqual([]);
});
