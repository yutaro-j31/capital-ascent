import {test,expect} from '@playwright/test';

test('iPhone WebKit runs all three Financial City prototype modes',async({page})=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));

  await page.goto('./prototypes/financial-city-lab.html');
  await expect(page).toHaveTitle(/Financial City Lab/);
  await expect(page.locator('body')).toHaveAttribute('data-runtime-ready','1');

  // ① CSS/isometric: buildings exist as static DOM, then selection works via JS.
  await expect(page.locator('#v1')).toBeVisible();
  await expect(page.locator('#v1 [data-iso]')).toHaveCount(8);
  await page.locator('#v1 [data-iso="Stock Exchange"]').click();
  await expect(page.locator('#isoName')).toHaveText('Stock Exchange');

  // ② WebGL 3D: mode can be entered and its canvas/controls remain usable on iPhone WebKit.
  await page.locator('[data-mode="2"]').click();
  await expect(page.locator('#v2')).toBeVisible();
  await expect(page.locator('#gl2')).toBeVisible();
  await expect(page.locator('#focus2')).toBeVisible();
  const webgl2=await page.evaluate(()=>!!document.getElementById('gl2').getContext('webgl'));
  expect(webgl2).toBeTruthy();

  // ③ simulator: deterministic week advancement changes the exposed state and HUD.
  await page.locator('[data-mode="3"]').click();
  await expect(page.locator('#v3')).toBeVisible();
  await expect(page.locator('#gl3')).toBeVisible();
  const webgl3=await page.evaluate(()=>!!document.getElementById('gl3').getContext('webgl'));
  expect(webgl3).toBeTruthy();
  const before=await page.evaluate(()=>window.cityLab.getState());
  await page.locator('#next').click();
  const after=await page.evaluate(()=>window.cityLab.getState());
  expect(after.week).toBe(before.week+1);
  expect(after.cash).toBeGreaterThan(before.cash);
  await expect(page.locator('#week')).toHaveText(String(after.week));

  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
});
