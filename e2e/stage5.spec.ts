import { expect, test } from '@playwright/test';
import { mockOD } from './fixtures.ts';

test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('kontrpik-lang', 'ru')); });

test('Разобранный матч по ссылке Dotabuff: выбор игрока, 3–6 выводов, «поделиться»', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await mockOD(page);
  await page.goto('/#match');
  await page.waitForSelector('html[data-ready]');
  await page.fill('#match-id', 'https://www.dotabuff.com/matches/8000000002');
  await page.locator('#match-form .me-go').click();
  await expect(page.locator('#match-out')).toContainText('Чей разбор показать?');
  await expect(page.locator('[data-pslot]')).toHaveCount(10);
  await page.locator('[data-pslot="0"]').click();
  await expect(page.locator('.m-title strong')).toHaveText('Разбор за Juggernaut');
  await expect(page.locator('.m-head')).toContainText('Поражение');
  const items = page.locator('.m-ins li');
  expect(await items.count()).toBeGreaterThanOrEqual(3);
  expect(await items.count()).toBeLessThanOrEqual(6);
  await expect(items.first()).toHaveClass(/t-bad/);
  await expect(page.locator('.m-ins')).toContainText('К 10-й минуте 27 добиваний');
  await expect(page.locator('.m-ins')).toContainText('8 смертей, из них 1 до 10-й минуты; 6 — вне командных драк.');
  await expect(page.locator('.m-ins')).toContainText('2 600 золота потеряно на смертях');
  await expect(page).toHaveURL(/\/match\/8000000002\?p=0$/);
  await page.locator('[data-mshare]').click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toMatch(/\/match\/8000000002\?p=0$/);

  // ссылка открывает тот же разбор
  const p2 = await context.newPage();
  await mockOD(p2);
  await p2.goto(url);
  await p2.waitForSelector('html[data-ready]');
  await expect(p2.locator('.m-title strong')).toHaveText('Разбор за Juggernaut');
});

test('Неразобранный матч: очередь, прогресс, затем результат', async ({ page }) => {
  await mockOD(page, 'queue');
  await page.clock.install();
  await page.goto('/#match');
  await page.waitForSelector('html[data-ready]');
  await page.fill('#match-id', '8000000001');
  await page.locator('#match-form .me-go').click();
  await expect(page.locator('#match-status')).toHaveText('Загружаю матч…');
  await page.clock.runFor(5100);
  await expect(page.locator('#match-status')).toContainText('Матч обрабатывается, обычно 1–3 минуты. Прошло 0:05.');
  await page.clock.runFor(5100);
  await expect(page.locator('#match-out')).toContainText('Чей разбор показать?');
  await expect(page.locator('#match-status')).toBeHidden();
});

test('Мои последние игры (из профиля) и мой герой выбирается сам', async ({ page }) => {
  await mockOD(page);
  await page.goto('/#match');
  await page.waitForSelector('html[data-ready]');
  await page.locator('#match-recent').click();
  await expect(page.locator('#match-status')).toContainText('загрузи профиль');
  await page.fill('#me-id', '86745912'); await page.click('.me-go');
  await expect(page.locator('.me-who strong')).toHaveText('FINIK');
  await page.locator('#match-recent').click();
  await expect(page.locator('.m-recent [data-mid]')).toHaveCount(2);
  await page.locator('.m-recent [data-mid="8000000002"]').click();
  await expect(page.locator('.m-title strong')).toHaveText('Разбор за Juggernaut');
  await expect(page.locator('.m-title .roles')).toContainText('FINIK');
});

test('Ошибки: неверный номер и несуществующий матч', async ({ page }) => {
  await mockOD(page);
  await page.goto('/#match');
  await page.waitForSelector('html[data-ready]');
  await page.fill('#match-id', 'abc'); await page.locator('#match-form .me-go').click();
  await expect(page.locator('#match-status')).toContainText('Не понимаю номер матча');
  await page.fill('#match-id', 'https://www.opendota.com/matches/404000'); await page.locator('#match-form .me-go').click();
  await expect(page.locator('#match-status')).toHaveText('Матч не найден. Проверь номер.');
});

for (const width of [400, 1440]) for (const lang of ['ru', 'en']) {
  test(`разбор без горизонтальной прокрутки: ${lang} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(l => localStorage.setItem('kontrpik-lang', l), lang);
    await mockOD(page);
    await page.goto('/match/8000000002?p=0');
    await page.waitForSelector('html[data-ready]');
    await expect(page.locator('.m-ins li').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.locator('#match').screenshot({ path: `test-results/shots/match-${lang}-${width}.png` });
  });
}
