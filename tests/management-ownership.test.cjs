'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createRuntime}=require('./harness.cjs');

function near(a,b,tol=2){assert.ok(Math.abs(a-b)<=tol,'expected '+a+' ≈ '+b);}

test('IPO secondary percentage controls personal proceeds and founder ownership',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('IPO TEST','ramen','東京');
  a.eval('state.company.cash=120000000;state.company.lastWeekProfit=5000000;state.company.founderOwnership=1;');
  const value=a.companyValue(),before=a.get().personal.cash;
  assert.equal(a.ipoPct(.20),true);
  const s=a.get();
  assert.equal(s.company.public,true);
  near(s.personal.cash-before,value*.20);
  near(s.company.ipoTerms.secondaryPct,.20,.000001);
  near(s.company.founderOwnership,.8/1.1,.000001);
  assert.equal(s.career.exitRecords.filter(x=>x.type==='IPO').length,1);
});

test('company sale records one lifecycle and public founder only receives owned stake',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('SALE TEST','ramen','東京');
  a.eval('state.week=100;state.company.cash=220000000;state.company.lastWeekProfit=5000000;state.company.public=true;state.company.founderOwnership=.5;');
  const life=a.get().company.lifecycleId,value=a.companyValue(),before=a.get().personal.cash;
  assert.equal(a.sellCompany(),true);
  const s=a.get();
  near(s.personal.cash-before,value*.88*.5);
  assert.equal(s.career.completedCompanySales.filter(x=>x===life).length,1);
  assert.equal(s.career.exitRecords.filter(x=>x.type==='会社売却').length,1);
  const after=s.personal.cash;
  assert.equal(a.sellCompany(),false);
  assert.equal(a.get().personal.cash,after);
});

test('delegated manager can autonomously open a store when mandate and economics allow',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('DELEGATION TEST','ramen','東京');
  a.eval("state.company.cash=500000000;openStore('ramen');openStore('ramen');state.week=13;for(const s of state.company.stores){s.lastRevenue=10000000;s.lastProfit=2000000;}");
  assert.ok(a.get().company.stores.length>=3);
  a.policy('ramen','growth');
  a.autonomy('ramen','high');
  a.reviewCadence('ramen','monthly');
  a.weeklyBudget('ramen',1500000);
  a.capitalBudget('ramen',100000000);
  a.expansion('ramen','aggressive');
  const before=a.get().company.stores.length;
  a.applyDelegation();
  const after=a.get().company.stores.length;
  assert.equal(after,before+1);
  const opened=a.get().company.stores[a.get().company.stores.length-1];
  assert.equal(opened.openedBy,'delegated-management');
});

test('manager weekly and capital budgets are editable and review cadence has real effects',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('BUDGET TEST','ramen','東京');
  a.eval("state.company.cash=200000000;openStore('ramen');openStore('ramen');for(const s of state.company.stores){s.lastRevenue=10000000;s.lastProfit=1500000;}");
  a.weeklyBudget('ramen',1200000);
  a.capitalBudget('ramen',42000000);
  const u=a.get().management.businessUnits.ramen;
  assert.equal(u.weeklyBudget,1200000);
  assert.equal(u.capitalBudget,42000000);
  const weekly=a.eval("m21ReviewEffect({reviewCadence:'weekly'})");
  const quarterly=a.eval("m21ReviewEffect({reviewCadence:'quarterly'})");
  assert.ok(weekly.speed<quarterly.speed);
  assert.ok(weekly.risk<quarterly.risk);
});

test('CXO can be hired and replaced with deterministic candidates',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('CXO TEST','ramen','東京');
  a.eval("state.company.cash=500000000;openStore('ramen');openStore('ramen');");
  const candidates=a.cxoCandidates('COO');
  assert.equal(candidates.length,3);
  assert.equal(a.hireCxo('COO',candidates[0].id),true);
  const first=a.get().management.executives.COO;
  assert.equal(first.id,candidates[0].id);
  const cashAfterFirst=a.get().company.cash;
  assert.equal(a.hireCxo('COO',candidates[1].id),true);
  const second=a.get().management.executives.COO;
  assert.equal(second.id,candidates[1].id);
  assert.notEqual(second.id,first.id);
  assert.ok(a.get().company.cash<cashAfterFirst);
});

test('PE view exposes the operating sequence and metric explanations',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('PE GUIDE','ramen','東京');
  a.eval('state.pe.unlocked=true;');
  const html=a.eval('peView()');
  assert.match(html,/PEファームの進め方/);
  assert.match(html,/ファンドを作る/);
  assert.match(html,/企業調査をする/);
  assert.match(html,/回収済倍率/);
  assert.match(html,/総合倍率/);
  assert.match(html,/外部投資家/);
});

test('policy guide explains strategy differences and current delegation status',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('POLICY GUIDE','ramen','東京');
  const html=a.eval("m21PolicyGuidePanel('ramen')");
  assert.match(html,/経営ポリシーの違い/);
  assert.match(html,/高付加価値/);
  assert.match(html,/成長優先/);
  assert.match(html,/利益率優先/);
  assert.match(html,/シェア優先/);
  assert.match(html,/現金温存/);
  assert.match(html,/CEO手動/);
});
