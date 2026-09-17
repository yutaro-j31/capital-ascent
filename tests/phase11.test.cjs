'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createRuntime}=require('./harness.cjs');

function plain(x){return JSON.parse(JSON.stringify(x));}

test('Phase 11 journey exposes factual next milestone and unlock reasons',()=>{
  const r=createRuntime();r.api.fresh('P11 JOURNEY','ramen','東京');
  let j=plain(r.api.journey());assert.equal(j.completed,1);assert.equal(j.next.id,'profit');
  const reasons=plain(r.api.unlocks());assert.ok(reasons.some(function(x){return x.name==='IPO'&&!x.ready;}));assert.ok(reasons.some(function(x){return x.name==='PE'&&!x.ready;}));
  r.api.eval('state.company.lastWeekProfit=1000000;state.company.cash=100000000;state.history.companyWeeks=[{week:1,revenue:5000000,profit:1000000,cash:100000000,debt:0,companyValue:0}];');
  j=plain(r.api.journey());assert.ok(j.completed>=2);
});

test('Phase 11 state migration adds tutorial progress without changing public save version',()=>{
  const r=createRuntime();const s=r.api.fresh('P11 SAVE','ramen','東京');delete s.progression;r.api.eval('ensureAdvancedState(state);');
  const after=plain(r.api.get());assert.equal(after.version,1);assert.equal(after.schemaVersion,2);assert.ok(after.progression&&after.progression.tutorial);assert.equal(after.progression.tutorial.dismissed,false);
});

test('Phase 11 native borrowing and repayment preserve company versus personal cash separation',()=>{
  const r=createRuntime();r.api.fresh('P11 FINANCE','ramen','東京');r.api.eval('state.company.cash=100000000;state.personal.cash=12345678;');
  const personal=r.api.get().personal.cash,companyBefore=r.api.get().company.cash,debtBefore=r.api.get().company.debt;
  assert.equal(r.api.borrowNative(5000000),true);assert.equal(r.api.get().personal.cash,personal);assert.equal(r.api.get().company.cash,companyBefore+5000000);assert.equal(r.api.get().company.debt,debtBefore+5000000);
  assert.equal(r.api.repayNative(2000000),true);assert.equal(r.api.get().personal.cash,personal);assert.equal(r.api.get().company.debt,debtBefore+3000000);
});


test('Phase 11 Fund I GP commitment is reachable but still requires founder capital',()=>{
  const r=createRuntime();r.api.fresh('P11 FUND ACCESS','ramen','東京');
  r.api.eval('state.pe.unlocked=true;state.personal.cash=20000000;');
  assert.equal(r.api.raiseFund(),true);
  const s=plain(r.api.get()),fund=s.pe.funds[0];
  assert.ok(fund.gpCommit/fund.commitments>=.015&&fund.gpCommit/fund.commitments<=.025);
  assert.ok(fund.gpContributed>0&&fund.gpContributed<20000000);
  assert.equal(fund.calledCapital,290000000);
});


test('Phase 11 PE deal tickets are sized to make the deployment gate structurally reachable',()=>{
  const r=createRuntime();r.api.fresh('P11 TICKET','ramen','東京');
  r.api.eval('state.pe.unlocked=true;state.personal.cash=100000000;raiseFund();generatePeDeals(state);');
  const s=plain(r.api.get()),fund=s.pe.funds[0],deal=s.pe.deals.find(function(d){return d.status==='open';});
  assert.ok(deal);assert.ok(deal.value>=fund.commitments/fund.slots*1.6);
  assert.ok(deal.value<=fund.commitments/fund.slots*2.3);
});
