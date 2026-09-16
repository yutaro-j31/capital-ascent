'use strict';

// Roadmap Phase 8: turn M&A and PE from counters into causal economic objects.
const _endgameGeneratePeDeals=generatePeDeals;
const _endgameDdDeal=ddDeal;

function nextSubsidiaryCandidate(s){
  ensureAdvancedState(s);
  const q=Math.floor((s.week-1)/13),n=s.company.subsidiaryPortfolio.length;
  const key=`ma:${s.seed}:${q}:${n}`;
  const ids=Object.keys(PILLARS);const businessID=ids[hash32(key)%ids.length];
  const revenue=(18000000+u01(key+':rev')*85000000)*52;
  const margin=.06+u01(key+':m')*.16;
  const ebitda=revenue*margin;
  const multiple=5.2+u01(key+':mult')*4.4;
  const enterpriseValue=ebitda*multiple;
  const debt=enterpriseValue*(.08+u01(key+':debt')*.30);
  const equityValue=Math.max(1000000,enterpriseValue-debt);
  return {
    id:uid('target',key),name:`${['東都','北辰','みらい','中央','ネクスト','青葉'][hash32(key+':n')%6]} ${PILLARS[businessID].name}HD`,
    businessID,revenue,ebitda,margin,growth:-.01+u01(key+':g')*.09,enterpriseValue,debt,equityValue,
    ownership:1,managementQuality:35+u01(key+':q')*60,synergy:20+u01(key+':syn')*70,status:'candidate'
  };
}

acquireSubsidiary=function(){
  ensureAdvancedState(state);
  const t=nextSubsidiaryCandidate(state);
  const price=t.equityValue*(.96+u01(`${t.id}:premium`)*.16);
  if(state.company.cash<price){alert(`M&Aには株式取得対価 ${yen(price)} が必要です。`);return;}
  state.company.cash-=price;
  const acquired={...t,status:'held',acquisitionWeek:state.week,acquisitionPrice:price,enterpriseValue:t.enterpriseValue,ownership:1,lastRevenue:0,lastProfit:0};
  state.company.subsidiaryPortfolio.push(acquired);state.company.subsidiaries=state.company.subsidiaryPortfolio.length;
  state.company.reputation=clamp(state.company.reputation+4,0,100);
  log(`M&A成立: ${t.name} を Equity ${yen(price)} で取得。EBITDA ${yen(t.ebitda)} / Debt ${yen(t.debt)}。`,'major');save();render();
};

sellSubsidiary=function(){
  ensureAdvancedState(state);
  const held=state.company.subsidiaryPortfolio.filter(x=>x.status==='held');
  const sub=held[held.length-1];if(!sub){alert('売却可能な子会社がありません。');return;}
  const multiple=clamp(6.2+sub.managementQuality/45+sub.synergy/80+state.macro.cycle*.7,4.5,12);
  const ev=Math.max(0,(sub.ebitda||0)*multiple);
  const proceeds=Math.max(0,ev-(sub.debt||0));
  sub.status='sold';sub.saleWeek=state.week;sub.saleEnterpriseValue=ev;sub.saleProceeds=proceeds;
  state.company.cash+=proceeds;state.company.subsidiaries=state.company.subsidiaryPortfolio.filter(x=>x.status==='held').length;
  recordExit('子会社売却',proceeds,proceeds/Math.max(1,sub.acquisitionPrice),ev);
  log(`${sub.name} を EV ${yen(ev)} で売却。株式価値 ${yen(proceeds)} を会社現金へ。`,'major');save();render();
};

function serviceSubsidiaries(s){
  ensureAdvancedState(s);let revenue=0,profit=0;
  for(const sub of s.company.subsidiaryPortfolio){
    if(sub.status!=='held')continue;
    const operational=(sub.growth||0)/52+(sub.managementQuality-50)/26000+s.macro.cycle*.0005+noise(`sub:${sub.id}:${s.week}`,.0015);
    sub.revenue=Math.max(0,sub.revenue*(1+operational));
    sub.ebitda=Math.max(0,sub.revenue*clamp(sub.margin+(sub.synergy-40)/10000,.03,.30));
    const weeklyRevenue=sub.revenue/52;
    const weeklyEbitda=sub.ebitda/52;
    const interest=(sub.debt||0)*(.03+s.macro.rate+.012)/52;
    const weeklyProfit=weeklyEbitda-interest;
    if(weeklyProfit>0&&sub.debt>0){const amort=Math.min(sub.debt,weeklyProfit*.18);sub.debt-=amort;}
    sub.enterpriseValue=sub.ebitda*clamp(6.2+sub.managementQuality/45+sub.synergy/85+s.macro.cycle*.5,4.5,11.5);
    sub.lastRevenue=weeklyRevenue;sub.lastProfit=weeklyProfit;
    revenue+=weeklyRevenue;profit+=weeklyProfit;
  }
  s.company.subsidiaries=s.company.subsidiaryPortfolio.filter(x=>x.status==='held').length;
  return {revenue,profit};
}

generatePeDeals=function(s){
  _endgameGeneratePeDeals(s);
  for(const d of s.pe.deals){
    if(!Number.isFinite(d.entryMultiple)&&d.ebitda>0)d.entryMultiple=d.value/d.ebitda;
  }
};

ddDeal=function(id){
  _endgameDdDeal(id);
  const d=state.pe.deals.find(x=>x.id===id);if(!d||!d.dd)return;
  d.margin=.08+u01(`${d.id}:margin`)*.20;
  d.organicGrowth=-.02+u01(`${d.id}:growth`)*.12;
  d.debtCapacity=.35+u01(`${d.id}:dc`)*.35;
  d.cyclicality=Math.round(10+u01(`${d.id}:cyc`)*85);
  d.entryMultiple=d.value/Math.max(1,d.ebitda);
  d.thesis=['Margin expansion','Buy-and-build','Digital transformation','Pricing power','Operational turnaround'][hash32(`${d.id}:thesis`)%5];
  save();render();
};

acquireDeal=function(id){
  const d=state.pe.deals.find(x=>x.id===id),f=currentFund();if(!d||!f||!d.dd)return;
  const held=state.pe.portfolio.filter(x=>x.fundId===f.id&&x.status==='held').length;
  if(held>=f.slots){alert('保有スロット上限です。');return;}
  const quality=Number(d.quality)||50,risk=Number(d.risk)||50;
  const leverage=clamp(.52+(quality-risk)/420,.35,Math.min(.68,d.debtCapacity||.60));
  const debt=d.value*leverage,equity=d.value-debt;
  if(f.cash<equity){alert(`ファンド現金が不足しています。必要 Equity ${yen(equity)}`);return;}
  f.cash-=equity;f.invested+=equity;d.status='won';
  state.pe.portfolio.unshift({
    id:d.id,name:d.name,businessID:d.businessID,fundId:f.id,entryWeek:state.week,age:0,
    entryValue:d.value,value:d.value,enterpriseValue:d.value,equityInvested:equity,debt,
    leverage,entryMultiple:d.entryMultiple||d.value/Math.max(1,d.ebitda),ebitda:d.ebitda,
    quality,risk,margin:d.margin||.15,organicGrowth:d.organicGrowth||.03,cyclicality:d.cyclicality||50,
    thesis:d.thesis||'Operational improvement',improvement:0,cash:d.value*.03,status:'held',initiatives:[]
  });
  log(`${d.name} を EV ${yen(d.value)} / ${leverage.toFixed(2)}x debt ratio / Equity ${yen(equity)} で取得。`,'major');save();render();
};

const PE_INITIATIVES={
  cost:{cost:25000000,gain:11,duration:8},talent:{cost:35000000,gain:14,duration:12},
  capex:{cost:50000000,gain:17,duration:16},channel:{cost:30000000,gain:13,duration:10}
};

improvePortfolio=function(id,kind){
  const p=state.pe.portfolio.find(x=>x.id===id),f=state.pe.funds.find(x=>x.id===p?.fundId);if(!p||!f||p.status!=='held')return;
  const cfg=PE_INITIATIVES[kind];if(!cfg)return;
  p.initiatives=p.initiatives||[];
  if(p.initiatives.some(x=>x.status==='in_progress'&&x.kind===kind)){alert('同じ施策が進行中です。');return;}
  if(f.cash<cfg.cost){alert('ファンド現金不足');return;}
  f.cash-=cfg.cost;f.invested+=cfg.cost;
  const chance=clamp(.56+(p.quality-50)/180-(p.risk-50)/220+(kind==='talent'?.05:0),.28,.92);
  p.initiatives.push({id:uid('init',`${p.id}:${kind}:${state.week}`),kind,cost:cfg.cost,gain:cfg.gain,startWeek:state.week,completeWeek:state.week+cfg.duration,chance,status:'in_progress'});
  log(`${p.name}: ${kind}施策開始。${cfg.duration}週後に成果判定。`);save();render();
};

function servicePeInitiatives(s,p){
  p.initiatives=p.initiatives||[];
  for(const x of p.initiatives){
    if(x.status!=='in_progress'||x.completeWeek>s.week)continue;
    const success=u01(`${p.id}:${x.kind}:${x.startWeek}:outcome`)<x.chance;
    x.status=success?'succeeded':'failed';x.completedWeek=s.week;
    if(success){
      p.improvement=clamp(p.improvement+x.gain,0,100);
      if(x.kind==='cost')p.margin=clamp(p.margin+.012,.03,.35);
      if(x.kind==='talent')p.quality=clamp(p.quality+6,0,100);
      if(x.kind==='capex'){p.margin=clamp(p.margin+.008,.03,.35);p.organicGrowth+=.008;}
      if(x.kind==='channel')p.organicGrowth+=.012;
      log(`${p.name}: ${x.kind}施策成功。改善度 ${p.improvement.toFixed(0)}。`,'good');
    }else{
      p.risk=clamp(p.risk+4,0,100);p.cash-=x.cost*.08;
      log(`${p.name}: ${x.kind}施策は計画未達。Riskが上昇。`,'bad');
    }
  }
}

servicePE=function(s){
  for(const f of s.pe.funds){const yr=Math.floor((s.week-f.startWeek)/52)+1;if(yr!==f.ddYear){f.ddYear=yr;f.ddUsedYear=0;}}
  for(const d of s.pe.deals){if(d.status==='open'&&s.week>d.expires)d.status='lost';}
  for(const p of s.pe.portfolio){
    if(p.status!=='held')continue;
    p.quality=Number.isFinite(p.quality)?p.quality:55;p.risk=Number.isFinite(p.risk)?p.risk:50;
    p.ebitda=Number.isFinite(p.ebitda)?p.ebitda:p.entryValue/8;
    p.entryMultiple=Number.isFinite(p.entryMultiple)?p.entryMultiple:p.entryValue/Math.max(1,p.ebitda);
    servicePeInitiatives(s,p);
    const weeklyGrowth=(p.organicGrowth||.03)/52+(p.quality-50)/35000+p.improvement/18000+s.macro.cycle*.0007;
    p.ebitda=Math.max(p.entryValue*.015,p.ebitda*(1+weeklyGrowth+noise(`pe-op:${p.id}:${s.week}`,.0018)));
    if(s.week%13===0){
      const downsideChance=(p.risk/100)*(.035+(p.cyclicality||50)/2500);
      if(u01(`pe-down:${p.id}:${s.week}`)<downsideChance){const shock=.04+u01(`pe-down-mag:${p.id}:${s.week}`)*.10;p.ebitda*=1-shock;log(`${p.name}: 業績ダウンサイド発生。EBITDA -${pct(shock,0)}。`,'bad');}
    }
    const debtInterest=p.debt*(.045+s.macro.rate+(p.risk/100)*.018)/52;
    const freeCash=p.ebitda/52*.55-debtInterest;
    p.cash+=freeCash;
    if(p.cash>p.entryValue*.035&&p.debt>0){const amort=Math.min(p.debt,(p.cash-p.entryValue*.025)*.45);p.debt-=Math.max(0,amort);p.cash-=Math.max(0,amort);}
    const markMultiple=clamp(p.entryMultiple+(p.quality-50)/45+p.improvement/55-(p.risk-50)/70+s.macro.cycle*.45,4.5,14);
    p.value=p.enterpriseValue=p.ebitda*markMultiple;p.age++;
  }
};

exitPortfolio=function(id){
  const p=state.pe.portfolio.find(x=>x.id===id),f=state.pe.funds.find(x=>x.id===p?.fundId);if(!p||!f||p.status!=='held')return;
  if(p.age<52&&!confirm('保有1年未満です。Exitしますか？'))return;
  const exitMultiple=clamp(p.entryMultiple+(p.quality-50)/38+p.improvement/42-(p.risk-50)/55+state.macro.cycle*.6,4.5,15);
  const exitValue=Math.max(0,p.ebitda*exitMultiple);
  const equityProceeds=Math.max(0,exitValue-p.debt+(p.cash||0));
  const gain=equityProceeds-p.equityInvested,carry=Math.max(0,gain*.2),gpShare=f.gpCommit/f.size;
  const gpDistribution=equityProceeds*gpShare+carry;
  state.personal.cash+=gpDistribution;f.distributed+=equityProceeds;f.realizedGain+=gain;
  p.status='exited';p.exitValue=exitValue;p.exitMultiple=exitMultiple;p.exitEquity=equityProceeds;p.moic=equityProceeds/Math.max(1,p.equityInvested);p.exitWeek=state.week;
  log(`${p.name} Exit: ${exitMultiple.toFixed(1)}x EBITDA / MOIC ${p.moic.toFixed(2)}x / GP受取 ${yen(gpDistribution)}。`,'major');save();render();
};
