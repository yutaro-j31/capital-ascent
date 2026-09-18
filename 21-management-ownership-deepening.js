'use strict';

// Post-release deepening: explainable delegation, CXO ownership, IPO ownership design,
// idempotent company exits, delegated expansion and PE onboarding.
const _m21EnsureAdvancedState=ensureAdvancedState;
const _m21Operations=operations;
const _m21Market=market;
const _m21PeView=peView;
const _m21Bind=bind;
const _m21Render=render;
const _m21ProcessCompanyWeek=processCompanyWeek;
const _m21ProjectCapacity=projectCapacity;
const _m21DdDeal=ddDeal;

const M21_POLICY_GUIDE={
  manual:{label:'CEO手動',intent:'価格・広告・出店を自分で判断',price:'手動',ads:'手動',expansion:'自動出店なし'},
  premium:{label:'高付加価値',intent:'単価・品質・ブランドを優先',price:'+18%目標',ads:'中',expansion:'慎重な出店と相性が良い'},
  growth:{label:'成長優先',intent:'利益率より売上と拠点拡大を優先',price:'-4%目標',ads:'高',expansion:'標準〜積極出店向け'},
  margin:{label:'利益率優先',intent:'値上げと広告抑制で利益率を重視',price:'+8%目標',ads:'低',expansion:'高収益時だけ出店向き'},
  share:{label:'シェア優先',intent:'低価格・広告・拠点数で市場シェアを取る',price:'-10%目標',ads:'最高',expansion:'積極出店向け'},
  cash:{label:'現金温存',intent:'広告・新規投資を抑え現金を守る',price:'+3%目標',ads:'なし',expansion:'自動出店は非推奨'}
};
const M21_REVIEW_EFFECTS={
  weekly:{label:'毎週',speed:.88,risk:.65,desc:'統制が強い。判断ブレを35%抑える代わりに実行速度は12%低下。'},
  monthly:{label:'4週ごと',speed:1,risk:1,desc:'速度と統制の標準設定。'},
  quarterly:{label:'13週ごと',speed:1.12,risk:1.30,desc:'現場判断は12%速いが、判断ブレが30%大きくなる。'}
};
const M21_EXPANSION={
  off:{label:'自動出店しない',margin:99,fit:101,reserve:99},
  cautious:{label:'慎重',margin:.12,fit:80,reserve:1.30},
  balanced:{label:'標準',margin:.06,fit:72,reserve:.90},
  aggressive:{label:'積極',margin:.00,fit:64,reserve:.55}
};
const M21_CXO_SPECS={
  COO:{label:'COO / 最高執行責任者',baseSalary:360000,effect:'委任実行速度と自動出店判断を改善',unlock:'3拠点以上'},
  CFO:{label:'CFO / 最高財務責任者',baseSalary:340000,effect:'財務統制と信用力の回復を改善',unlock:'企業価値8,000万円以上'},
  CMO:{label:'CMO / 最高マーケティング責任者',baseSalary:300000,effect:'広告運用の判断ブレとブランド形成を改善',unlock:'5拠点以上'},
  CSO:{label:'CSO / 最高戦略責任者',baseSalary:400000,effect:'同時プロジェクト枠と出店立地評価を改善',unlock:'8拠点または子会社保有'},
  CIO:{label:'CIO / 投資責任者',baseSalary:440000,effect:'PEのDD精度を改善',unlock:'PE解禁後'}
};
const M21_NAMES=['佐伯','藤井','石川','河合','森田','高瀬','西村','三浦','岡本','長谷川','井上','松井','黒田','神谷','水野'];
const M21_STYLES=['慎重','バランス','成長'];

let m21Sheet=null;

function m21LifecycleId(s){
  return (s.company&&s.company.lifecycleId)||('C'+String((s.career&&s.career.companySerial)||1));
}
function m21CandidateRows(s,role){
  const spec=M21_CXO_SPECS[role],life=m21LifecycleId(s);
  return [0,1,2].map(function(i){
    const key=String(s.seed)+':'+life+':'+role+':'+i;
    const quality=66+(hash32(key+':q')%25);
    const name=M21_NAMES[hash32(key+':n')%M21_NAMES.length];
    const style=M21_STYLES[hash32(key+':s')%M21_STYLES.length];
    const salary=Math.round(spec.baseSalary*(.82+quality/190)/10000)*10000;
    return {id:role+'-'+hash32(key),role:role,name:name,quality:quality,style:style,salary:salary};
  });
}
function ensureM21State(s){
  _m21EnsureAdvancedState(s);
  s.management=s.management||{};
  s.management.executives=s.management.executives||{};
  s.career=s.career||{};
  s.career.completedCompanySales=Array.isArray(s.career.completedCompanySales)?s.career.completedCompanySales:[];
  s.company.lifecycleId=s.company.lifecycleId||('C'+String(s.career.companySerial||1));
  for(const role of Object.keys(M21_CXO_SPECS)){
    if(!Object.prototype.hasOwnProperty.call(s.management.executives,role))s.management.executives[role]=null;
  }
  for(const id of Object.keys(s.company.businesses||{})){
    const u=businessUnitFor(s,id);
    if(!Number.isFinite(u.capitalBudget))u.capitalBudget=15000000;
    if(!M21_EXPANSION[u.expansionMandate])u.expansionMandate='off';
    if(!Number.isFinite(u.lastExpansionWeek))u.lastExpansionWeek=0;
  }
  return s;
}
ensureAdvancedState=ensureM21State;

function m21Executive(s,role){
  ensureM21State(s);
  return s.management.executives[role]||null;
}
function m21ExecFactor(s,role){
  const e=m21Executive(s,role);
  return e&&e.hired?clamp(Number(e.quality)||70,50,100)/100:0;
}
function m21CxoUnlocked(s,role){
  const n=(s.company.stores||[]).length,v=companyValue(s);
  if(role==='COO')return n>=3;
  if(role==='CFO')return v>=80000000;
  if(role==='CMO')return n>=5;
  if(role==='CSO')return n>=8||(s.company.subsidiaryPortfolio||[]).some(function(x){return x.status==='held';});
  if(role==='CIO')return !!(s.pe&&s.pe.unlocked);
  return false;
}
function hireExecutive(role,candidateId){
  ensureM21State(state);
  if(!M21_CXO_SPECS[role]||!m21CxoUnlocked(state,role)){alert('この役職はまだ解禁されていません。');return false;}
  const candidate=m21CandidateRows(state,role).find(function(x){return x.id===candidateId;});
  if(!candidate)return false;
  const current=m21Executive(state,role);
  if(current&&current.hired&&current.id===candidate.id)return true;
  const severance=current&&current.hired?current.salary*4:0;
  const signing=candidate.salary*2;
  const cost=severance+signing;
  if(state.company.cash<cost){alert('CXO交代・採用費用 '+yen(cost)+' を会社現金から支払えません。');return false;}
  state.company.cash-=cost;
  state.management.executives[role]={id:candidate.id,role:role,name:candidate.name,quality:candidate.quality,style:candidate.style,salary:candidate.salary,hired:true,startWeek:state.week};
  log(M21_CXO_SPECS[role].label+': '+candidate.name+' を任命。能力 '+candidate.quality+' / 週次報酬 '+yen(candidate.salary)+'。','major');
  save();render();return true;
}
function fireExecutive(role){
  ensureM21State(state);
  const current=m21Executive(state,role);if(!current||!current.hired)return false;
  const severance=current.salary*4;
  if(state.company.cash<severance){alert('退任費用 '+yen(severance)+' を支払えません。');return false;}
  state.company.cash-=severance;
  state.management.executives[role]=null;
  log(M21_CXO_SPECS[role].label+': '+current.name+' が退任。退任費用 '+yen(severance)+'。');
  save();render();return true;
}
function serviceM21Executives(s){
  ensureM21State(s);
  let payroll=0;
  for(const role of Object.keys(M21_CXO_SPECS)){
    const e=m21Executive(s,role);if(e&&e.hired)payroll+=Number(e.salary)||0;
  }
  if(payroll>0){
    s.company.cash-=payroll;
    s.company.lastWeekProfit-=payroll;
    s.company.cumulativeProfit-=payroll;
    const brief=(s.history&&s.history.briefs||[]).slice(-1)[0];
    if(brief&&brief.week===s.week){brief.profit=(Number(brief.profit)||0)-payroll;if(brief.executive)brief.executive.cxoPayroll=payroll;}
    if(s.company.cash<-3000000)s.gameOver=true;
  }
  const cfo=m21ExecFactor(s,'CFO');
  if(cfo>0&&s.company.debt>0)s.company.credit=clamp((Number(s.company.credit)||60)+.08*cfo,20,95);
}
processCompanyWeek=function(s){
  _m21ProcessCompanyWeek(s);
  serviceM21Executives(s);
};

projectCapacity=function(s){
  const base=_m21ProjectCapacity(s),cso=m21ExecFactor(s,'CSO');
  return base+(cso>=.65?1:0);
};

ddDeal=function(id){
  const before=state.pe.deals.find(function(x){return x.id===id;});
  const was=!!(before&&before.dd);
  _m21DdDeal(id);
  const d=state.pe.deals.find(function(x){return x.id===id;});
  const cio=m21ExecFactor(state,'CIO');
  if(d&&d.dd&&!was&&cio>0){
    const qBonus=Math.round(2+cio*4),rBonus=Math.round(1+cio*3);
    d.quality=clamp((Number(d.quality)||50)+qBonus,0,100);
    d.risk=clamp((Number(d.risk)||50)-rBonus,0,100);
    log('CIOレビュー: DD精度改善。Quality +'+qBonus+' / Risk -'+rBonus+'。');
    save();render();
  }
};

function m21ReviewEffect(u){
  return M21_REVIEW_EFFECTS[u.reviewCadence]||M21_REVIEW_EFFECTS.monthly;
}
function m21PolicyLabel(mode){
  return (M21_POLICY_GUIDE[mode]&&M21_POLICY_GUIDE[mode].label)||mode;
}
function m21ManagerBudgetMax(s,id){
  const stores=(s.company.stores||[]).filter(function(x){return x.businessID===id;});
  const rev=stores.reduce(function(a,x){return a+(Number(x.lastRevenue)||0);},0);
  return Math.max(500000,Math.min(5000000,Math.round(Math.max(rev*.15,500000)/50000)*50000));
}
setManagementBudget=function(id,amount){
  const u=businessUnitFor(state,id),max=m21ManagerBudgetMax(state,id);
  u.weeklyBudget=clamp(Math.round(Number(amount)||0),0,max);
  log((PILLARS[id]&&PILLARS[id].name||id)+': 週次裁量予算を '+yen(u.weeklyBudget)+' に変更。');
  save();render();
};
function setManagementCapitalBudget(id,amount){
  const u=businessUnitFor(state,id);
  u.capitalBudget=clamp(Math.round(Number(amount)||0),0,100000000);
  log((PILLARS[id]&&PILLARS[id].name||id)+': 1件あたり投資上限を '+yen(u.capitalBudget)+' に変更。');
  save();render();
}
function setExpansionMandate(id,mode){
  if(!M21_EXPANSION[mode])return;
  const u=businessUnitFor(state,id);u.expansionMandate=mode;
  log((PILLARS[id]&&PILLARS[id].name||id)+': 自動出店方針を「'+M21_EXPANSION[mode].label+'」に変更。');
  save();render();
}

function m21BestSite(s,id){
  if(id==='productVentures'||typeof propertyCandidates!=='function')return null;
  const cso=m21ExecFactor(s,'CSO'),coo=m21ExecFactor(s,'COO');
  const sites=[];
  for(const region of REGIONS){
    const rows=propertyCandidates(id,region)||[];
    for(const site of rows.slice(0,3)){
      const score=(Number(site.fit)||0)+(Number(site.traffic)||1)*5-(Number(site.competition)||0)*.07+cso*5+coo*2;
      sites.push({site:site,score:score});
    }
  }
  sites.sort(function(a,b){return b.score-a.score;});
  return sites.length?sites[0].site:null;
}
function m21OpenDelegatedStore(s,id,site,u){
  const p=PILLARS[id];if(!p||!site||id==='productVentures')return false;
  const count=s.company.stores.filter(function(x){return x.businessID===id;}).length;
  if(s.company.cash<site.total)return false;
  s.company.cash-=site.total;
  const storeId=uid('store',String(s.seed)+':delegate:'+id+':'+site.id+':'+s.week+':'+(count+1));
  s.company.stores.push({
    id:storeId,businessID:id,region:site.region,name:site.district+(count+1)+'号店',traffic:site.traffic,rent:site.rent,deposit:site.deposit,
    priceOverride:null,operatingHours:12,members:id==='gym'?50:0,capacity:id==='gym'?Math.max(260,Math.round(site.size*2.3)):0,
    pipeline:id==='realEstateAgency'?[]:null,lastRevenue:0,lastProfit:0,lastUnits:0,
    property:{district:site.district,size:site.size,frontage:site.frontage,access:site.access,competition:site.competition,fit:site.fit,leaseWeek:s.week},
    openedBy:'delegated-management'
  });
  u.lastExpansionWeek=s.week;
  log((p.name||id)+': '+site.region+'・'+site.district+'への出店をManagerが承認。初期費用 '+yen(site.total)+'。','major');
  return true;
}
function m21MaybeExpand(s,id,u,policy){
  const mandate=M21_EXPANSION[u.expansionMandate]||M21_EXPANSION.off;
  if(u.expansionMandate==='off'||id==='productVentures'||!policy.delegated)return false;
  if(s.week-(u.lastExpansionWeek||0)<13)return false;
  const stores=s.company.stores.filter(function(x){return x.businessID===id;});
  if(!stores.length)return false;
  const rev=stores.reduce(function(a,x){return a+(Number(x.lastRevenue)||0);},0);
  const profit=stores.reduce(function(a,x){return a+(Number(x.lastProfit)||0);},0);
  const margin=rev>0?profit/rev:-1;
  const policyAdjust={premium:.02,growth:-.03,margin:.04,share:-.04,cash:.10}[policy.mode]||0;
  const coo=m21ExecFactor(s,'COO'),cfo=m21ExecFactor(s,'CFO');
  const requiredMargin=mandate.margin+policyAdjust-coo*.015;
  if(margin<requiredMargin)return false;
  const site=m21BestSite(s,id);if(!site||site.fit<mandate.fit)return false;
  if(site.total>Math.max(0,Number(u.capitalBudget)||0))return false;
  const reserve=Math.max(3000000,(Number(u.weeklyBudget)||0)*13,site.total*mandate.reserve*(1-cfo*.08));
  if(s.company.cash-site.total<reserve)return false;
  return m21OpenDelegatedStore(s,id,site,u);
}

applyDelegatedPolicies=function(s){
  ensureM21State(s);s.management.delegationLevel=managementTier(s);
  for(const id of Object.keys(s.company.businesses||{})){
    const b=s.company.businesses[id],policy=policyFor(s,id),preset=POLICY_PRESETS[policy.mode],u=businessUnitFor(s,id);
    if(!policy.delegated||!preset)continue;
    const cfg=PHASE9_AUTONOMY[u.autonomy]||PHASE9_AUTONOMY.low;
    const review=m21ReviewEffect(u),coo=m21ExecFactor(s,'COO'),cmo=m21ExecFactor(s,'CMO');
    const skill=clamp(.62+u.managerQuality/125,.75,1.35);
    const speed=clamp(cfg.speed*skill*review.speed*(1+coo*.16),.05,.58);
    const varianceScale=cfg.deviation*(1.35-u.managerQuality/120)*review.risk*(1-cmo*.22);
    const variance=noise('manager:'+s.seed+':'+id+':'+s.week,varianceScale);
    const base=PILLARS[id]&&PILLARS[id].price||b.price;
    const priceTarget=Math.max(10,base*preset.price*(1+variance));
    const adTarget=Math.min(Math.max(0,preset.adSpend*(1+variance*.6)),Math.max(0,u.weeklyBudget)*cfg.budgetScale);
    b.price=Math.round((b.price*(1-speed)+priceTarget*speed)/10)*10;
    b.adSpend=Math.max(0,Math.round((b.adSpend*(1-speed)+adTarget*speed)/10000)*10000);
    if(cmo>0&&b.adSpend>0)b.brand=clamp((Number(b.brand)||0)+.015*cmo,0,100);
    u.lastExecutionWeek=s.week;u.lastVariance=variance;u.lastPriceTarget=priceTarget;u.lastAdTarget=adTarget;
    const reviewEvery=PHASE9_REVIEW[u.reviewCadence]&&PHASE9_REVIEW[u.reviewCadence].weeks||4;
    if(s.week-(u.lastReviewWeek||0)>=reviewEvery){
      u.lastReviewWeek=s.week;
      m21MaybeExpand(s,id,u,policy);
    }
  }
};

function m21PolicyGuidePanel(id){
  const policy=policyFor(state,id),tier=managementTier(state),u=businessUnitFor(state,id);
  const cards=Object.keys(M21_POLICY_GUIDE).map(function(mode){
    const g=M21_POLICY_GUIDE[mode],active=policy.mode===mode;
    return '<div class="m21-policy-card '+(active?'active':'')+'"><div><b>'+g.label+'</b>'+(active?'<span>現在</span>':'')+'</div><p>'+g.intent+'</p><small>価格: '+g.price+' · 広告: '+g.ads+'</small><small>'+g.expansion+'</small></div>';
  }).join('');
  return '<section class="card m21-policy-guide"><div class="section-row"><div><h2>経営ポリシーの違い</h2><p class="sub">ポリシーを選ぶと価格・広告をManagerが目標へ近づけます。出店は下の「自動出店」で別に許可します。</p></div><span class="pill '+(policy.delegated?'live':'')+'">'+(policy.delegated?'委任中':'CEO手動')+'</span></div><div class="m21-delegation-status"><b>組織レベル '+tier+'/4</b><span>'+phase9TierLabel(tier)+'</span><em>現在: '+m21PolicyLabel(policy.mode)+' / 自動出店 '+M21_EXPANSION[u.expansionMandate].label+'</em></div><div class="m21-policy-grid">'+cards+'</div></section>';
}
phase9ManagementPanel=function(id){
  const tier=managementTier(state),u=businessUnitFor(state,id),policy=policyFor(state,id),cfg=PHASE9_AUTONOMY[u.autonomy]||PHASE9_AUTONOMY.low,review=m21ReviewEffect(u);
  const autonomy=Object.keys(PHASE9_AUTONOMY).map(function(k){
    const v=PHASE9_AUTONOMY[k],label={low:'低',medium:'中',high:'高'}[k]||v.label;
    return '<option value="'+k+'" '+(u.autonomy===k?'selected':'')+'>'+label+'</option>';
  }).join('');
  const reviews=Object.keys(PHASE9_REVIEW).map(function(k){
    return '<option value="'+k+'" '+(u.reviewCadence===k?'selected':'')+'>'+M21_REVIEW_EFFECTS[k].label+'</option>';
  }).join('');
  const expansion=Object.keys(M21_EXPANSION).map(function(k){
    return '<option value="'+k+'" '+(u.expansionMandate===k?'selected':'')+'>'+M21_EXPANSION[k].label+'</option>';
  }).join('');
  const max=m21ManagerBudgetMax(state,id);
  const execution=cfg.speed*(.62+u.managerQuality/125)*review.speed*(1+m21ExecFactor(state,'COO')*.16);
  return '<section class="card half phase9-management m21-management"><div class="section-row"><div><h2>経営組織</h2><p class="sub">'+phase9TierLabel(tier)+' · '+u.managerName+' 責任者</p></div><span class="manager-score">'+Math.round(u.managerQuality)+'<small>能力</small></span></div>'+
    '<div class="m21-current-delegation"><b>'+(policy.delegated?'Managerへ委任中':'CEOが手動運営')+'</b><span>ポリシー: '+m21PolicyLabel(policy.mode)+'</span></div>'+
    '<div class="manager-grid"><label>裁量<select data-p9-autonomy="'+id+'">'+autonomy+'</select></label><label>レビュー<select data-p9-review="'+id+'">'+reviews+'</select></label></div>'+
    '<div class="m21-effect-box"><div><b>裁量の効果</b><span>実行速度 '+pct(execution,0)+' / 予算利用 '+pct(cfg.budgetScale,0)+' / 判断ブレ ±'+pct(cfg.deviation*review.risk,1)+'</span></div><div><b>レビューの効果</b><span>'+review.desc+'</span></div></div>'+
    '<div class="m21-budget-grid"><label>週次裁量予算<small>広告・日常判断の上限 / 最大 '+yen(max)+'</small><input type="number" inputmode="numeric" min="0" max="'+max+'" step="50000" value="'+Math.round(u.weeklyBudget)+'" data-m21-weekly-budget="'+id+'" '+(tier<1?'disabled':'')+'></label><label>1件あたり投資上限<small>自動出店の物件取得上限</small><input type="number" inputmode="numeric" min="0" max="100000000" step="1000000" value="'+Math.round(u.capitalBudget)+'" data-m21-capital-budget="'+id+'" '+(tier<1?'disabled':'')+'></label></div>'+
    '<label class="m21-expansion-label">自動出店<select data-m21-expansion="'+id+'" '+(tier<1?'disabled':'')+'>'+expansion+'</select><small>レビュー時に利益率・立地・会社現金・投資上限をManagerが評価し、条件を満たす場合だけ出店します。</small></label>'+
    '<div class="manager-facts"><span>在任 <b>'+Math.max(0,state.week-u.tenureStartWeek)+'週</b></span><span>最終レビュー <b>第'+Math.max(0,u.lastReviewWeek||0)+'週</b></span><span>最終自動出店 <b>'+(u.lastExpansionWeek?'第'+u.lastExpansionWeek+'週':'なし')+'</b></span></div></section>';
};

function m21CxoPanel(){
  ensureM21State(state);
  const rows=Object.keys(M21_CXO_SPECS).map(function(role){
    const spec=M21_CXO_SPECS[role],current=m21Executive(state,role),unlocked=m21CxoUnlocked(state,role),candidates=m21CandidateRows(state,role);
    const options=candidates.map(function(c){return '<option value="'+c.id+'" '+(current&&current.id===c.id?'selected':'')+'>'+c.name+' / 能力'+c.quality+' / '+c.style+' / '+yen(c.salary)+'/週</option>';}).join('');
    return '<div class="m21-cxo-row '+(!unlocked?'locked':'')+'"><div class="m21-cxo-copy"><b>'+spec.label+'</b><span>'+spec.effect+'</span><small>'+(unlocked?'採用可能':'解禁条件: '+spec.unlock)+'</small></div><div class="m21-cxo-control">'+(unlocked?'<select data-m21-cxo-select="'+role+'">'+options+'</select><div class="actions"><button class="btn" data-m21-cxo-hire="'+role+'">'+(current&&current.hired?'責任者を交代':'採用')+'</button>'+(current&&current.hired?'<button class="btn ghost" data-m21-cxo-fire="'+role+'">退任</button>':'')+'</div>':'')+'</div>'+(current&&current.hired?'<div class="m21-cxo-current"><strong>'+current.name+'</strong><span>能力 '+current.quality+' · '+current.style+'</span><small>週次報酬 '+yen(current.salary)+'</small></div>':'')+'</div>';
  }).join('');
  const payroll=Object.keys(M21_CXO_SPECS).reduce(function(a,r){const e=m21Executive(state,r);return a+(e&&e.hired?Number(e.salary)||0:0);},0);
  return '<section class="card m21-cxo-panel"><div class="section-row"><div><h2>経営陣 / CXO</h2><p class="sub">会社規模に応じて機能責任者を採用・交代できます。能力と報酬のトレードオフがあります。</p></div><span class="pill">週次報酬 '+yen(payroll)+'</span></div><div class="m21-cxo-list">'+rows+'</div></section>';
}

operations=function(){
  const html=_m21Operations();
  if(!selectedBusiness||selectedMapBusiness||selectedStoreDetail)return html;
  return injectBeforeMainClose(html,m21PolicyGuidePanel(selectedBusiness)+m21CxoPanel());
};

function m21IpoPreview(pct){
  const v=companyValue(state),owner=clamp(Number(state.company.founderOwnership)||1,0,1),p=clamp(Number(pct)||0,0,.30),primaryRate=.10;
  return {value:v,secondaryPct:p,secondary:v*owner*p,primary:v*primaryRate,ownership:owner*(1-p)/(1+primaryRate)};
}
function executeIpoSalePct(pct){
  ensureM21State(state);
  if(state.company.public){alert('この会社はすでに上場済みです。');return false;}
  const v=companyValue(state);
  if(v<80000000||state.company.lastWeekProfit<=0){alert('IPOには企業価値8,000万円以上かつ直近黒字が必要です。');return false;}
  const x=m21IpoPreview(pct);
  state.company.public=true;
  state.company.founderOwnership=x.ownership;
  state.personal.cash+=x.secondary;
  state.company.cash+=x.primary;
  state.company.ipoTerms={week:state.week,secondaryPct:x.secondaryPct,secondaryProceeds:x.secondary,primaryProceeds:x.primary,founderOwnershipAfter:x.ownership};
  recordExit('IPO',x.secondary,x.secondary/Math.max(1,2000000),v);
  log('IPO完了。創業者売出 '+pct(x.secondaryPct)+' / 個人受取 '+yen(x.secondary)+' / 会社調達 '+yen(x.primary)+' / IPO後持株比率 '+pct(x.ownership)+'。','major');
  m21Sheet=null;save();render();return true;
}
ipo=function(secondaryPct){
  const p=secondaryPct==null?.08:Number(secondaryPct);
  return executeIpoSalePct(Number.isFinite(p)?p:.08);
};

sellCompany=function(){
  ensureM21State(state);
  const life=m21LifecycleId(state);
  if(state.career.completedCompanySales.includes(life)){alert('この会社はすでに売却済みです。');return false;}
  const v=companyValue(state);
  if(v<120000000||state.week<80){alert('会社売却には企業価値1.2億円以上かつ80週以上の運営実績が必要です。');return false;}
  if(!confirm('会社を '+yen(v)+' の評価で売却し、新会社へ移りますか？'))return false;
  const ownership=clamp(Number(state.company.founderOwnership)||1,0,1);
  const realized=v*.88*ownership;
  state.career.completedCompanySales.push(life);
  state.personal.cash+=realized;
  recordExit('会社売却',realized,realized/Math.max(1,2000000),v);
  state.career.companySerial++;
  const nextLife='C'+String(state.career.companySerial);
  state.company={cash:8000000,debt:0,credit:60,reputation:12,public:false,founderOwnership:1,shares:10000,subsidiaries:0,businesses:{ramen:baseBusiness('ramen')},stores:[],lastWeekRevenue:0,lastWeekProfit:0,cumulativeProfit:0,lifecycleId:nextLife};
  openInitialStore(state,'ramen',REGIONS[state.career.companySerial%REGIONS.length]);
  ensureM21State(state);
  log('会社売却完了。創業者持株 '+pct(ownership)+' 相当の '+yen(realized)+' を個人で受領し、第'+state.career.companySerial+'社を創業。','major');
  save();render();return true;
};

function m21OwnershipPanel(){
  ensureM21State(state);
  const v=companyValue(state),eligible=v>=80000000&&state.company.lastWeekProfit>0;
  if(!state.company.public){
    return '<section class="card m21-ownership"><div class="section-row"><div><h2>IPO / 持株設計</h2><p class="sub">IPO時に創業者が何%売り出すかを選べます。売出を増やすほど個人現金は増え、持株比率は下がります。</p></div><span class="pill '+(eligible?'live':'')+'">'+(eligible?'IPO可能':'条件未達')+'</span></div><div class="kpis"><div class="kpi"><div class="label">企業価値</div><div class="value">'+yen(v)+'</div></div><div class="kpi"><div class="label">創業者持株</div><div class="value">'+pct(state.company.founderOwnership)+'</div></div></div><button class="btn primary wide" data-m21-ipo-open '+(eligible?'':'disabled')+'>IPOの売出比率を設計</button></section>';
  }
  const terms=state.company.ipoTerms;
  return '<section class="card m21-ownership"><div class="section-row"><div><h2>上場後のOwnership</h2><p class="sub">創業者持株・市場流通株・過去のIPO売出を確認できます。</p></div><span class="pill live">上場済み</span></div><div class="kpis"><div class="kpi"><div class="label">創業者持株</div><div class="value">'+pct(state.company.founderOwnership)+'</div></div><div class="kpi"><div class="label">市場流通株</div><div class="value">'+pct(1-state.company.founderOwnership)+'</div></div><div class="kpi"><div class="label">IPO売出</div><div class="value">'+(terms?pct(terms.secondaryPct):'旧セーブ')+'</div></div></div></section>';
}
market=function(){
  const html=_m21Market();
  if(marketPane!=='capital')return html;
  return injectBeforeMainClose(html,m21OwnershipPanel());
};

function m21PeGuide(){
  ensureM21State(state);
  const funds=state.pe.funds||[],deals=state.pe.deals||[],ports=state.pe.portfolio||[];
  const hasFund=funds.length>0,hasDd=deals.some(function(d){return d.dd;}),hasHeld=ports.some(function(p){return p.status==='held';}),hasInitiative=ports.some(function(p){return (p.initiatives||[]).length>0||Number(p.improvement)>0;}),hasExit=ports.some(function(p){return p.status==='exited';}),gate=hasFund?nextFundEligibility(state):null;
  const steps=[
    ['1','ファンドを組成',hasFund,'個人資金でGP出資し、LPのCommitmentを集めます。'],
    ['2','案件を確認',hasFund&&deals.some(function(d){return d.status==='open';}),'案件一覧は四半期ごとに更新されます。'],
    ['3','DDを実施',hasDd,'DDでQuality / Riskを確認します。'],
    ['4','投資委員会 → LBO取得',hasHeld,'Fundの集中制約・投資余力を満たす案件だけ取得できます。'],
    ['5','Value Creation',hasInitiative,'コスト・人材・設備・販路を改善します。'],
    ['6','Debt Paydownと保有',hasHeld,'時間経過でEBITDA・Debt・企業価値が動きます。'],
    ['7','ExitしてLPへ分配',hasExit,'売却代金がDPI/TVPIとCarryへ反映されます。'],
    ['8','次号ファンド',!!(gate&&gate.eligible),'DPI 1.20x・投資進捗80%・LP信頼45が基準です。']
  ];
  let current=steps.findIndex(function(x){return !x[2];});if(current<0)current=steps.length-1;
  const rows=steps.map(function(x,i){return '<div class="m21-pe-step '+(x[2]?'done':i===current?'current':'')+'"><span>'+(x[2]?'✓':x[0])+'</span><div><b>'+x[1]+'</b><small>'+x[3]+'</small></div></div>';}).join('');
  return '<section class="card m21-pe-guide"><div class="section-row"><div><h2>PEファームの進め方</h2><p class="sub">「何をすれば次へ進むか」をこの順番で確認してください。</p></div><span class="pill">8 STEP</span></div><div class="m21-pe-steps">'+rows+'</div><div class="m21-glossary"><div><b>DPI</b><span>LPへ実際に返した金額 ÷ 払込済資金</span></div><div><b>TVPI</b><span>分配済み + 未売却資産価値 ÷ 払込済資金</span></div><div><b>投資進捗</b><span>Commitmentのうち実際に投資した割合</span></div><div><b>LP信頼</b><span>次号ファンドを組成するための投資家からの信用</span></div></div></section>';
}
peView=function(){
  const html=_m21PeView();
  if(!state.pe.unlocked)return html.replace('<main>','<main>'+m21PeGuide());
  return html.replace('<main>','<main>'+m21PeGuide());
};

function m21IpoSheet(){
  if(!m21Sheet||m21Sheet.kind!=='ipo')return '';
  const x=m21IpoPreview(m21Sheet.pct);
  return '<div class="p11-sheet-backdrop"><section class="p11-sheet m21-ipo-sheet" role="dialog" aria-modal="true" aria-label="IPO売出設計"><div class="p11-sheet-handle"></div><div class="p11-section-head"><div><span class="p11-eyebrow">OWNERSHIP DESIGN</span><h2>IPO売出設計</h2></div><button class="btn ghost" data-m21-sheet-close>閉じる</button></div><label class="m21-ipo-range">創業者が売り出す比率 <b data-m21-ipo-pct-label>'+Math.round(x.secondaryPct*100)+'%</b><input type="range" min="0" max="30" step="5" value="'+Math.round(x.secondaryPct*100)+'" data-m21-ipo-pct></label><div class="m21-ipo-preview"><div><small>個人受取</small><b data-m21-ipo-secondary>'+yen(x.secondary)+'</b></div><div><small>会社の新規調達</small><b>'+yen(x.primary)+'</b></div><div><small>IPO後持株比率</small><b data-m21-ipo-ownership>'+pct(x.ownership)+'</b></div><div><small>市場流通株</small><b data-m21-ipo-float>'+pct(1-x.ownership)+'</b></div></div><p class="sub">会社の新規調達は企業価値の10%で固定。売出比率は創業者保有分の0〜30%から選択します。</p><button class="btn primary wide" data-m21-ipo-confirm>この比率でIPO</button></section></div>';
}
function m21OpenIpoSheet(){
  m21Sheet={kind:'ipo',pct:.08};render();
}
function m21UpdateIpoSheet(pctValue){
  if(!m21Sheet)return;
  m21Sheet.pct=clamp((Number(pctValue)||0)/100,0,.30);
  const x=m21IpoPreview(m21Sheet.pct);
  const a=document.querySelector('[data-m21-ipo-pct-label]'),b=document.querySelector('[data-m21-ipo-secondary]'),c=document.querySelector('[data-m21-ipo-ownership]'),d=document.querySelector('[data-m21-ipo-float]');
  if(a)a.textContent=Math.round(x.secondaryPct*100)+'%';
  if(b)b.textContent=yen(x.secondary);
  if(c)c.textContent=pct(x.ownership);
  if(d)d.textContent=pct(1-x.ownership);
}

bind=function(){
  _m21Bind();
  ensureM21State(state);
  document.querySelectorAll('[data-m21-weekly-budget]').forEach(function(el){el.onchange=function(){setManagementBudget(el.dataset.m21WeeklyBudget,el.value);};});
  document.querySelectorAll('[data-m21-capital-budget]').forEach(function(el){el.onchange=function(){setManagementCapitalBudget(el.dataset.m21CapitalBudget,el.value);};});
  document.querySelectorAll('[data-m21-expansion]').forEach(function(el){el.onchange=function(){setExpansionMandate(el.dataset.m21Expansion,el.value);};});
  document.querySelectorAll('[data-m21-cxo-hire]').forEach(function(el){el.onclick=function(){const role=el.dataset.m21CxoHire,select=document.querySelector('[data-m21-cxo-select="'+role+'"]');if(select)hireExecutive(role,select.value);};});
  document.querySelectorAll('[data-m21-cxo-fire]').forEach(function(el){el.onclick=function(){fireExecutive(el.dataset.m21CxoFire);};});
  document.querySelectorAll('[data-act="ipo"],[data-m21-ipo-open]').forEach(function(el){el.onclick=function(){m21OpenIpoSheet();};});
  document.querySelectorAll('[data-m21-sheet-close]').forEach(function(el){el.onclick=function(){m21Sheet=null;render();};});
  document.querySelectorAll('[data-m21-ipo-pct]').forEach(function(el){el.oninput=function(){m21UpdateIpoSheet(el.value);};});
  document.querySelectorAll('[data-m21-ipo-confirm]').forEach(function(el){el.onclick=function(){executeIpoSalePct(m21Sheet&&m21Sheet.pct||0);};});
};
render=function(){
  _m21Render();
  if(m21Sheet&&typeof app.insertAdjacentHTML==='function'){
    app.insertAdjacentHTML('beforeend',m21IpoSheet());
    bind();
  }
};

if(state){ensureM21State(state);save();render();}
