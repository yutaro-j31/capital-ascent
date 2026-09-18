'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createRuntime}=require('./harness.cjs');

function count(text,needle){
  return text.split(needle).length-1;
}

test('operations hub renders each business entry action once and removes the duplicate lower panel',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('ENTRY HUB','ramen','東京');
  a.eval('selectedBusiness=null; selectedMapBusiness=null; selectedStoreDetail=null;');
  const html=a.operationsHtml();
  const ids=[...html.matchAll(/data-add-business="([^"]+)"/g)].map(x=>x[1]);
  assert.ok(ids.length>=1);
  assert.equal(ids.length,new Set(ids).size);
  assert.doesNotMatch(html,/m22-business-entry/);
});

test('auto expansion can launch the first store for a newly entered non-ramen business',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('AUTO EXPAND','ramen','東京');
  a.eval("state.company.cash=500_000_000; while(state.company.stores.filter(x=>x.businessID==='ramen').length<3)openStore('ramen');");
  assert.equal(a.addBusiness('gym'),true);
  assert.equal(a.get().company.stores.filter(x=>x.businessID==='gym').length,0);
  a.capitalBudget('gym',100_000_000);
  a.reviewCadence('gym','weekly');
  a.expansion('gym','aggressive');
  a.applyDelegation();
  const gyms=a.get().company.stores.filter(x=>x.businessID==='gym');
  assert.equal(gyms.length,1);
  assert.equal(gyms[0].openedBy,'delegated-management');
  assert.match(a.eval("businessUnitFor(state,'gym').lastExpansionDecision"),/初号店を自動出店/);
});

test('staged fundraising respects the player GP commitment and records multiple LP investors',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('FUNDRAISE','ramen','東京');
  a.eval('state.pe.unlocked=true; state.personal.cash=2_000_000_000; state.pe.lpTrust=95; state.pe.network=95;');
  const startingCash=a.get().personal.cash;
  assert.equal(a.fundraiseStart(2_900_000_000,100_000_000),true);
  a.eval('state.pe.fundraising.lpProspects.forEach(x=>x.relationship=98);');
  for(const lp of a.get().pe.fundraising.lpProspects.slice())a.fundraiseSolicit(lp.id);
  assert.equal(a.fundraiseDdq(),true);
  let approved=a.get().pe.fundraising.lpProspects.filter(x=>x.status==='approved');
  assert.ok(approved.length>=2);
  assert.equal(a.fundraiseAnchor(approved[0].id),true);
  approved=a.get().pe.fundraising.lpProspects.filter(x=>x.status==='approved');
  for(const lp of approved)a.fundraiseCommit(lp.id);

  for(let round=0;round<3 && a.eval('m23FundraiseTotal(state.pe.fundraising) < state.pe.fundraising.targetSize*.70');round++){
    a.fundraiseExpand();
    a.eval("state.pe.fundraising.lpProspects.filter(x=>x.status==='prospect').forEach(x=>x.relationship=98);");
    for(const lp of a.get().pe.fundraising.lpProspects.filter(x=>x.status==='prospect').slice())a.fundraiseSolicit(lp.id);
    a.fundraiseDdq();
    for(const lp of a.get().pe.fundraising.lpProspects.filter(x=>x.status==='approved').slice())a.fundraiseCommit(lp.id);
  }

  assert.ok(a.eval('m23FundraiseTotal(state.pe.fundraising) >= state.pe.fundraising.targetSize*.70'));
  assert.equal(a.fundraiseFirstClose(),true);
  assert.equal(a.fundraiseFinalClose(),true);
  const f=a.get().pe.funds[0];
  assert.equal(f.gpCommit,100_000_000);
  assert.ok(f.lpInvestors.length>=2);
  assert.equal(f.commitments,f.gpCommit+f.lpInvestors.reduce((sum,x)=>sum+x.commitment,0));
  assert.equal(startingCash-a.get().personal.cash,10_000_000);
  const html=a.peHtml();
  assert.match(html,/出資者構成/);
  assert.match(html,new RegExp(f.lpInvestors[0].name));
});

test('portfolio turnaround consumes fund capital and deterministically improves the company at completion',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('TURNAROUND','ramen','東京');
  a.eval('state.pe.unlocked=true; state.personal.cash=2_000_000_000;');
  assert.equal(a.raiseFund(),true);
  a.eval("const f=state.pe.funds[0]; f.cash=500_000_000; state.pe.portfolio=[{id:'turn1',name:'再建テスト社',businessID:'ramen',fundId:f.id,status:'held',entryWeek:1,age:60,entryValue:1_000_000_000,value:1_000_000_000,enterpriseValue:1_000_000_000,equityInvested:300_000_000,fundCostBasis:300_000_000,debt:600_000_000,leverage:.6,entryMultiple:10,ebitda:100_000_000,quality:45,risk:75,margin:.10,organicGrowth:.01,cyclicality:50,thesis:'Turnaround',improvement:0,cash:20_000_000,initiatives:[]}];");
  const cashBefore=a.get().pe.funds[0].cash;
  assert.equal(a.turnaroundPe('turn1'),true);
  const p0=a.get().pe.portfolio[0];
  assert.equal(p0.turnaround.status,'in_progress');
  assert.ok(a.get().pe.funds[0].cash<cashBefore);
  const completeWeek=p0.turnaround.completeWeek;
  a.eval('state.week='+completeWeek+';');
  a.serviceTurnarounds();
  const p=a.get().pe.portfolio[0];
  assert.equal(p.turnaround.status,'completed');
  assert.ok(p.quality>45);
  assert.ok(p.risk<75);
  assert.ok(p.ebitda>100_000_000);
  assert.match(a.peHtml(),/再建完了/);
});
