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
  await expect(page.getByRole('heading',{name:/経営報告/})).toBeVisible();

  await page.locator('nav [data-tab="operations"]').click();
  await page.locator('[data-manage-business="ramen"]').click();
  await expect(page.getByText('経営組織')).toBeVisible();
  await expect(page.getByText('設備投資計画')).toBeVisible();
  await expect(page.getByText('経営ポリシーの違い')).toBeVisible();
  await expect(page.getByText('経営陣 / CXO')).toBeVisible();
  await expect(page.locator('[data-m21-weekly-budget="ramen"]')).toBeVisible();
  await expect(page.locator('[data-m21-capital-budget="ramen"]')).toBeVisible();
  await expect(page.locator('[data-m21-expansion="ramen"]')).toBeVisible();
  await page.locator('[data-open-map-business="ramen"]').click();
  await expect(page.locator('.city-world-screen')).toBeVisible();
  await expect(page.locator('.rival-pin').first()).toBeVisible();
  await expect(page.locator('.site-pin').first()).toBeVisible();

  await page.locator('nav [data-tab="market"]').click();
  await expect(page.getByText('資本配分室')).toBeVisible();
  await expect(page.getByRole('heading',{name:'資本制約'})).toBeVisible();
  await page.locator('[data-act="borrow"]').first().click();
  await expect(page.getByRole('dialog',{name:'銀行借入'})).toBeVisible();
  await expect(page.locator('[data-p11-sheet-input]')).toBeVisible();
  await page.locator('[data-p11-sheet-close]').click();

  await page.locator('nav [data-tab="pe"]').click();
  await expect(page.getByText('PEファームの進め方')).toBeVisible();
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
  await expect(page.getByRole('heading',{name:'事業',exact:true})).toBeVisible();
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
  await expect(page.getByRole('heading',{name:'第1号ファンド 収益'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'投資候補案件'})).toBeVisible();
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


test('management and ownership deepening UX works on iPhone',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('./');
  await page.locator('[data-act="start"]').click();

  await page.evaluate(()=>{
    state.company.cash=150_000_000;
    state.company.lastWeekProfit=5_000_000;
    state.history.companyWeeks=[];
    save();tab='market';marketPane='capital';render();
  });

  await expect(page.getByText('IPO / 持株設計')).toBeVisible();
  await expect(page.locator('[data-m21-ipo-open]')).toBeEnabled();
  await page.locator('[data-m21-ipo-open]').click();
  await expect(page.getByRole('dialog',{name:'IPO売出設計'})).toBeVisible();
  const slider=page.locator('[data-m21-ipo-pct]');
  await slider.fill('20');
  await expect(page.locator('[data-m21-ipo-pct-label]')).toHaveText('20%');
  await page.locator('[data-m21-ipo-confirm]').click();
  await expect(page.getByText('上場後のOwnership')).toBeVisible();
  const ownership=await page.evaluate(()=>state.company.founderOwnership);
  expect(ownership).toBeGreaterThan(.70);
  expect(ownership).toBeLessThan(.75);

  await page.locator('nav [data-tab="pe"]').click();
  await expect(page.getByText('PEファームの進め方')).toBeVisible();
  await expect(page.locator('.m21-glossary b').filter({hasText:'回収済倍率'}).first()).toBeVisible();
  await expect(page.locator('.m21-glossary b').filter({hasText:'総合倍率'}).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});


test('player feedback UX exposes plain PE terms and real-estate entry on iPhone',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('./');
  await page.locator('[data-act="start"]').click();

  await page.locator('nav [data-tab="operations"]').click();
  await page.evaluate(()=>{state.company.cash=20_000_000;save();render();});
  const realEstateButton=page.locator('[data-add-business="realEstateAgency"]');
  await expect(realEstateButton).toBeVisible();
  await expect(realEstateButton).toContainText('75万');
  await realEstateButton.click();
  await expect(page.locator('.screen-head h1')).toHaveText('不動産仲介');

  await page.evaluate(()=>{
    state.pe.unlocked=true;
    state.personal.cash=1_000_000_000;
    if(!state.pe.funds.length)raiseFund();
    tab='pe';render();
  });
  await expect(page.getByText('PE運営会社の利益')).toBeVisible();
  await expect(page.getByText('外部投資家（LP）')).toBeVisible();
  await expect(page.locator('.m22-fund-grid small').filter({hasText:'回収済倍率'}).first()).toBeVisible();
  await expect(page.locator('.m22-explainer .label').filter({hasText:'案件ネットワーク'}).first()).toBeVisible();

  await page.evaluate(()=>{
    tab='operations';selectedBusiness='ramen';
    state.company.cash=500_000_000;
    while(state.company.stores.filter(x=>x.businessID==='ramen').length<3)openStore('ramen');
    const c=m21CandidateRows(state,'COO')[0];
    if(!state.management.executives.COO)hireExecutive('COO',c.id);
    render();
  });
  await expect(page.getByText('CXOへ設備投資判断を委任')).toBeVisible();
  await expect(page.locator('[data-m22-capex-role="ramen"]')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});


test('staged PE fundraising, single entry hub and portfolio turnaround work on iPhone',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('./');
  await page.locator('[data-act="start"]').click();

  await page.locator('nav [data-tab="operations"]').click();
  await expect(page.locator('.m22-business-entry')).toHaveCount(0);
  await expect(page.locator('[data-add-business="realEstateAgency"]')).toHaveCount(1);

  const gymStores=await page.evaluate(()=>{
    state.company.cash=500_000_000;
    while(state.company.stores.filter(x=>x.businessID==='ramen').length<3)openStore('ramen');
    addBusiness('gym');
    setManagementCapitalBudget('gym',100_000_000);
    setManagementReviewCadence('gym','weekly');
    setExpansionMandate('gym','aggressive');
    applyDelegatedPolicies(state);
    save();render();
    return state.company.stores.filter(x=>x.businessID==='gym').length;
  });
  expect(gymStores).toBe(1);

  await page.evaluate(()=>{
    state.pe.unlocked=true;
    state.personal.cash=2_000_000_000;
    state.pe.lpTrust=95;
    state.pe.network=95;
    tab='pe';render();
  });
  await expect(page.getByRole('heading',{name:'第1号ファンド 資金調達'})).toBeVisible();
  await expect(page.locator('[data-m23-gp-commit]')).toBeVisible();
  await page.locator('[data-m23-gp-commit]').fill('100000000');
  await page.locator('[data-m23-start-fundraise]').click();
  await expect(page.getByText('Pre-Marketing',{exact:true})).toBeVisible();
  await expect(page.locator('[data-m23-solicit]').first()).toBeVisible();

  await page.evaluate(()=>{
    state.pe.fundraising=null;
    if(!state.pe.funds.length)raiseFund();
    const f=state.pe.funds[0];
    f.cash=500_000_000;
    state.pe.portfolio=[{id:'mobile-turn',name:'モバイル再建社',businessID:'ramen',fundId:f.id,status:'held',entryWeek:1,age:60,entryValue:1_000_000_000,value:1_000_000_000,enterpriseValue:1_000_000_000,equityInvested:300_000_000,fundCostBasis:300_000_000,debt:600_000_000,leverage:.6,entryMultiple:10,ebitda:100_000_000,quality:45,risk:75,margin:.10,organicGrowth:.01,cyclicality:50,thesis:'Turnaround',improvement:0,cash:20_000_000,initiatives:[]}];
    tab='pe';save();render();
  });
  await expect(page.locator('[data-m23-turnaround="mobile-turn"]')).toBeVisible();
  await page.locator('[data-m23-turnaround="mobile-turn"]').click();
  await expect(page.getByText(/再建中/).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});
