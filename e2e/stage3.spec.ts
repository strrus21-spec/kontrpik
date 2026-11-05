import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('kontrpik-lang', 'ru')); });

test('Карточка героя: из слота, содержимое, адрес /hero/…, закрытие и «назад»', async ({ page }) => {
  await page.goto('/#counterpick');
  await page.waitForSelector('html[data-ready]');
  await page.locator('#slots-enemy .hlink', { hasText: 'Pudge' }).click();
  const dlg = page.locator('#hero');
  await expect(dlg).toBeVisible();
  await expect(page).toHaveURL(/\/hero\/pudge$/);
  await expect(page.locator('#hero-title')).toHaveText('Pudge');
  await expect(dlg.locator('section', { hasText: 'Кого он контрит' }).locator('.bar-row')).toHaveCount(8);
  await expect(dlg.locator('section', { hasText: 'Кто контрит его' }).locator('.bar-row')).toHaveCount(8);
  await expect(dlg.locator('section', { hasText: 'С кем лучше всего' }).locator('.bar-row')).toHaveCount(5);
  await expect(dlg.locator('.hd-posrow')).toHaveCount(5);
  await expect(dlg.locator('.hd-wr tr')).toHaveCount(5);
  await expect(dlg.locator('.hd-tips .vt')).toHaveCount(1);
  await expect(dlg).toContainText('Black King Bar');
  // переход по герою внутри карточки и «назад»
  await dlg.locator('section', { hasText: 'Кто контрит его' }).locator('.hlink').first().click();
  await expect(page).not.toHaveURL(/\/hero\/pudge$/);
  await page.goBack();
  await expect(page.locator('#hero-title')).toHaveText('Pudge');
  await page.keyboard.press('Escape');
  await expect(dlg).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/(#counterpick)?$/);
});

test('Карточка из пула (правый клик), кнопки «Отметить врагом» и «Беру его»', async ({ page }) => {
  await page.goto('/#counterpick');
  await page.waitForSelector('html[data-ready]');
  await page.fill('#q', 'Lion');
  await page.locator('#pool .hero', { hasText: /^Lion$/ }).click({ button: 'right' });
  await expect(page.locator('#hero-title')).toHaveText('Lion');
  await expect(page.locator('#slots-enemy .slot:not(.empty)')).toHaveCount(5);   // правый клик не трогает драфт
  await page.locator('[data-hero-act="ally"]').click();
  await expect(page.locator('#hero')).toBeHidden();
  await expect(page.locator('#slots-ally .slot:not(.empty):not(.you) .sname')).toHaveText(['Lion']);
  await page.locator('.podium .hlink').first().click();
  await page.locator('[data-hero-act="enemy"]').click();
  await expect(page.locator('#slots-enemy .slot:not(.empty) .sname').last()).not.toHaveText('Crystal Maiden');
});

test('Прямая ссылка на героя и неизвестный герой', async ({ page }) => {
  await page.goto('/hero/natures-prophet');
  await page.waitForSelector('html[data-ready]');
  await expect(page.locator('#hero-title')).toHaveText("Nature's Prophet");
  await page.locator('[data-hero-close]').click();
  await expect(page).toHaveURL(/\/(#counterpick)?$/);
  await page.goto('/hero/nobody');
  await page.waitForSelector('html[data-ready]');
  await expect(page.locator('#hero')).toBeHidden();
  await expect(page).toHaveURL(/\/(#counterpick)?$/);
});

test('Моя линия: появляется при выбранной позиции, соперники и оценка', async ({ page }) => {
  await page.goto('/#counterpick');
  await page.waitForSelector('html[data-ready]');
  await expect(page.locator('#lane')).toBeHidden();
  await page.locator('#poschips [data-pos="1"]').click();
  const lane = page.locator('#lane');
  await expect(lane).toBeVisible();
  await expect(lane).toContainText('для Lifestealer');
  await expect(lane.locator('.lane-vs .hlink')).toHaveText(['Axe', 'Pudge']);
  await expect(lane.locator('.lane-level')).toHaveText(/лёгкая|средняя|тяжёлая/);
  await expect(lane.locator('.lane-hints li')).toHaveCount(3);
  await page.locator('#poschips [data-pos="2"]').click();
  await expect(lane.locator('.lane-vs .hlink')).toHaveText(['Invoker']);
  // «Беру его» — линия считается для взятого героя
  await page.locator('.podium [data-take]').nth(1).click();
  const taken = await page.locator('#slots-ally .slot:not(.empty):not(.you) .sname').textContent();
  await expect(lane).toContainText('для ' + taken);
});

for (const width of [400, 1440]) for (const lang of ['ru', 'en']) {
  test(`карточка без горизонтальной прокрутки: ${lang} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(l => localStorage.setItem('kontrpik-lang', l), lang);
    await page.goto('/hero/phantom-assassin');
    await page.waitForSelector('html[data-ready]');
    await expect(page.locator('#hero-title')).toHaveText('Phantom Assassin');
    const [sw, cw] = await page.locator('#hero').evaluate(d => [d.scrollWidth, d.clientWidth]);
    expect(sw).toBeLessThanOrEqual(cw);
    const box = (await page.locator('#hero').boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(16);
    await page.screenshot({ path: `test-results/shots/hero-${lang}-${width}.png` });
  });
}

test('Сборки предметов: в карточке героя 4 фазы, под рекомендацией — ключевые предметы', async ({ page }) => {
  await page.route('https://cdn.cloudflare.steamstatic.com/**', r => r.fulfill({ body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'), contentType: 'image/png' }));
  await page.goto('/#counterpick');
  await page.waitForSelector('html[data-ready]');
  await expect(page.locator('.podium .top').first().locator('.b-line .it')).toHaveCount(3);
  await page.goto('/hero/pudge');
  await page.waitForSelector('html[data-ready]');
  await expect(page.locator('.hd-build h3')).toHaveText('Что собирают');
  await expect(page.locator('.hd-build .b-row')).toHaveCount(4);
  await expect(page.locator('.hd-build .it').first()).toHaveAttribute('title', /\S/);
});
