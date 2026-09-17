'use strict';

const _p11EnsureAdvancedState=ensureAdvancedState;
const _p11Overview=overview;
const _p11PeView=peView;
const _p11Market=market;
const _p11Legacy=legacy;
const _p11Bind=bind;
const _p11Render=render;
let phase11Sheet=null;

function ensurePhase11State(s){
  _p11EnsureAdvancedState(s);
  s.progression=s.progression||{};
  s.progression.tutorial=s.progression.tutorial||{};
  const t=s.progression.tutorial;
  if(typeof t.dismissed!=='boolean')t.dismissed=false;
  if(typeof t.visitedOperations!=='boolean')t.visitedOperations=false;
  if(typeof t.visitedMarket!=='boolean')t.visitedMarket=false;
  if(typeof t.visitedPe!=='boolean')t.visitedPe=false;
  if(typeof t.visitedCity!=='boolean')t.visitedCity=false;
  if(!Number.isFinite(t.startedWeek))t.startedWeek=s.week||1;
  return s;
}
ensureAdvancedState=ensurePhase11State;

// Phase 11 progression calibration: institutional PE GPs typically commit a small
// minority of fund capital. Keep the track-record benefit, but avoid the legacy
// 2–20% range that made Fund I unreachable after a credible founder Exit.
gpRatio=function(score){return .025-.01*Math.pow(clamp(Number(score)||0,0,100)/100,.7);};

const _p11GeneratePeDeals=generatePeDeals;
generatePeDeals=function(s){
  const before=new Set((s.pe.deals||[]).map(function(d){return d.id;}));
  _p11GeneratePeDeals(s);
  const active=(s.pe.funds||[]).filter(function(f){return s.week<=f.investmentEndWeek;}).slice(-1)[0];
  if(!active)return;
  (s.pe.deals||[]).forEach(function(d){
    if(before.has(d.id)||d.status!=='open')return;
    const target=(active.commitments||active.size)/Math.max(1,active.slots)*1.9*(.85+u01(d.id+':phase11-ticket')*.30);
    if(d.value<target){
      d.value=target;
      d.ebitda=d.value/(6.5+u01(d.id+'m')*3.5);
      d.entryMultiple=d.value/Math.max(1,d.ebitda);
    }
  });
};

function phase11FundNumber(s){return (s.pe&&s.pe.funds||[]).reduce(function(m,f){return Math.max(m,Number(f.number)||0);},0);}
function phase11HasPeExit(s){return (s.pe&&s.pe.portfolio||[]).some(function(p){return p.status==='exited';});}
function phase11HasPeDeal(s){return (s.pe&&s.pe.portfolio||[]).length>0;}

function phase11Journey(s){
  s=s||state;ensurePhase11State(s);
  const value=companyValue(s),profit=Number(s.company.lastWeekProfit)||0,exitCount=(s.career.exitRecords||[]).length,fundNo=phase11FundNumber(s);
  const steps=[
    {id:'found',label:'創業',short:'FOUND',done:true,detail:'会社を設立し、最初の事業を開始した。'},
    {id:'profit',label:'黒字化',short:'PROFIT',done:profit>0,detail:profit>0?'週次利益 '+yen(profit):'週次利益をプラスへ。価格・需要・固定費の因果を確認。'},
    {id:'scale',label:'企業価値8,000万円',short:'SCALE',done:value>=80000000,detail:value>=80000000?'企業価値 '+yen(value):'あと '+yen(Math.max(0,80000000-value))+'。13週平均利益と資本構成が企業価値を決める。'},
    {id:'exit',label:'Exit',short:'EXIT',done:exitCount>0,detail:exitCount>0?exitCount+'回達成':'IPOまたは会社売却でFounder資本を個人資産へ移す。'},
    {id:'fund1',label:'Fund I',short:'FUND I',done:fundNo>=1,detail:fundNo>=1?'LP commitmentsを運用中。':'Exit実績でPEを解禁し、GP出資を用意する。'},
    {id:'peDeal',label:'LBO投資',short:'LBO',done:phase11HasPeDeal(s),detail:phase11HasPeDeal(s)?'DD→IC→取得の実績あり。':'DD後、Fund construction制約の中で案件を取得する。'},
    {id:'peExit',label:'PE Exit',short:'REALIZE',done:phase11HasPeExit(s),detail:phase11HasPeExit(s)?'Fund distribution実績あり。':'Value creationとdebt paydownを経てExitする。'},
    {id:'fund2',label:'Fund II',short:'FUND II',done:fundNo>=2,detail:fundNo>=2?'現在 Fund '+fundNo:'DPI 1.20x・Deployment 80%・LP Trust 45を満たす。'}
  ];
  const completed=steps.filter(function(x){return x.done;}).length,next=steps.find(function(x){return !x.done;})||null;
  let role='Owner Operator';if(steps[2].done)role='CEO';if(steps[3].done)role='Exited Founder';if(steps[4].done)role='Capital Allocator';if(steps[7].done)role='Institutional GP';
  return {steps:steps,completed:completed,total:steps.length,next:next,role:role,value:value,profit:profit};
}

function phase11UnlockReasons(s){
  s=s||state;ensurePhase11State(s);const out=[],value=companyValue(s),tier=managementTier(s);
  out.push(tier<1?{name:'Manager委任',ready:false,reason:'3拠点で解禁。現在 '+s.company.stores.length+'拠点。'}:{name:'Manager委任',ready:true,reason:phase9TierLabel(tier)+' を利用可能。'});
  if(!s.company.public){
    const reasons=[];if(value<80000000)reasons.push('企業価値 '+yen(value)+' / 8,000万円');if((s.company.lastWeekProfit||0)<=0)reasons.push('直近黒字が必要');
    out.push({name:'IPO',ready:reasons.length===0,reason:reasons.length?reasons.join(' · '):'条件達成。'});
  }else out.push({name:'IPO',ready:true,reason:'上場済み。株主還元とCapital Allocationが利用可能。'});
  if(!s.pe.unlocked)out.push({name:'PE',ready:false,reason:'IPOまたは会社売却など、Exit実績が1回必要。'});
  else if(!(s.pe.funds||[]).length){
    const size=2.9e9,gp=size*gpRatio(trackScore(s)),initialGp=gp*.10;
    out.push({name:'Fund I',ready:s.personal.cash>=initialGp,reason:'First Close GP call '+yen(initialGp)+' / 個人現金 '+yen(s.personal.cash)});
  }else{
    const gate=nextFundEligibility(s);
    out.push({name:'Fund '+s.pe.nextFundNo,ready:gate.eligible,reason:gate.eligible?'DPI / Deployment / LP Trust達成。':gate.reasons.join(' · ')});
  }
  return out;
}

function phase11TutorialSteps(s){
  s=s||state;ensurePhase11State(s);const t=s.progression.tutorial;
  return [
    {label:'1週進める',done:s.week>=2,help:'週送りで売上・利益・競合・イベントが動きます。'},
    {label:'Management Briefを見る',done:(s.history.briefs||[]).length>0,help:'結果ではなく、なぜ変わったかを確認します。'},
    {label:'事業画面を開く',done:t.visitedOperations,help:'価格・広告・投資を1事業に集中して判断します。'},
    {label:'City Mapを見る',done:t.visitedCity,help:'物件と競合を同じ経済モデルで比較します。'},
    {label:'資本市場を見る',done:t.visitedMarket,help:'借入・M&A・IPOと資本配分を確認します。'}
  ];
}

function phase11TutorialPanel(){
  const t=state.progression.tutorial;if(t.dismissed)return '';
  const steps=phase11TutorialSteps(state),done=steps.filter(function(x){return x.done;}).length;if(done===steps.length&&state.week>13)return '';
  const rows=steps.map(function(x,i){return '<div class="p11-tutorial-step '+(x.done?'done':'')+'"><span>'+(x.done?'✓':i+1)+'</span><div><b>'+x.label+'</b><small>'+x.help+'</small></div></div>';}).join('');
  return '<section class="card p11-tutorial"><div class="p11-section-head"><div><span class="p11-eyebrow">FIRST-RUN GUIDE</span><h2>Founder Launch Guide</h2><p class="sub">操作方法ではなく、意思決定ループを覚えるガイドです。</p></div><button class="btn ghost" data-p11-dismiss-tutorial>非表示</button></div><div class="p11-tutorial-steps">'+rows+'</div><div class="p11-progress"><i style="width:'+(done/steps.length*100)+'%"></i></div></section>';
}

function phase11JourneyPanel(){
  const j=phase11Journey(state),unlocks=phase11UnlockReasons(state);
  const milestones=j.steps.map(function(x){
    const cls=x.done?'done':(j.next&&j.next.id===x.id?'next':'');
    return '<div class="p11-milestone '+cls+'"><span class="dot"></span><b>'+x.short+'</b><small>'+x.detail+'</small></div>';
  }).join('');
  const u=unlocks.map(function(x){return '<div class="p11-unlock '+(x.ready?'ready':'locked')+'"><span>'+(x.ready?'READY':'LOCKED')+'</span><b>'+x.name+'</b><small>'+x.reason+'</small></div>';}).join('');
  const next=j.next?'<div class="p11-next"><span>NEXT DECISION</span><b>'+j.next.label+'</b><p>'+j.next.detail+'</p></div>':'<div class="p11-next complete"><span>JOURNEY COMPLETE</span><b>Fund II到達</b><p>以後は規模ではなくDPI/TVPI、資本配分、レガシーの質を競います。</p></div>';
  return '<section class="card p11-journey"><div class="p11-section-head"><div><span class="p11-eyebrow">FOUNDER → CAPITAL ALLOCATOR</span><h2>Progression Journey</h2><p class="sub">現在の役割: <b>'+j.role+'</b>。次に何が解禁されるかを条件ベースで表示します。</p></div><span class="pill live">'+j.completed+'/'+j.total+'</span></div><div class="p11-progress p11-progress-large"><i style="width:'+(j.completed/j.total*100)+'%"></i></div><div class="p11-milestones">'+milestones+'</div>'+next+'<div class="p11-unlocks">'+u+'</div></section>';
}

function phase11PeProgressPanel(){
  const j=phase11Journey(state);
  if(!state.pe.unlocked)return '<section class="card p11-gate-card"><span class="p11-eyebrow">WHY PE IS LOCKED</span><h2>PE Unlock Path</h2><p>PEは時間経過ではなくFounder Exitで解禁されます。</p><div class="p11-gate-line"><span>企業価値</span><b>'+yen(j.value)+'</b><small>IPO 8,000万円 / 売却 1.2億円</small></div><div class="p11-gate-line"><span>直近利益</span><b>'+yen(j.profit)+'</b><small>IPOは直近黒字が必要</small></div><div class="p11-gate-line"><span>運営期間</span><b>W'+state.week+'</b><small>会社売却は80週以上</small></div></section>';
  const gate=nextFundEligibility(state);
  if((state.pe.funds||[]).length&&!gate.eligible)return '<section class="card p11-gate-card"><span class="p11-eyebrow">NEXT FUND GATE</span><h2>なぜ次号ファンドが未解禁か</h2>'+gate.reasons.map(function(r){return '<div class="p11-gate-reason">'+r+'</div>';}).join('')+'<p class="sub">経過週ではなく、既存Fundのrealized performanceがfundraisingを決めます。</p></section>';
  return '';
}

overview=function(){ensurePhase11State(state);return _p11Overview().replace('<main>','<main>'+phase11TutorialPanel()+phase11JourneyPanel());};
peView=function(){ensurePhase11State(state);return _p11PeView().replace('</main>',phase11PeProgressPanel()+'</main>');};

function phase11CapitalDecisionSupport(){
  if(marketPane!=='capital')return '';
  const value=companyValue(state),cash=state.company.cash,debt=state.company.debt,projectSpend=(state.projects||[]).filter(function(p){return p.status==='in_progress';}).reduce(function(a,p){return a+(Number(p.cost)||0);},0);
  const runway=state.company.lastWeekProfit<0?cash/Math.max(1,-state.company.lastWeekProfit):Infinity,notes=[];
  if(debt>value*.30)notes.push('Debt / EVが30%超。追加借入より返済余地を確認。');
  if(projectSpend>cash*.35)notes.push('進行中Projectの投下額が現金の35%超。流動性を確認。');
  if(Number.isFinite(runway)&&runway<13)notes.push('赤字runway '+runway.toFixed(1)+'週。');
  if(!notes.length)notes.push('重大な資本制約は検出されていません。M&A・CAPEX・返済・株主還元を比較できます。');
  return '<section class="card p11-decision-support"><div class="p11-section-head"><div><span class="p11-eyebrow">DECISION SUPPORT</span><h2>Capital Constraints</h2></div><span class="pill">'+(state.company.public?'PUBLIC':'PRIVATE')+'</span></div>'+notes.map(function(n){return '<div class="p11-note">'+n+'</div>';}).join('')+'<p class="sub">これは推奨ではなく、現在の制約条件の説明です。</p></section>';
}
market=function(){return _p11Market().replace('</main>',phase11CapitalDecisionSupport()+'</main>');};

legacy=function(){
  const j=phase11Journey(state);
  const extra='<section class="card p11-release-readiness"><span class="p11-eyebrow">LONG-FORM PROGRESS</span><h2>Career Progress</h2><div class="p11-release-grid"><div><small>Journey</small><b>'+j.completed+'/'+j.total+'</b></div><div><small>Role</small><b>'+j.role+'</b></div><div><small>Exits</small><b>'+state.career.exitRecords.length+'</b></div><div><small>Highest Fund</small><b>'+(phase11FundNumber(state)||'—')+'</b></div></div></section>';
  return _p11Legacy().replace('</main>',extra+'</main>');
};

function phase11BorrowCapacity(){
  const credit=clamp(Number(state.company.credit)||60,20,95),leverageCap=.20+(credit/100)*.32;
  return Math.max(0,companyValue(state)*leverageCap-state.company.debt);
}
function phase11SetSheet(kind,payload){phase11Sheet={kind:kind,payload:payload||{},error:''};render();}
function phase11SheetError(msg){if(phase11Sheet){phase11Sheet.error=msg;render();}}
function phase11CloseSheet(){phase11Sheet=null;render();}

function phase11SheetMarkup(){
  if(!phase11Sheet)return '';
  const kind=phase11Sheet.kind,payload=phase11Sheet.payload,error=phase11Sheet.error;let title='',body='',input='';
  if(kind==='borrow'){
    const max=phase11BorrowCapacity(),suggest=Math.round(Math.min(max,20000000));title='銀行借入';
    body='<p>借入上限 <b>'+yen(max)+'</b> · 信用スプレッド '+pct(creditSpread(state))+'</p><p class="sub">借入は会社現金を増やしますが、信用力と週次利払いへ反映されます。</p>';
    input='<label class="p11-sheet-field">借入額<input data-p11-sheet-input type="number" inputmode="numeric" min="0" max="'+Math.floor(max)+'" value="'+suggest+'"></label>';
  }else if(kind==='repay'){
    const max=Math.max(0,Math.min(state.company.debt,state.company.cash)),suggest=Math.round(Math.min(max,state.company.cash*.5));title='負債返済';
    body='<p>会社負債 <b>'+yen(state.company.debt)+'</b> · 会社現金 '+yen(state.company.cash)+'</p><p class="sub">返済額だけ会社現金が減り、信用力が改善します。</p>';
    input='<label class="p11-sheet-field">返済額<input data-p11-sheet-input type="number" inputmode="numeric" min="0" max="'+Math.floor(max)+'" value="'+suggest+'"></label>';
  }else if(kind==='buy'){
    const l=state.market.listings.find(function(x){return x.id===payload.id;});title=(l?l.name:'Microcap')+'を買う';
    body='<p>現在値 <b>'+(l?yen(l.price):'—')+'</b> · 個人現金 '+yen(state.personal.cash)+'</p><p class="sub">注文サイズに応じて最大3%の価格インパクトがあります。</p>';
    input='<label class="p11-sheet-field">株数<input data-p11-sheet-input type="number" inputmode="numeric" min="1" max="50000" value="1000"></label>';
  }else if(kind==='sell'){
    const l=state.market.listings.find(function(x){return x.id===payload.id;}),pos=state.personal.stocks[payload.id];title=(l?l.name:'Microcap')+'を売る';
    body='<p>現在値 <b>'+(l?yen(l.price):'—')+'</b> · 保有 '+Number(pos&&pos.qty||0).toLocaleString()+'株</p><p class="sub">注文サイズに応じて売却価格へ価格インパクトがあります。</p>';
    input='<label class="p11-sheet-field">株数<input data-p11-sheet-input type="number" inputmode="numeric" min="1" max="'+Math.floor(pos&&pos.qty||0)+'" value="'+Math.floor(pos&&pos.qty||0)+'"></label>';
  }else if(kind==='dividend'){
    const amount=Math.min(state.company.cash*.10,companyValue(state)*.02),founder=amount*state.company.founderOwnership;title='特別配当';
    body='<p>会社支払 <b>'+yen(amount)+'</b></p><p>Founder受取 <b>'+yen(founder)+'</b> · Ownership '+pct(state.company.founderOwnership)+'</p><p class="sub">外部株主分は管理下の資産へ戻りません。</p>';
  }else if(kind==='buyback'){
    const f=Math.max(0,1-state.company.founderOwnership),p=Math.min(.02,f*.25),cost=companyValue(state)*p;title='自社株買い';
    body='<p>想定支出 <b>'+yen(cost)+'</b> · Public float '+pct(f)+'</p><p class="sub">Founderは売却しない前提のため、実行後はFounder ownershipが上昇します。</p>';
  }
  return '<div class="p11-sheet-backdrop"><section class="p11-sheet" role="dialog" aria-modal="true" aria-label="'+title+'"><div class="p11-sheet-handle"></div><div class="p11-section-head"><div><span class="p11-eyebrow">DECISION SHEET</span><h2>'+title+'</h2></div><button class="btn ghost" data-p11-sheet-close>閉じる</button></div>'+body+input+(error?'<div class="p11-sheet-error">'+error+'</div>':'')+'<button class="btn primary wide" data-p11-sheet-confirm>実行</button></section></div>';
}

function phase11ExecuteBorrow(amount){
  const max=phase11BorrowCapacity(),amt=Math.floor(Number(amount)||0);if(amt<=0||amt>max)return phase11SheetError('0より大きく、'+yen(max)+'以下を入力してください。');
  const beforeValue=companyValue(state);state.company.debt+=amt;state.company.cash+=amt;state.company.credit=clamp(state.company.credit-amt/Math.max(1,beforeValue)*14,20,95);
  log('銀行借入 '+yen(amt)+' を実行。信用力に応じた金利スプレッドが適用される。');phase11Sheet=null;save();render();
}
function phase11ExecuteRepay(amount){
  const amt=Math.floor(Number(amount)||0),pay=Math.min(amt,state.company.debt,Math.max(0,state.company.cash));if(pay<=0)return phase11SheetError('返済可能額を入力してください。');
  const beforeValue=companyValue(state);state.company.debt-=pay;state.company.cash-=pay;state.company.credit=clamp(state.company.credit+pay/Math.max(1,beforeValue)*8,20,95);
  log('会社負債を '+yen(pay)+' 返済。');phase11Sheet=null;save();render();
}
function phase11ExecuteTrade(kind,id,qtyRaw){
  const l=state.market.listings.find(function(x){return x.id===id;}),qty=Math.floor(Number(qtyRaw)||0);if(!l||l.delisted)return phase11SheetError('この銘柄は取引できません。');
  if(kind==='buy'){
    const q=clamp(qty,0,50000),impact=Math.min(.03,(q/l.shares)*.6),exec=l.price*(1+impact),cost=q*exec;if(q<=0||state.personal.cash<cost)return phase11SheetError('個人現金が不足、または数量が不正です。概算 '+yen(cost)+'。');
    state.personal.cash-=cost;const pos=state.personal.stocks[id]||{qty:0,cost:0};pos.cost+=cost;pos.qty+=q;state.personal.stocks[id]=pos;l.price*=1+impact;log(l.name+' を '+q.toLocaleString()+'株購入。個人資産から '+yen(cost)+'。');
  }else{
    const pos=state.personal.stocks[id];if(!pos||!pos.qty)return phase11SheetError('売却可能な保有株がありません。');const q=clamp(qty,0,pos.qty),impact=Math.min(.03,(q/l.shares)*.6),exec=l.price*(1-impact),proceeds=q*exec;if(q<=0)return phase11SheetError('1株以上を入力してください。');
    state.personal.cash+=proceeds;const avg=pos.cost/pos.qty;pos.cost-=avg*q;pos.qty-=q;if(pos.qty===0)delete state.personal.stocks[id];l.price*=1-impact;log(l.name+' を '+q.toLocaleString()+'株売却。'+yen(proceeds)+' を個人現金へ。');
  }
  phase11Sheet=null;save();render();
}
function phase11ExecuteFixed(kind){
  if(kind==='dividend'){
    if(!state.company.public)return phase11SheetError('IPO後に利用できます。');const amount=Math.min(state.company.cash*.10,companyValue(state)*.02);if(amount<500000||state.company.cash-amount<3000000)return phase11SheetError('配当後に必要な会社現金を確保できません。');
    state.company.cash-=amount;const founder=amount*state.company.founderOwnership;state.personal.cash+=founder;state.company.capitalAllocation.dividendsPaid+=amount;log('特別配当 '+yen(amount)+'。Founder受取 '+yen(founder)+' / Ownership '+pct(state.company.founderOwnership)+'。','major');
  }else if(kind==='buyback'){
    if(!state.company.public)return phase11SheetError('IPO後に利用できます。');const publicFloat=Math.max(0,1-state.company.founderOwnership);if(publicFloat<.02)return phase11SheetError('市場流通株が少なすぎます。');const repurchasePct=Math.min(.02,publicFloat*.25),cost=companyValue(state)*repurchasePct;if(state.company.cash-cost<3000000)return phase11SheetError('自社株買い後の会社現金が不足します。');
    state.company.cash-=cost;state.company.founderOwnership=clamp(state.company.founderOwnership/(1-repurchasePct),0,1);state.company.capitalAllocation.buybackSpend+=cost;state.company.capitalAllocation.buybacks++;log('自社株買い '+yen(cost)+'。Founder ownership '+pct(state.company.founderOwnership)+'。','major');
  }
  phase11Sheet=null;save();render();
}
function phase11BindSheet(){
  if(!phase11Sheet)return;
  document.querySelectorAll('[data-p11-sheet-close]').forEach(function(el){el.onclick=function(){phase11CloseSheet();};});
  document.querySelectorAll('[data-p11-sheet-confirm]').forEach(function(el){el.onclick=function(){
    const input=document.querySelector('[data-p11-sheet-input]'),val=input?input.value:null,kind=phase11Sheet&&phase11Sheet.kind,payload=phase11Sheet&&phase11Sheet.payload||{};
    if(kind==='borrow')phase11ExecuteBorrow(val);else if(kind==='repay')phase11ExecuteRepay(val);else if(kind==='buy'||kind==='sell')phase11ExecuteTrade(kind,payload.id,val);else phase11ExecuteFixed(kind);
  };});
}
function phase11WrapVisit(selector,key){
  document.querySelectorAll(selector).forEach(function(el){const prev=el.onclick;el.onclick=function(e){state.progression.tutorial[key]=true;save();if(prev)prev.call(el,e);};});
}

bind=function(){
  _p11Bind();ensurePhase11State(state);
  phase11WrapVisit('nav [data-tab="operations"]','visitedOperations');phase11WrapVisit('nav [data-tab="market"]','visitedMarket');phase11WrapVisit('nav [data-tab="pe"]','visitedPe');phase11WrapVisit('[data-open-map-business]','visitedCity');
  document.querySelectorAll('[data-p11-dismiss-tutorial]').forEach(function(el){el.onclick=function(){state.progression.tutorial.dismissed=true;save();render();};});
  document.querySelectorAll('[data-act="borrow"]').forEach(function(el){el.onclick=function(){phase11SetSheet('borrow');};});
  document.querySelectorAll('[data-act="repay"]').forEach(function(el){el.onclick=function(){phase11SetSheet('repay');};});
  document.querySelectorAll('[data-buy]').forEach(function(el){el.onclick=function(){phase11SetSheet('buy',{id:el.dataset.buy});};});
  document.querySelectorAll('[data-sell]').forEach(function(el){el.onclick=function(){phase11SetSheet('sell',{id:el.dataset.sell});};});
  document.querySelectorAll('[data-p10-dividend]').forEach(function(el){el.onclick=function(){phase11SetSheet('dividend');};});
  document.querySelectorAll('[data-p10-buyback]').forEach(function(el){el.onclick=function(){phase11SetSheet('buyback');};});
};
render=function(){
  _p11Render();
  if(phase11Sheet&&typeof app.insertAdjacentHTML==='function'){app.insertAdjacentHTML('beforeend',phase11SheetMarkup());phase11BindSheet();}
};

if(state){ensurePhase11State(state);save();render();}
