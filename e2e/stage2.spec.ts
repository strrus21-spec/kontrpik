import { expect, test, type Page } from '@playwright/test';

const topNames = (page: Page) => page.locator('.podium .top-name strong').allTextContents();

async function mockOpenDota(page: Page, mode: 'open' | 'closed' = 'open') {
  await page.route('https://api.opendota.com/api/**', r => {
    const u = r.request().url();
    if (u.endsWith('/api/heroes')) return r.fulfill({ json: [{ id: 18, localized_name: 'Sven' }, { id: 70, localized_name: 'Ursa' }, { id: 54, localized_name: 'Lifestealer' }, { id: 19, localized_name: 'Tiny' }] });
    if (u.includes('/heroes?date=90')) return r.fulfill({ json: mode === 'closed' ? [] : [{ hero_id: 54, games: 25, win: 16 }, { hero_id: 70, games: 12, win: 5 }, { hero_id: 19, games: 3, win: 3 }, { hero_id: 18, games: 9, win: 6 }] });
    return r.fulfill({ json: { profile: { personaname: 'FINIK', avatarfull: '' }, rank_tier: 54 } });
  });
}

test('Мои герои: открытый профиль → пул, личные винрейты, бонус; сохраняется', async ({ page }) => {
  await mockOpenDota(page);
  await page.addInitScript(() => localStorage.setItem('kontrpik-lang', 'ru'));
  await page.goto('/');
  await page.fill('#me-id', 'https://www.dotabuff.com/players/86745912');
  const t0 = Date.now();
  await page.click('.me-go');
  await expect(page.locator('.me-who strong')).toHaveText('FINIK');
  expect(Date.now() - t0).toBeLessThan(3000);
  await expect(page.locator('.me-who span')).toHaveText('Легенда 4');
  await expect(page.locator('#me-only')).toBeChecked();
  await page.locator('#poschips [data-pos="1"]').click();
  expect(await topNames(page)).toEqual(['Lifestealer', 'Ursa', 'Sven']);   // Tiny: 3 игры — не в пуле
  await expect(page.locator('.podium .mine').first()).toHaveText('у тебя 25 игр, винрейт 64% · +3.0 за личный винрейт');

  await page.reload();
  await expect(page.locator('.me-who strong')).toHaveText('FINIK');
  await page.locator('#me-only').uncheck();
  expect(await topNames(page)).toEqual(['Lifestealer', 'Ursa', 'Tiny']);    // как в контрольном примере
});

test('Мои герои: закрытый профиль и короткая ссылка Steam → понятные сообщения', async ({ page }) => {
  await mockOpenDota(page, 'closed');
  await page.addInitScript(() => localStorage.setItem('kontrpik-lang', 'ru'));
  await page.goto('/');
  await page.fill('#me-id', '86745912'); await page.click('.me-go');
  await expect(page.locator('.me-err')).toHaveText(/^Профиль закрыт\. Включи в Dota: Настройки → Общедоступная история матчей/);
  await page.fill('#me-id', 'https://steamcommunity.com/id/finik'); await page.click('.me-go');
  await expect(page.locator('.me-err')).toContainText('Короткие ссылки Steam');
});

test('Звёздочки вручную: режим ★ Мои', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kontrpik-lang', 'en'));
  await page.goto('/');
  await page.locator('#me-only').check();
  await expect(page.locator('#out .empty-state')).toHaveText('Your pool is empty. Enter your Steam ID or star some heroes.');
  await page.locator('#m-star').click();
  for (const n of ['Puck', 'Sven']) { await page.fill('#q', n); await page.locator('#pool .hero', { hasText: new RegExp(`^${n}`) }).click(); }
  await expect(page.locator('#pool .hero.is-star')).toHaveCount(1); // в поиске виден только Sven
  expect(await topNames(page)).toEqual(['Puck', 'Sven']);
  await expect(page.locator('#slots-enemy .slot:not(.empty)')).toHaveCount(5); // драфт не тронут
  await expect(page.locator('.podium .mine').first()).toHaveText('★ starred');
});

test('Что купить: MKB против PA и BKB против магии, у причины есть враг', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kontrpik-lang', 'ru'));
  await page.goto('/');
  const items = page.locator('#buy .buy-list li');
  await expect(items).toHaveCount(4);
  await expect(items.filter({ hasText: 'Monkey King Bar' })).toHaveText('Monkey King Bar — у Phantom Assassin уклонение');
  await expect(items.filter({ hasText: 'Black King Bar' })).toContainText('у Pudge, Invoker и Crystal Maiden много магического урона');
  await page.locator('#poschips [data-pos="5"]').click();
  await expect(page.locator('#buy')).toContainText('Glimmer Cape');
  await expect(page.locator('#buy')).not.toContainText('Monkey King Bar');
});

test('Ссылка на драфт: копируется и открывает тот же пик', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => localStorage.setItem('kontrpik-lang', 'ru'));
  await page.goto('/');
  await page.locator('#m-ally').click();
  await page.fill('#q', 'lion'); await page.locator('#pool .hero', { hasText: /^Lion$/ }).click();
  await page.locator('#src').selectOption('high');
  await page.locator('#poschips [data-pos="2"]').click();
  await page.locator('#share').click();
  await expect(page.locator('#share-msg')).toHaveText('Ссылка скопирована');
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain('?e=phantom-assassin,pudge,invoker,axe,crystal-maiden&a=lion&r=high&pos=2');

  // «другое устройство»: чистый контекст
  const other = await context.browser()!.newContext();
  const p2 = await other.newPage();
  await p2.goto(url);
  await expect(p2.locator('#slots-enemy .slot:not(.empty) .sname')).toHaveText(['Phantom Assassin', 'Pudge', 'Invoker', 'Axe', 'Crystal Maiden']);
  await expect(p2.locator('#slots-ally .slot:not(.empty):not(.you) .sname')).toHaveText(['Lion']);
  await expect(p2.locator('#src')).toHaveValue('high');
  await expect(p2.locator('#poschips [data-pos="2"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(p2.locator('#exampleTag')).toBeHidden();
  expect(new URL(p2.url()).search).toBe('');   // адрес очищен, дальше драфт в localStorage
  await other.close();
});
