'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createRuntime}=require('./harness.cjs');

test('trillion yen values keep 100-million-yen detail',()=>{
  const r=createRuntime(),a=r.api;
  assert.equal(a.formatYen(1_000_000_000_000),'1兆');
  assert.equal(a.formatYen(1_234_500_000_000),'1兆2,345億');
  assert.equal(a.formatYen(9_876_500_000_000),'9兆8,765億');
});

test('real-estate agency entry succeeds and returns an explicit result',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('REAL ESTATE TEST','ramen','東京');
  a.eval('state.company.cash=10_000_000;');
  assert.equal(a.addBusiness('realEstateAgency'),true);
  assert.ok(a.get().company.businesses.realEstateAgency);
  assert.equal(a.addBusiness('realEstateAgency'),true);
});

test('PE screen explains fund economics, GP, LP and network in plain Japanese',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('PE WORDING','ramen','東京');
  a.eval('state.pe.unlocked=true;state.personal.cash=1_000_000_000;');
  assert.equal(a.raiseFund(),true);
  const html=a.peHtml();
  assert.match(html,/出資約束総額/);
  assert.match(html,/実際に払込済みの資金/);
  assert.match(html,/回収済倍率/);
  assert.match(html,/PE運営会社の利益/);
  assert.match(html,/外部投資家（LP）/);
  assert.match(html,/案件ネットワーク/);
  assert.match(html,/専門用語を知らなくても/);
});

test('PE exit history exposes sale value, fund proceeds and personal proceeds',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('PE EXIT DISPLAY','ramen','東京');
  a.eval('state.pe.unlocked=true;state.personal.cash=1_000_000_000;');
  assert.equal(a.raiseFund(),true);
  a.eval("const f=state.pe.funds[0]; state.pe.portfolio.push({id:'exit_display',name:'表示テスト社',businessID:'ramen',fundId:f.id,status:'exited',exitWeek:120,equityInvested:100_000_000,exitValue:300_000_000,exitEquity:180_000_000,moic:1.8}); f.distributionHistory.push({week:120,portfolioId:'exit_display',proceeds:180_000_000,carry:3_000_000,gpDistribution:5_000_000});");
  const html=a.peHtml();
  assert.match(html,/投資案件のExit実績/);
  assert.match(html,/会社全体の売却評価額/);
  assert.match(html,/借入返済後にファンドへ戻った現金/);
  assert.match(html,/あなた個人への受取/);
  assert.match(html,/表示テスト社/);
});

test('subsidiary panel shows acquisition cost and unrealized profit or loss',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('SUB VALUE','ramen','東京');
  a.eval("state.company.subsidiaryPortfolio=[{id:'sub_value',name:'子会社テスト',businessID:'ramen',status:'held',acquisitionPrice:100_000_000,enterpriseValue:160_000_000,debt:20_000_000,ownership:1,ebitda:20_000_000,synergy:40,integrationStatus:'standalone',integrationMode:'standalone',managementQuality:60,margin:.12,growth:.03,lastRevenue:0,lastProfit:0}]; state.company.subsidiaries=1; marketPane='capital';");
  const html=a.marketHtml();
  assert.match(html,/取得額/);
  assert.match(html,/現在の株式価値/);
  assert.match(html,/含み益/);
  assert.match(html,/4,000万/);
});

test('hired COO can autonomously approve a CAPEX project at quarter review',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('CXO CAPEX','ramen','東京');
  a.eval("state.company.cash=500_000_000;openStore('ramen');openStore('ramen');");
  const candidates=a.cxoCandidates('COO');
  assert.equal(a.hireCxo('COO',candidates[0].id),true);
  a.capitalBudget('ramen',100_000_000);
  assert.equal(a.capexDelegate('ramen','COO'),true);
  a.eval('state.week=14;state.projects=[];');
  a.serviceDelegatedCapex();
  const delegated=a.get().projects.filter(p=>p.scope==='capex'&&p.delegatedBy==='COO');
  assert.equal(delegated.length,1);
  const html=a.eval("phase9CapexPanel('ramen')");
  assert.match(html,/CXOへ設備投資判断を委任/);
  assert.match(html,/COO委任/);
});
