'use strict';

// CEO Command Center: executive shell + live simulation-backed operating surfaces.
const _ccBind=bind,_ccTopbar=topbar,_ccNav=nav;

function ccRoleLabel(){
  try{return phase11Journey(state).role||'Owner Operator';}
  catch(_){return 'Owner Operator';}
}
function ccActiveBusinessCount(){return Object.keys(state.company.businesses||{}).length;}
function ccFmtPct(x){return (Number(x)*100).toFixed(1)+'%';}
function ccSeries(key,current){
  const rows=(state.history&&state.history.companyWeeks||[]).slice(-8);
  const vals=rows.map(function(x){return Number(x[key])||0;});
  if(!vals.length||vals[vals.length-1]!==current)vals.push(Number(current)||0);
  return vals.slice(-8);
}
function ccSpark(values,tone){
  if(!values||!values.length)return '<div class="cc-spark empty"></div>';
  const min=Math.min.apply(null,values),max=Math.max.apply(null,values),range=Math.max(1,max-min);
  return '<div class="cc-spark '+(tone||'')+'">'+values.map(function(v){const h=20+Math.round((v-min)/range*80);return '<i style="height:'+h+'%"></i>';}).join('')+'</div>';
}
function ccDelta(current,previous,invert){
  if(!Number.isFinite(previous)||Math.abs(previous)<1)return {text:'—',cls:'neutral'};
  const d=(current-previous)/Math.abs(previous),good=invert?d<=0:d>=0;
  return {text:(d>=0?'▲ +':'▼ ')+(Math.abs(d)*100).toFixed(1)+'%',cls:good?'positive':'negative'};
}
function ccMetricCard(label,value,current,series,invert){
  const prev=series.length>1?series[series.length-2]:NaN,d=ccDelta(current,prev,invert);
  return '<article class="cc-kpi-card"><small>'+label+'</small><b>'+value+'</b><span class="'+d.cls+'">'+d.text+'</span>'+ccSpark(series,d.cls)+'</article>';
}
function ccExecutiveMetrics(){
  const value=companyValue(state),cash=Number(state.company.cash)||0,debt=Number(state.company.debt)||0,profit=Number(state.company.lastWeekProfit)||0;
  const invested=Math.max(1,value-cash+debt),roic=profit*52/invested;
  const valueSeries=ccSeries('companyValue',value),cashSeries=ccSeries('cash',cash),debtSeries=ccSeries('debt',debt),profitSeries=ccSeries('profit',profit);
  const roicSeries=profitSeries.map(function(p,i){const row=(state.history.companyWeeks||[]).slice(-profitSeries.length)[i];const v=row&&Number(row.companyValue)||value,c=row&&Number(row.cash)||cash,d=row&&Number(row.debt)||debt;return p*52/Math.max(1,v-c+d);});
  return '<section class="cc-panel cc-kpi-panel" data-cc-section="kpis"><div class="cc-panel-head"><div><span>PERFORMANCE</span><h2>Executive Metrics</h2></div><i>LIVE</i></div><div class="cc-kpi-grid">'
    +ccMetricCard('Enterprise Value',yen(value),value,valueSeries,false)
    +ccMetricCard('Company Cash',yen(cash),cash,cashSeries,false)
    +ccMetricCard('Debt',yen(debt),debt,debtSeries,true)
    +ccMetricCard('ROIC',ccFmtPct(roic),roic,roicSeries,false)
    +ccMetricCard('Weekly Profit',yen(profit),profit,profitSeries,false)
    +'</div></section>';
}
function ccInboxItems(){
  const items=[];
  const push=function(priority,tag,title,sub,route,business){items.push({priority:priority,tag:tag,title:title,sub:sub,route:route,business:business});};
  const brief=(state.history&&state.history.briefs||[]).slice(-1)[0];
  if(brief&&brief.decisions)brief.decisions.slice(0,2).forEach(function(d){
    const p=d.level==='critical'?3:d.level==='warning'?2:d.level==='opportunity'?1:0;
    push(p,'BRIEF',d.text,p>=2?'Management Briefで原因を確認してください。':'資本余力と優先順位を比較できます。','operations');
  });
  const pressured=(state.company.stores||[]).filter(function(s){return Number(s.lastBreakdown&&s.lastBreakdown.competitionPressure||0)>.18;}).sort(function(a,b){return (b.lastBreakdown.competitionPressure||0)-(a.lastBreakdown.competitionPressure||0);})[0];
  if(pressured)push(3,'COMPETITION',pressured.name+' 競争圧力 '+ccFmtPct(pressured.lastBreakdown.competitionPressure),'価格・広告・改装の対応余地を確認。','operations',pressured.businessID);
  const weak=(state.company.stores||[]).filter(function(s){return Number(s.lastProfit||0)<0;}).sort(function(a,b){return Number(a.lastProfit||0)-Number(b.lastProfit||0);})[0];
  if(weak)push(3,'P&L',weak.name+' 赤字 '+yen(weak.lastProfit),'店舗P&Lと競合・立地要因を確認。','operations',weak.businessID);
  const project=(state.projects||[]).filter(function(p){return p.status==='in_progress';}).sort(function(a,b){return a.completeWeek-b.completeWeek;})[0];
  if(project)push(project.completeWeek-state.week<=4?2:1,'CAPEX',(PILLARS[project.targetId]&&PILLARS[project.targetId].name||project.targetId)+' '+String(project.kind).toUpperCase()+' W'+project.completeWeek+'完了','残り '+Math.max(0,project.completeWeek-state.week)+'週。','operations',project.targetId);
  const events=typeof activeEvents==='function'?activeEvents(state):[];
  if(events.length)push(2,'MACRO',typeof eventLabel==='function'?eventLabel(events[0].type):events[0].type,'W'+events[0].endWeek+'まで業績へ影響。','operations');
  if(!state.company.public&&companyValue(state)>=80000000&&state.company.lastWeekProfit>0)push(2,'CAPITAL','IPO条件を達成','資本市場からIPOを実行できます。','market');
  if(state.pe&&state.pe.unlocked){
    const open=(state.pe.deals||[]).filter(function(d){return d.status==='open';}).length;
    if(open)push(2,'DEAL',open+'件のPE案件がDeal Bookで待機','DD / IC判断が必要です。','pe');
    const fund=(state.pe.funds||[]).slice(-1)[0];
    if(fund)push(1,'FUND',fund.id+' deployable capital '+yen(fund.cash||0),'Deployment '+ccFmtPct((fund.invested||0)/Math.max(1,fund.commitments||fund.size||1))+'。','pe');
  }
  if(!items.length)push(0,'STABLE','重大な要対応事項なし','次の成長投資と資本効率を比較できます。','operations');
  return items.sort(function(a,b){return b.priority-a.priority;}).slice(0,5);
}
function ccInbox(){
  const items=ccInboxItems(),critical=items.filter(function(x){return x.priority>=2;}).length;
  return '<section class="cc-panel cc-inbox-panel" data-cc-section="inbox"><div class="cc-panel-head"><div><span>ACTION REQUIRED</span><h2>CEO Inbox</h2></div><i class="'+(critical?'warn':'')+'">'+critical+' PRIORITY</i></div><div class="cc-inbox-list">'+items.map(function(x){
    const cls=x.priority>=3?'critical':x.priority===2?'warning':x.priority===1?'opportunity':'stable';
    return '<button class="cc-inbox-row '+cls+'" data-cc-route="'+x.route+'"'+(x.business?' data-cc-business="'+x.business+'"':'')+'><span class="cc-inbox-dot"></span><em>'+x.tag+'</em><div><b>'+x.title+'</b><small>'+x.sub+'</small></div><strong>›</strong></button>';
  }).join('')+'</div></section>';
}
function ccBusinessTrend(id){
  const rows=(state.history&&state.history.storeWeeks||[]).slice(-7);
  return rows.map(function(w){return (w.stores||[]).filter(function(s){return s.businessID===id;}).reduce(function(a,s){return a+(Number(s.profit)||0);},0);});
}
function ccBusinessUnits(){
  const rows=Object.keys(state.company.businesses||{}).map(function(id){
    const p=PILLARS[id]||{name:id,icon:'◆'},summary=businessSummary({id:id,name:p.name,icon:p.icon,desc:p.desc||''}),u=businessUnitFor(state,id),trend=ccBusinessTrend(id);
    const policy=policyFor(state,id);
    return '<button class="cc-business-row" data-cc-business="'+id+'"><span class="cc-business-icon">'+p.icon+'</span><div class="cc-business-copy"><b>'+p.name+'</b><small>'+summary.stores.length+' locations · '+u.managerName+' · '+(policy.mode||'manual')+'</small></div><div class="cc-business-value"><b class="'+(summary.profit>=0?'positive':'negative')+'">'+yen(summary.profit)+'</b><small>weekly profit</small></div>'+ccSpark(trend,summary.profit>=0?'positive':'negative')+'<strong>›</strong></button>';
  }).join('');
  return '<section class="cc-panel cc-business-panel" data-cc-section="business"><div class="cc-panel-head"><div><span>OPERATING PORTFOLIO</span><h2>Business Units</h2></div><i>'+Object.keys(state.company.businesses||{}).length+' UNITS</i></div><div class="cc-business-list">'+(rows||'<div class="cc-empty">事業ポートフォリオがありません。</div>')+'</div></section>';
}
function ccHero(){
  const v=companyValue(state);
  return '<section class="cc-hero"><div class="cc-hero-copy"><div class="cc-brandline"><span>CAPITAL ASCENT</span><i>BUILD · ACQUIRE · OPERATE · ALLOCATE</i></div><div class="cc-period"><b>Y'+state.year+' · W'+state.week+'</b><small>'+ccRoleLabel()+'</small></div><h1>CEO Command Center</h1><p>全社の重要シグナル、事業、資本配分、次の意思決定を1画面で確認します。</p><div class="cc-companyline"><span>'+state.player.name+'</span><em>'+ccActiveBusinessCount()+' business units · '+state.company.stores.length+' locations</em></div></div><div class="cc-hero-value"><small>ENTERPRISE VALUE</small><b>'+yen(v)+'</b><span class="'+(state.company.lastWeekProfit>=0?'positive':'negative')+'">'+(state.company.lastWeekProfit>=0?'▲':'▼')+' Weekly Profit '+yen(state.company.lastWeekProfit)+'</span></div></section>';
}
function ccQuickActions(){
  return '<div class="cc-quick-actions"><button data-act="advance13"><span>13W</span><b>Quarter Advance</b></button><button data-tab="operations"><span>OPS</span><b>Operations</b></button><button data-tab="market"><span>CAP</span><b>Capital</b></button><button data-tab="pe"><span>PE</span><b>Deal Office</b></button></div>';
}
function ccCapitalAllocation(){
  ensurePhase10State(state);
  const since=Math.max(1,state.week-51);
  const capex=(state.projects||[]).filter(function(p){return Number(p.startWeek||0)>=since;}).reduce(function(a,p){return a+(Number(p.cost)||0);},0);
  const acquisitions=(state.company.subsidiaryPortfolio||[]).filter(function(s){return Number(s.acquisitionWeek||0)>=since;}).reduce(function(a,s){return a+(Number(s.acquisitionPrice)||0);},0);
  const pmi=(state.company.integrationProjects||[]).filter(function(p){return Number(p.startWeek||0)>=since;}).reduce(function(a,p){return a+(Number(p.cost)||0);},0);
  const returns=(Number(state.company.capitalAllocation&&state.company.capitalAllocation.dividendsPaid)||0)+(Number(state.company.capitalAllocation&&state.company.capitalAllocation.buybackSpend)||0);
  const rows=[
    {label:'Organic CAPEX · 52W',value:capex,icon:'▥'},
    {label:'M&A + PMI · 52W',value:acquisitions+pmi,icon:'◇'},
    {label:'Shareholder Return · LTD',value:returns,icon:'↗'},
    {label:'Debt Outstanding',value:Math.max(0,Number(state.company.debt)||0),icon:'▰'},
    {label:'Cash Reserve',value:Math.max(0,Number(state.company.cash)||0),icon:'●'}
  ];
  const total=Math.max(1,rows.reduce(function(a,x){return a+x.value;},0));
  return '<section class="cc-panel cc-capital-panel" data-cc-section="capital"><div class="cc-panel-head"><div><span>CAPITAL OFFICE</span><h2>Capital Allocation</h2></div><i>ACTUAL</i></div><p class="cc-panel-note">直近52週の投下資本と現在のBalance Sheetを表示。予算値ではありません。</p><div class="cc-allocation-list">'+rows.map(function(x){const share=x.value/total;return '<div class="cc-allocation-row"><span>'+x.icon+'</span><div><b>'+x.label+'</b><div class="cc-allocation-track"><i style="width:'+Math.max(2,Math.round(share*100))+'%"></i></div></div><strong>'+yen(x.value)+'</strong></div>';}).join('')+'</div><button class="cc-panel-link" data-cc-route="market">Open Capital Allocation Office <b>›</b></button></section>';
}
function ccQuarterEvents(){
  const qEnd=state.week+(13-((state.week-1)%13));
  const items=[{week:qEnd,tag:'BOARD',title:'Quarter Close / Operating Review',sub:'次四半期の資本配分と事業優先順位を更新。',route:'overview'}];
  (state.projects||[]).filter(function(p){return p.status==='in_progress'&&p.completeWeek>=state.week&&p.completeWeek<=qEnd;}).forEach(function(p){items.push({week:p.completeWeek,tag:'CAPEX',title:(PILLARS[p.targetId]&&PILLARS[p.targetId].name||p.targetId)+' '+String(p.kind).toUpperCase()+' complete',sub:'投資効果が週次economicsへ反映開始。',route:'operations',business:p.targetId});});
  (state.company.integrationProjects||[]).filter(function(p){return p.status==='in_progress'&&p.completeWeek>=state.week&&p.completeWeek<=qEnd;}).forEach(function(p){const sub=(state.company.subsidiaryPortfolio||[]).find(function(s){return s.id===p.subsidiaryId;});items.push({week:p.completeWeek,tag:'PMI',title:(sub&&sub.name||'Subsidiary')+' integration milestone',sub:'Synergy / margin / management qualityの統合結果を確認。',route:'market'});});
  (typeof activeEvents==='function'?activeEvents(state):[]).filter(function(e){return e.endWeek>=state.week&&e.endWeek<=qEnd;}).forEach(function(e){items.push({week:e.endWeek,tag:'MACRO',title:(typeof eventLabel==='function'?eventLabel(e.type):e.type)+' ends',sub:'外部環境の業績影響が終了予定。',route:'operations'});});
  const fund=(state.pe&&state.pe.funds||[]).slice(-1)[0];
  if(fund){
    if(fund.investmentEndWeek>=state.week&&fund.investmentEndWeek<=qEnd)items.push({week:fund.investmentEndWeek,tag:'FUND',title:fund.id+' Investment Period End',sub:'Deploymentとreserveを確認。',route:'pe'});
    if(fund.endWeek>=state.week&&fund.endWeek<=qEnd)items.push({week:fund.endWeek,tag:'LP',title:fund.id+' Fund Term End',sub:'DPI / TVPI / distributionsを確認。',route:'pe'});
  }
  return items.sort(function(a,b){return a.week-b.week;}).slice(0,5);
}
function ccQuarterCalendar(){
  const events=ccQuarterEvents();
  return '<section class="cc-panel cc-quarter-panel" data-cc-section="quarter"><div class="cc-panel-head"><div><span>BOARD CALENDAR</span><h2>This Quarter</h2></div><i>W'+state.week+'</i></div><div class="cc-calendar-list">'+events.map(function(x){const left=Math.max(0,x.week-state.week);return '<button class="cc-calendar-row" data-cc-route="'+x.route+'"'+(x.business?' data-cc-business="'+x.business+'"':'')+'><time><b>W'+x.week+'</b><small>'+(left===0?'NOW':'+'+left+'W')+'</small></time><em>'+x.tag+'</em><div><b>'+x.title+'</b><small>'+x.sub+'</small></div><strong>›</strong></button>';}).join('')+'</div></section>';
}
function ccSummitBanner(){
  return '<section class="cc-summit"><div><span>NEXT SUMMIT</span><b>Operate the business. Allocate the capital. Compound the advantage.</b><small>'+ccRoleLabel()+' · Y'+state.year+' W'+state.week+'</small></div><button data-tab="legacy">Career & Legacy ›</button></section>';
}
function ccLegacyPanels(){
  let html='';if(typeof phase11TutorialPanel==='function')html+=phase11TutorialPanel();if(typeof phase11JourneyPanel==='function')html+=phase11JourneyPanel();if(typeof briefPanel==='function')html+='<div class="cc-board-papers"><div class="cc-section-title"><span>BOARD PAPERS</span><h2>Operating Review</h2></div>'+briefPanel()+'</div>';return html;
}
overview=function(){
  ensurePhase11State(state);
  return '<main class="cc-main">'+ccHero()+ccQuickActions()+'<div class="cc-layout">'+ccExecutiveMetrics()+ccInbox()+ccBusinessUnits()+ccCapitalAllocation()+ccQuarterCalendar()+'</div>'+ccSummitBanner()+ccLegacyPanels()+'</main>';
};
topbar=function(){
  if(tab!=='overview')return _ccTopbar();
  return '<header class="topbar cc-topbar"><div class="cc-topbar-brand"><b>'+state.player.name+'</b><span>CAPITAL ASCENT · CEO OFFICE</span></div><div class="time-ctrl"><div class="week-badge"><b>Y'+state.year+' · W'+state.week+'</b><small>'+ccRoleLabel()+'</small></div><button class="advance-btn" data-act="advance" aria-label="1週進める">▶</button></div></header>';
};
nav=function(){
  const items=[['overview','▥','Overview'],['operations','▦','Operations'],['market','↗','Market'],['pe','◉','PE'],['legacy','△','Legacy']];
  return '<nav class="nav cc-nav">'+items.map(function(x){return '<button data-tab="'+x[0]+'" class="'+(tab===x[0]?'active':'')+'"><span class="ico">'+x[1]+'</span>'+x[2]+'</button>';}).join('')+'</nav>';
};
bind=function(){
  _ccBind();
  document.querySelectorAll('[data-cc-route]').forEach(function(el){el.onclick=function(){const route=el.dataset.ccRoute;if(el.dataset.ccBusiness){selectedBusiness=el.dataset.ccBusiness;selectedMapBusiness=null;selectedStoreDetail=null;}tab=route;render();};});
  document.querySelectorAll('.cc-business-row[data-cc-business]').forEach(function(el){el.onclick=function(){selectedBusiness=el.dataset.ccBusiness;selectedMapBusiness=null;selectedStoreDetail=null;tab='operations';state.progression.tutorial.visitedOperations=true;save();render();};});
};

if(state)render();
