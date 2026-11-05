import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('kontrpik-lang', 'ru')); });

test.describe('PWA', () => {
  test.use({ serviceWorkers: 'allow' });
test('PWA: манифест и иконки, офлайн на последних загруженных данных', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForSelector('html[data-ready]');
  const man = await (await page.request.get('/manifest.webmanifest')).json();
  expect(man.display).toBe('standalone');
  expect(man.icons.map((i: { sizes: string }) => i.sizes)).toEqual(['192x192', '512x512', '512x512']);
  for (const i of man.icons) expect((await page.request.get('/' + i.src)).ok()).toBe(true);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();                                   // теперь страницу контролирует SW, ресурсы в кэше
  await page.waitForSelector('html[data-ready]');
  await expect(page.locator('.podium .top')).toHaveCount(3);
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector('html[data-ready]');
  await expect(page.locator('.podium .top-name strong')).toHaveText(['Earth Spirit', 'Puck', 'Lifestealer']);
  await page.goto('/hero/pudge');                         // любые адреса приложения — из кэша
  await page.waitForSelector('html[data-ready]');
  await expect(page.locator('#hero-title')).toHaveText('Pudge');
  await context.setOffline(false);
});
});

test('Горячие клавиши: / поиск, 1–5 и 0 позиция, E/A/B режим (и в русской раскладке)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForSelector('html[data-ready]');
  await expect(page.locator('.kbd-hint')).toBeVisible();
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Digit1');
  await expect(page.locator('#poschips [data-pos="1"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('.podium .top-name strong').allTextContents()).toEqual(['Lifestealer', 'Ursa', 'Tiny']);
  await page.keyboard.press('Digit0');
  await expect(page.locator('#poschips [data-pos="0"]')).toHaveAttribute('aria-pressed', 'true');
  // русская раскладка: KeyA даёт «ф», но режим всё равно «Союзник»
  await page.dispatchEvent('body', 'keydown', { code: 'KeyA', key: 'ф', bubbles: true });
  await expect(page.locator('#m-ally')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('KeyB');
  await expect(page.locator('#m-ban')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('KeyE');
  await expect(page.locator('#m-enemy')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Slash');
  await expect(page.locator('#q')).toBeFocused();
  await page.keyboard.type('e1');                        // в поле ввода клавиши не перехватываются
  await expect(page.locator('#q')).toHaveValue('e1');
  await expect(page.locator('#m-enemy')).toHaveAttribute('aria-pressed', 'true');
});

for (const lang of ['ru', 'en']) {
  test(`Компактный режим на телефоне (${lang}): слоты врагов, поиск, топ-5 крупно; сохраняется`, async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 860 });
    await page.addInitScript(l => localStorage.setItem('kontrpik-lang', l), lang);
    await page.goto('/');
    await page.waitForSelector('html[data-ready]');
    await page.locator('#compact-toggle').click();
    await expect(page.locator('.team.radiant')).toBeHidden();
    await expect(page.locator('.results').first()).toBeHidden();
    await expect(page.locator('#tips-block')).toBeHidden();
    await expect(page.locator('.team.dire')).toBeVisible();
    await expect(page.locator('#pool .hero')).toHaveCount(0);
    const top = page.locator('.c-pick');
    await expect(top).toHaveCount(5);
    await expect(top.first().locator('.c-name')).toHaveText('Earth Spirit');
    expect((await top.first().boundingBox())!.height).toBeGreaterThanOrEqual(48);
    await page.fill('#q', 'Sven');
    await page.locator('#pool .hero', { hasText: /^Sven$/ }).click();
    await expect(page.locator('#slots-enemy .slot:not(.empty) .sname').last()).toHaveText('Sven');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(400);
    await page.screenshot({ path: `test-results/shots/compact-${lang}-400.png`, fullPage: true });
    await top.first().click();
    await expect(page.locator('#hero')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.reload();
    await page.waitForSelector('html[data-ready]');
    await expect(page.locator('.c-pick')).toHaveCount(5);
    await page.locator('#compact-toggle').click();
    await expect(page.locator('.team.radiant')).toBeVisible();
    await expect(page.locator('#compact-top')).toBeHidden();
  });
}
