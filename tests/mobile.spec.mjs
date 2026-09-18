import {test,expect} from '@playwright/test';

async function expectNoHorizontalOverflow(page){
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
}

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

  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

test('Phase 12 iPhone route audit covers overview, operations, market, PE and legacy at RC state',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('./');
  await page.locator('[data-act="start"]').click();

  await page.evaluate(()=>{
    state.company.cash=2_000_000_000;
    state.company.lastWeekProfit=5_000_000;
    state.history.companyWeeks=[{week:state.week,revenue:25_000_000,profit:5_000_000,cash:state.company.cash,debt:0,companyValue:0}];
    if(!state.company.public)ipo();
    state.personal.cash=Math.max(state.personal.cash,150_000_000);
    state.pe.unlocked=true;
    if(!state.pe.funds.length)raiseFund();
    generatePeDeals(state);
    save();tab='overview';selectedBusiness=null;render();
  });

  await expect(page.getByText('Progression Journey')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.locator('nav [data-tab="operations"]').click();
  await expect(page.getByRole('heading',{name:'事業'})).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.locator('[data-manage-business="ramen"]').click();
  await expect(page.getByText('Management Organization')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.locator('nav [data-tab="market"]').click();
  await expect(page.getByText('Capital Allocation Office')).toBeVisible();
  await expect(page.locator('[data-market-pane="microcap"]')).toBeVisible();
  await page.locator('[data-market-pane="microcap"]').click();
  await expect(page.locator('[data-market-pane="microcap"].active')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.locator('[data-market-pane="capital"]').click();
  await expect(page.getByText('Capital Allocation Office')).toBeVisible();

  await page.locator('nav [data-tab="pe"]').click();
  await expect(page.getByText('F1 Fund Economics')).toBeVisible();
  await expect(page.getByText('Deal Book')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.locator('nav [data-tab="legacy"]').click();
  await expect(page.getByText('Save Safety')).toBeVisible();
  await expect(page.getByText('Career Progress')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.locator('nav [data-tab="overview"]').click();
  await expect(page.getByText('Progression Journey')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});
