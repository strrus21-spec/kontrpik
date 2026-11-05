// Доступность: axe (WCAG 2.1 AA) на всех экранах в обоих языках + видимый фокус с клавиатуры.
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const audit = async (page: Page, where: string) => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const bad = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
    .map(v => `${where}: ${v.id} — ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(', ')}`);
  expect(bad).toEqual([]);
};

for (const lang of ['ru', 'en']) {
  test(`axe: главная, карточка героя, викторина, голосование (${lang})`, async ({ page }) => {
    await page.addInitScript(l => localStorage.setItem('kontrpik-lang', l), lang);
    await page.goto('/');
    await page.waitForSelector('html[data-ready]');
    await page.locator('#poschips [data-pos="1"]').click();
    await page.locator('#stream summary').click();
    await audit(page, 'главная');
    await page.locator('#slots-enemy .hlink').first().click();
    await expect(page.locator('#hero')).toBeVisible();
    await audit(page, 'карточка');
    await page.keyboard.press('Escape');
    await page.locator('.nav a[href="#tips-block"]').click(); await page.locator('#quiz-open').click();
    await audit(page, 'викторина');
    await page.keyboard.press('Escape');
    await page.goto('/vote/');
    await audit(page, 'голосование');
  });
}

test('у каждого элемента, куда попадает Tab, виден фокус', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('html[data-ready]');
  const bad: string[] = [];
  for (let i = 0; i < 120; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const e = document.activeElement as HTMLElement | null; if (!e || e === document.body) return null;
      const cs = getComputedStyle(e);
      const vis = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (!!cs.boxShadow && cs.boxShadow !== 'none');
      return vis ? null : `${e.tagName}.${e.className} «${(e.textContent || '').trim().slice(0, 20)}»`;
    });
    if (r) bad.push(r);
  }
  expect(bad).toEqual([]);
});
