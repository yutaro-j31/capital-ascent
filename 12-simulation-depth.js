'use strict';

// Roadmap Phases 2-6: normalized valuation, explainability, delayed investment,
// delegation, contextual events and changing competitors.
const _depthRunStore=runStore;
const _depthRunProduct=runProduct;
const _depthProcessCompanyWeek=processCompanyWeek;
const _depthInvestBusiness=investBusiness;
const _depthCityCompetitors=cityCompetitors;

const PROJECT_DURATIONS={quality:5,brand:6,efficiency:8,digital:7};
const POLICY_PRESETS={
  manual:null,
  premium:{price:1.18,adSpend:350000},
  growth:{price:.96,adSpend:600000},
  margin:{price:1.08,adSpend:100000},
  share:{price:.90,adSpend:800000},
  cash:{price:1.03,adSpend:0}
};
const WORLD_EVENT_TYPES=['raw_materials','labor_shortage','station_redevelopment','social_buzz','cyber_incident'];

function managementTier(s){
  const n=s.company.stores.length;
  return n>=50?4:n>=20?3:n>=8?2:n>=3?1:0;
}

function policyFor(s,id){
  ensureAdvancedState(s);
  return s.management.policies[id]||(s.management.policies[id]={mode:'manual',delegated:false});
}

function setBusinessPolicy(id,mode){
  if(!state.company.businesses[id]||!Object.prototype.hasOwnProperty.call(POLICY_PRESETS,mode))return;
  if(mode!=='manual'&&managementTier(state)<1){alert('3拠点以上でStore Manager委任が解禁されます。');return;}
  const p=policyFor(state,id);p.mode=mode;p.delegated=mode!=='manual';
  log(`${PILLARS[id].name}: 経営ポリシーを ${mode.toUpperCase()} に変更。`);
  save();render();
}

function applyDelegatedPolicies(s){
  ensureAdvancedState(s);
  s.management.delegationLevel=managementTier(s);
  for(const [id,b] of Object.entries(s.company.businesses)){
    const policy=policyFor(s,id);const preset=POLICY_PRESETS[policy.mode];
    if(!policy.delegated||!preset)continue;
    const base=PILLARS[id]?.price||b.price;
    const target=Math.max(10,base*preset.price);
    b.price=Math.round((b.price*.8+target*.2)/10)*10;
    b.adSpend=Math.max(0,Math.round((b.adSpend*.65+preset.adSpend*.35)/10000)*10000);
  }
}

function scheduleBusinessProject(id,kind,amt){
  ensureAdvancedState(state);
  const b=state.company.businesses[id];if(!b)return false;
  if(state.projects.some(p=>p.status==='in_progress'&&p.scope==='business'&&p.targetId===id&&p.kind===kind)){
    alert('同種の投資プロジェクトが進行中です。');return false;
  }
  if(state.company.cash<amt){alert('会社現金が不足しています。');return false;}
  const gain=18*Math.log10(1+amt/300000);
  const duration=PROJECT_DURATIONS[kind]||6;
  state.company.cash-=amt;
  state.projects.push({id:uid('proj',`${state.seed}:${id}:${kind}:${state.week}`),scope:'business',targetId:id,kind,cost:amt,gain,startWeek:state.week,completeWeek:state.week+duration,status:'in_progress'});
  log(`${PILLARS[id].name}: ${kind}改善プロジェクト開始。${duration}週後に効果発現。`);
  save();render();return true;
}

investBusiness=function(id,kind,amt){return scheduleBusinessProject(id,kind,amt);};

function serviceProjects(s){
  ensureAdvancedState(s);
  for(const p of s.projects){
    if(p.status!=='in_progress'||p.completeWeek>s.week)continue;
    if(p.scope==='business'){
      const b=s.company.businesses[p.targetId];
      if(b){b[p.kind]=clamp((Number(b[p.kind])||0)+p.gain,0,100);p.status='completed';p.completedWeek=s.week;log(`${PILLARS[p.targetId].name}: ${p.kind}改善が完了。`,'good');}
      else p.status='cancelled';
    }
  }
}

function serviceWorldEvents(s){
  ensureAdvancedState(s);
  for(const e of s.world.events)if(e.status==='active'&&s.week>e.endWeek)e.status='ended';
  if((s.week-1)%13!==0||s.week<=1)return;
  const key=`event:${s.seed}:${s.week}`;
  const type=WORLD_EVENT_TYPES[hash32(key)%WORLD_EVENT_TYPES.length];
  const duration=7+(hash32(key+':d')%9);
  const id=uid('event',key);
  if(s.world.events.some(e=>e.id===id))return;
  const labels={raw_materials:'原材料コスト上昇',labor_shortage:'人手不足',station_redevelopment:'駅前再開発',social_buzz:'SNS需要波',cyber_incident:'システム障害'};
  s.world.events.push({id,type,startWeek:s.week,endWeek:s.week+duration,status:'active'});
  log(`外部環境: ${labels[type]}。経営能力によって影響が変わります。`,type==='station_redevelopment'||type==='social_buzz'?'good':'major');
}

function activeEvents(s){return (s.world?.events||[]).filter(e=>e.status==='active'&&e.startWeek<=s.week&&e.endWeek>=s.week);}

function eventModifiersForBusiness(s,businessID){
  const b=s.company.businesses[businessID]||{};
  let demand=1,cost=1,note=[];
  for(const e of activeEvents(s)){
    if(e.type==='raw_materials'){
      const mitigation=clamp((b.efficiency||0)/100,0,1);cost*=1+.14*(1-mitigation*.65);note.push('原材料高');
    }else if(e.type==='labor_shortage'){
      const mitigation=clamp(((b.efficiency||0)+(b.digital||0))/200,0,1);cost*=1+.10*(1-mitigation*.7);note.push('人手不足');
    }else if(e.type==='station_redevelopment'&&businessID!=='productVentures'){
      demand*=1.06+(b.brand||0)/2000;note.push('再開発需要');
    }else if(e.type==='social_buzz'){
      demand*=1.03+((b.brand||0)+(b.digital||0))/2200;note.push('SNS需要');
    }else if(e.type==='cyber_incident'){
      const resilience=clamp((b.digital||0)/100,0,1);demand*=1-.10*(1-resilience*.75);cost*=1+.04*(1-resilience*.6);note.push('システム障害');
    }
  }
  return {demand,cost,note};
}

runStore=function(s,store){
  const result=_depthRunStore(s,store);
  const mod=eventModifiersForBusiness(s,store.businessID);
  const beforeRevenue=result.revenue,beforeCost=result.cost;
  result.revenue*=mod.demand;
  result.units=Math.max(0,Math.round(result.units*mod.demand));
  result.cost*=mod.cost;
  result.breakdown=result.breakdown||{};
  Object.assign(result.breakdown,{eventDemandMultiplier:mod.demand,eventCostMultiplier:mod.cost,eventNotes:mod.note,eventRevenueDelta:result.revenue-beforeRevenue,eventCostDelta:result.cost-beforeCost});
  store.lastBreakdown={...result.breakdown};
  return result;
};

runProduct=function(s,b){
  const result=_depthRunProduct(s,b);
  const mod=eventModifiersForBusiness(s,'productVentures');
  result.revenue*=mod.demand;result.cost*=mod.cost;result.units=Math.max(0,Math.round(result.units*mod.demand));
  b.lastBreakdown={eventDemandMultiplier:mod.demand,eventCostMultiplier:mod.cost,eventNotes:mod.note,revenue:result.revenue,cost:result.cost};
  return result;
};

function creditSpread(s){return clamp((75-(s.company.credit||60))*.0008,.002,.055);}

function estimateDriverRows(s){
  const rows=[];
  let competition=0,location=0,ads=0,rent=0,events=0;
  for(const store of s.company.stores){
    const rev=store.lastRevenue||0,b=store.lastBreakdown||{};
    const cp=clamp(Number(b.competitionPressure)||0,0,.6);
    competition-=rev*cp/Math.max(.4,1-cp);
    const traffic=Number(b.locationIndex)||1;
    location+=rev*(traffic-1)*.35;
    ads+=rev*Math.min(.15,(Number(b.adSpend)||0)/2000000*.08);
    rent-=Number(b.rent)||store.rent||0;
    const edm=Number(b.eventDemandMultiplier)||1;
    events+=rev*(edm-1)/Math.max(.6,edm)-(Number(b.eventCostDelta)||0);
  }
  if(Math.abs(location)>1000)rows.push({label:'立地・人流',amount:location});
  if(Math.abs(competition)>1000)rows.push({label:'競合圧力',amount:competition});
  if(Math.abs(ads)>1000)rows.push({label:'広告効果',amount:ads});
  if(Math.abs(events)>1000)rows.push({label:'外部環境',amount:events});
  if(Math.abs(rent)>1000)rows.push({label:'家賃',amount:rent});
  return rows.sort((a,b)=>Math.abs(b.amount)-Math.abs(a.amount)).slice(0,5);
}

function recordManagementBrief(s){
  ensureAdvancedState(s);
  const previous=s.history.companyWeeks[s.history.companyWeeks.length-1]||null;
  const current={week:s.week,revenue:s.company.lastWeekRevenue,profit:s.company.lastWeekProfit,cash:s.company.cash,debt:s.company.debt,companyValue:companyValue(s)};
  s.history.companyWeeks.push(current);
  if(s.history.companyWeeks.length>260)s.history.companyWeeks.shift();
  const brief={week:s.week,revenue:current.revenue,profit:current.profit,revenueDelta:previous?current.revenue-previous.revenue:0,profitDelta:previous?current.profit-previous.profit:0,drivers:estimateDriverRows(s),risks:[]};
  if(s.company.cash<Math.max(3000000,Math.abs(s.company.lastWeekProfit)*8))brief.risks.push('会社現金の余裕が小さい');
  if(s.company.debt>Math.max(1,companyValue(s))*.35)brief.risks.push('レバレッジが高い');
  const highPressure=s.company.stores.filter(x=>(x.lastBreakdown?.competitionPressure||0)>.18).length;
  if(highPressure)brief.risks.push(`競争圧力が高い店舗 ${highPressure}店`);
  const projects=s.projects.filter(p=>p.status==='in_progress').length;if(projects)brief.risks.push(`進行中プロジェクト ${projects}件`);
  s.history.briefs.push(brief);if(s.history.briefs.length>52)s.history.briefs.shift();
}

processCompanyWeek=function(s){
  ensureAdvancedState(s);
  serviceWorldEvents(s);serviceProjects(s);applyDelegatedPolicies(s);
  const beforeCash=s.company.cash;
  _depthProcessCompanyWeek(s);

  // Credit quality changes the debt spread in addition to the base borrowing rate.
  const extraInterest=s.company.debt*creditSpread(s)/52;
  if(extraInterest>0){s.company.cash-=extraInterest;s.company.lastWeekProfit-=extraInterest;s.company.cumulativeProfit-=extraInterest;}

  if(typeof serviceSubsidiaries==='function'){
    const sub=serviceSubsidiaries(s)||{revenue:0,profit:0};
    s.company.cash+=sub.profit||0;s.company.lastWeekRevenue+=sub.revenue||0;s.company.lastWeekProfit+=sub.profit||0;s.company.cumulativeProfit+=sub.profit||0;
  }
  // A profitable subsidiary can rescue the parent from the legacy pre-consolidation bankruptcy check.
  if(s.gameOver&&s.company.cash>=-3000000)s.gameOver=false;
  recordManagementBrief(s);
  s.company.lastCashChange=s.company.cash-beforeCash;
};

companyValue=function(s){
  ensureAdvancedState(s);
  const hist=s.history.companyWeeks.slice(-13);
  const avgWeekly=hist.length?hist.reduce((a,x)=>a+(Number(x.profit)||0),0)/hist.length:(Number(s.company.lastWeekProfit)||0);
  const annual=Math.max(0,avgWeekly*52);
  const ids=Object.keys(s.company.businesses||{});
  const sectorMultiple={ramen:6,conveni:7,gym:8,realEstateAgency:7,productVentures:12};
  const multiple=ids.length?ids.reduce((a,id)=>a+(sectorMultiple[id]||7),0)/ids.length:7;
  const subsidiaryEquity=(s.company.subsidiaryPortfolio||[]).reduce((a,x)=>a+Math.max(0,(Number(x.enterpriseValue)||0)-(Number(x.debt)||0))*clamp(Number(x.ownership)||1,0,1),0);
  const operating=annual*multiple;
  return Math.max(10000000,operating+subsidiaryEquity+(Number(s.company.cash)||0)-(Number(s.company.debt)||0));
};

personalNetWorth=function(s){
  let stocks=0;
  for(const [id,pos] of Object.entries(s.personal.stocks||{})){
    const l=s.market.listings.find(x=>x.id===id);if(l&&!l.delisted)stocks+=(Number(pos.qty)||0)*(Number(l.price)||0);
  }
  // Foundation assets are no longer personally owned after donation.
  return (Number(s.personal.cash)||0)-(Number(s.personal.debt)||0)+stocks;
};

borrowCompany=function(){
  ensureAdvancedState(state);
  const credit=clamp(Number(state.company.credit)||60,20,95);
  const leverageCap=.20+(credit/100)*.32;
  const max=Math.max(0,companyValue(state)*leverageCap-state.company.debt);
  const suggested=Math.min(max,20000000);
  const amt=Number(prompt(`借入額（上限 ${yen(max)} / 追加信用スプレッド ${pct(creditSpread(state))}）`,String(Math.round(suggested))))||0;
  if(amt<=0||amt>max){alert('借入上限を超えています。');return;}
  state.company.debt+=amt;state.company.cash+=amt;
  state.company.credit=clamp(state.company.credit-amt/Math.max(1,companyValue(state))*14,20,95);
  log(`銀行借入 ${yen(amt)} を実行。信用力に応じた金利スプレッドが適用される。`);save();render();
};

cityCompetitors=function(businessID,region){
  const base=_depthCityCompetitors(businessID,region);
  const quarter=Math.floor((state.week-1)/13);
  const actions=['price_cut','brand_push','renovation','steady','expansion'];
  return base.map(r=>{
    const action=actions[hash32(`${r.id}:act:${quarter}`)%actions.length];
    let strength=r.strength,priceIndex=r.priceIndex;
    if(action==='price_cut'){priceIndex*=.93;strength+=4;}
    else if(action==='brand_push')strength+=6;
    else if(action==='renovation')strength+=5;
    else if(action==='expansion')strength+=3;
    return {...r,action,strength:clamp(Math.round(strength),20,99),priceIndex:clamp(priceIndex,.70,1.45)};
  });
};
