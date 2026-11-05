import { expect, test, type Page } from '@playwright/test';

const errors = (page: Page) => {
  const list: string[] = [];
  page.on('pageerror', e => list.push(e.message));
  page.on('console', m => { if (m.type() === 'error') list.push(m.text()); });
  return list;
};
const topNames = (page: Page) => page.locator('.podium .top-name strong').allTextContents();

// Иконки способностей и предметов грузятся с сервера Valve; в тестах — подставная картинка 1×1.
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
test.beforeEach(async ({ page }) => { await page.route('https://cdn.cloudflare.steamstatic.com/**', r => r.fulfill({ body: PNG1, contentType: 'image/png' })); });

for (const lang of ['ru', 'en'] as const) {
  for (const width of [1440, 400]) {
    test(`${lang} ${width}px: пример пика, контрольный топ-3, без горизонтальной прокрутки`, async ({ page }) => {
      const errs = errors(page);
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(l => localStorage.setItem('kontrpik-lang', l), lang);
      await page.goto('/');
      await page.waitForSelector('html[data-ready]');
      await expect(page.locator('.podium .top')).toHaveCount(3);
      expect(await topNames(page)).toEqual(['Earth Spirit', 'Puck', 'Lifestealer']);
      await expect(page.locator('#exampleTag')).toBeVisible();
      await expect(page.locator('#slots-enemy .slot:not(.empty)')).toHaveCount(5);
      await expect(page.locator('.slot.you .sname')).toHaveText('Earth Spirit?');
      await expect(page.locator('#tips .tip')).toHaveCount(30);
      await expect(page.locator('h1')).toContainText(lang === 'ru' ? 'помощник' : 'helper');
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({ path: `test-results/shots/${lang}-${width}.png`, fullPage: true });
      expect(errs).toEqual([]);
    });
  }
}

test('позиция, источник, бан, союзник, «Беру его»', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kontrpik-lang', 'ru'));
  await page.goto('/');
  await page.waitForSelector('html[data-ready]');
  await page.locator('#poschips [data-pos="1"]').click();
  expect(await topNames(page)).toEqual(['Lifestealer', 'Ursa', 'Tiny']);
  await page.locator('#poschips [data-pos="5"]').click();
  expect(await topNames(page)).toEqual(['Phoenix', 'Disruptor', 'Bane']);
  await page.locator('#poschips [data-pos="0"]').click();

  await page.locator('.podium [data-take]').first().click();
  await expect(page.locator('#slots-ally .slot:not(.empty):not(.you) .sname')).toHaveText(['Earth Spirit']);
  await expect(page.locator('#bans .ban-chip')).toHaveCount(5);
  await page.locator('#bans .ban-chip').first().click();
  await expect(page.locator('#slots-ban .slot:not(.empty)')).toHaveCount(1);

  await page.locator('#src').selectOption('pro');
  await expect(page.locator('.podium .top .bars-label', { hasText: 'С союзниками' })).toHaveCount(0);
  await expect(page.locator('#note')).toContainText('Про-сцена');
});

test('пул: режимы и поиск по прозвищу', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('html[data-ready]');
  await page.locator('[data-clear="enemy"]').click();
  await expect(page.locator('#exampleTag')).toBeHidden();
  await page.locator('#q').fill('квопа');
  await expect(page.locator('#pool .hero')).toHaveText(['Queen of Pain']);
  await page.locator('#pool .hero').click();
  await expect(page.locator('#slots-enemy .sname').first()).toHaveText('Queen of Pain');
  await page.locator('#m-ally').click();
  await page.locator('#q').fill('пудж');
  await page.locator('#pool .hero').click();
  await expect(page.locator('#pool .hero.is-ally')).toHaveCount(1);
  await page.locator('#q').fill('zzzz');
  await expect(page.locator('#pool .empty-state')).toBeVisible();
});

test('драфт, язык и изученные фишки сохраняются после перезагрузки; драфт хранится по именам', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('html[data-ready]');
  await page.locator('.lang [data-lang="en"]').click();
  await expect(page.locator('h1')).toContainText('helper');
  await page.locator('[data-clear="enemy"]').click();
  await page.locator('#q').fill('Axe');
  await page.locator('#pool .hero', { hasText: /^Axe$/ }).click();
  await page.locator('.nav a[href="#tips-block"]').click(); await page.locator('#tips [data-known="0"]').click();
  await expect(page.locator('#prog-text')).toHaveText('Learned 1 of 30');

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('kontrpik-draft')!));
  expect(stored.enemy).toEqual(['Axe']);

  await page.reload();
  await page.waitForSelector('html[data-ready]');
  await expect(page.locator('h1')).toContainText('helper');
  await expect(page.locator('#slots-enemy .slot:not(.empty) .sname')).toHaveText(['Axe']);
  await expect(page.locator('#prog-text')).toHaveText('Learned 1 of 30');
});

test('драфт из прототипа (индексы) переносится', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('kontrpik-draft')) localStorage.setItem('counterpick2', JSON.stringify({ enemy: [0, 5], ally: [], ban: [], mode: 'ally', src: 'high', pos: 2 }));
  });
  await page.goto('/');
  await page.waitForSelector('html[data-ready]');
  await expect(page.locator('#slots-enemy .slot:not(.empty) .sname')).toHaveText(['Abaddon', 'Axe']);
  await expect(page.locator('#src')).toHaveValue('high');
  await expect(page.locator('#m-ally')).toHaveAttribute('aria-pressed', 'true');
});

test('анимации рисуются, фишки против пика показаны', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('html[data-ready]');
  await expect(page.locator('#vs-tips .vt')).toHaveCount(2);
  // Иконки с CDN Valve делают canvas «чужим» для getImageData, поэтому сравниваем два снимка: анимация идёт.
  await page.locator('.nav a[href="#tips-block"]').click(); 
  const cv = page.locator('#featured canvas');
  await cv.scrollIntoViewIfNeeded();
  const a = await cv.screenshot();
  await page.waitForTimeout(600);
  const b = await cv.screenshot();
  expect(a.length).toBeGreaterThan(5000);
  expect(a.equals(b)).toBe(false);
});

test('Вкладки: один раздел на экране, адрес #вкладки, «назад», запоминание', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('html[data-ready]');
  const visible = async () => (await Promise.all(['counterpick', 'meta', 'match', 'tips-block'].map(async id => [id, await page.locator('#' + id).isVisible()] as const))).filter(x => x[1]).map(x => x[0]);
  await expect.poll(visible).toEqual(['counterpick']);
  await expect(page.locator('.nav a[href="#counterpick"]')).toHaveAttribute('aria-current', 'page');
  await page.locator('.nav a[href="#meta"]').click();
  await expect.poll(visible).toEqual(['meta']);
  await expect(page).toHaveURL(/#meta$/);
  await page.locator('.nav a[href="#tips-block"]').click();
  await expect.poll(visible).toEqual(['tips-block']);
  await page.goBack();
  await expect.poll(visible).toEqual(['meta']);
  await page.reload(); await page.waitForSelector('html[data-ready]');
  await expect.poll(visible).toEqual(['meta']);
  // «Все фишки» под рекомендациями открывает вкладку фишек
  await page.locator('.nav a[href="#counterpick"]').click();
  await page.locator('#vs-tips .vt-more').click();
  await expect.poll(visible).toEqual(['tips-block']);
});
