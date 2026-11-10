import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page, context }) => {
  await context.addInitScript(() => localStorage.setItem('kontrpik-lang', 'ru'));
  void page;
});

test('Оверлей: прозрачный фон, пик и топ-3 приходят с основной страницы и меняются вживую', async ({ context }) => {
  const main = await context.newPage();
  await main.goto('/#counterpick');
  await main.waitForSelector('html[data-ready]');
  await expect(main.locator('.podium .top')).toHaveCount(3);
  const ov = await context.newPage();
  await ov.setViewportSize({ width: 1920, height: 1080 });
  await ov.goto('/overlay/');
  await expect(ov.locator('.ov-enemy img')).toHaveCount(5);
  await expect(ov.locator('.ov-name')).toHaveText(['Earth Spirit', 'Puck', 'Lifestealer']);
  expect(await ov.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await main.locator('#poschips [data-pos="1"]').click();
  await expect(ov.locator('.ov-name')).toHaveText(['Lifestealer', 'Ursa', 'Tiny']);
  // читаемость: имя героя не меньше 24 px на 1920×1080
  const size = await ov.locator('.ov-name').first().evaluate(e => parseFloat(getComputedStyle(e).fontSize));
  expect(size).toBeGreaterThanOrEqual(24);
  await ov.screenshot({ path: 'test-results/shots/overlay-1920.png', omitBackground: true });
});

test('Голосование из чата Twitch: !1/!2/!3, один голос на зрителя, проценты в оверлее', async ({ context }) => {
  const main = await context.newPage();
  let send: ((m: string) => void) | null = null;
  const sent: string[] = [];
  await main.routeWebSocket('wss://irc-ws.chat.twitch.tv:443', ws => {
    ws.onMessage(m => { sent.push(String(m)); });
    send = m => ws.send(m);
  });
  await main.goto('/#counterpick');
  await main.waitForSelector('html[data-ready]');
  await main.locator('#stream summary').click();
  await main.fill('#st-channel', 'https://www.twitch.tv/FINIK');
  await main.locator('#stream .me-go').click();
  await expect(main.locator('.st-chat')).toHaveText('Чат #finik подключён');
  await expect.poll(() => sent.join('\n')).toContain('JOIN #finik');
  expect(sent[1]).toMatch(/^NICK justinfan\d+$/);
  await main.locator('[data-st="start"]').click();
  const msg = (u: string, t: string) => send!(`@x=y :${u}!${u}@${u}.tmi.twitch.tv PRIVMSG #finik :${t}\r\n`);
  msg('a', '!1'); msg('b', '!1'); msg('c', '!2 точно'); msg('a', '!3'); msg('d', 'привет'); msg('e', '!7');
  await expect(main.locator('.st-vote + .bans-note')).toHaveText('3 голоса');
  await expect(main.locator('.st-pc')).toHaveText(['33%', '33%', '33%']);
  const ov = await context.newPage();
  await ov.goto('/overlay/');
  await expect(ov.locator('.ov-pc')).toHaveText(['!1 · 33%', '!2 · 33%', '!3 · 33%']);
  await expect(ov.locator('.ov-hint')).toContainText('!1, !2 или !3');
  await main.locator('[data-st="stop"]').click();
  msg('f', '!1');
  await expect(main.locator('.st-vote + .bans-note')).toHaveText('3 голоса');
  await expect(ov.locator('.ov-hint')).toHaveCount(0);
});

test('Викторина: 10 вопросов, ответ подсвечивается, итог и рекорд', async ({ page }) => {
  await page.goto('/#counterpick');
  await page.waitForSelector('html[data-ready]');
  await page.locator('.nav a[href="#tips-block"]').click(); await page.locator('#quiz-open').click();
  const dlg = page.locator('#quiz');
  await expect(dlg).toBeVisible();
  for (let k = 1; k <= 10; k++) {
    await expect(dlg.locator('.place')).toContainText(`Вопрос ${k} из 10`);
    await expect(dlg.locator('.qz-opt')).toHaveCount(4);
    await dlg.locator('.qz-opt').first().click();
    await expect(dlg.locator('.qz-opt.right')).toHaveCount(1);
    await expect(dlg.locator('.qz-res')).toHaveText(/Верно!|Неверно\./);
    await dlg.locator('[data-qz="next"]').click();
  }
  await expect(dlg.locator('h2')).toHaveText('Результат');
  await expect(dlg.locator('.qz-score')).toHaveText(/^\d+ из 10$/);
  await expect(dlg.locator('.bans-note').first()).toContainText('Твой рекорд');
  await dlg.locator('[data-qz="close"]').click();
  await expect(dlg).toBeHidden();
});

for (const width of [400, 1440]) for (const lang of ['ru', 'en']) {
  test(`стрим и викторина без горизонтальной прокрутки: ${lang} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(l => localStorage.setItem('kontrpik-lang', l), lang);
    await page.goto('/#counterpick');
    await page.waitForSelector('html[data-ready]');
    await page.locator('#stream summary').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.locator('#stream').screenshot({ path: `test-results/shots/stream-${lang}-${width}.png` });
    await page.locator('.nav a[href="#tips-block"]').click(); await page.locator('#quiz-open').click();
    const [sw, cw] = await page.locator('#quiz').evaluate(d => [d.scrollWidth, d.clientWidth]);
    expect(sw).toBeLessThanOrEqual(cw);
    await page.screenshot({ path: `test-results/shots/quiz-${lang}-${width}.png` });
  });
}
