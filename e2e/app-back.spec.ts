import { expect, test } from '@playwright/test';

// Android-приложение: вкладки не копятся в истории, «Назад» — окно → главная → выход.
test.use({ userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36 DotaPickApp/1.0.6', viewport: { width: 412, height: 892 } });

test('приложение: «Назад» закрывает окно, потом ведёт на главную, потом выход', async ({ page }) => {
  await page.goto('/'); await page.waitForSelector('html[data-ready]');
  await expect(page.locator('html')).toHaveClass(/in-app/);
  const h0 = await page.evaluate(() => history.length);
  for (const t of ['counterpick', 'meta', 'match', 'about']) await page.locator(`.tabs-nav a[href="#${t}"]`).click();
  expect(await page.evaluate(() => history.length)).toBe(h0);
  await page.locator('.tabs-nav a[href="#counterpick"]').click();
  await page.locator('#slots-enemy .hlink').first().click();
  await expect(page.locator('#hero')).toHaveAttribute('open', '');
  expect(await page.evaluate(() => (window as unknown as { dpBack: () => boolean }).dpBack())).toBe(true);
  await expect(page.locator('#hero')).not.toHaveAttribute('open', '');
  expect(await page.evaluate(() => (window as unknown as { dpBack: () => boolean }).dpBack())).toBe(true);
  await expect(page.locator('body')).toHaveAttribute('data-tab', 'home');
  expect(await page.evaluate(() => (window as unknown as { dpBack: () => boolean }).dpBack())).toBe(false);
});
