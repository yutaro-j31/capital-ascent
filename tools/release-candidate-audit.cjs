'use strict';
const assert=require('node:assert/strict');
const {createRuntime}=require('../tests/harness.cjs');

function finite(value,path='state'){
  if(typeof value==='number')assert.ok(Number.isFinite(value),path+' must be finite');
  else if(Array.isArray(value))value.forEach((x,i)=>finite(x,path+'['+i+']'));
  else if(value&&typeof value==='object')Object.entries(value).forEach(([k,v])=>finite(v,path+'.'+k));
}

function operate(a,turn){
  const s=a.get(),b=s.company.businesses.ramen;
  if(b){b.price=Math.round(920*1.10);b.adSpend=s.company.cash>8000000?40000:10000;}
  if(turn%6===0&&s.company.cash>6500000)a.invest('ramen',turn%12===0?'quality':'efficiency',500000);
  if(turn%4===0&&s.company.cash>9000000&&s.company.stores.filter(x=>x.businessID==='ramen').length<9)a.eval("openStore('ramen')");
  const now=a.get();
  if(!now.company.public&&a.companyValue()>=80000000&&now.company.lastWeekProfit>0)a.eval('ipo()');
}

function allocate(a,turn){
  let s=a.get();if(!s.pe.unlocked)return;
  if(!s.pe.funds.length){a.raiseFund();return;}
  if((s.pe.managementCompanyCash||0)>2000000&&turn%2===0)a.eval('distributeManagementCompanyCash()');
  s=a.get();
  const f=s.pe.funds.slice(-1)[0],gpRemaining=Math.max(0,(f.gpCommit||0)-(f.gpContributed||0));
  const liquidityNeed=Math.min(gpRemaining,Math.max(15000000,(f.commitments||0)*.012));
  if(s.company.public&&s.personal.cash<liquidityNeed&&turn%2===0)a.dividend();
  const open=a.get().pe.deals.find(d=>d.status==='open');
  if(open){
    if(!open.dd)a.dd(open.id);
    const live=a.get().pe.deals.find(d=>d.id===open.id);
    if(live&&live.dd)a.acquirePe(live.id);
  }
  for(const p of a.get().pe.portfolio.filter(p=>p.status==='held')){
    const live=a.get().pe.portfolio.find(x=>x.id===p.id);if(!live)continue;
    const active=(live.initiatives||[]).some(x=>x.status==='in_progress');
    if(!active&&live.age>0&&live.age%26<13)a.improvePe(live.id,live.improvement<25?'cost':'channel');
    if(live.age>=104)a.exitPe(live.id);
  }
  const gate=a.fundGate();
  if(gate&&gate.eligible&&a.get().pe.nextFundNo<=2)a.raiseFund();
}

function capture(a,m){
  const s=a.get(),ex=s.career.exitRecords||[],funds=s.pe.funds||[],port=s.pe.portfolio||[];
  if(m.ipo==null&&s.company.public)m.ipo=s.week;
  if(m.exit==null&&ex.length)m.exit=ex[0].week||s.week;
  if(m.peUnlock==null&&s.pe.unlocked)m.peUnlock=s.week;
  if(m.fund1==null&&funds.some(f=>f.number>=1))m.fund1=s.week;
  if(m.deal==null&&port.length)m.deal=s.week;
  if(m.realization==null&&port.some(p=>p.status==='exited'))m.realization=s.week;
  if(m.fund2==null&&funds.some(f=>f.number>=2))m.fund2=s.week;
}

function runCleanStartPath(maxWeeks=520){
  const r=createRuntime(),a=r.api;
  a.fresh('RELEASE CANDIDATE','ramen','東京');
  const m={ipo:null,exit:null,peUnlock:null,fund1:null,deal:null,realization:null,fund2:null};
  let turn=0;capture(a,m);
  while(a.get().week<maxWeeks&&!a.get().gameOver&&m.fund2==null){
    operate(a,turn);allocate(a,turn);
    const step=Math.min(13,maxWeeks-a.get().week);if(step<=0)break;
    a.simulate(step);turn++;capture(a,m);
    assert.deepEqual(a.validate(),[]);
  }
  const s=a.get();finite(s);
  assert.equal(s.gameOver,false,'clean-start RC path must survive');
  assert.ok(Number.isFinite(m.ipo),'clean-start path must reach IPO');
  assert.ok(Number.isFinite(m.peUnlock),'clean-start path must unlock PE');
  assert.ok(Number.isFinite(m.fund1),'clean-start path must raise Fund I');
  assert.ok(Number.isFinite(m.deal),'clean-start path must acquire a PE deal');
  assert.ok(Number.isFinite(m.realization),'clean-start path must realize a PE investment');
  assert.ok(Number.isFinite(m.fund2),'clean-start path must raise Fund II');
  assert.ok(m.fund2<=520,'Fund II must be reachable inside 10 years from a clean start');
  return {r,a,m};
}

function auditSaveRoundTrip(source){
  const text=source.api.exportText();
  assert.ok(Buffer.byteLength(text,'utf8')<5*1024*1024,'release save must remain below 5MB');
  const target=createRuntime();
  target.api.fresh('IMPORT TARGET','ramen','大阪');
  const result=target.api.importText(text);
  assert.equal(result.ok,true,'exported save must import');
  assert.deepEqual(target.api.validate(),[]);
  assert.equal(target.api.get().schemaVersion,2);

  const legacy=JSON.parse(text);delete legacy.schemaVersion;delete legacy.progression;
  const legacyTarget=createRuntime();legacyTarget.api.fresh('LEGACY TARGET');
  const legacyResult=legacyTarget.api.importText(JSON.stringify(legacy));
  assert.equal(legacyResult.ok,true,'V1-compatible save must migrate');
  assert.equal(legacyTarget.api.get().schemaVersion,2);

  const backup=createRuntime();backup.api.fresh('BACKUP RC');backup.api.save();
  backup.api.eval('state.week=2;');backup.api.save();
  backup.storage.setItem('capital_ascent_v1','{corrupt');
  assert.ok(backup.api.load(),'corrupt primary must recover from rolling backup');
}

function auditMoneyBuckets(){
  const r=createRuntime(),a=r.api;a.fresh('ACCOUNTING RC','ramen','東京');
  a.eval('state.company.cash=10000000000;state.personal.cash=100000000;state.company.lastWeekProfit=5000000;state.company.public=true;state.company.founderOwnership=.82;state.pe.unlocked=true;');
  const company0=a.get().company.cash,personal0=a.get().personal.cash;
  assert.equal(a.raiseFund(),true);
  let s=a.get(),f=s.pe.funds[0];
  assert.equal(s.company.cash,company0,'Fund capital call must not change company cash');
  assert.ok(s.personal.cash<personal0,'GP capital call must reduce personal cash');
  assert.equal(f.cash,f.calledCapital,'initial called capital must remain in fund bucket');

  const company1=s.company.cash,personal1=s.personal.cash,fund1=f.cash;
  const call=100000000,gpRatio=f.gpCommit/f.commitments;
  assert.equal(a.callFund(f.id,call,'release-audit'),true);
  s=a.get();f=s.pe.funds[0];
  assert.equal(s.company.cash,company1,'LP/GP capital call must not touch company cash');
  assert.ok(Math.abs(s.personal.cash-(personal1-call*gpRatio))<1,'personal cash must fund only GP pro-rata');
  assert.ok(Math.abs(f.cash-(fund1+call))<1,'full capital call must enter fund cash');

  const beforeDividend={company:s.company.cash,personal:s.personal.cash,fund:f.cash};
  assert.equal(a.dividend(),true);
  s=a.get();f=s.pe.funds[0];
  assert.ok(s.company.cash<beforeDividend.company,'special dividend must reduce company cash');
  assert.ok(s.personal.cash>beforeDividend.personal,'founder share of dividend must enter personal cash');
  assert.equal(f.cash,beforeDividend.fund,'company dividend must not change PE-fund cash');

  const beforeMA={personal:s.personal.cash,fund:f.cash,company:s.company.cash};
  a.acquireSub();s=a.get();f=s.pe.funds[0];
  assert.equal(s.personal.cash,beforeMA.personal,'corporate M&A must not use personal cash');
  assert.equal(f.cash,beforeMA.fund,'corporate M&A must not use PE-fund cash');
  assert.ok(s.company.cash<=beforeMA.company,'corporate M&A must use company cash only');
  assert.deepEqual(a.validate(),[]);
}

function main(){
  const path=runCleanStartPath();
  auditSaveRoundTrip(path.r);
  auditMoneyBuckets();
  const report={
    releaseCandidate:true,
    milestones:path.m,
    finalWeek:path.a.get().week,
    companyValue:path.a.companyValue(),
    personalNetWorth:path.a.personalNetWorth(),
    schemaVersion:path.a.get().schemaVersion,
    saveBytes:Buffer.byteLength(path.a.exportText(),'utf8'),
    validationErrors:path.a.validate()
  };
  console.log(JSON.stringify(report,null,2));
}

if(require.main===module){
  try{main();}catch(err){console.error('PHASE12 RELEASE AUDIT FAIL:',err&&err.stack||err);process.exitCode=1;}
}
module.exports={runCleanStartPath,auditSaveRoundTrip,auditMoneyBuckets};
