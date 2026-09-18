'use strict';

// Player-feedback depth: LP DDQ response flow, network-scaled deal sourcing,
// explicit portfolio-action costs, successor-fund guidance, fund liquidity,
// and fair-value transfers from PE funds into the player's operating company.
const _m24EnsureAdvancedState=ensureAdvancedState;
const _m24GeneratePeDeals=generatePeDeals;
const _m24PeView=peView;
const _m24Bind=bind;

const M24_PORTFOLIO_ACTIONS={
  cost:{label:'コスト改善',cost:25000000,duration:8},
  talent:{label:'人材強化',cost:35000000,duration:12},
  capex:{label:'設備投資',cost:50000000,duration:16},
  channel:{label:'販路拡大',cost:30000000,duration:10}
};

function ensureM24State(s){
  _m24EnsureAdvancedState(s);
  s.pe.relatedPartyTransfers=Array.isArray(s.pe.relatedPartyTransfers)?s.pe.relatedPartyTransfers:[];
  if(s.pe.relatedPartyTransfers.length>80)s.pe.relatedPartyTransfers=s.pe.relatedPartyTransfers.slice(-80);
  if(Array.isArray(s.pe.deals)&&s.pe.deals.length>180){
    const open=s.pe.deals.filter(function(d){return d.status==='open';});
    const closed=s.pe.deals.filter(function(d){return d.status!=='open';}).slice(0,120);
    s.pe.deals=open.concat(closed);
  }
  return s;
}
ensureAdvancedState=ensureM24State;

function m24RunLpDdq(id){
  ensureM24State(state);
  const c=state.pe.fundraising,lp=c&&c.lpProspects.find(function(x){return x.id===id;});
  if(!c||!lp||lp.status!=='interested')return false;
  const score=m23SolicitationScore(c,lp)+u01(String(state.seed)+':ddq:'+c.fundNo+':'+lp.id)*8;
  lp.status=score>=42?'approved':'passed';
  lp.relationship=clamp(lp.relationship+(lp.status==='approved'?4:-2),0,100);
  if(m23FundraiseStageIndex(c.stage)<1)c.stage='ddq';
  c.history.push({week:state.week,event:'ddq_single',lpId:lp.id,result:lp.status});
  log(lp.name+' DDQ回答: '+(lp.status==='approved'?'審査通過。出資条件の協議へ進めます。':'今回は審査見送り。'),lp.status==='approved'?'good':'');
  save();render();return lp.status==='approved';
}

m23ProspectRow=function(c,lp){
  let action='',status='';
  if(lp.status==='prospect'){
    action='<button class="btn" data-m23-solicit="'+lp.id+'">出資を打診</button>';
    status='未打診';
  }else if(lp.status==='interested'){
    action='<button class="btn primary" data-m24-lp-ddq="'+lp.id+'">DDQを実施</button>';
    status='関心あり';
  }else if(lp.status==='approved'&&!c.anchorInvestorId){
    action='<button class="btn primary" data-m23-anchor="'+lp.id+'">Anchor LPに指名</button>';
    status='DDQ通過';
  }else if(lp.status==='approved'){
    action='<button class="btn" data-m23-commit-lp="'+lp.id+'">出資を依頼</button>';
    status='DDQ通過';
  }else if(lp.status==='committed'){
    action='<strong class="positive">'+yen(lp.commitment)+'</strong>';
    status='出資約束済み';
  }else{
    action='<span class="pill">見送り</span>';
    status='今回は見送り';
  }
  return '<div class="m23-lp-row"><div><b>'+lp.name+'</b><span>'+lp.type+' · 関係 '+Math.round(lp.relationship)+' · 想定枠 '+yen(lp.ticket)+'</span><small class="m24-lp-status">'+status+'</small>'+
    (lp.sideLetter?'<small>'+lp.sideLetter+'</small>':'')+'</div><div>'+action+'</div></div>';
};

function m24DealTarget(s){
  return 2+Math.floor(clamp(Number(s.pe.network)||0,0,100)/25);
}
function m24CreateNetworkDeal(s,f,quarter,sequence){
  const key=String(s.seed)+':network-deal:'+quarter+':'+sequence;
  const id=uid('deal',key);
  if(s.pe.deals.some(function(d){return d.id===id;}))return null;
  const pillars=Object.keys(PILLARS),businessID=pillars[hash32(key+':sector')%pillars.length];
  const floor=f.number===1?350000000:Math.min(80000000000,(Number(f.size)||Number(f.commitments)||2900000000)*.12);
  const value=floor*(.72+u01(key+':value')*.96);
  const ebitda=value/(6.2+u01(key+':multiple')*3.8);
  return {
    id:id,
    name:PILLARS[businessID].name+' '+['東亜','みらい','中央','ネクスト','日本','青葉','北辰'][hash32(key+':name')%7]+'グループ',
    businessID:businessID,
    value:value,
    ebitda:ebitda,
    seller:['創業家','大企業カーブアウト','金融機関','PEセカンダリー'][hash32(key+':seller')%4],
    round:'indication',
    expires:s.week+12,
    dd:false,
    exclusive:u01(key+':exclusive')<Math.min(.55,(Number(s.pe.network)||0)/190),
    status:'open',
    sourcedByNetwork:true
  };
}
generatePeDeals=function(s){
  _m24GeneratePeDeals(s);
  ensureM24State(s);
  if(!s.pe.unlocked||!s.pe.funds.length)return;
  const active=s.pe.funds.filter(function(f){return s.week<=f.investmentEndWeek;});
  if(!active.length)return;
  const f=active[active.length-1],target=m24DealTarget(s),quarter=Math.floor((s.week-1)/13);
  let open=s.pe.deals.filter(function(d){return d.status==='open';}).length;
  let sequence=0,guard=0;
  while(open<target&&guard<24){
    const d=m24CreateNetworkDeal(s,f,quarter,sequence++);
    guard++;
    if(!d)continue;
    s.pe.deals.unshift(d);open++;
  }
};

function m24TurnaroundCost(p){
  const base=Number(p.entryValue)||Number(p.value)||1000000000;
  return m23RoundMoney(Math.max(30000000,Math.min(150000000,base*.025)),1000000);
}
function m24SetButtonLabel(html,attrs,label){
  const token=attrs+'>',at=html.indexOf(token);
  if(at<0)return html;
  const end=html.indexOf('</button>',at);
  if(end<0)return html;
  return html.slice(0,at+token.length)+label+html.slice(end);
}
function m24AnnotatePortfolioActions(html){
  for(const p of state.pe.portfolio.filter(function(x){return x.status==='held';})){
    for(const kind of Object.keys(M24_PORTFOLIO_ACTIONS)){
      const a=M24_PORTFOLIO_ACTIONS[kind];
      html=m24SetButtonLabel(html,'data-improve="'+kind+'" data-port="'+p.id+'"',a.label+' · '+yen(a.cost)+' / '+a.duration+'週');
    }
    html=m24SetButtonLabel(html,'data-m23-turnaround="'+p.id+'"','再建 · '+yen(m24TurnaroundCost(p))+' / 26週');
  }
  return html;
}

function m24CallableCapital(f){
  const commitments=Math.max(1,Number(f.commitments)||Number(f.size)||1);
  const uncalled=Math.max(0,commitments-(Number(f.calledCapital)||0));
  const ratio=Math.max(0,(Number(f.gpCommit)||0)/commitments);
  const byGp=ratio>0?Math.max(0,Number(state.personal.cash)||0)/ratio:uncalled;
  return Math.min(uncalled,byGp);
}
function m24FundLiquidityPanel(){
  const funds=(state.pe.funds||[]).slice().reverse();
  if(!funds.length)return '';
  const rows=funds.map(function(f){
    const m=fundMetrics(f,state),callable=m24CallableCapital(f);
    const theoretical=Math.max(0,Number(f.cash)||0)+callable;
    const status=m.status==='investing'?'投資期間':m.status==='harvesting'?'回収期間':'満期';
    return '<div class="m24-fund-liquidity-row"><div class="section-row"><div><b>第'+f.number+'号ファンド</b><span>'+status+' · 投資済み '+yen(f.invested||0)+'</span></div><strong>'+yen(theoretical)+'</strong></div>'+
      '<div class="m24-liquidity-grid"><span>ファンド手元現金<b>'+yen(f.cash||0)+'</b><small>今すぐ支払える資金</small></span>'+
      '<span>未払込コミット<b>'+yen(m.uncalled)+'</b><small>まだLP/GPへCallしていない額</small></span>'+
      '<span>現在追加Call可能<b>'+yen(callable)+'</b><small>個人GP資金も考慮した上限</small></span>'+
      '<span>理論上の投資余力<b>'+yen(theoretical)+'</b><small>手元現金＋追加Call可能額</small></span></div></div>';
  }).join('');
  return '<section class="card m24-fund-liquidity"><div class="section-row"><div><h2>ファンド別の投資余力</h2><p class="sub">「今いくら残っているか」と「追加のCapital Callを含め、最大いくら動かせるか」を分けて表示します。</p></div><span class="pill">'+funds.length+' Funds</span></div>'+
    rows+'<p class="tiny">理論上の投資余力は案件のIC制約、将来の管理報酬、運営リザーブを差し引く前の上限です。</p></section>';
}

function m24NextFundGatePanel(){
  const gate=nextFundEligibility(state);
  if(!gate.previous)return '';
  const f=gate.previous,m=gate.metrics||fundMetrics(f,state);
  const distributionNeed=Math.max(0,m.paidIn*1.20-m.distributed);
  const investNeed=Math.max(0,(Number(f.commitments)||0)*.80-(Number(f.invested)||0));
  const trust=Number(state.pe.lpTrust)||0,trustNeed=Math.max(0,45-trust);
  const dpiOk=m.dpi>=1.20,deployOk=m.deployment>=.80,trustOk=trust>=45;
  return '<section class="card m24-next-fund"><div class="section-row"><div><h2>次号ファンド解禁条件</h2><p class="sub">3条件をすべて同時に満たすと、第'+state.pe.nextFundNo+'号ファンドの資金調達を開始できます。</p></div><span class="pill '+(gate.eligible?'live':'warn')+'">'+(gate.eligible?'解禁済み':'未解禁')+'</span></div>'+
    '<div class="m24-gate-list">'+
      '<div class="'+(dpiOk?'done':'')+'"><div><b>① 回収済倍率 1.20x以上</b><span>現在 '+m.dpi.toFixed(2)+'x · 払込済 '+yen(m.paidIn)+' / 回収済 '+yen(m.distributed)+'</span></div><strong>'+(dpiOk?'達成':'あと '+yen(distributionNeed)+' 回収')+'</strong><p>投資先をExitし、ファンドへ現金を戻すと上がります。保有価値（NAV）だけではこの条件は達成しません。</p></div>'+
      '<div class="'+(deployOk?'done':'')+'"><div><b>② 投資済み比率 80%以上</b><span>現在 '+pct(m.deployment)+' · 投資済 '+yen(f.invested||0)+' / コミット '+yen(f.commitments||0)+'</span></div><strong>'+(deployOk?'達成':'あと '+yen(investNeed)+' 投資')+'</strong><p>企業買収、追加投資、Value Creation、再建へのファンド資金投入が投資済み額に加算されます。</p></div>'+
      '<div class="'+(trustOk?'done':'')+'"><div><b>③ 外部投資家からの信頼 45以上</b><span>現在 '+Math.round(trust)+' / 45</span></div><strong>'+(trustOk?'達成':'あと '+Math.ceil(trustNeed))+'</strong><p>良好なExit実績で改善し、低いMOICのExitでは悪化します。案件ネットワークとは別の指標です。</p></div>'+
    '</div></section>';
}

function m24PortfolioTransferValue(p){
  const ev=Math.max(0,Number(p.value)||Number(p.enterpriseValue)||0);
  return Math.max(1000000,ev-Math.max(0,Number(p.debt)||0)+Math.max(0,Number(p.cash)||0));
}
function m24PortfolioEnterpriseValue(p){
  return Math.max(0,Number(p.value)||Number(p.enterpriseValue)||Number(p.entryValue)||0);
}
function m24RecordFundSaleToCompany(p,f,price,ev){
  const gain=price-(Number(p.equityInvested)||0);
  const years=Math.min(5,Math.max(0,Number(p.age)||0)/52);
  const hurdle=(Number(p.equityInvested)||0)*Math.pow(1+(Number(f.preferredReturn)||.08),years);
  const carry=Math.max(0,price-hurdle)*(Number(f.carryRate)||.20);
  const gpProRata=price*((Number(f.gpCommit)||0)/Math.max(1,Number(f.commitments)||Number(f.size)||1));
  const gpDistribution=gpProRata+carry;
  state.personal.cash+=gpDistribution;
  f.distributed=(Number(f.distributed)||0)+price;
  f.realizedGain=(Number(f.realizedGain)||0)+gain;
  f.carryPaid=(Number(f.carryPaid)||0)+carry;
  f.gpDistributions=(Number(f.gpDistributions)||0)+gpDistribution;
  f.distributionHistory=Array.isArray(f.distributionHistory)?f.distributionHistory:[];
  f.distributionHistory.push({week:state.week,portfolioId:p.id,proceeds:price,carry:carry,gpDistribution:gpDistribution,kind:'sale-to-player-company'});
  if(f.distributionHistory.length>80)f.distributionHistory.shift();
  p.status='exited';p.exitType='sale-to-player-company';p.exitWeek=state.week;p.exitValue=ev;p.exitEquity=price;
  p.exitMultiple=(Number(p.ebitda)||0)>0?ev/Math.max(1,Number(p.ebitda)||1):0;
  p.moic=price/Math.max(1,Number(p.equityInvested)||1);
  state.pe.lpTrust=clamp((Number(state.pe.lpTrust)||0)+(p.moic>=1.8?3:p.moic>=1.2?1:-3),0,100);
  return {gain:gain,carry:carry,gpDistribution:gpDistribution};
}
function m24BuildSubsidiaryFromPortfolio(p,price,ev){
  const margin=clamp(Number(p.margin)||.15,.03,.40);
  const ebitda=Math.max(0,Number(p.ebitda)||0);
  const revenue=Math.max(ebitda,ebitda/Math.max(.03,margin));
  return {
    id:uid('pe-sub',String(state.seed)+':'+p.id+':'+state.week),
    name:p.name,businessID:p.businessID,revenue:revenue,ebitda:ebitda,margin:margin,
    growth:Number(p.organicGrowth)||.03,enterpriseValue:ev,debt:Math.max(0,Number(p.debt)||0),
    equityValue:price,ownership:1,managementQuality:clamp(Number(p.quality)||55,0,100),
    synergy:35,status:'held',acquisitionWeek:state.week,acquisitionPrice:price,lastRevenue:0,lastProfit:0,
    integrationStatus:'standalone',integrationMode:'standalone',source:'pe-portfolio',sourcePortfolioId:p.id,sourceFundId:p.fundId
  };
}
function m24TransferPortfolioToCompany(id,options){
  options=options||{};
  ensureM24State(state);
  const p=state.pe.portfolio.find(function(x){return x.id===id;});
  const f=state.pe.funds.find(function(x){return x.id===(p&&p.fundId);});
  if(!p||!f||p.status!=='held')return false;
  if(state.company.subsidiaryPortfolio.some(function(x){return x.sourcePortfolioId===p.id&&x.status==='held';}))return false;
  const price=m24PortfolioTransferValue(p),ev=m24PortfolioEnterpriseValue(p);
  if(state.company.cash<price){
    if(!options.silent)alert('自社M&Aには会社現金 '+yen(price)+' が必要です。現在 '+yen(state.company.cash)+'。');
    return false;
  }
  if(!options.skipConfirm&&!confirm(p.name+' を自社子会社として '+yen(price)+' で取得しますか？\nファンド側はFair ValueでExit扱いになります。'))return false;
  state.company.cash-=price;
  const sub=m24BuildSubsidiaryFromPortfolio(p,price,ev);
  state.company.subsidiaryPortfolio.push(sub);
  state.company.subsidiaries=state.company.subsidiaryPortfolio.filter(function(x){return x.status==='held';}).length;
  const sale=m24RecordFundSaleToCompany(p,f,price,ev);
  state.pe.relatedPartyTransfers.push({week:state.week,fundId:f.id,portfolioId:p.id,subsidiaryId:sub.id,price:price,enterpriseValue:ev});
  log('関連当事者M&A: '+p.name+' を '+yen(price)+' で自社子会社化。ファンド側MOIC '+p.moic.toFixed(2)+'x。','major');
  if(!options.silent){save();render();}
  return {price:price,subsidiaryId:sub.id,gpDistribution:sale.gpDistribution};
}
function m24TransferFundPortfolioToCompany(fundId){
  ensureM24State(state);
  const held=state.pe.portfolio.filter(function(p){return p.fundId===fundId&&p.status==='held';});
  if(!held.length){alert('このファンドに自社へ移せる保有先がありません。');return false;}
  const total=held.reduce(function(a,p){return a+m24PortfolioTransferValue(p);},0);
  if(state.company.cash<total){alert('一括M&Aには会社現金 '+yen(total)+' が必要です。現在 '+yen(state.company.cash)+'。');return false;}
  if(!confirm('第'+((state.pe.funds.find(function(f){return f.id===fundId;})||{}).number||fundId)+'号ファンドの保有先 '+held.length+'社を合計 '+yen(total)+' で自社子会社化しますか？'))return false;
  for(const p of held){
    const ok=m24TransferPortfolioToCompany(p.id,{silent:true,skipConfirm:true});
    if(!ok)return false;
  }
  save();render();return true;
}
function m24InjectCompanyMaButtons(html){
  for(const p of state.pe.portfolio.filter(function(x){return x.status==='held';})){
    const token='data-exit-port="'+p.id+'"',at=html.indexOf(token);
    if(at<0)continue;
    const start=html.lastIndexOf('<button',at);if(start<0)continue;
    const price=m24PortfolioTransferValue(p),disabled=state.company.cash<price?' disabled':'';
    const btn='<button class="btn m24-company-ma" data-m24-company-ma="'+p.id+'"'+disabled+'>自社へM&A · '+yen(price)+'</button>';
    html=html.slice(0,start)+btn+html.slice(start);
  }
  return html;
}
function m24CompanyAcquisitionPanel(){
  const rows=(state.pe.funds||[]).map(function(f){
    const held=state.pe.portfolio.filter(function(p){return p.fundId===f.id&&p.status==='held';});
    if(!held.length)return '';
    const total=held.reduce(function(a,p){return a+m24PortfolioTransferValue(p);},0);
    return '<div class="m24-fund-ma-row"><div><b>第'+f.number+'号ファンド</b><span>'+held.length+'社 · Fair Value合計 '+yen(total)+'</span></div><button class="btn" data-m24-company-ma-fund="'+f.id+'" '+(state.company.cash<total?'disabled':'')+'>保有先を一括M&A · '+yen(total)+'</button></div>';
  }).join('');
  if(!rows)return '';
  return '<section class="card m24-company-ma-panel"><div class="section-row"><div><h2>PE投資先を自社へM&A / 子会社化</h2><p class="sub">各投資先を個別、またはファンド単位でまとめて自社へ移せます。</p></div><span class="pill">Related Party</span></div>'+
    '<p class="tiny">自社がファンドの保有株式を現在のFair Valueで買い取ります。会社現金は減少し、ファンドではExit・分配として処理され、投資先の負債は子会社に残ります。</p>'+
    '<div class="m24-fund-ma-list">'+rows+'</div></section>';
}

function m24PipelinePanel(){
  if(!state.pe.funds.length)return '';
  const open=state.pe.deals.filter(function(d){return d.status==='open';}).length,target=m24DealTarget(state);
  return '<section class="card m24-pipeline"><div class="section-row"><div><h2>案件パイプライン</h2><p class="sub">案件ネットワークが高いほど、同時に検討できる案件数が増えます。</p></div><span class="pill">'+open+' / '+target+'件</span></div>'+
    '<div class="m24-network-scale"><span>Network 0<b>2件</b></span><span>25<b>3件</b></span><span>50<b>4件</b></span><span>75<b>5件</b></span><span>100<b>6件</b></span></div></section>';
}

peView=function(){
  ensureM24State(state);
  let html=_m24PeView();
  if(!state.pe.unlocked)return html;
  html=m24AnnotatePortfolioActions(html);
  html=m24InjectCompanyMaButtons(html);
  const extra=m24PipelinePanel()+m24FundLiquidityPanel()+m24NextFundGatePanel()+m24CompanyAcquisitionPanel();
  return html.replace('</main>',extra+'</main>');
};

bind=function(){
  _m24Bind();
  document.querySelectorAll('[data-m24-lp-ddq]').forEach(function(el){el.onclick=function(){m24RunLpDdq(el.dataset.m24LpDdq);};});
  document.querySelectorAll('[data-m24-company-ma]').forEach(function(el){el.onclick=function(){m24TransferPortfolioToCompany(el.dataset.m24CompanyMa);};});
  document.querySelectorAll('[data-m24-company-ma-fund]').forEach(function(el){el.onclick=function(){m24TransferFundPortfolioToCompany(el.dataset.m24CompanyMaFund);};});
};

if(state){ensureM24State(state);save();render();}
