import {test,expect} from '@playwright/test';

test('iPhone WebKit covers Phase 11 progression, native sheets and late-game surfaces',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('./');
  await expect(page).toHaveTitle('CAPITAL ASCENT');
  await expect(page.locator('[data-act="start"]')).toBeVisible();
  await page.locator('[data-act="start"]').click();
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.getByText('Founder Launch Guide')).toBeVisible();
  await expect(page.getByText('Progression Journey')).toBeVisible();

  await page.locator('[data-act="advance"]').click();
  await expect(page.locator('.week-badge')).toContainText('W2');
  await expect(page.getByText('Executive Management Brief')).toBeVisible();

  await page.locator('nav [data-tab="operations"]').click();
  await page.locator('[data-manage-business="ramen"]').click();
  await expect(page.getByText('Management Organization')).toBeVisible();
  await expect(page.getByText('Capital Program')).toBeVisible();
  await page.locator('[data-open-map-business="ramen"]').click();
  await expect(page.locator('.city-world-screen')).toBeVisible();
  await expect(page.locator('.rival-pin').first()).toBeVisible();
  await expect(page.locator('.site-pin').first()).toBeVisible();

  await page.locator('nav [data-tab="market"]').click();
  await expect(page.getByText('Capital Allocation Office')).toBeVisible();
  await expect(page.getByText('Capital Constraints')).toBeVisible();
  await page.locator('[data-act="borrow"]').first().click();
  await expect(page.getByRole('dialog',{name:'銀行借入'})).toBeVisible();
  await expect(page.locator('[data-p11-sheet-input]')).toBeVisible();
  await page.locator('[data-p11-sheet-close]').click();

  await page.locator('nav [data-tab="pe"]').click();
  await expect(page.getByText('Phase 10 — Fund Economics')).toBeVisible();
  await expect(page.getByText('PE Unlock Path')).toBeVisible();

  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
});
