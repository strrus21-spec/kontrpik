// Бэкенд стрима: оверлей и зрители на «другом устройстве» (отдельный браузерный контекст), таблица лидеров.
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ context }) => { await context.addInitScript(() => localStorage.setItem('kontrpik-lang', 'ru')); });

test('Комната: оверлей и голосование зрителей с другого устройства, голоса чата и страницы вместе', async ({ page, browser }) => {
  let send: ((m: string) => void) | null = null;
  await page.routeWebSocket('wss://irc-ws.chat.twitch.tv:443', ws => { ws.onMessage(() => {}); send = m => ws.send(m); });
  await page.goto('/');
  await page.waitForSelector('html[data-ready]');
  await page.locator('#stream summary').click();
  await page.locator('[data-st="room"]').click();
  const code = (await page.locator('.st-code b').textContent())!;
  expect(code).toMatch(/^[A-Z2-9]{6}$/);
  await expect(page.locator('.st-code .st-chat')).toHaveText('на связи');
  const ovUrl = await page.locator('.st-lab input').nth(0).inputValue();
  const vtUrl = await page.locator('.st-lab input').nth(1).inputValue();
  expect(ovUrl).toContain('/overlay/?room=' + code);

  // «другое устройство»: новый контекст без общего localStorage и BroadcastChannel
  const dev2 = await browser.newContext(); const ov = await dev2.newPage();
  await ov.goto(ovUrl);
  await expect(ov.locator('.ov-name')).toHaveText(['Earth Spirit', 'Puck', 'Lifestealer']);
  await page.locator('#poschips [data-pos="1"]').click();
  await expect(ov.locator('.ov-name')).toHaveText(['Lifestealer', 'Ursa', 'Tiny']);

  // голосование: чат + страница зрителей
  await page.fill('#st-channel', 'finik'); await page.locator('#stream .me-go').click();
  await page.locator('[data-st="start"]').click();
  const dev3 = await browser.newContext(); const viewer = await dev3.newPage();
  await viewer.addInitScript(() => localStorage.setItem('kontrpik-lang', 'ru'));
  await viewer.goto(vtUrl);
  await expect(viewer.locator('.vt-opt')).toHaveCount(3);
  await viewer.locator('.vt-opt').nth(1).click();
  await expect(viewer.locator('.vt-msg')).toHaveText('Голос принят: Ursa. Можно передумать.');
  await expect.poll(() => send !== null).toBe(true);
  send!(':a!a@a.tmi.twitch.tv PRIVMSG #finik :!1\r\n');
  await expect(page.locator('.st-vote + .bans-note')).toHaveText('2 голоса');
  await expect(ov.locator('.ov-pc')).toHaveText(['!1 50%', '!2 50%', '!3 0%']);
  await expect(viewer.locator('.vt-pc')).toHaveText(['50%', '50%', '0%']);
  // передумал — голос один
  await viewer.locator('.vt-opt').nth(2).click();
  await expect(ov.locator('.ov-pc')).toHaveText(['!1 50%', '!2 0%', '!3 50%']);
  await page.locator('[data-st="stop"]').click();
  await expect(viewer.locator('.empty-state')).toHaveText('Сейчас голосования нет. Страница обновится сама.');
  await dev2.close(); await dev3.close();
});

test('Комната: неверный код и ключ управления', async ({ page, request }) => {
  await page.goto('/vote/?room=AAAAAA');
  await expect(page.locator('.me-err')).toHaveText('Комната не найдена. Проверь код.', { timeout: 20_000 });
  await page.fill('#vt-code', 'zz'); await page.locator('#vt-form .me-go').click();
  await expect(page.locator('.me-err')).toContainText('6 латинских букв');
  // голос в несуществующую комнату и без открытого голосования
  const r1 = await request.post('http://127.0.0.1:8787/room/AAAAAA/vote', { data: { voter: 'abcdefgh12345678', option: 0 } });
  expect(r1.status()).toBe(404);
  const { code } = await (await request.post('http://127.0.0.1:8787/room')).json();
  const r2 = await request.post(`http://127.0.0.1:8787/room/${code}/vote`, { data: { voter: 'abcdefgh12345678', option: 0 } });
  expect(r2.status()).toBe(409);
  // чужой ключ не даёт управлять комнатой
  const res = await page.evaluate(c => new Promise<string>(ok => { const ws = new WebSocket(`ws://127.0.0.1:8787/room/${c}/ws?role=control&key=wrong`); ws.onopen = () => ok('open'); ws.onerror = () => ok('rejected'); }), code);
  expect(res).toBe('rejected');
});

test('Таблица лидеров викторины', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('html[data-ready]');
  await page.locator('#quiz-open').click();
  const dlg = page.locator('#quiz');
  for (let k = 0; k < 10; k++) { await dlg.locator('.qz-opt').first().click(); await dlg.locator('[data-qz="next"]').click(); }
  await expect(dlg.locator('.lb h3')).toHaveText('Таблица лидеров');
  await dlg.locator('#lb-name').fill('x');
  await dlg.locator('#lb-form .me-go').click();
  await expect(dlg.locator('.lb [role=status]')).toHaveText('Имя — от 2 до 20 символов.');
  const name = 'Tester' + Date.now() % 100000;
  await dlg.locator('#lb-name').fill(name);
  await dlg.locator('#lb-form .me-go').click();
  await expect(dlg.locator('.lb [role=status]')).toHaveText('Результат записан.');
  await expect(dlg.locator('.lb-list li', { hasText: name })).toHaveCount(1);
  await expect(dlg.locator('#lb-form')).toHaveCount(0);
});

for (const width of [400, 1440]) for (const lang of ['ru', 'en']) {
  test(`страница голосования и комната без горизонтальной прокрутки: ${lang} ${width}`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(l => localStorage.setItem('kontrpik-lang', l), lang);
    const { code } = await (await request.post('http://127.0.0.1:8787/room')).json();
    await page.goto('/vote/?room=' + code);
    await expect(page.locator('.empty-state')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.goto('/');
    await page.waitForSelector('html[data-ready]');
    await page.locator('#stream summary').click();
    await page.locator('[data-st="room"]').click();
    await expect(page.locator('.st-code b')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.locator('#stream').screenshot({ path: `test-results/shots/room-${lang}-${width}.png` });
  });
}
