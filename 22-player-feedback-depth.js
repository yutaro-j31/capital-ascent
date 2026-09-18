'use strict';

// Player feedback pass: plain-language PE economics, realized-exit visibility,
// subsidiary mark-to-market, delegated CXO CAPEX, precise trillion formatting,
// and reliable business-entry routing.
const _m22EnsureAdvancedState=ensureAdvancedState;
const _m22PeView=peView;
const _m22Operations=operations;
const _m22Bind=bind;
const _m22ProcessCompanyWeek=processCompanyWeek;

function ensureM22State(s){
  _m22EnsureAdvancedState(s);
  for(const id of Object.keys(s.company.businesses||{})){
    const u=businessUnitFor(s,id);
    if(!['off','COO','CSO'].includes(u.capexDelegateRole))u.capexDelegateRole='off';
    if(!Number.isFinite(u.lastDelegatedCapexWeek))u.lastDelegatedCapexWeek=0;
    if(typeof u.lastDelegatedCapexDecision!=='string')u.lastDelegatedCapexDecision='';
  }
  return s;
}
ensureAdvancedState=ensureM22State;

yen=function(n){
  n=Number(n);
  if(!Number.isFinite(n))return '—';
  const sign=n<0?'-':'',a=Math.abs(n);
  if(a>=1e12){
    let cho=Math.floor(a/1e12);
    let oku=Math.round((a-cho*1e12)/1e8);
    if(oku>=10000){cho+=Math.floor(oku/10000);oku%=10000;}
    return sign+cho.toLocaleString()+'兆'+(oku?oku.toLocaleString()+'億':'');
  }
  if(a>=1e8)return (n/1e8).toFixed(2)+'億';
  if(a>=1e4)return Math.round(n/1e4).toLocaleString()+'万';
  return '¥'+Math.round(n).toLocaleString();
};

function m22FundStatusLabel(status){
  return status==='investing'?'投資期間':status==='harvesting'?'回収期間':'満期';
}
phase10FundPanel=function(f){
  const m=fundMetrics(f,state),gate=nextFundEligibility(state),exp=fundSectorExposure(state,f);
  const sector=Object.entries(exp.rows).sort((a,b)=>b[1]-a[1])[0];
  const reasons=[];
  if(m.dpi<1.20)reasons.push('回収済倍率 '+m.dpi.toFixed(2)+'x / 1.20x必要');
  if(m.deployment<.80)reasons.push('投資済み比率 '+pct(m.deployment)+' / 80%必要');
  if((state.pe.lpTrust||0)<45)reasons.push('外部投資家からの信頼度 '+Math.round(state.pe.lpTrust)+' / 45必要');
  return '<section class="card p10-fund m22-fund">'+
    '<div class="section-row"><div><h2>第'+f.number+'号ファンド 収益</h2><p class="sub">'+m22FundStatusLabel(m.status)+'。ファンドに集めた資金が、どこまで投資され、いくら戻ってきたかを表示しています。</p></div><span class="pill live">投資家信頼 '+Math.round(state.pe.lpTrust)+'</span></div>'+
    '<div class="p10-fund-grid m22-fund-grid">'+
      '<div><small>出資約束総額</small><b>'+yen(f.commitments)+'</b><em>投資家とあなたが「最大ここまで出す」と約束した総額</em></div>'+
      '<div><small>実際に払込済みの資金</small><b>'+yen(m.paidIn)+'</b><em>すでにファンド口座へ入った金額</em></div>'+
      '<div><small>まだ払込していない残額</small><b>'+yen(m.uncalled)+'</b><em>必要になった時に追加で集められる金額</em></div>'+
      '<div><small>保有企業の現在価値</small><b>'+yen(m.nav)+'</b><em>まだ売却していない投資先の株式価値</em></div>'+
      '<div><small>回収済倍率</small><b>'+m.dpi.toFixed(2)+'x</b><em>払込100円に対して、現金で何円回収したか。1.20xなら120円回収済み</em></div>'+
      '<div><small>回収済＋保有中の総合倍率</small><b>'+m.tvpi.toFixed(2)+'x</b><em>現金回収と未売却資産を合わせた現在の総成果</em></div>'+
      '<div><small>投資済み比率</small><b>'+pct(m.deployment)+'</b><em>出資約束総額のうち、案件へ使った割合</em></div>'+
      '<div><small>ファンド手元現金比率</small><b>'+pct(m.reserveRatio)+'</b><em>追加投資や費用のために残している現金</em></div>'+
    '</div>'+
    '<div class="p10-fund-foot m22-fund-foot"><span>運営報酬の累計 '+yen(f.managementFeesPaid)+'</span><span>成功報酬の累計 '+yen(f.carryPaid)+'</span><span>'+(sector?'最大投資分野 '+(PILLARS[sector[0]]?.name||sector[0])+' '+pct(sector[1]/Math.max(1,exp.total)):'投資先なし')+'</span></div>'+
    '<div class="p10-gate '+(gate.eligible?'ready':'locked')+'"><b>次のファンドを組成する条件: '+(gate.eligible?'達成':'未達')+'</b><span>'+(gate.eligible?'回収済倍率・投資済み比率・投資家信頼の3条件を満たしています。':reasons.join(' · '))+'</span>'+(gate.eligible?'<button class="btn primary" data-act="raiseFund">次号ファンドを組成</button>':'')+'</div>'+
  '</section>';
};


m21PeGuide=function(){
  ensureM21State(state);
  const funds=state.pe.funds||[],deals=state.pe.deals||[],ports=state.pe.portfolio||[];
  const hasFund=funds.length>0,hasResearch=deals.some(function(d){return d.dd;}),hasHeld=ports.some(function(p){return p.status==='held';});
  const hasImprove=ports.some(function(p){return (p.initiatives||[]).length>0||Number(p.improvement)>0;}),hasExit=ports.some(function(p){return p.status==='exited';});
  const gate=hasFund?nextFundEligibility(state):null;
  const steps=[
    ['1','ファンドを作る',hasFund,'あなた自身も少額を出資し、残りを外部投資家から集めます。'],
    ['2','買収候補を待つ',hasFund&&deals.some(function(d){return d.status==='open';}),'買収できそうな会社が四半期ごとに届きます。'],
    ['3','企業調査をする',hasResearch,'売上の質・リスク・借入余力を調べて、買う価値があるか確認します。'],
    ['4','会社を買収する',hasHeld,'ファンド資金と借入を組み合わせて会社を取得します。'],
    ['5','買収先を改善する',hasImprove,'コスト、人材、設備、販路へ投資して利益を伸ばします。'],
    ['6','借入を返しながら成長させる',hasHeld,'利益から借入を返すほど、株主側の価値が増えやすくなります。'],
    ['7','会社を売却して現金回収',hasExit,'売却後、ファンドへ戻った現金とあなた個人の受取額を確認できます。'],
    ['8','次のファンドを作る',!!(gate&&gate.eligible),'回収実績・投資済み比率・外部投資家からの信頼が一定以上なら次へ進めます。']
  ];
  let current=steps.findIndex(function(x){return !x[2];});if(current<0)current=steps.length-1;
  const rows=steps.map(function(x,i){return '<div class="m21-pe-step '+(x[2]?'done':i===current?'current':'')+'"><span>'+(x[2]?'✓':x[0])+'</span><div><b>'+x[1]+'</b><small>'+x[3]+'</small></div></div>';}).join('');
  return '<section class="card m21-pe-guide"><div class="section-row"><div><h2>PEファームの進め方</h2><p class="sub">専門用語を知らなくても、この8段階を順番に進めれば運営できます。</p></div><span class="pill">8段階</span></div><div class="m21-pe-steps">'+rows+'</div>'+
    '<div class="m21-glossary"><div><b>外部投資家（LP）</b><span>ファンドへ資金を出してくれる投資家。</span></div><div><b>運営側（GP）</b><span>ファンドを運営するあなたのPE会社。</span></div><div><b>回収済倍率</b><span>払込済み資金に対して、現金で何倍回収したか。</span></div><div><b>総合倍率</b><span>回収済み現金と、まだ保有している会社の価値を合わせた倍率。</span></div></div></section>';
};

function m22GpCompanyPanel(){
  const cash=Math.max(0,Number(state.pe.managementCompanyCash)||0),dist=cash*.50;
  return '<section class="card half m22-explainer"><h2>PE運営会社の利益</h2>'+
    '<p class="sub"><b>GP</b>とはファンドを運営する側、つまりあなたのPE会社です。投資用のファンド資金とは別会計です。</p>'+
    '<div class="kpis"><div class="kpi"><div class="label">運営会社に貯まった現金</div><div class="value">'+yen(cash)+'</div></div><div class="kpi"><div class="label">今回個人へ移せる額</div><div class="value">'+yen(dist)+'</div></div></div>'+
    '<div class="m22-money-flow"><span>ファンド</span><b>→ 運営報酬 →</b><span>PE運営会社</span><b>→ 利益分配 →</b><span>あなた個人</span></div>'+
    '<p class="sub">毎週の運営報酬がここに入り、「個人へ利益分配」を押すと運営会社現金の50%が個人現金へ移ります。投資先企業の資金を直接抜く操作ではありません。</p>'+
    '<button class="btn wide" data-p10-gp-distribute>運営会社の現金50%を個人へ利益分配</button></section>';
}
function m22NetworkPanel(){
  return '<section class="card half m22-explainer"><h2>案件の人脈 / 外部投資家</h2>'+
    '<p class="sub"><b>LP</b>とは、あなたのファンドへ資金を出す外部投資家です。あなたは運営側（GP）、LPは資金提供側です。</p>'+
    '<div class="kpis"><div class="kpi"><div class="label">案件ネットワーク</div><div class="value">'+state.pe.network.toFixed(0)+'</div></div><div class="kpi"><div class="label">外部投資家からの信頼度</div><div class="value">'+state.pe.lpTrust.toFixed(0)+'</div></div></div>'+
    '<div class="m22-explain-list"><div><b>案件ネットワーク</b><span>銀行・経営者・仲介会社などとの人脈。高いほど独占的な案件が出やすくなります。</span></div><div><b>外部投資家からの信頼度</b><span>次号ファンドを任せてもらえるかの信用。投資先のExit成績で上下し、次号ファンドには45以上が必要です。</span></div></div>'+
    '<button class="btn wide" data-act="network">投資家・案件紹介者と面談する（2週間進む）</button></section>';
}
function m22ExitHistoryPanel(){
  const exited=(state.pe.portfolio||[]).filter(function(p){return p.status==='exited';}).sort(function(a,b){return (b.exitWeek||0)-(a.exitWeek||0);});
  const rows=exited.slice(0,12).map(function(p){
    const f=(state.pe.funds||[]).find(function(x){return x.id===p.fundId;});
    const d=f&&(f.distributionHistory||[]).slice().reverse().find(function(x){return x.portfolioId===p.id;});
    const invested=Number(p.equityInvested)||0,proceeds=Number(p.exitEquity)||0,gain=proceeds-invested;
    return '<div class="m22-exit-row"><div class="section-row"><div><b>'+p.name+'</b><span>第'+(p.exitWeek||'—')+'週 Exit · '+(PILLARS[p.businessID]?.name||p.businessID)+'</span></div><strong class="'+(gain>=0?'positive':'negative')+'">'+(gain>=0?'+':'')+yen(gain)+'</strong></div>'+
      '<div class="m22-exit-grid"><span>ファンドが投資した自己資金<b>'+yen(invested)+'</b></span><span>会社全体の売却評価額<b>'+yen(p.exitValue||0)+'</b></span><span>借入返済後にファンドへ戻った現金<b>'+yen(proceeds)+'</b></span><span>投資倍率<b>'+Number(p.moic||0).toFixed(2)+'x</b></span><span>あなた個人への受取<b>'+yen(d?.gpDistribution||0)+'</b></span><span>成功報酬分<b>'+yen(d?.carry||0)+'</b></span></div></div>';
  }).join('');
  return '<section class="card m22-exit-history"><div class="section-row"><div><h2>投資案件のExit実績</h2><p class="sub">売却時に「会社はいくらで売れたか」「ファンドにいくら戻ったか」「あなた個人にいくら入ったか」を分けて表示します。</p></div><span class="pill">'+exited.length+'件</span></div>'+(rows||'<p class="sub">まだExitした投資案件はありません。</p>')+'</section>';
}
function m22ReplaceSection(html,heading,replacement){
  const h=html.indexOf('<h2>'+heading+'</h2>');if(h<0)return html;
  const start=html.lastIndexOf('<section',h),end=html.indexOf('</section>',h);if(start<0||end<0)return html;
  return html.slice(0,start)+replacement+html.slice(end+'</section>'.length);
}
peView=function(){
  let html=_m22PeView();
  if(!state.pe.unlocked)return html;
  html=m22ReplaceSection(html,'GP運営会社',m22GpCompanyPanel());
  html=m22ReplaceSection(html,'ネットワーク / LP',m22NetworkPanel());
  html=html
    .replace('Fund I 初回募集','第1号ファンドを作る')
    .replace('Fund Iは2.9B commitments。最初に10%を資金払込し、案件取得時に必要額を追加Callします。','第1号ファンドの出資約束総額は29億円です。最初は10%だけをファンド口座へ払い込み、企業を買収する時に必要な分を追加で集めます。')
    .replace('Fund Iを組成','第1号ファンドを作る')
    .replace('投資委員会 / 案件一覧','投資候補案件')
    .replace('ポートフォリオ構築','保有中の投資先')
    .replace(/>DD<\/button>/g,'>企業調査（DD）<\/button>')
    .replace(/>Acquire<\/button>/g,'>買収実行<\/button>')
    .replace(/>Cost<\/button>/g,'>コスト改善<\/button>')
    .replace(/>Exit<\/button>/g,'>売却を検討<\/button>');
  html=html.replace('<div class="screen-head"><div class="copy"><h1>PEファーム</h1><p>LP commitmentsを預かり、capital call・portfolio construction・value creation・distributionまで運営します。</p></div></div>',
    '<div class="screen-head"><div class="copy"><h1>PEファーム</h1><p>外部投資家から預かった資金で企業へ投資し、企業価値を高めて売却し、利益を投資家と運営会社へ分配します。</p></div></div>');
  return html.replace('</main>',m22ExitHistoryPanel()+'</main>');
};

phase10AllocationPanel=function(){
  const a=capitalAllocationSnapshot(state),subs=state.company.subsidiaryPortfolio.filter(function(x){return x.status==='held';});
  const subRows=subs.map(function(sub){
    const p=integrationProjectFor(sub.id),ownership=clamp(Number(sub.ownership)||1,0,1);
    const currentEquity=Math.max(0,(Number(sub.enterpriseValue)||0)-(Number(sub.debt)||0))*ownership;
    const acquisition=Number(sub.acquisitionPrice)||0,pl=currentEquity-acquisition,ret=acquisition>0?currentEquity/acquisition:0;
    return '<div class="p10-sub-row m22-sub-row"><div><b>'+sub.name+'</b><span>EBITDA '+yen(sub.ebitda)+' · 負債 '+yen(sub.debt)+' · '+sub.integrationStatus+'</span>'+
      '<div class="m22-sub-value"><span>取得額 <b>'+yen(acquisition)+'</b></span><span>現在の株式価値 <b>'+yen(currentEquity)+'</b></span><span>含み'+(pl>=0?'益':'損')+' <b class="'+(pl>=0?'positive':'negative')+'">'+(pl>=0?'+':'')+yen(pl)+'</b></span><span>取得額比 <b>'+ret.toFixed(2)+'x</b></span></div></div>'+
      '<div class="p10-sub-actions">'+(p?'<span class="pill warn">'+PHASE10_INTEGRATIONS[p.mode].label+' 第'+p.completeWeek+'週</span>':'<button class="btn" data-p10-integration="synergy" data-p10-sub="'+sub.id+'">シナジー統合</button><button class="btn ghost" data-p10-integration="turnaround" data-p10-sub="'+sub.id+'">再建</button>')+'<button class="btn danger" data-p10-sell-sub="'+sub.id+'">子会社を売却</button></div></div>';
  }).join('')||'<p class="sub">保有子会社はありません。M&A候補を取得すると、取得額と現在価値を比較できます。</p>';
  return '<section class="card p10-allocation m22-allocation"><div class="section-row"><div><h2>資本配分室</h2><p class="sub">会社の現金を、設備投資・M&A・借入返済・株主還元のどこへ使うか管理します。</p></div><span class="pill">会社資金</span></div>'+
    '<div class="p10-metrics"><div><small>会社現金</small><b>'+yen(a.cash)+'</b></div><div><small>追加で借りられる目安</small><b>'+yen(a.debtCapacity)+'</b></div><div><small>進行中の投資額</small><b>'+yen(a.activeProjects)+'</b></div><div><small>保有子会社</small><b>'+a.subsidiaries+'社</b></div></div>'+
    '<div class="actions"><button class="btn primary" data-act="acquireSub">M&A候補を取得</button><button class="btn" data-p10-dividend '+(state.company.public?'':'disabled')+'>特別配当</button><button class="btn" data-p10-buyback '+(state.company.public?'':'disabled')+'>自社株買い</button></div>'+
    '<h3 style="margin-top:14px">保有子会社の取得額と現在価値</h3><div class="p10-sub-list">'+subRows+'</div></section>';
};

function m22CxoCapexRoleAvailable(role){
  if(role==='off')return true;
  const e=m21Executive(state,role);return !!(e&&e.hired);
}
function setM22CapexDelegateRole(id,role){
  ensureM22State(state);
  if(!['off','COO','CSO'].includes(role))return false;
  if(role!=='off'&&!m22CxoCapexRoleAvailable(role)){alert(role+'を先に採用してください。');return false;}
  const u=businessUnitFor(state,id);u.capexDelegateRole=role;
  u.lastDelegatedCapexDecision=role==='off'?'設備投資の委任を解除':'次の四半期レビューから'+role+'が設備投資を判断';
  log((PILLARS[id]?.name||id)+': 設備投資判断を '+(role==='off'?'CEO手動':'CXO '+role)+' に設定。');
  save();render();return true;
}
function m22DelegatedCapexKind(s,id,role){
  const b=s.company.businesses[id]||{},policy=policyFor(s,id).mode,stores=s.company.stores.filter(function(x){return x.businessID===id;}).length;
  const scores={
    renovation:Math.max(0,100-((Number(b.brand)||0)*.6+(Number(b.quality)||0)*.4)),
    automation:Math.max(0,100-(Number(b.efficiency)||0)),
    capacity:45+Math.min(30,stores*3),
    product:Math.max(0,100-(Number(b.quality)||0))
  };
  if(policy==='growth'){scores.capacity+=30;scores.product+=10;}
  if(policy==='share')scores.capacity+=35;
  if(policy==='premium'){scores.renovation+=25;scores.product+=25;}
  if(policy==='margin'||policy==='cash')scores.automation+=28;
  if(role==='COO'){scores.automation+=20;scores.capacity+=12;}
  if(role==='CSO'){scores.renovation+=15;scores.product+=15;scores.capacity+=10;}
  return Object.keys(scores).sort(function(a,b2){return scores[b2]-scores[a]||a.localeCompare(b2);})[0];
}
function m22ServiceDelegatedCapex(s){
  ensureM22State(s);
  if(s.week<=1||(s.week-1)%13!==0)return;
  for(const id of Object.keys(s.company.businesses||{})){
    const u=businessUnitFor(s,id),role=u.capexDelegateRole||'off';
    if(role==='off')continue;
    const exec=m21Executive(s,role);
    if(!exec||!exec.hired){u.capexDelegateRole='off';u.lastDelegatedCapexDecision=role+'不在のため委任解除';continue;}
    if(s.week-(u.lastDelegatedCapexWeek||0)<13)continue;
    const active=activeProjectCount(s),cap=projectCapacity(s);
    if(active>=cap){u.lastDelegatedCapexDecision='見送り: 全社プロジェクト枠が満杯';continue;}
    const kind=m22DelegatedCapexKind(s,id,role),spec=PHASE9_CAPEX[kind];
    if(!spec)continue;
    if(s.projects.some(function(p){return p.status==='in_progress'&&p.scope==='capex'&&p.targetId===id&&p.kind===kind;})){u.lastDelegatedCapexDecision='見送り: 同種設備投資が進行中';continue;}
    const authority=Math.max(0,Number(u.capitalBudget)||0);
    if(spec.cost>authority){u.lastDelegatedCapexDecision='見送り: 1件投資上限 '+yen(authority)+' を超過';continue;}
    const reserve=Math.max(5000000,(Number(u.weeklyBudget)||0)*13,spec.cost*.50);
    if(s.company.cash-spec.cost<reserve){u.lastDelegatedCapexDecision='見送り: 設備投資後の現金余力が不足';continue;}
    s.company.cash-=spec.cost;
    const quality=clamp(Number(exec.quality)||70,50,100)/100;
    s.projects.push({id:uid('capex',s.seed+':cxocapex:'+id+':'+kind+':'+s.week),scope:'capex',targetId:id,kind:kind,cost:spec.cost,startWeek:s.week,completeWeek:s.week+spec.duration,duration:spec.duration,status:'in_progress',executionRisk:spec.risk*(1-quality*.25),progress:0,expectedEffect:spec.description,delegatedBy:role});
    u.lastDelegatedCapexWeek=s.week;u.lastDelegatedCapexDecision=role+'が「'+spec.label+'」を承認 '+yen(spec.cost);
    log((PILLARS[id]?.name||id)+': '+role+'が設備投資 '+spec.label+' '+yen(spec.cost)+' を承認。','major');
  }
}
processCompanyWeek=function(s){
  _m22ProcessCompanyWeek(s);
  m22ServiceDelegatedCapex(s);
};

phase9CapexPanel=function(id){
  ensureM22State(state);
  const cap=projectCapacity(state),active=activeProjectCount(state),u=businessUnitFor(state,id);
  const rows=state.projects.filter(function(p){return p.scope==='capex'&&p.targetId===id&&p.status==='in_progress';}).map(function(p){
    return '<div class="project-row"><div><b>'+(PHASE9_CAPEX[p.kind]?.label||p.kind)+'</b><span>'+Math.round((p.progress||0)*100)+'% · 第'+p.completeWeek+'週完成 · '+yen(p.cost)+(p.delegatedBy?' · '+p.delegatedBy+'委任':'')+'</span></div><strong>'+Math.max(0,p.completeWeek-state.week)+'週</strong></div>';
  }).join('')||'<p class="sub">この事業の設備投資は進行していません。</p>';
  const buttons=Object.entries(PHASE9_CAPEX).map(function(entry){const k=entry[0],v=entry[1];return '<button class="btn phase9-capex-btn" data-p9-capex="'+id+'" data-p9-kind="'+k+'" '+(active>=cap?'disabled':'')+'><b>'+v.label+'</b><small>'+yen(v.cost)+' · '+v.duration+'週</small></button>';}).join('');
  const coo=m21Executive(state,'COO'),cso=m21Executive(state,'CSO');
  return '<section class="card half phase9-capex m22-capex"><div class="section-row"><div><h2>設備投資計画</h2><p class="sub">CEOが手動実行するか、採用済みCXOへ四半期ごとの判断を委任できます。</p></div><span class="pill">進行 '+active+'/'+cap+'</span></div>'+
    '<div class="m22-capex-delegate"><label>CXOへ設備投資判断を委任<select data-m22-capex-role="'+id+'"><option value="off" '+(u.capexDelegateRole==='off'?'selected':'')+'>委任しない（CEO手動）</option><option value="COO" '+(u.capexDelegateRole==='COO'?'selected':'')+' '+(!coo?.hired?'disabled':'')+'>COOへ委任'+(!coo?.hired?'（未採用）':'')+'</option><option value="CSO" '+(u.capexDelegateRole==='CSO'?'selected':'')+' '+(!cso?.hired?'disabled':'')+'>CSOへ委任'+(!cso?.hired?'（未採用）':'')+'</option></select></label>'+
    '<p>四半期ごとに、事業方針・能力値・会社現金・プロジェクト枠・「1件あたり投資上限」を確認してCXOが設備投資を自動判断します。</p><small>直近判断: '+(u.lastDelegatedCapexDecision||'まだ判断なし')+'</small></div>'+
    '<div class="project-list">'+rows+'</div><div class="capex-actions">'+buttons+'</div></section>';
};

addBusiness=function(id){
  if(!PILLARS[id])return false;
  if(state.company.businesses[id])return true;
  const cost=id==='productVentures'?2500000:750000;
  if(state.company.cash<cost){alert(PILLARS[id].name+'への参入には準備資金 '+yen(cost)+' が必要です。現在の会社現金は '+yen(state.company.cash)+' です。');return false;}
  state.company.cash-=cost;state.company.businesses[id]=baseBusiness(id);
  if(id==='productVentures')state.company.businesses[id].product={stage:'released',awareness:500,registrations:80,mau:35,paid:6,techDebt:4,serverCapacity:500};
  ensureM22State(state);
  log(PILLARS[id].name+'事業へ参入。準備資金 '+yen(cost)+'。','major');save();return true;
};

function m22BusinessEntryPanel(){
  const rows=Object.entries(PILLARS).filter(function(entry){return !state.company.businesses[entry[0]];}).map(function(entry){
    const id=entry[0],p=entry[1],cost=id==='productVentures'?2500000:750000;
    return '<div class="m22-entry-row"><div><b>'+p.icon+' '+p.name+'</b><span>'+p.desc+'</span></div><button class="btn primary" data-add-business="'+id+'">参入 · '+yen(cost)+'</button></div>';
  }).join('');
  if(!rows)return '';
  return '<section class="card m22-business-entry"><div class="section-row"><div><h2>新規事業へ参入</h2><p class="sub">現在の事業を見ながら、別事業にも直接参入できます。</p></div></div><div class="m22-entry-list">'+rows+'</div></section>';
}
operations=function(){
  let html=_m22Operations();
  if(!state.company.businesses.realEstateAgency&&!html.includes('data-add-business="realEstateAgency"')){
    html=injectBeforeMainClose(html,m22BusinessEntryPanel());
  }else if(selectedBusiness&&!selectedMapBusiness&&!selectedStoreDetail){
    html=injectBeforeMainClose(html,m22BusinessEntryPanel());
  }
  html=html.replace('data-add-business="realEstateAgency">参入</button>','data-add-business="realEstateAgency">参入 · 75万円</button>');
  return html;
};

bind=function(){
  _m22Bind();
  document.querySelectorAll('nav [data-tab="operations"]').forEach(function(el){el.onclick=function(){
    tab='operations';selectedBusiness=null;selectedMapBusiness=null;selectedStoreDetail=null;
    if(typeof selectedCityEntity!=='undefined')selectedCityEntity=null;
    render();
  };});
  document.querySelectorAll('[data-m22-capex-role]').forEach(function(el){el.onchange=function(){setM22CapexDelegateRole(el.dataset.m22CapexRole,el.value);};});
  document.querySelectorAll('[data-add-business]').forEach(function(el){el.onclick=function(){
    const id=el.dataset.addBusiness;
    if(addBusiness(id)){selectedBusiness=id;selectedMapBusiness=null;selectedStoreDetail=null;render();}
  };});
};

if(state){ensureM22State(state);save();render();}
