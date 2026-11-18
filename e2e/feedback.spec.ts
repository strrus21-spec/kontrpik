import { expect, test } from '@playwright/test';

// Форма «Предложить идею»: проверка полей, отправка в Web3Forms, сообщение об успехе и об ошибке.
test('обратная связь: пустая форма не уходит, заполненная отправляется', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kontrpik-lang', 'ru'));
  const sent: Record<string, string>[] = [];
  let ok = true;
  await page.route('https://api.web3forms.com/submit', async r => {
    sent.push(r.request().postDataJSON());
    await r.fulfill({ status: ok ? 200 : 500, contentType: 'application/json', body: JSON.stringify({ success: ok }) });
  });
  await page.goto('/#about'); await page.waitForSelector('html[data-ready]');
  await page.locator('#fb-send').click();
  await expect(page.locator('#fb-status')).toHaveText('Заполни тему и описание.');
  expect(sent).toHaveLength(0);
  await page.fill('#fb-subject', 'Идея'); await page.fill('#fb-message', 'Добавьте Rubick'); await page.fill('#fb-contact', 'tg @test');
  await page.locator('#fb-send').click();
  await expect(page.locator('#fb-status')).toHaveText('Спасибо! Письмо отправлено.');
  expect(sent[0]).toMatchObject({ subject: 'DotaPick: Идея', message: 'Добавьте Rubick', contact: 'tg @test' });
  await expect(page.locator('#fb-subject')).toHaveValue('');
  ok = false;
  await page.fill('#fb-subject', 'Ещё'); await page.fill('#fb-message', 'текст'); await page.locator('#fb-send').click();
  await expect(page.locator('#fb-status')).toHaveText('Не удалось отправить. Попробуй ещё раз чуть позже.');
});
