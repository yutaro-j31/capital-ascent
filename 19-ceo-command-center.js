'use strict';

// Post-release UI workstream: CEO Command Center.
// PR1 establishes the shell and preserves the existing causal panels underneath it.
const _ccOverview=overview;

function ccRoleLabel(){
  try{return phase11Journey(state).role||'Owner Operator';}
  catch(_){return 'Owner Operator';}
}
function ccActiveBusinessCount(){return Object.keys(state.company.businesses||{}).length;}
function ccHero(){
  const v=companyValue(state);
  return '<section class="cc-hero">'
    +'<div class="cc-hero-copy"><div class="cc-brandline"><span>CAPITAL ASCENT</span><i>BUILD · ACQUIRE · OPERATE · ALLOCATE</i></div>'
    +'<div class="cc-period"><b>Y'+state.year+' · W'+state.week+'</b><small>'+ccRoleLabel()+'</small></div>'
    +'<h1>CEO Command Center</h1><p>全社の重要シグナル、事業、資本配分、次の意思決定を1画面で確認します。</p>'
    +'<div class="cc-companyline"><span>'+state.player.name+'</span><em>'+ccActiveBusinessCount()+' business units · '+state.company.stores.length+' locations</em></div>'
    +'</div>'
    +'<div class="cc-hero-value"><small>ENTERPRISE VALUE</small><b>'+yen(v)+'</b><span class="'+(state.company.lastWeekProfit>=0?'positive':'negative')+'">'+(state.company.lastWeekProfit>=0?'▲':'▼')+' Weekly Profit '+yen(state.company.lastWeekProfit)+'</span></div>'
    +'</section>';
}
function ccQuickActions(){
  return '<div class="cc-quick-actions">'
    +'<button data-act="advance13"><span>13W</span><b>Quarter Advance</b></button>'
    +'<button data-tab="operations"><span>OPS</span><b>Operations</b></button>'
    +'<button data-tab="market"><span>CAP</span><b>Capital</b></button>'
    +'<button data-tab="pe"><span>PE</span><b>Deal Office</b></button>'
    +'</div>';
}
function ccPlaceholder(title,kicker,kind){
  return '<section class="cc-panel cc-placeholder" data-cc-section="'+kind+'"><div class="cc-panel-head"><div><span>'+kicker+'</span><h2>'+title+'</h2></div><i>LIVE</i></div><div class="cc-placeholder-body"><b>Executive data surface</b><small>次のUIレイヤーで既存simulationの実データを接続します。</small></div></section>';
}
function ccLegacyPanels(){
  let html='';
  if(typeof phase11TutorialPanel==='function')html+=phase11TutorialPanel();
  if(typeof phase11JourneyPanel==='function')html+=phase11JourneyPanel();
  if(typeof briefPanel==='function')html+='<div class="cc-board-papers"><div class="cc-section-title"><span>BOARD PAPERS</span><h2>Operating Review</h2></div>'+briefPanel()+'</div>';
  return html;
}
overview=function(){
  ensurePhase11State(state);
  return '<main class="cc-main">'
    +ccHero()
    +ccQuickActions()
    +'<div class="cc-layout">'
      +ccPlaceholder('Executive Metrics','PERFORMANCE','kpis')
      +ccPlaceholder('CEO Inbox','ACTION REQUIRED','inbox')
      +ccPlaceholder('Business Units','OPERATING PORTFOLIO','business')
      +ccPlaceholder('Capital Allocation','CAPITAL OFFICE','capital')
      +ccPlaceholder('This Quarter','BOARD CALENDAR','quarter')
    +'</div>'
    +ccLegacyPanels()
    +'</main>';
};

if(state)render();
