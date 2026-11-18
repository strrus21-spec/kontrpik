import { expect, test } from '@playwright/test';

// Дневной / вечерний режим: по умолчанию как в системе, переключатель запоминает выбор.
test('режим: по системе, переключение и запоминание', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/#meta'); await page.waitForSelector('html[data-ready]');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const darkBg = await bg();
  await page.locator('#theme-btn').click();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect.poll(bg).not.toBe(darkBg);
  await expect(page.locator('#theme-btn')).toHaveAttribute('aria-label', /вечерн|evening/i);
  await page.reload(); await page.waitForSelector('html[data-ready]');
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.locator('#theme-btn').click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.goto('/#about'); await expect(page.locator('.ab-fine')).toContainText('Eran Fowler');   // автор картины — на «О сайте»
});
