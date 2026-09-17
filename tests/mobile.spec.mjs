import {test,expect} from '@playwright/test';

test('iPhone WebKit covers Phase 9 management and Phase 10 capital allocator surfaces',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('./');
  await expect(page).toHaveTitle('CAPITAL ASCENT');
  await expect(page.locator('[data-act="start"]')).toBeVisible();
  await page.locator('[data-act="start"]').click();
  await expect(page.locator('.topbar')).toBeVisible();
  await page.locator('[data-act="advance"]').click();
  await expect(page.locator('.week-badge')).toContainText('W2');
  await expect(page.getByText('Executive Management Brief')).toBeVisible();
  await page.locator('nav [data-tab="operations"]').click();
  await page.locator('[data-manage-business="ramen"]').click();
  await expect(page.getByText('価格と集客')).toBeVisible();
  await expect(page.getByText('Management Organization')).toBeVisible();
  await expect(page.getByText('Capital Program')).toBeVisible();
  await page.locator('[data-open-map-business="ramen"]').click();
  await expect(page.locator('.city-world-screen')).toBeVisible();
  await expect(page.locator('.rival-pin').first()).toBeVisible();
  await expect(page.locator('.site-pin').first()).toBeVisible();
  await page.locator('nav [data-tab="market"]').click();
  await expect(page.getByText('Capital Allocation Office')).toBeVisible();
  await page.locator('nav [data-tab="pe"]').click();
  await expect(page.getByText('Phase 10 — Fund Economics')).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
});
