'use strict';

// Phase 9: executive operating review, management organization, competitor memory,
// and a deeper capex/project portfolio. This layer is additive and preserves the v1 save contract.
const _p9EnsureAdvancedState=ensureAdvancedState;
const _p9ProcessCompanyWeek=processCompanyWeek;
const _p9ServiceProjects=serviceProjects;
const _p9CityCompetitors=cityCompetitors;
const _p9Operations=operations;
const _p9BriefPanel=briefPanel;
const _p9CityEntitySheet=cityEntitySheet;
const _p9Bind=bind;

const PHASE9_AUTONOMY={
  low:{speed:.10,deviation:.010,budgetScale:.75,label:'Low'},
  medium:{speed:.20,deviation:.018,budgetScale:1,label:'Medium'},
  high:{speed:.34,deviation:.030,budgetScale:1.25,label:'High'}
};
const PHASE9_REVIEW={weekly:{weeks:1,label:'Weekly'},monthly:{weeks:4,label:'Monthly'},quarterly:{weeks:13,label:'Quarterly'}};
const PHASE9_MANAGER_NAMES=['佐伯','藤井','石川','河合','森田','高瀬','西村','三浦','岡本','長谷川','井上','松井'];
const PHASE9_CAPEX={
  renovation:{label:'Renovation',duration:8,cost:8000000,risk:.12,description:'ブランド・品質を同時に改善'},
  capacity:{label:'Capacity Expansion',duration:10,cost:12000000,risk:.16,description:'店舗処理能力と需要取り込み余地を拡張'},
  automation:{label:'Automation',duration:9,cost:10000000,risk:.14,description:'効率・デジタル能力を改善'},
  product:{label:'Product Development',duration:7,cost:6000000,risk:.18,description:'品質・ブランド・商品話題性を改善'}
};
const PHASE9_RIVAL_ACTIONS={
  price_attack:['price_cut','brand_push','renovation'],
  ad_blitz:['brand_push','renovation','price_cut'],
  expansion:['expansion','price_cut','renovation'],
  premium:['renovation','brand_push','price_cut'],
  weakness:['expansion','price_cut','steady'],
  steady:['steady','brand_push','price_cut']
};

function phase9TierLabel(t){return ['Owner Operator','Store Manager','Area Manager','Business Unit Head','COO'][clamp(t,0,4)];}
function phase9ManagerSeed(s,id){return `${s.seed}:${id}:manager`;}
function phase9DefaultBusinessUnit(s,id){
  const key=phase9ManagerSeed(s,id);
  const quality=54+(hash32(key+':q')%30);
  const name=PHASE9_MANAGER_NAMES[hash32(key+':n')%PHASE9_MANAGER_NAMES.length];
  return {managerName:name,managerQuality:quality,tenureStartWeek:s.week||1,autonomy:'low',reviewCadence:'weekly',weeklyBudget:300000,lastExecutionWeek:0,lastReviewWeek:0,lastVariance:0};
}
function ensurePhase9State(s){
  _p9EnsureAdvancedState(s);
  s.management.businessUnits=s.management.businessUnits||{};
  s.management.cooMandate=s.management.cooMandate||'balanced';
  s.world.competitorMemory=s.world.competitorMemory||{};
  s.history.storeWeeks=Array.isArray(s.history.storeWeeks)?s.history.storeWeeks:[];
  for(const id of Object.keys(s.company.businesses||{})){
    if(!s.management.businessUnits[id])s.management.businessUnits[id]=phase9DefaultBusinessUnit(s,id);
    const u=s.management.businessUnits[id];
    if(!PHASE9_AUTONOMY[u.autonomy])u.autonomy='low';
    if(!PHASE9_REVIEW[u.reviewCadence])u.reviewCadence='weekly';
    if(!Number.isFinite(u.managerQuality))u.managerQuality=60;
    if(!Number.isFinite(u.weeklyBudget))u.weeklyBudget=300000;
    if(!Number.isFinite(u.tenureStartWeek))u.tenureStartWeek=s.week||1;
  }
  if(s.history.storeWeeks.length>104)s.history.storeWeeks=s.history.storeWeeks.slice(-104);
  const memoryEntries=Object.entries(s.world.competitorMemory);
  if(memoryEntries.length>300)s.world.competitorMemory=Object.fromEntries(memoryEntries.sort((a,b)=>(b[1]?.lastResponseWeek||0)-(a[1]?.lastResponseWeek||0)).slice(0,300));
  return s;
}
ensureAdvancedState=ensurePhase9State;

function businessUnitFor(s,id){ensurePhase9State(s);return s.management.businessUnits[id]||(s.management.businessUnits[id]=phase9DefaultBusinessUnit(s,id));}
function setManagementAutonomy(id,level){
  if(!state.company.businesses[id]||!PHASE9_AUTONOMY[level])return;
  if(managementTier(state)<1){alert('3拠点以上でManager委任が解禁されます。');return;}
  const u=businessUnitFor(state,id);u.autonomy=level;log(`${PILLARS[id].name}: Manager autonomyを ${PHASE9_AUTONOMY[level].label} に変更。`);save();render();
}
function setManagementReviewCadence(id,cadence){
  if(!state.company.businesses[id]||!PHASE9_REVIEW[cadence])return;
  const u=businessUnitFor(state,id);u.reviewCadence=cadence;log(`${PILLARS[id].name}: review cadenceを ${PHASE9_REVIEW[cadence].label} に変更。`);save();render();
}
function setManagementBudget(id,amount){
  const u=businessUnitFor(state,id);const max=Math.max(100000,Math.round((state.company.lastWeekRevenue||1000000)*.12));
  u.weeklyBudget=clamp(Math.round(Number(amount)||0),0,max);save();render();
}

applyDelegatedPolicies=function(s){
  ensurePhase9State(s);s.management.delegationLevel=managementTier(s);
  for(const [id,b] of Object.entries(s.company.businesses||{})){
    const policy=policyFor(s,id),preset=POLICY_PRESETS[policy.mode],u=businessUnitFor(s,id);
    if(!policy.delegated||!preset)continue;
    const cfg=PHASE9_AUTONOMY[u.autonomy]||PHASE9_AUTONOMY.low;
    const skill=clamp(.62+u.managerQuality/125,.75,1.35);
    const speed=clamp(cfg.speed*skill,.06,.46);
    const variance=noise(`manager:${s.seed}:${id}:${s.week}`,cfg.deviation*(1.35-u.managerQuality/120));
    const base=PILLARS[id]?.price||b.price;
    const priceTarget=Math.max(10,base*preset.price*(1+variance));
    const adTarget=Math.min(Math.max(0,preset.adSpend*(1+variance*.6)),Math.max(0,u.weeklyBudget)*cfg.budgetScale);
    b.price=Math.round((b.price*(1-speed)+priceTarget*speed)/10)*10;
    b.adSpend=Math.max(0,Math.round((b.adSpend*(1-speed)+adTarget*speed)/10000)*10000);
    u.lastExecutionWeek=s.week;u.lastVariance=variance;u.lastPriceTarget=priceTarget;u.lastAdTarget=adTarget;
    const reviewEvery=PHASE9_REVIEW[u.reviewCadence]?.weeks||1;
    if(s.week-(u.lastReviewWeek||0)>=reviewEvery)u.lastReviewWeek=s.week;
  }
};

function projectCapacity(s){return 1+managementTier(s);}
function activeProjectCount(s){return (s.projects||[]).filter(p=>p.status==='in_progress').length;}
function scheduleCapexProject(id,kind,costOverride){
  ensurePhase9State(state);
  const b=state.company.businesses[id],spec=PHASE9_CAPEX[kind];if(!b||!spec)return false;
  if(activeProjectCount(state)>=projectCapacity(state)){alert(`同時進行できるProjectは ${projectCapacity(state)}件までです。`);return false;}
  if(state.projects.some(p=>p.status==='in_progress'&&p.scope==='capex'&&p.targetId===id&&p.kind===kind)){alert('同種のCAPEXが進行中です。');return false;}
  const cost=Math.max(100000,Number(costOverride)||spec.cost);if(state.company.cash<cost){alert('会社現金が不足しています。');return false;}
  state.company.cash-=cost;
  const idKey=uid('capex',`${state.seed}:${id}:${kind}:${state.week}`);
  state.projects.push({id:idKey,scope:'capex',targetId:id,kind,cost,startWeek:state.week,completeWeek:state.week+spec.duration,duration:spec.duration,status:'in_progress',executionRisk:spec.risk,progress:0,expectedEffect:spec.description});
  log(`${PILLARS[id].name}: ${spec.label}開始。${spec.duration}週後に完成予定。`);save();render();return true;
}
function applyCapexEffect(s,p,factor){
  const b=s.company.businesses[p.targetId];if(!b)return;
  if(p.kind==='renovation'){b.brand=clamp((b.brand||0)+9*factor,0,100);b.quality=clamp((b.quality||0)+5*factor,0,100);}
  else if(p.kind==='automation'){b.efficiency=clamp((b.efficiency||0)+10*factor,0,100);b.digital=clamp((b.digital||0)+5*factor,0,100);}
  else if(p.kind==='product'){b.quality=clamp((b.quality||0)+7*factor,0,100);b.brand=clamp((b.brand||0)+3*factor,0,100);b.menuBuzz=clamp((b.menuBuzz||15)+18*factor,0,100);}
  else if(p.kind==='capacity'){
    for(const store of s.company.stores.filter(x=>x.businessID===p.targetId)){
      if(store.businessID==='gym'&&Number.isFinite(store.capacity))store.capacity=Math.round(store.capacity*(1+.16*factor));
      else store.traffic=clamp((store.traffic||1)*(1+.035*factor),.35,2.5);
    }
    b.capacityIndex=clamp((Number(b.capacityIndex)||0)+12*factor,0,100);
  }
}
serviceProjects=function(s){
  _p9ServiceProjects(s);ensurePhase9State(s);
  for(const p of s.projects){
    if(p.scope!=='capex'||p.status!=='in_progress')continue;
    p.progress=clamp((s.week-p.startWeek)/Math.max(1,p.completeWeek-p.startWeek),0,1);
    if(p.completeWeek>s.week)continue;
    const full=u01(`capex:${p.id}:execution`)>=p.executionRisk;
    const factor=full?1:.55;applyCapexEffect(s,p,factor);p.status='completed';p.completedWeek=s.week;p.progress=1;p.outcome=full?'full':'partial';p.effectFactor=factor;
    log(`${PILLARS[p.targetId]?.name||p.targetId}: ${PHASE9_CAPEX[p.kind]?.label||p.kind} 完成（${full?'計画通り':'一部効果'}）。`,full?'good':'major');
  }
};

function playerSignalFor(s,businessID,region){
  const stores=s.company.stores.filter(x=>x.businessID===businessID&&x.region===region),b=s.company.businesses[businessID],p=PILLARS[businessID];
  if(!b||!p||!stores.length)return 'steady';
  const recentOpen=stores.filter(x=>(s.week-(x.property?.leaseWeek||1))<=26).length;
  const profit=stores.reduce((a,x)=>a+(Number(x.lastProfit)||0),0);
  if(b.price<p.price*.94)return 'price_attack';
  if((b.adSpend||0)/Math.max(1,stores.length)>350000)return 'ad_blitz';
  if(recentOpen>=2||stores.length>=4)return 'expansion';
  if((b.quality||0)>=70&&(b.brand||0)>=68)return 'premium';
  if(profit<0)return 'weakness';
  return 'steady';
}
function rivalPosture(action){return ({price_cut:'Aggressive Price',brand_push:'Brand Defense',renovation:'Quality Defense',expansion:'Expansion',steady:'Hold'})[action]||action;}
function serviceCompetitorStrategies(s){
  ensurePhase9State(s);if(s.week<=1||(s.week-1)%13!==0)return;
  const pairs=new Set();for(const store of s.company.stores)if(store.businessID&&store.businessID!=='productVentures')pairs.add(`${store.businessID}::${store.region}`);
  for(const pair of pairs){
    const [businessID,region]=pair.split('::'),signal=playerSignalFor(s,businessID,region),rivals=_p9CityCompetitors(businessID,region);
    for(const r of rivals){
      const options=PHASE9_RIVAL_ACTIONS[signal]||PHASE9_RIVAL_ACTIONS.steady;
      const action=options[hash32(`${r.id}:${signal}:${Math.floor((s.week-1)/13)}`)%options.length];
      const prev=s.world.competitorMemory[r.id]||{};
      const direction=action==='steady'?-1:action==='expansion'?3:2;
      const momentum=clamp((Number(prev.momentum)||0)*.55+direction+(hash32(`${r.id}:mom:${s.week}`)%3)-1,-5,18);
      s.world.competitorMemory[r.id]={action,posture:rivalPosture(action),momentum,lastResponseWeek:s.week,playerSignal:signal,previousAction:prev.action||null};
    }
  }
}
cityCompetitors=function(businessID,region){
  const rows=_p9CityCompetitors(businessID,region);ensurePhase9State(state);
  return rows.map(r=>{
    const m=state.world.competitorMemory[r.id];if(!m)return r;
    let strength=r.strength+Math.round((m.momentum||0)*.55),priceIndex=r.priceIndex;
    if(m.action==='price_cut'){priceIndex*=.95;strength+=2;}
    else if(m.action==='brand_push')strength+=4;
    else if(m.action==='renovation')strength+=5;
    else if(m.action==='expansion')strength+=3;
    return {...r,action:m.action,strategicPosture:m.posture,playerSignal:m.playerSignal,momentum:m.momentum,lastResponseWeek:m.lastResponseWeek,strength:clamp(Math.round(strength),20,99),priceIndex:clamp(priceIndex,.68,1.45)};
  });
};

function phase9RecordStoreHistory(s,before){
  const rows=s.company.stores.map(store=>({id:store.id,businessID:store.businessID,name:store.name,revenue:Number(store.lastRevenue)||0,profit:Number(store.lastProfit)||0,revenueDelta:(Number(store.lastRevenue)||0)-(before.get(store.id)?.revenue||0),profitDelta:(Number(store.lastProfit)||0)-(before.get(store.id)?.profit||0)}));
  s.history.storeWeeks.push({week:s.week,stores:rows});if(s.history.storeWeeks.length>104)s.history.storeWeeks.shift();return rows;
}
function phase9OpportunityQueue(s,brief){
  const q=[];const tier=managementTier(s),margin=brief.executive.operatingMargin,runway=brief.executive.cashRunwayWeeks;
  if(runway<13)q.push({level:'critical',text:'Cash runwayが13週未満。投資抑制・資金調達・不採算改善を優先。'});
  if(margin<0)q.push({level:'critical',text:'営業赤字。価格・固定費・競合圧力を事業別に確認。'});
  const unused=projectCapacity(s)-activeProjectCount(s);if(unused>0&&s.company.cash>12000000)q.push({level:'opportunity',text:`Project capacityが${unused}枠空いています。CAPEX配分余地あり。`});
  if(tier>=1&&Object.entries(s.management.policies).some(([,p])=>p.mode==='manual'))q.push({level:'opportunity',text:'委任可能な事業がManualのままです。CEO時間を資本配分へ移せます。'});
  const high=s.company.stores.filter(x=>(x.lastBreakdown?.competitionPressure||0)>.18).length;if(high)q.push({level:'warning',text:`競争圧力18%超の店舗が${high}店。価格・改装・撤退を比較。`});
  if(!q.length)q.push({level:'stable',text:'重大な経営アラートなし。次の成長投資と資本効率を比較。'});return q.slice(0,4);
}
function phase9Outlook(s){
  const hist=s.history.companyWeeks.slice(-4),avgRev=hist.length?hist.reduce((a,x)=>a+(x.revenue||0),0)/hist.length:(s.company.lastWeekRevenue||0),avgProfit=hist.length?hist.reduce((a,x)=>a+(x.profit||0),0)/hist.length:(s.company.lastWeekProfit||0);
  const nearProjects=s.projects.filter(p=>p.status==='in_progress'&&p.completeWeek<=s.week+4).length;
  const active=activeEvents(s);let eventTilt=0;for(const e of active){if(e.type==='station_redevelopment'||e.type==='social_buzz')eventTilt+=.015;else eventTilt-=.012;}
  const projectTilt=nearProjects*.012,tilt=clamp(projectTilt+eventTilt,-.08,.10),centerRev=Math.max(0,avgRev*(1+tilt)),spread=.06+Math.min(.04,active.length*.01);
  const centerProfit=avgProfit+avgRev*tilt*.35;
  return {weeks:4,revenueCenter:centerRev,revenueLow:centerRev*(1-spread),revenueHigh:centerRev*(1+spread),profitCenter:centerProfit,nearProjects,activeEvents:active.length};
}
function enrichExecutiveBrief(s,storeRows){
  const brief=s.history.briefs[s.history.briefs.length-1];if(!brief)return;
  const hist=s.history.companyWeeks.slice(-4),rev4=hist.map(x=>x.revenue||0),profit4=hist.map(x=>x.profit||0);
  const margin=brief.revenue?brief.profit/brief.revenue:0,weeklyBurn=Math.max(0,-brief.profit),runway=weeklyBurn>0?clamp(s.company.cash/weeklyBurn,0,999):999,lev=s.company.debt/Math.max(1,companyValue(s));
  brief.executive={operatingMargin:margin,cashRunwayWeeks:runway,leverageRatio:lev,revenue4w:rev4,profit4w:profit4,revenueTrend4w:rev4.length>1?rev4[rev4.length-1]-rev4[0]:0,profitTrend4w:profit4.length>1?profit4[profit4.length-1]-profit4[0]:0,tier:managementTier(s),tierLabel:phase9TierLabel(managementTier(s))};
  brief.storeMovers=storeRows.slice().sort((a,b)=>Math.abs(b.profitDelta)-Math.abs(a.profitDelta)).slice(0,5);
  brief.projectMilestones=s.projects.filter(p=>p.status==='in_progress').sort((a,b)=>a.completeWeek-b.completeWeek).slice(0,5).map(p=>({id:p.id,targetId:p.targetId,kind:p.kind,completeWeek:p.completeWeek,progress:clamp((s.week-p.startWeek)/Math.max(1,p.completeWeek-p.startWeek),0,1)}));
  brief.eventExposure=activeEvents(s).map(e=>({type:e.type,endWeek:e.endWeek}));brief.outlook=phase9Outlook(s);brief.decisions=phase9OpportunityQueue(s,brief);
}
processCompanyWeek=function(s){
  ensurePhase9State(s);serviceCompetitorStrategies(s);
  const before=new Map(s.company.stores.map(x=>[x.id,{revenue:Number(x.lastRevenue)||0,profit:Number(x.lastProfit)||0}]));
  _p9ProcessCompanyWeek(s);
  const rows=phase9RecordStoreHistory(s,before);enrichExecutiveBrief(s,rows);
};

function phase9PctBar(values,positiveClass='positive'){
  if(!values?.length)return '';
  const max=Math.max(1,...values.map(x=>Math.abs(x)));return `<div class="mini-bars">${values.map(x=>`<i class="${x>=0?positiveClass:'negative'}" style="height:${Math.max(8,Math.round(Math.abs(x)/max*100))}%"></i>`).join('')}</div>`;
}
briefPanel=function(){
  const b=state.history?.briefs?.[state.history.briefs.length-1];if(!b?.executive)return _p9BriefPanel();
  const e=b.executive,o=b.outlook||{},drivers=(b.drivers||[]).map(x=>`<div class="bridge-row"><span>${x.label}</span><b class="${x.amount>=0?'positive':'negative'}">${signedYen(x.amount)}</b></div>`).join('');
  const movers=(b.storeMovers||[]).map(x=>`<div class="phase9-row"><div><b>${x.name}</b><span>${PILLARS[x.businessID]?.name||x.businessID}</span></div><strong class="${x.profitDelta>=0?'positive':'negative'}">${signedYen(x.profitDelta)}</strong></div>`).join('')||'<p class="sub">店舗差分を蓄積中です。</p>';
  const decisions=(b.decisions||[]).map(x=>`<div class="decision-item ${x.level}">${x.text}</div>`).join('');
  return `<section class="card roadmap-card executive-brief"><div class="section-row"><div><h2>W${b.week} Executive Management Brief</h2><p class="sub">${e.tierLabel} · 変化の理由から次の意思決定まで。</p></div><span class="pill">OPERATING REVIEW</span></div><div class="executive-kpis"><div><small>Revenue</small><b>${yen(b.revenue)}</b><em class="${b.revenueDelta>=0?'positive':'negative'}">${signedYen(b.revenueDelta)}</em></div><div><small>Operating Margin</small><b>${pct(e.operatingMargin)}</b><em>${phase9PctBar(e.profit4w)}</em></div><div><small>Cash Runway</small><b>${e.cashRunwayWeeks>=999?'Profitable':`${e.cashRunwayWeeks.toFixed(1)}週`}</b><em>Cash ${yen(state.company.cash)}</em></div><div><small>Leverage</small><b>${pct(e.leverageRatio)}</b><em>Debt ${yen(state.company.debt)}</em></div></div><div class="phase9-columns"><div><h3>Performance Bridge</h3><div class="bridge-list">${drivers||'<p class="sub">主要ドライバーを蓄積中。</p>'}</div></div><div><h3>Top Store Movers</h3><div class="phase9-list">${movers}</div></div></div><div class="outlook-strip"><div><small>4W Revenue Outlook</small><b>${yen(o.revenueLow||0)} – ${yen(o.revenueHigh||0)}</b></div><div><small>Projects completing</small><b>${o.nearProjects||0}</b></div><div><small>Active events</small><b>${o.activeEvents||0}</b></div></div><h3>Decision Queue</h3><div class="decision-list">${decisions}</div></section>`;
};

function phase9ManagementPanel(id){
  const tier=managementTier(state),u=businessUnitFor(state,id),policy=policyFor(state,id),cfg=PHASE9_AUTONOMY[u.autonomy]||PHASE9_AUTONOMY.low;
  const autonomy=Object.entries(PHASE9_AUTONOMY).map(([k,v])=>`<option value="${k}" ${u.autonomy===k?'selected':''} ${tier<1?'disabled':''}>${v.label}</option>`).join('');
  const reviews=Object.entries(PHASE9_REVIEW).map(([k,v])=>`<option value="${k}" ${u.reviewCadence===k?'selected':''}>${v.label}</option>`).join('');
  return `<section class="card half phase9-management"><div class="section-row"><div><h2>Management Organization</h2><p class="sub">${phase9TierLabel(tier)} · ${u.managerName} Manager</p></div><span class="manager-score">${Math.round(u.managerQuality)}<small>QUALITY</small></span></div><div class="manager-grid"><label>Autonomy<select data-p9-autonomy="${id}">${autonomy}</select></label><label>Review<select data-p9-review="${id}">${reviews}</select></label></div><div class="manager-facts"><span>Policy <b>${policyLabel(policy.mode)}</b></span><span>Execution speed <b>${pct(cfg.speed*(.62+u.managerQuality/125),0)}</b></span><span>Budget ceiling <b>${yen(u.weeklyBudget)}</b></span><span>Tenure <b>${Math.max(0,state.week-u.tenureStartWeek)}週</b></span></div><input class="phase9-range" type="range" min="0" max="2000000" step="50000" value="${clamp(u.weeklyBudget,0,2000000)}" data-p9-budget="${id}" ${tier<1?'disabled':''}></section>`;
}
function phase9CapexPanel(id){
  const cap=projectCapacity(state),active=activeProjectCount(state),rows=state.projects.filter(p=>p.scope==='capex'&&p.targetId===id&&p.status==='in_progress').map(p=>`<div class="project-row"><div><b>${PHASE9_CAPEX[p.kind]?.label||p.kind}</b><span>${Math.round((p.progress||0)*100)}% · W${p.completeWeek}完成 · ${yen(p.cost)}</span></div><strong>${Math.max(0,p.completeWeek-state.week)}週</strong></div>`).join('')||'<p class="sub">この事業のCAPEXは進行していません。</p>';
  const buttons=Object.entries(PHASE9_CAPEX).map(([k,v])=>`<button class="btn phase9-capex-btn" data-p9-capex="${id}" data-p9-kind="${k}" ${active>=cap?'disabled':''}><b>${v.label}</b><small>${yen(v.cost)} · ${v.duration}週</small></button>`).join('');
  return `<section class="card half phase9-capex"><div class="section-row"><div><h2>Capital Program</h2><p class="sub">効果は完成後。全社Project Capacity ${active}/${cap}</p></div><span class="pill">CAPEX</span></div><div class="project-list">${rows}</div><div class="capex-actions">${buttons}</div></section>`;
}
operations=function(){
  let html=_p9Operations();if(!selectedBusiness||selectedMapBusiness||selectedStoreDetail)return html;
  return injectBeforeMainClose(html,`<div class="grid roadmap-grid phase9-ops">${phase9ManagementPanel(selectedBusiness)}${phase9CapexPanel(selectedBusiness)}</div>`);
};

cityEntitySheet=function(businessID,entity){
  let html=_p9CityEntitySheet(businessID,entity);if(entity?.type!=='rival'||!entity.data?.strategicPosture)return html;
  const r=entity.data,extra=`<div class="rival-strategy"><span>STRATEGY</span><b>${r.strategicPosture}</b><small>Player signal: ${r.playerSignal} · Momentum ${Number(r.momentum||0).toFixed(1)} · W${r.lastResponseWeek}</small></div>`;
  return html.replace('</section>',`${extra}</section>`);
};

bind=function(){
  _p9Bind();
  document.querySelectorAll('[data-p9-autonomy]').forEach(el=>el.onchange=()=>setManagementAutonomy(el.dataset.p9Autonomy,el.value));
  document.querySelectorAll('[data-p9-review]').forEach(el=>el.onchange=()=>setManagementReviewCadence(el.dataset.p9Review,el.value));
  document.querySelectorAll('[data-p9-budget]').forEach(el=>el.onchange=()=>setManagementBudget(el.dataset.p9Budget,el.value));
  document.querySelectorAll('[data-p9-capex]').forEach(el=>el.onclick=()=>scheduleCapexProject(el.dataset.p9Capex,el.dataset.p9Kind));
};

if(state){ensurePhase9State(state);save();render();}
