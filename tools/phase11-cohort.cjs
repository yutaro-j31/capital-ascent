'use strict';
const {createRuntime}=require('../tests/harness.cjs');

const ACTORS=['growth','seller','allocator'];
const CHECKPOINTS=[520,1560,5200];

function operatingAction(r,actor,turn){
  const a=r.api,s=a.get(),b=s.company.businesses.ramen;
  if(b){b.price=Math.round(920*(actor==='seller'?1.12:actor==='allocator'?1.10:1.02));b.adSpend=actor==='growth'?80000:50000;}
  if(turn%6===0&&s.company.cash>6000000&&b)a.invest('ramen',turn%12===0?'quality':'efficiency',500000);
  const limit=actor==='growth'?18:actor==='seller'?7:10;
  if(turn%4===0&&s.company.stores.filter(function(x){return x.businessID==='ramen';}).length<limit&&s.company.cash>9000000){
    a.eval("openStore('ramen')");
  }
  if(actor==='growth'&&turn%12===0){
    a.eval("if(!state.company.businesses.conveni&&companyValue(state)>90000000&&state.company.cash>30000000){addBusiness('conveni');if(state.company.cash>25000000)openStore('conveni');}");
  }
}

function founderAction(r,actor){
  const a=r.api,s=a.get(),v=a.companyValue();
  if(actor==='seller'){
    if(s.week>=80&&v>=120000000&&!(s.career.exitRecords||[]).some(function(x){return x.type==='会社売却';}))a.eval('sellCompany()');
    return;
  }
  if(!s.company.public&&v>=80000000&&s.company.lastWeekProfit>0)a.eval('ipo()');
}

function allocatorAction(r,turn){
  const a=r.api,s=a.get();
  if(!s.pe.unlocked)return;
  if(!s.pe.funds.length){
    if(s.company.public&&s.personal.cash<15000000&&turn%4===0)a.dividend();
    a.raiseFund();
    return;
  }
  const open=s.pe.deals.find(function(d){return d.status==='open';});
  if(open){
    if(!open.dd)a.dd(open.id);
    const d=a.get().pe.deals.find(function(x){return x.id===open.id;});
    if(d&&d.dd)a.acquirePe(d.id);
  }
  const held=a.get().pe.portfolio.filter(function(p){return p.status==='held';});
  held.forEach(function(p,i){
    const live=a.get().pe.portfolio.find(function(x){return x.id===p.id;});
    if(!live)return;
    const active=(live.initiatives||[]).some(function(x){return x.status==='in_progress';});
    if(!active&&live.age>0&&live.age%26<13)a.improvePe(live.id,i%2===0?'cost':'channel');
    if(live.age>=104)a.exitPe(live.id);
  });
  const gate=a.fundGate();
  if(gate&&gate.eligible&&a.get().pe.nextFundNo<=3)a.raiseFund();
}

function captureMilestones(a,m){
  const s=a.get(),ex=s.career.exitRecords||[],funds=s.pe.funds||[],port=s.pe.portfolio||[];
  if(m.ipo==null&&s.company.public)m.ipo=s.week;
  if(m.companySale==null&&ex.some(function(x){return x.type==='会社売却';}))m.companySale=s.week;
  if(m.exit==null&&ex.length)m.exit=ex[0].week||s.week;
  if(m.peUnlock==null&&s.pe.unlocked)m.peUnlock=s.week;
  if(m.fund1==null&&funds.some(function(f){return f.number>=1;}))m.fund1=s.week;
  if(m.peDeal==null&&port.length)m.peDeal=s.week;
  if(m.peExit==null&&port.some(function(p){return p.status==='exited';}))m.peExit=s.week;
  if(m.fund2==null&&funds.some(function(f){return f.number>=2;}))m.fund2=s.week;
}

function snapshot(a,m){
  const s=a.get(),fund=(s.pe.funds||[]).slice(-1)[0],fm=fund?a.fundMetrics(fund.id):null,j=a.journey();
  return {
    week:s.week,survived:!s.gameOver,companyValue:a.companyValue(),companyCash:s.company.cash,companyDebt:s.company.debt,
    personalNetWorth:a.personalNetWorth(),public:s.company.public,peUnlocked:s.pe.unlocked,
    highestFund:(s.pe.funds||[]).reduce(function(x,f){return Math.max(x,Number(f.number)||0);},0),
    peDeals:(s.pe.portfolio||[]).length,peExits:(s.pe.portfolio||[]).filter(function(p){return p.status==='exited';}).length,
    dpi:fm?fm.dpi:0,tvpi:fm?fm.tvpi:0,journey:j.completed,milestones:Object.assign({},m)
  };
}

function progressionGap(m,finalWeek){
  const order=['exit','fund1','peDeal','peExit','fund2'],vals=[1];
  order.forEach(function(k){if(Number.isFinite(m[k]))vals.push(m[k]);});vals.push(finalWeek);vals.sort(function(a,b){return a-b;});
  let max=0;for(let i=1;i<vals.length;i++)max=Math.max(max,vals[i]-vals[i-1]);return max;
}

function runActor(actor,seedIndex,maxWeeks){
  const r=createRuntime(),a=r.api,regions=['東京','大阪','福岡','愛知'];a.fresh('P11-'+actor+'-'+seedIndex,'ramen',regions[seedIndex%regions.length]);
  a.eval('state.company.cash+=12000000;');const milestones={ipo:null,companySale:null,exit:null,peUnlock:null,fund1:null,peDeal:null,peExit:null,fund2:null},snapshots={};let turn=0;
  captureMilestones(a,milestones);
  while(a.get().week<maxWeeks&&!a.get().gameOver){
    operatingAction(r,actor,turn);founderAction(r,actor);if(actor==='allocator')allocatorAction(r,turn);
    const remaining=maxWeeks-a.get().week,step=Math.min(13,remaining);if(step<=0)break;a.simulate(step);turn++;captureMilestones(a,milestones);
    CHECKPOINTS.forEach(function(w){if(!snapshots[w]&&a.get().week>=w)snapshots[w]=snapshot(a,milestones);});
    const errors=a.validate();if(errors.length)throw new Error(actor+'/'+seedIndex+': '+errors.join(','));
  }
  CHECKPOINTS.forEach(function(w){if(!snapshots[w])snapshots[w]=snapshot(a,milestones);});
  const final=snapshot(a,milestones);final.maxProgressionGapWeeks=progressionGap(milestones,final.week);
  return {actor:actor,seedIndex:seedIndex,snapshots:snapshots,final:final};
}

function summarize(rows){
  const out={};
  CHECKPOINTS.forEach(function(w){
    const xs=rows.map(function(r){return r.snapshots[w];}),n=Math.max(1,xs.length),avg=function(k){return xs.reduce(function(a,x){return a+(Number(x[k])||0);},0)/n;};
    out[w]={runs:xs.length,survivalRate:xs.filter(function(x){return x.survived;}).length/n,ipoRate:xs.filter(function(x){return x.public;}).length/n,peUnlockRate:xs.filter(function(x){return x.peUnlocked;}).length/n,fund1Rate:xs.filter(function(x){return x.highestFund>=1;}).length/n,fund2Rate:xs.filter(function(x){return x.highestFund>=2;}).length/n,peExitRate:xs.filter(function(x){return x.peExits>0;}).length/n,avgCompanyValue:avg('companyValue'),avgPersonalNetWorth:avg('personalNetWorth')};
  });
  return out;
}

function runCohort(opts){
  opts=opts||{};const seeds=opts.seeds||2,maxWeeks=opts.maxWeeks||5200,actors=opts.actors||ACTORS,rows=[];
  for(let seed=0;seed<seeds;seed++)for(const actor of actors)rows.push(runActor(actor,seed,maxWeeks));
  return {rows:rows,summary:summarize(rows)};
}

if(require.main===module){
  const ci=process.argv.includes('--ci'),result=runCohort({seeds:ci?1:3,maxWeeks:5200});
  console.log(JSON.stringify(result.summary,null,2));
  const bad=result.rows.some(function(r){return !Number.isFinite(r.final.companyValue)||!Number.isFinite(r.final.personalNetWorth)||!Number.isFinite(r.final.maxProgressionGapWeeks);});
  if(bad){console.error('PHASE11 COHORT FAIL: non-finite long-horizon metric');process.exitCode=1;}
  const allocator=result.rows.filter(function(r){return r.actor==='allocator';});
  if(allocator.length&&!allocator.some(function(r){return r.final.peUnlocked;})){console.error('PHASE11 COHORT FAIL: allocator archetype never unlocks PE');process.exitCode=1;}
}

module.exports={ACTORS,CHECKPOINTS,runActor,runCohort,summarize};
