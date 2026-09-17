'use strict';

// Phase 10: complete the CEO -> capital allocator transition.
// Adds fund-level LP economics, portfolio construction, fund sequencing,
// corporate M&A integration and explicit public-company capital allocation.
const _p10EnsureAdvancedState=ensureAdvancedState;
const _p10ServicePE=servicePE;
const _p10ProcessCompanyWeek=processCompanyWeek;
const _p10ServiceSubsidiaries=serviceSubsidiaries;
const _p10AcquireSubsidiary=acquireSubsidiary;
const _p10PeView=peView;
const _p10Market=market;
const _p10Bind=bind;

const PHASE10_INTEGRATIONS={
  standalone:{label:'Stand-alone',duration:1,costRate:0,synergy:0,quality:0,margin:0,growth:0,risk:.02},
  synergy:{label:'Synergy Capture',duration:13,costRate:.018,synergy:16,quality:2,margin:.010,growth:.004,risk:.16},
  turnaround:{label:'Turnaround',duration:20,costRate:.032,synergy:8,quality:12,margin:.020,growth:.010,risk:.24},
  merge:{label:'Full Integration',duration:16,costRate:.026,synergy:23,quality:5,margin:.014,growth:.006,risk:.21}
};

function ensurePhase10State(s){
  _p10EnsureAdvancedState(s);
  s.pe.managementCompanyCash=Number.isFinite(s.pe.managementCompanyCash)?s.pe.managementCompanyCash:0;
  s.pe.fundHistory=Array.isArray(s.pe.fundHistory)?s.pe.fundHistory:[];
  s.company.integrationProjects=Array.isArray(s.company.integrationProjects)?s.company.integrationProjects:[];
  s.company.capitalAllocation=s.company.capitalAllocation||{dividendsPaid:0,buybackSpend:0,buybacks:0};
  if(!Number.isFinite(s.company.capitalAllocation.dividendsPaid))s.company.capitalAllocation.dividendsPaid=0;
  if(!Number.isFinite(s.company.capitalAllocation.buybackSpend))s.company.capitalAllocation.buybackSpend=0;
  if(!Number.isFinite(s.company.capitalAllocation.buybacks))s.company.capitalAllocation.buybacks=0;
  for(const f of s.pe.funds||[]){
    f.commitments=Number.isFinite(f.commitments)?f.commitments:(Number(f.size)||0);
    f.gpCommit=Number.isFinite(f.gpCommit)?f.gpCommit:f.commitments*.02;
    f.lpCommit=Number.isFinite(f.lpCommit)?f.lpCommit:Math.max(0,f.commitments-f.gpCommit);
    f.calledCapital=Number.isFinite(f.calledCapital)?f.calledCapital:f.commitments;
    f.gpContributed=Number.isFinite(f.gpContributed)?f.gpContributed:Math.min(f.gpCommit,f.calledCapital*(f.gpCommit/Math.max(1,f.commitments)));
    f.lpContributed=Number.isFinite(f.lpContributed)?f.lpContributed:Math.max(0,f.calledCapital-f.gpContributed);
    f.uncalledCommitment=Math.max(0,f.commitments-f.calledCapital);
    f.managementFeeRate=Number.isFinite(f.managementFeeRate)?f.managementFeeRate:.02;
    f.managementFeesPaid=Number.isFinite(f.managementFeesPaid)?f.managementFeesPaid:0;
    f.carryRate=Number.isFinite(f.carryRate)?f.carryRate:.20;
    f.preferredReturn=Number.isFinite(f.preferredReturn)?f.preferredReturn:.08;
    f.carryPaid=Number.isFinite(f.carryPaid)?f.carryPaid:0;
    f.gpDistributions=Number.isFinite(f.gpDistributions)?f.gpDistributions:0;
    f.reserveTarget=Number.isFinite(f.reserveTarget)?f.reserveTarget:.15;
    f.capitalCallHistory=Array.isArray(f.capitalCallHistory)?f.capitalCallHistory:[];
    f.distributionHistory=Array.isArray(f.distributionHistory)?f.distributionHistory:[];
    if(f.capitalCallHistory.length>80)f.capitalCallHistory=f.capitalCallHistory.slice(-80);
    if(f.distributionHistory.length>80)f.distributionHistory=f.distributionHistory.slice(-80);
    f.status=phase10FundStatus(s,f);
  }
  for(const p of s.pe.portfolio||[]){
    p.fundCostBasis=Number.isFinite(p.fundCostBasis)?p.fundCostBasis:(Number(p.equityInvested)||0);
  }
  for(const sub of s.company.subsidiaryPortfolio||[]){
    sub.integrationStatus=sub.integrationStatus||'standalone';
    sub.integrationMode=sub.integrationMode||'standalone';
  }
  if(s.company.integrationProjects.length>60)s.company.integrationProjects=s.company.integrationProjects.slice(-60);
  if(s.pe.fundHistory.length>30)s.pe.fundHistory=s.pe.fundHistory.slice(-30);
  return s;
}
ensureAdvancedState=ensurePhase10State;

function phase10FundStatus(s,f){
  if(s.week<=f.investmentEndWeek)return 'investing';
  if(s.week<=f.endWeek)return 'harvesting';
  return 'mature';
}

function fundPortfolio(s,f){return (s.pe.portfolio||[]).filter(p=>p.fundId===f.id);}
function fundNAV(s,f){
  return fundPortfolio(s,f).filter(p=>p.status==='held').reduce((sum,p)=>sum+Math.max(0,(Number(p.value)||0)-(Number(p.debt)||0)+(Number(p.cash)||0)),0);
}
function fundSectorExposure(s,f){
  const rows={};let total=0;
  for(const p of fundPortfolio(s,f).filter(x=>x.status==='held')){
    const equity=Math.max(0,Number(p.equityInvested)||0);rows[p.businessID]=(rows[p.businessID]||0)+equity;total+=equity;
  }
  return {rows,total};
}
function fundMetrics(f,s=state){
  ensurePhase10State(s);
  const paidIn=Math.max(0,Number(f.calledCapital)||0),nav=fundNAV(s,f),distributed=Math.max(0,Number(f.distributed)||0);
  const dpi=paidIn>0?distributed/paidIn:0;
  const tvpi=paidIn>0?(distributed+nav)/paidIn:0;
  const deployment=clamp((Number(f.invested)||0)/Math.max(1,Number(f.commitments)||Number(f.size)||1),0,2);
  const reserveRatio=clamp((Number(f.cash)||0)/Math.max(1,Number(f.commitments)||1),0,1);
  return {paidIn,nav,distributed,dpi,tvpi,deployment,reserveRatio,uncalled:Math.max(0,(Number(f.commitments)||0)-paidIn),status:phase10FundStatus(s,f)};
}

function nextFundEligibility(s=state){
  ensurePhase10State(s);
  if(!s.pe.unlocked)return {eligible:false,reasons:['PE未解禁'],previous:null};
  if(!s.pe.funds.length)return {eligible:true,reasons:[],previous:null};
  const previous=s.pe.funds[s.pe.funds.length-1],m=fundMetrics(previous,s),reasons=[];
  if(m.dpi<1.20)reasons.push(`DPI ${m.dpi.toFixed(2)}x / 1.20x必要`);
  if(m.deployment<.80)reasons.push(`Deployment ${pct(m.deployment)} / 80%必要`);
  if((s.pe.lpTrust||0)<45)reasons.push(`LP Trust ${Math.round(s.pe.lpTrust)} / 45必要`);
  return {eligible:reasons.length===0,reasons,previous,metrics:m};
}

function callFundCapital(f,amount,reason='investment'){
  ensurePhase10State(state);
  const remaining=Math.max(0,f.commitments-f.calledCapital);
  const call=Math.min(Math.max(0,Number(amount)||0),remaining);
  if(call<=0)return true;
  const gpRatio=f.gpCommit/Math.max(1,f.commitments),gpNeed=call*gpRatio;
  if(state.personal.cash<gpNeed){alert(`Capital Callに必要なGP出資 ${yen(gpNeed)} が個人現金を超えています。`);return false;}
  state.personal.cash-=gpNeed;
  f.gpContributed+=gpNeed;f.lpContributed+=call-gpNeed;f.calledCapital+=call;f.uncalledCommitment=Math.max(0,f.commitments-f.calledCapital);f.cash+=call;
  f.capitalCallHistory.push({week:state.week,amount:call,gp:gpNeed,lp:call-gpNeed,reason});
  if(f.capitalCallHistory.length>80)f.capitalCallHistory.shift();
  log(`${f.id}: Capital Call ${yen(call)}（${reason}）。GP ${yen(gpNeed)} / LP ${yen(call-gpNeed)}。`,'major');
  return true;
}

raiseFund=function(){
  ensurePhase10State(state);
  const gate=nextFundEligibility(state);if(!gate.eligible){alert(`次号ファンドの条件未達:\n${gate.reasons.join('\n')}`);return false;}
  const fundNo=state.pe.nextFundNo,score=trackScore(state);
  let size=2.9e9;
  if(gate.previous){
    const pm=gate.metrics,growth=clamp(1.18+(pm.tvpi-1)*.36+(state.pe.lpTrust-50)/180,1.08,1.90);
    size=Math.min(1e12,gate.previous.size*growth);
  }
  const gpCommit=size*gpRatio(score),initialCall=size*.10,initialGp=initialCall*(gpCommit/size);
  if(state.personal.cash<initialGp){alert(`First Closeに必要なGP Capital Call ${yen(initialGp)} が不足しています。`);return false;}
  const f={
    id:`F${fundNo}`,number:fundNo,size,commitments:size,gpCommit,lpCommit:size-gpCommit,
    cash:0,calledCapital:0,gpContributed:0,lpContributed:0,uncalledCommitment:size,
    distributed:0,invested:0,coInvestUsed:0,startWeek:state.week,investmentEndWeek:state.week+260,endWeek:state.week+520,
    slots:fundNo<3?3:fundNo<5?5:7,ddUsedYear:0,ddYear:Math.floor((state.week-1)/52)+1,realizedGain:0,
    managementFeeRate:.02,managementFeesPaid:0,carryRate:.20,preferredReturn:.08,carryPaid:0,gpDistributions:0,reserveTarget:.15,
    capitalCallHistory:[],distributionHistory:[],status:'investing'
  };
  state.pe.funds.push(f);state.pe.nextFundNo++;
  if(!callFundCapital(f,initialCall,'first-close')){state.pe.funds.pop();state.pe.nextFundNo--;return false;}
  log(`Fund ${fundNo} First Close: Commitments ${yen(size)} / Initial Call ${yen(initialCall)}。`,'major');save();render();return true;
};

function ensureFundLiquidity(f,required,reason){
  const need=Math.max(0,required-f.cash);if(need<=0)return true;
  return callFundCapital(f,need,reason);
}

function dealPortfolioConstruction(f,d,equity){
  const exposure=fundSectorExposure(state,f),afterTotal=exposure.total+equity,afterSector=(exposure.rows[d.businessID]||0)+equity;
  const concentration=afterTotal>0?afterSector/afterTotal:0;
  const held=fundPortfolio(state,f).filter(x=>x.status==='held').length;
  const reasons=[];
  if(equity>f.commitments*.45)reasons.push('単一案件がFund commitmentsの45%を超える');
  if(held>=1&&concentration>.60)reasons.push(`同一セクター集中 ${pct(concentration)} > 60%`);
  if(held>=f.slots)reasons.push('保有スロット上限');
  return {approved:reasons.length===0,reasons,concentration};
}

acquireDeal=function(id){
  ensurePhase10State(state);
  const d=state.pe.deals.find(x=>x.id===id),f=currentFund();if(!d||!f||!d.dd)return false;
  const quality=Number(d.quality)||50,risk=Number(d.risk)||50;
  const leverage=clamp(.52+(quality-risk)/420,.35,Math.min(.68,d.debtCapacity||.60));
  const debt=d.value*leverage,equity=d.value-debt,ic=dealPortfolioConstruction(f,d,equity);
  if(!ic.approved){alert(`Investment Committee否決:\n${ic.reasons.join('\n')}`);return false;}
  const operatingReserve=Math.min(f.commitments*.05,Math.max(0,f.commitments-f.calledCapital));
  if(!ensureFundLiquidity(f,equity+operatingReserve,'acquisition'))return false;
  if(f.cash<equity){alert('ファンド現金が不足しています。');return false;}
  f.cash-=equity;f.invested+=equity;d.status='won';
  state.pe.portfolio.unshift({
    id:d.id,name:d.name,businessID:d.businessID,fundId:f.id,entryWeek:state.week,age:0,
    entryValue:d.value,value:d.value,enterpriseValue:d.value,equityInvested:equity,fundCostBasis:equity,debt,
    leverage,entryMultiple:d.entryMultiple||d.value/Math.max(1,d.ebitda),ebitda:d.ebitda,
    quality,risk,margin:d.margin||.15,organicGrowth:d.organicGrowth||.03,cyclicality:d.cyclicality||50,
    thesis:d.thesis||'Operational improvement',improvement:0,cash:d.value*.03,status:'held',initiatives:[]
  });
  log(`${d.name} Investment Committee承認。EV ${yen(d.value)} / Equity ${yen(equity)} / Sector concentration ${pct(ic.concentration)}。`,'major');
  save();render();return true;
};

exitPortfolio=function(id){
  ensurePhase10State(state);
  const p=state.pe.portfolio.find(x=>x.id===id),f=state.pe.funds.find(x=>x.id===p?.fundId);if(!p||!f||p.status!=='held')return false;
  if(p.age<52&&!confirm('保有1年未満です。Exitしますか？'))return false;
  const exitMultiple=clamp(p.entryMultiple+(p.quality-50)/38+p.improvement/42-(p.risk-50)/55+state.macro.cycle*.6,4.5,15);
  const exitValue=Math.max(0,p.ebitda*exitMultiple),equityProceeds=Math.max(0,exitValue-p.debt+(p.cash||0));
  const gain=equityProceeds-p.equityInvested,years=Math.min(5,Math.max(0,p.age)/52),hurdle=p.equityInvested*Math.pow(1+f.preferredReturn,years);
  const carry=Math.max(0,equityProceeds-hurdle)*f.carryRate,gpProRata=equityProceeds*(f.gpCommit/Math.max(1,f.commitments));
  const gpDistribution=gpProRata+carry;
  state.personal.cash+=gpDistribution;f.distributed+=equityProceeds;f.realizedGain+=gain;f.carryPaid+=carry;f.gpDistributions+=gpDistribution;
  f.distributionHistory.push({week:state.week,portfolioId:p.id,proceeds:equityProceeds,carry,gpDistribution});if(f.distributionHistory.length>80)f.distributionHistory.shift();
  p.status='exited';p.exitValue=exitValue;p.exitMultiple=exitMultiple;p.exitEquity=equityProceeds;p.moic=equityProceeds/Math.max(1,p.equityInvested);p.exitWeek=state.week;
  const m=fundMetrics(f,state);state.pe.lpTrust=clamp(state.pe.lpTrust+(p.moic>=1.8?3:p.moic>=1.2?1:-3),0,100);
  log(`${p.name} Exit: MOIC ${p.moic.toFixed(2)}x / Fund DPI ${m.dpi.toFixed(2)}x / Carry ${yen(carry)}。`,'major');save();render();return true;
};

function serviceFundEconomics(s){
  ensurePhase10State(s);
  for(const f of s.pe.funds){
    f.status=phase10FundStatus(s,f);
    if(f.status==='mature')continue;
    const age=s.week-f.startWeek,rate=age<=260?f.managementFeeRate:f.managementFeeRate*.75,weeklyFee=f.commitments*rate/52;
    if(f.cash<weeklyFee){
      const remaining=Math.max(0,f.commitments-f.calledCapital),call=Math.min(remaining,Math.max(weeklyFee-f.cash,f.commitments*.005));
      if(call>0){
        const gpRatio=f.gpCommit/Math.max(1,f.commitments),gpNeed=call*gpRatio;
        if(s.personal.cash>=gpNeed){s.personal.cash-=gpNeed;f.gpContributed+=gpNeed;f.lpContributed+=call-gpNeed;f.calledCapital+=call;f.cash+=call;f.uncalledCommitment=Math.max(0,f.commitments-f.calledCapital);f.capitalCallHistory.push({week:s.week,amount:call,gp:gpNeed,lp:call-gpNeed,reason:'fees'});}
      }
    }
    const paid=Math.min(f.cash,weeklyFee);f.cash-=paid;f.managementFeesPaid+=paid;s.pe.managementCompanyCash+=paid;
    if(f.capitalCallHistory.length>80)f.capitalCallHistory=f.capitalCallHistory.slice(-80);
  }
}

servicePE=function(s){_p10ServicePE(s);serviceFundEconomics(s);};

acquireSubsidiary=function(){
  const before=(state.company.subsidiaryPortfolio||[]).length;_p10AcquireSubsidiary();ensurePhase10State(state);
  if(state.company.subsidiaryPortfolio.length>before){const sub=state.company.subsidiaryPortfolio[state.company.subsidiaryPortfolio.length-1];sub.integrationStatus='standalone';sub.integrationMode='standalone';save();}
};

function integrationProjectFor(subId){return (state.company.integrationProjects||[]).find(p=>p.subsidiaryId===subId&&p.status==='in_progress')||null;}
function startSubsidiaryIntegration(subId,mode){
  ensurePhase10State(state);const sub=state.company.subsidiaryPortfolio.find(x=>x.id===subId&&x.status==='held'),cfg=PHASE10_INTEGRATIONS[mode];if(!sub||!cfg)return false;
  if(integrationProjectFor(subId)){alert('この子会社は統合プロジェクト進行中です。');return false;}
  if(mode==='standalone'){sub.integrationMode='standalone';sub.integrationStatus='standalone';save();render();return true;}
  const cost=Math.max(500000,sub.acquisitionPrice*cfg.costRate);if(state.company.cash<cost){alert(`PMI費用 ${yen(cost)} が不足しています。`);return false;}
  state.company.cash-=cost;const p={id:uid('pmi',`${state.seed}:${subId}:${mode}:${state.week}`),subsidiaryId:subId,mode,cost,startWeek:state.week,completeWeek:state.week+cfg.duration,status:'in_progress',executionRisk:cfg.risk};
  state.company.integrationProjects.push(p);sub.integrationMode=mode;sub.integrationStatus='integrating';sub.integrationDrag=.08;
  log(`${sub.name}: PMI ${cfg.label}開始。${cfg.duration}週 / ${yen(cost)}。`,'major');save();render();return true;
}

function serviceCorporateIntegrations(s){
  ensurePhase10State(s);
  for(const p of s.company.integrationProjects){
    if(p.status!=='in_progress'||p.completeWeek>s.week)continue;
    const sub=s.company.subsidiaryPortfolio.find(x=>x.id===p.subsidiaryId),cfg=PHASE10_INTEGRATIONS[p.mode];if(!sub||!cfg){p.status='cancelled';continue;}
    const managementBonus=(sub.managementQuality-50)/250,success=u01(`pmi:${p.id}:outcome`)>=clamp(p.executionRisk-managementBonus,.05,.45),factor=success?1:.5;
    sub.synergy=clamp(sub.synergy+cfg.synergy*factor,0,100);sub.managementQuality=clamp(sub.managementQuality+cfg.quality*factor,0,100);sub.margin=clamp(sub.margin+cfg.margin*factor,.03,.35);sub.growth+=cfg.growth*factor;
    sub.integrationStatus=success?'integrated':'partial';sub.integrationDrag=0;p.status='completed';p.completedWeek=s.week;p.outcome=success?'full':'partial';
    log(`${sub.name}: PMI ${cfg.label} ${success?'完了':'一部達成'}。Synergy ${sub.synergy.toFixed(0)}。`,success?'good':'major');
  }
}

serviceSubsidiaries=function(s){
  const result=_p10ServiceSubsidiaries(s);
  for(const sub of s.company.subsidiaryPortfolio||[]){
    if(sub.status!=='held'||sub.integrationStatus!=='integrating')continue;
    const drag=Math.max(0,Number(sub.lastProfit)||0)*(Number(sub.integrationDrag)||.08);sub.lastProfit-=drag;result.profit-=drag;
  }
  return result;
};

processCompanyWeek=function(s){serviceCorporateIntegrations(s);_p10ProcessCompanyWeek(s);};

function sellSubsidiaryById(id){
  ensurePhase10State(state);const sub=state.company.subsidiaryPortfolio.find(x=>x.id===id&&x.status==='held');if(!sub)return false;
  const multiple=clamp(6.2+sub.managementQuality/45+sub.synergy/80+state.macro.cycle*.7,4.5,12),ev=Math.max(0,(sub.ebitda||0)*multiple),proceeds=Math.max(0,ev-(sub.debt||0));
  sub.status='sold';sub.saleWeek=state.week;sub.saleEnterpriseValue=ev;sub.saleProceeds=proceeds;state.company.cash+=proceeds;state.company.subsidiaries=state.company.subsidiaryPortfolio.filter(x=>x.status==='held').length;
  recordExit('子会社売却',proceeds,proceeds/Math.max(1,sub.acquisitionPrice),ev);log(`${sub.name}をDivest。EV ${yen(ev)} / Proceeds ${yen(proceeds)}。`,'major');save();render();return true;
}
sellSubsidiary=function(){const held=state.company.subsidiaryPortfolio.filter(x=>x.status==='held');return held.length?sellSubsidiaryById(held[held.length-1].id):false;};

function capitalAllocationSnapshot(s=state){
  ensurePhase10State(s);const v=companyValue(s),credit=clamp(Number(s.company.credit)||60,20,95),debtCapacity=Math.max(0,v*(.20+(credit/100)*.32)-s.company.debt);
  const activeProjects=(s.projects||[]).filter(p=>p.status==='in_progress').reduce((a,p)=>a+(Number(p.cost)||0),0),heldSubs=s.company.subsidiaryPortfolio.filter(x=>x.status==='held');
  return {companyValue:v,cash:s.company.cash,debt:s.company.debt,debtCapacity,activeProjects,subsidiaries:heldSubs.length,publicFloat:s.company.public?Math.max(0,1-s.company.founderOwnership):0};
}

function paySpecialDividend(){
  ensurePhase10State(state);if(!state.company.public){alert('特別配当はIPO後に利用できます。');return false;}
  const amount=Math.min(state.company.cash*.10,companyValue(state)*.02);if(amount<500000||state.company.cash-amount<3000000){alert('配当余力が不足しています。');return false;}
  state.company.cash-=amount;const founder=amount*state.company.founderOwnership;state.personal.cash+=founder;state.company.capitalAllocation.dividendsPaid+=amount;
  log(`特別配当 ${yen(amount)}。Founder受取 ${yen(founder)} / Ownership ${pct(state.company.founderOwnership)}。`,'major');save();render();return true;
}

function executeBuyback(){
  ensurePhase10State(state);if(!state.company.public){alert('自社株買いはIPO後に利用できます。');return false;}
  const publicFloat=Math.max(0,1-state.company.founderOwnership);if(publicFloat<.02){alert('市場流通株が少なすぎます。');return false;}
  const repurchasePct=Math.min(.02,publicFloat*.25),cost=companyValue(state)*repurchasePct;if(state.company.cash-cost<3000000){alert('自社株買い後の会社現金が不足します。');return false;}
  state.company.cash-=cost;state.company.founderOwnership=clamp(state.company.founderOwnership/(1-repurchasePct),0,1);state.company.capitalAllocation.buybackSpend+=cost;state.company.capitalAllocation.buybacks++;
  log(`自社株買い ${yen(cost)}。Founder ownership ${pct(state.company.founderOwnership)}。`,'major');save();render();return true;
}

function distributeManagementCompanyCash(){
  ensurePhase10State(state);const amount=state.pe.managementCompanyCash*.50;if(amount<100000){alert('GP会社の分配可能現金が不足しています。');return false;}
  state.pe.managementCompanyCash-=amount;state.personal.cash+=amount;log(`GP management companyから ${yen(amount)} を個人へ分配。`);save();render();return true;
}

function phase10AllocationPanel(){
  const a=capitalAllocationSnapshot(state),subs=state.company.subsidiaryPortfolio.filter(x=>x.status==='held');
  const subRows=subs.map(sub=>{const p=integrationProjectFor(sub.id);return `<div class="p10-sub-row"><div><b>${sub.name}</b><span>EBITDA ${yen(sub.ebitda)} · Debt ${yen(sub.debt)} · Synergy ${sub.synergy.toFixed(0)} · ${sub.integrationStatus}</span></div><div class="p10-sub-actions">${p?`<span class="pill warn">${PHASE10_INTEGRATIONS[p.mode].label} W${p.completeWeek}</span>`:`<button class="btn" data-p10-integration="synergy" data-p10-sub="${sub.id}">Synergy</button><button class="btn ghost" data-p10-integration="turnaround" data-p10-sub="${sub.id}">Turnaround</button>`}<button class="btn danger" data-p10-sell-sub="${sub.id}">Divest</button></div></div>`;}).join('')||'<p class="sub">保有子会社はありません。M&A候補取得後にPMIを選択できます。</p>';
  return `<section class="card p10-allocation"><div class="section-row"><div><h2>Capital Allocation Office</h2><p class="sub">会社資本をCAPEX・M&A・Debt・株主還元へ配分するCEOレイヤー。</p></div><span class="pill">PHASE 10</span></div><div class="p10-metrics"><div><small>Company Cash</small><b>${yen(a.cash)}</b></div><div><small>Debt Capacity</small><b>${yen(a.debtCapacity)}</b></div><div><small>Active Projects</small><b>${yen(a.activeProjects)}</b></div><div><small>Subsidiaries</small><b>${a.subsidiaries}</b></div></div><div class="actions"><button class="btn primary" data-act="acquireSub">M&A候補を取得</button><button class="btn" data-p10-dividend ${state.company.public?'':'disabled'}>特別配当</button><button class="btn" data-p10-buyback ${state.company.public?'':'disabled'}>自社株買い</button></div><h3 style="margin-top:14px">Post-Merger Integration</h3><div class="p10-sub-list">${subRows}</div></section>`;
}

market=function(){return _p10Market().replace('</main>',`${phase10AllocationPanel()}</main>`);};

function phase10FundPanel(f){
  const m=fundMetrics(f,state),gate=nextFundEligibility(state),exp=fundSectorExposure(state,f);const sector=Object.entries(exp.rows).sort((a,b)=>b[1]-a[1])[0];
  return `<section class="card p10-fund"><div class="section-row"><div><h2>${f.id} Fund Economics</h2><p class="sub">${m.status.toUpperCase()} · Commitments → Calls → NAV → Distributions</p></div><span class="pill live">LP Trust ${Math.round(state.pe.lpTrust)}</span></div><div class="p10-fund-grid"><div><small>Commitments</small><b>${yen(f.commitments)}</b></div><div><small>Paid-in</small><b>${yen(m.paidIn)}</b></div><div><small>Uncalled</small><b>${yen(m.uncalled)}</b></div><div><small>NAV</small><b>${yen(m.nav)}</b></div><div><small>DPI</small><b>${m.dpi.toFixed(2)}x</b></div><div><small>TVPI</small><b>${m.tvpi.toFixed(2)}x</b></div><div><small>Deployment</small><b>${pct(m.deployment)}</b></div><div><small>Reserve</small><b>${pct(m.reserveRatio)}</b></div></div><div class="p10-fund-foot"><span>Fees ${yen(f.managementFeesPaid)}</span><span>Carry ${yen(f.carryPaid)}</span><span>${sector?`Top sector ${PILLARS[sector[0]]?.name||sector[0]} ${pct(sector[1]/Math.max(1,exp.total))}`:'No exposure'}</span></div><div class="p10-gate ${gate.eligible?'ready':'locked'}"><b>Next Fund Gate: ${gate.eligible?'READY':'NOT READY'}</b><span>${gate.eligible?'DPI / deployment / LP Trust cleared':gate.reasons.join(' · ')}</span>${gate.eligible?'<button class="btn primary" data-act="raiseFund">次号ファンドを組成</button>':''}</div></section>`;
}

peView=function(){
  ensurePhase10State(state);
  if(!state.pe.unlocked)return _p10PeView().replace('</main>',`<section class="card p10-preview"><h2>Phase 10 — Fund Economics</h2><p class="sub">Exit後はcommitment・capital call・DPI/TVPI・portfolio construction・carryまで管理します。</p></section></main>`);
  const f=currentFund(),deals=state.pe.deals.filter(d=>d.status==='open').slice(0,8),ports=state.pe.portfolio.filter(p=>p.status==='held');
  const dealRows=f?deals.map(d=>{const quality=Number(d.quality),risk=Number(d.risk),lev=d.dd?clamp(.52+(quality-risk)/420,.35,Math.min(.68,d.debtCapacity||.60)):.5,equity=d.value*(1-lev),ic=d.dd?dealPortfolioConstruction(f,d,equity):null;return `<div class="store-card"><div><b>${d.name}</b><span>${PILLARS[d.businessID].name} · ${d.seller} · Entry ${(d.entryMultiple||d.value/Math.max(1,d.ebitda)).toFixed(1)}x${d.dd?` · Q${d.quality}/R${d.risk}`:''}${ic&&!ic.approved?' · IC CONSTRAINT':''}</span></div><div style="text-align:right"><div style="font-weight:800">${yen(d.value)}</div><div class="actions" style="justify-content:flex-end;margin-top:5px">${!d.dd?`<button class="btn" data-dd="${d.id}">DD</button>`:`<button class="btn primary" data-acquire="${d.id}" ${ic&&!ic.approved?'disabled':''}>Acquire</button>`}</div></div></div>`;}).join(''):'';
  const portRows=ports.map(p=>{const equity=Math.max(0,p.value-p.debt+(p.cash||0)),moic=equity/Math.max(1,p.equityInvested);return `<div class="p10-port"><div class="section-row"><div><b>${p.name}</b><span>${PILLARS[p.businessID]?.name||p.businessID} · ${p.thesis} · Age ${p.age}w</span></div><strong>${moic.toFixed(2)}x</strong></div><div class="p10-port-grid"><span>EBITDA <b>${yen(p.ebitda)}</b></span><span>Debt <b>${yen(p.debt)}</b></span><span>Entry <b>${p.entryMultiple.toFixed(1)}x</b></span><span>Quality/Risk <b>${p.quality.toFixed(0)}/${p.risk.toFixed(0)}</b></span></div><div class="progress"><i style="width:${p.improvement}%"></i></div><div class="actions"><button class="btn" data-improve="cost" data-port="${p.id}">Cost</button><button class="btn" data-improve="talent" data-port="${p.id}">Talent</button><button class="btn" data-improve="capex" data-port="${p.id}">CAPEX</button><button class="btn" data-improve="channel" data-port="${p.id}">Channel</button><button class="btn danger" data-exit-port="${p.id}">Exit</button></div></div>`;}).join('')||'<p class="sub">保有企業はありません。</p>';
  return `<main><div class="screen-head"><div class="copy"><h1>PEファーム</h1><p>LP commitmentsを預かり、capital call・portfolio construction・value creation・distributionまで運営します。</p></div></div><div class="grid">${f?phase10FundPanel(f):`<section class="card"><h2>Fund I First Close</h2><p class="sub">Fund Iは2.9B commitments。最初に10%をCapital Callし、案件取得時に必要額を追加Callします。</p><button class="btn primary wide" data-act="raiseFund">Fund Iを組成</button></section>`}<section class="card half"><h2>GP Management Company</h2><div class="kpis"><div class="kpi"><div class="label">Management Cash</div><div class="value">${yen(state.pe.managementCompanyCash)}</div></div><div class="kpi"><div class="label">Track Score</div><div class="value">${trackScore(state).toFixed(0)}</div></div></div><button class="btn wide" style="margin-top:8px" data-p10-gp-distribute>GP会社から分配</button></section><section class="card half"><h2>Network / LP</h2><div class="kpis"><div class="kpi"><div class="label">Network</div><div class="value">${state.pe.network.toFixed(0)}</div></div><div class="kpi"><div class="label">LP Trust</div><div class="value">${state.pe.lpTrust.toFixed(0)}</div></div></div><button class="btn wide" style="margin-top:8px" data-act="network">面談に2週間使う</button></section><section class="card"><h2>Investment Committee / Deal Book</h2>${f?`<div class="store-list">${dealRows||'<div class="sub">案件供給待ち。四半期ごとに新規案件が出ます。</div>'}</div>`:'<p class="sub">まずFund Iを組成してください。</p>'}</section><section class="card"><h2>Portfolio Construction</h2>${portRows}</section></div></main>`;
};

bind=function(){
  _p10Bind();
  document.querySelectorAll('[data-p10-integration]').forEach(el=>el.onclick=()=>startSubsidiaryIntegration(el.dataset.p10Sub,el.dataset.p10Integration));
  document.querySelectorAll('[data-p10-sell-sub]').forEach(el=>el.onclick=()=>sellSubsidiaryById(el.dataset.p10SellSub));
  document.querySelectorAll('[data-p10-dividend]').forEach(el=>el.onclick=()=>paySpecialDividend());
  document.querySelectorAll('[data-p10-buyback]').forEach(el=>el.onclick=()=>executeBuyback());
  document.querySelectorAll('[data-p10-gp-distribute]').forEach(el=>el.onclick=()=>distributeManagementCompanyCash());
};

if(state){ensurePhase10State(state);save();render();}
