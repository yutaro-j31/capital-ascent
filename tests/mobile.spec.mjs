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
  await expect(page.getByText('CEO経営司令室')).toBeVisible();
  await expect(page.locator('.cc-hero')).toBeVisible();
  await expect(page.locator('[data-cc-section="kpis"]')).toBeVisible();
  await expect(page.locator('.cc-kpi-card')).toHaveCount(5);
  await expect(page.locator('[data-cc-section="inbox"]')).toBeVisible();
  await expect(page.locator('.cc-inbox-row').first()).toBeVisible();
  await expect(page.locator('[data-cc-section="business"]')).toBeVisible();
  await expect(page.locator('.cc-business-row').first()).toBeVisible();
  await expect(page.locator('[data-cc-section="capital"]')).toBeVisible();
  await expect(page.locator('.cc-allocation-row')).toHaveCount(5);
  await expect(page.locator('[data-cc-section="quarter"]')).toBeVisible();
  await expect(page.locator('.cc-calendar-row').first()).toBeVisible();
  await expect(page.locator('.cc-summit')).toBeVisible();
  await expect(page.getByText('創業者ガイド')).toBeVisible();
  await expect(page.getByText('成長ロードマップ')).toBeVisible();

  await page.locator('[data-act="advance"]').click();
  await expect(page.locator('.week-badge')).toContainText('第2週');
  await expect(page.getByText('経営報告')).toBeVisible();

  await page.locator('nav [data-tab="operations"]').click();
  await page.locator('[data-manage-business="ramen"]').click();
  await expect(page.getByText('経営組織')).toBeVisible();
  await expect(page.getByText('設備投資計画')).toBeVisible();
  await page.locator('[data-open-map-business="ramen"]').click();
  await expect(page.locator('.city-world-screen')).toBeVisible();
  await expect(page.locator('.rival-pin').first()).toBeVisible();
  await expect(page.locator('.site-pin').first()).toBeVisible();

  await page.locator('nav [data-tab="market"]').click();
  await expect(page.getByText('資本配分室')).toBeVisible();
  await expect(page.getByText('資本制約')).toBeVisible();
  await page.locator('[data-act="borrow"]').first().click();
  await expect(page.getByRole('dialog',{name:'銀行借入'})).toBeVisible();
  await expect(page.locator('[data-p11-sheet-input]')).toBeVisible();
  await page.locator('[data-p11-sheet-close]').click();

  await page.locator('nav [data-tab="pe"]').click();
  await expect(page.getByText('ファンド運営')).toBeVisible();
  await expect(page.getByText('PE解禁条件')).toBeVisible();

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

  await expect(page.getByText('CEO経営司令室')).toBeVisible();
  await expect(page.locator('.cc-kpi-card')).toHaveCount(5);
  await expect(page.locator('.cc-business-row').first()).toBeVisible();
  await expect(page.locator('.cc-allocation-row')).toHaveCount(5);
  await expect(page.locator('.cc-calendar-row').first()).toBeVisible();
  await expect(page.getByText('成長ロードマップ')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.locator('nav [data-tab="operations"]').click();
  await expect(page.getByRole('heading',{name:'事業'})).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.locator('[data-manage-business="ramen"]').click();
  await expect(page.getByText('経営組織')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.locator('nav [data-tab="market"]').click();
  await expect(page.getByText('資本配分室')).toBeVisible();
  await expect(page.locator('[data-market-pane="microcap"]')).toBeVisible();
  await page.locator('[data-market-pane="microcap"]').click();
  await expect(page.locator('[data-market-pane="microcap"].active')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.locator('[data-market-pane="capital"]').click();
  await expect(page.getByText('資本配分室')).toBeVisible();

  await page.locator('nav [data-tab="pe"]').click();
  await expect(page.getByText('F1 ファンド収益')).toBeVisible();
  await expect(page.getByText('案件一覧')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.locator('nav [data-tab="legacy"]').click();
  await expect(page.getByText('セーブ保護')).toBeVisible();
  await expect(page.getByText('キャリア進捗')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.locator('nav [data-tab="overview"]').click();
  await expect(page.getByText('CEO経営司令室')).toBeVisible();
  await expect(page.locator('.cc-topbar')).toBeVisible();
  await expect(page.locator('.cc-nav [data-tab="overview"].active')).toBeVisible();
  await expect(page.getByText('成長ロードマップ')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});
