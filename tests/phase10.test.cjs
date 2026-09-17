'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createRuntime}=require('./harness.cjs');
function plain(x){return JSON.parse(JSON.stringify(x));}

test('Phase 10 Fund I uses commitments and an initial capital call without mixing company cash',()=>{
  const r=createRuntime();r.api.fresh('FUND ECON','ramen','東京');
  r.api.eval('state.personal.cash=10000000000;state.pe.unlocked=true;state.company.cash=77777777;');
  const companyBefore=r.api.get().company.cash,personalBefore=r.api.get().personal.cash;
  assert.equal(r.api.raiseFund(),true);
  const s=plain(r.api.get()),f=s.pe.funds[0];
  assert.equal(f.commitments,2900000000);assert.equal(f.calledCapital,290000000);
  assert.equal(f.cash,290000000);assert.ok(f.uncalledCommitment>0);assert.ok(f.lpContributed>0);assert.ok(f.gpContributed>0);
  assert.equal(s.company.cash,companyBefore);assert.ok(s.personal.cash<personalBefore);
  assert.ok(Math.abs((personalBefore-s.personal.cash)-f.gpContributed)<1);
});

test('Phase 10 acquisition can trigger a capital call and never exceeds commitments',()=>{
  const r=createRuntime();r.api.fresh('CALL TEST','ramen','東京');
  r.api.eval('state.personal.cash=10000000000;state.pe.unlocked=true;raiseFund();generatePeDeals(state);');
  const dealId=r.api.get().pe.deals.find(d=>d.status==='open').id;r.api.dd(dealId);
  const beforeCalled=r.api.get().pe.funds[0].calledCapital,companyBefore=r.api.get().company.cash;
  r.api.eval('state.pe.funds[0].cash=1;');
  assert.equal(r.api.acquirePe(dealId),true);
  const s=plain(r.api.get()),f=s.pe.funds[0];
  assert.ok(f.calledCapital>beforeCalled);assert.ok(f.calledCapital<=f.commitments);assert.ok(f.uncalledCommitment>=0);
  assert.equal(s.company.cash,companyBefore);assert.equal(s.pe.portfolio.length,1);
});

test('Phase 10 next fund gate requires DPI, deployment and LP trust',()=>{
  const r=createRuntime();r.api.fresh('FUND II','ramen','東京');r.api.eval('state.personal.cash=10000000000;state.pe.unlocked=true;');
  r.api.raiseFund();let gate=plain(r.api.fundGate());assert.equal(gate.eligible,false);assert.ok(gate.reasons.length>=2);
  r.api.eval('const f=state.pe.funds[0];f.calledCapital=f.commitments;f.gpContributed=f.gpCommit;f.lpContributed=f.lpCommit;f.uncalledCommitment=0;f.invested=f.commitments*.85;f.distributed=f.commitments*1.25;state.pe.lpTrust=65;');
  gate=plain(r.api.fundGate());assert.equal(gate.eligible,true);
  assert.equal(r.api.raiseFund(),true);const s=plain(r.api.get());assert.equal(s.pe.funds.length,2);assert.equal(s.pe.funds[1].id,'F2');
});

test('Phase 10 fund metrics expose finite DPI TVPI NAV and deployment',()=>{
  const r=createRuntime();r.api.fresh('METRICS','ramen','東京');r.api.eval('state.personal.cash=10000000000;state.pe.unlocked=true;');r.api.raiseFund();
  const m=plain(r.api.fundMetrics('F1'));for(const k of ['paidIn','nav','distributed','dpi','tvpi','deployment','reserveRatio','uncalled'])assert.ok(Number.isFinite(m[k]),k);
  assert.equal(m.dpi,0);assert.equal(m.nav,0);assert.ok(m.uncalled>0);
});

test('Phase 10 PE exit updates fund distributions, carry and personal GP economics',()=>{
  const r=createRuntime();r.api.fresh('WATERFALL','ramen','東京');r.api.eval('state.personal.cash=10000000000;state.pe.unlocked=true;raiseFund();generatePeDeals(state);');
  const id=r.api.get().pe.deals.find(d=>d.status==='open').id;r.api.dd(id);assert.equal(r.api.acquirePe(id),true);
  r.api.eval(`const p=state.pe.portfolio[0];p.age=104;p.quality=92;p.risk=8;p.improvement=100;p.ebitda=p.entryValue/4;p.debt=0;p.cash=0;`);
  const personalBefore=r.api.get().personal.cash;assert.equal(r.api.exitPe(id),true);
  const s=plain(r.api.get()),f=s.pe.funds[0],p=s.pe.portfolio[0],m=plain(r.api.fundMetrics('F1'));
  assert.equal(p.status,'exited');assert.ok(f.distributed>0);assert.ok(f.carryPaid>0);assert.ok(f.gpDistributions>0);assert.ok(s.personal.cash>personalBefore);assert.ok(m.dpi>0);
});

test('Phase 10 corporate PMI is delayed and changes subsidiary economics only at completion',()=>{
  const r=createRuntime();r.api.fresh('PMI','ramen','東京');r.api.eval('state.company.cash=100000000000;');r.api.acquireSub();
  const subId=r.api.get().company.subsidiaryPortfolio[0].id,before=r.api.get().company.subsidiaryPortfolio[0].synergy;
  assert.equal(r.api.integrateSub(subId,'synergy'),true);r.api.simulate(12);
  let s=plain(r.api.get()),sub=s.company.subsidiaryPortfolio.find(x=>x.id===subId),proj=s.company.integrationProjects[0];
  assert.equal(proj.status,'in_progress');assert.equal(sub.synergy,before);
  r.api.simulate(1);s=plain(r.api.get());sub=s.company.subsidiaryPortfolio.find(x=>x.id===subId);proj=s.company.integrationProjects[0];
  assert.equal(proj.status,'completed');assert.ok(sub.synergy>before);assert.ok(['integrated','partial'].includes(sub.integrationStatus));
});

test('Phase 10 dividend and buyback preserve company versus personal accounting',()=>{
  const r=createRuntime();r.api.fresh('PUBLIC CAPITAL','ramen','東京');
  r.api.eval('state.company.public=true;state.company.founderOwnership=.80;state.company.cash=200000000;state.personal.cash=10000000;state.company.lastWeekProfit=2000000;state.history.companyWeeks=[{week:1,revenue:10000000,profit:2000000,cash:200000000,debt:0,companyValue:0}];');
  const c0=r.api.get().company.cash,p0=r.api.get().personal.cash,o0=r.api.get().company.founderOwnership;
  assert.equal(r.api.dividend(),true);const c1=r.api.get().company.cash,p1=r.api.get().personal.cash;
  assert.ok(c1<c0);assert.ok(p1>p0);assert.ok((c0-c1)>(p1-p0));
  assert.equal(r.api.buyback(),true);const s=plain(r.api.get());assert.ok(s.company.cash<c1);assert.ok(s.company.founderOwnership>o0);assert.equal(s.company.capitalAllocation.buybacks,1);
});
