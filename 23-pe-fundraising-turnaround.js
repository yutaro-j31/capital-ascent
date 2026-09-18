'use strict';

// Post-release depth layer.
// Adopts the staged institutional fundraising loop from pe-firm-tycoon while
// keeping CAPITAL ASCENT's simulation, accounting buckets and mobile UI.
const _m23EnsureAdvancedState=ensureAdvancedState;
const _m23PeView=peView;
const _m23Operations=operations;
const _m23Bind=bind;
const _m23ServicePE=servicePE;

const M23_LP_NAMES=[
  ['さくら年金基金','年金基金'],['東都生命','生命保険'],['北辰大学基金','大学基金'],['みらい財団','財団'],
  ['青葉ファミリーオフィス','ファミリーオフィス'],['大和共済','共済'],['中央機関投資部門','機関投資家'],['あすなろ投資顧問','資産運用会社'],
  ['ひかり企業年金','企業年金'],['瑞穂生命','生命保険'],['白樺大学基金','大学基金'],['つばさ財団','財団']
];
const M23_FUNDRAISE_STAGES=[
  ['pre_marketing','Pre-Marketing'],['ddq','DDQ'],['anchor','Anchor LP'],['first_close','First Close'],['final_close','Final Close']
];

function m23RoundMoney(n,unit){
  unit=unit||1000000;
  return Math.max(0,Math.round((Number(n)||0)/unit)*unit);
}
function m23DefaultFundTarget(s){
  const gate=nextFundEligibility(s);
  if(!gate.previous)return 2900000000;
  const m=gate.metrics||fundMetrics(gate.previous,s);
  const growth=clamp(1.18+(m.tvpi-1)*.36+((s.pe.lpTrust||50)-50)/180,1.08,1.90);
  return Math.min(1000000000000,m23RoundMoney((gate.previous.size||gate.previous.commitments||2900000000)*growth,10000000));
}
function m23FundraiseTotal(c){
  if(!c)return 0;
  return (Number(c.gpCommit)||0)+(c.lpProspects||[]).reduce(function(a,x){return a+(x.status==='committed'?(Number(x.commitment)||0):0);},0);
}
function m23CommittedLPs(c){
  return (c&&c.lpProspects||[]).filter(function(x){return x.status==='committed';});
}
function m23FundraiseStageIndex(stage){
  const i=M23_FUNDRAISE_STAGES.findIndex(function(x){return x[0]===stage;});
  return i<0?0:i;
}
function m23GenerateLPs(s,c,count){
  count=count||8;
  const round=Number(c.prospectRound)||0,rows=[];
  for(let i=0;i<count;i++){
    const pool=M23_LP_NAMES[(round*count+i)%M23_LP_NAMES.length];
    const key=String(s.seed)+':fundraise:'+c.fundNo+':'+round+':'+i;
    const baseTrust=Number(s.pe.lpTrust)||50,network=Number(s.pe.network)||0;
    const relationship=clamp(34+baseTrust*.28+network*.10+u01(key+':rel')*28,20,98);
    const appetite=clamp(.72+relationship/220+(u01(key+':app')-.5)*.22,.60,1.22);
    const pctTicket=.075+u01(key+':ticket')*.095;
    const ticket=m23RoundMoney(c.targetSize*pctTicket*appetite,10000000);
    rows.push({
      id:'LP-'+c.fundNo+'-'+round+'-'+i,
      name:pool[0]+(round>0?' '+(round+1)+'号口':''),
      type:pool[1],
      relationship:relationship,
      appetite:appetite,
      ticket:Math.max(50000000,ticket),
      status:'prospect',
      commitment:0,
      sideLetter:'',
      lastContactWeek:0
    });
  }
  return rows;
}
function ensureM23State(s){
  _m23EnsureAdvancedState(s);
  s.pe.fundraising=s.pe.fundraising&&typeof s.pe.fundraising==='object'?s.pe.fundraising:null;
  s.pe.fundraiseHistory=Array.isArray(s.pe.fundraiseHistory)?s.pe.fundraiseHistory:[];
  if(s.pe.fundraiseHistory.length>30)s.pe.fundraiseHistory=s.pe.fundraiseHistory.slice(-30);
  if(s.pe.fundraising){
    const c=s.pe.fundraising;
    c.lpProspects=Array.isArray(c.lpProspects)?c.lpProspects:[];
    c.history=Array.isArray(c.history)?c.history:[];
    c.prospectRound=Number.isFinite(c.prospectRound)?c.prospectRound:0;
    c.stage=c.stage||'pre_marketing';
    c.firstCloseWeek=Number.isFinite(c.firstCloseWeek)?c.firstCloseWeek:0;
    c.anchorInvestorId=c.anchorInvestorId||null;
  }
  for(const f of s.pe.funds||[]){
    f.lpInvestors=Array.isArray(f.lpInvestors)?f.lpInvestors:[];
    f.targetSize=Number.isFinite(f.targetSize)?f.targetSize:(Number(f.commitments)||Number(f.size)||0);
    f.fundraisingStage=f.fundraisingStage||'final_close';
  }
  for(const id of Object.keys(s.company.businesses||{})){
    const u=businessUnitFor(s,id);
    if(!Number.isFinite(u.lastAutoExpansionReviewWeek))u.lastAutoExpansionReviewWeek=0;
    if(typeof u.lastExpansionDecision!=='string')u.lastExpansionDecision='';
  }
  for(const p of s.pe.portfolio||[]){
    if(p.turnaround&&typeof p.turnaround!=='object')p.turnaround=null;
  }
  return s;
}
ensureAdvancedState=ensureM23State;

function m23StartFundraising(targetSize,gpCommit){
  ensureM23State(state);
  const gate=nextFundEligibility(state);
  if(!gate.eligible){alert('次号ファンドの条件が未達です。\n'+gate.reasons.join('\n'));return false;}
  if(state.pe.fundraising){alert('すでに資金調達を進めています。');return false;}
  const target=m23RoundMoney(targetSize,10000000);
  const gp=m23RoundMoney(gpCommit,1000000);
  if(target<500000000||target>1000000000000){alert('目標ファンド規模は5億円〜1兆円で設定してください。');return false;}
  const minGp=Math.max(5000000,m23RoundMoney(target*.005,1000000));
  const maxGp=m23RoundMoney(target*.20,1000000);
  if(gp<minGp||gp>maxGp){alert('個人GP出資額は目標ファンド規模の0.5%〜20%で設定してください。');return false;}
  if(state.personal.cash<gp*.10){alert('First Capital Callに備え、個人現金がGP出資約束額の10%以上必要です。');return false;}
  const fundNo=state.pe.nextFundNo;
  const c={
    id:'FR-'+fundNo+'-'+state.week,
    fundNo:fundNo,targetSize:target,gpCommit:gp,stage:'pre_marketing',
    startedWeek:state.week,firstCloseWeek:0,anchorInvestorId:null,
    prospectRound:0,lpProspects:[],history:[]
  };
  c.lpProspects=m23GenerateLPs(state,c,8);
  c.history.push({week:state.week,event:'pre_marketing',amount:0});
  state.pe.fundraising=c;
  log('第'+fundNo+'号ファンド資金調達を開始。目標 '+yen(target)+' / 個人GP出資 '+yen(gp)+'。','major');
  save();render();return true;
}
function m23SolicitationScore(c,lp){
  const track=trackScore(state),trust=Number(state.pe.lpTrust)||50,network=Number(state.pe.network)||0;
  const jitter=(u01(String(state.seed)+':lp-score:'+c.fundNo+':'+lp.id)-.5)*12;
  return lp.relationship*.52+trust*.24+network*.10+track*.14+jitter;
}
function m23SolicitLP(id){
  ensureM23State(state);
  const c=state.pe.fundraising,lp=c&&c.lpProspects.find(function(x){return x.id===id;});
  if(!c||!lp||lp.status!=='prospect')return false;
  const score=m23SolicitationScore(c,lp);
  lp.lastContactWeek=state.week;
  if(score>=38){
    lp.status='interested';
    lp.relationship=clamp(lp.relationship+3,0,100);
    log(lp.name+' が第'+c.fundNo+'号ファンドに関心。DDQへ進めます。');
  }else{
    lp.status='passed';
    lp.relationship=clamp(lp.relationship-2,0,100);
    log(lp.name+' は今回の出資検討を見送り。');
  }
  save();render();return lp.status==='interested';
}
function m23RunDdq(){
  ensureM23State(state);
  const c=state.pe.fundraising;if(!c)return false;
  const interested=c.lpProspects.filter(function(x){return x.status==='interested';});
  if(!interested.length){alert('まずLPへ出資を打診してください。');return false;}
  for(const lp of interested){
    const score=m23SolicitationScore(c,lp)+u01(String(state.seed)+':ddq:'+c.fundNo+':'+lp.id)*8;
    lp.status=score>=42?'approved':'passed';
    lp.relationship=clamp(lp.relationship+(lp.status==='approved'?4:-2),0,100);
  }
  if(m23FundraiseStageIndex(c.stage)<1)c.stage='ddq';
  c.history.push({week:state.week,event:'ddq',approved:c.lpProspects.filter(function(x){return x.status==='approved';}).length});
  log('第'+c.fundNo+'号ファンド DDQ完了。承認LP '+c.lpProspects.filter(function(x){return x.status==='approved';}).length+'社。','major');
  save();render();return true;
}
function m23CommitLP(c,lp,isAnchor){
  if(!c||!lp||lp.status!=='approved')return false;
  const remaining=Math.max(0,c.targetSize-m23FundraiseTotal(c));
  if(remaining<=0)return false;
  const relationshipFactor=.82+clamp(lp.relationship,0,100)/500;
  const amount=Math.min(remaining,m23RoundMoney(lp.ticket*relationshipFactor,10000000));
  if(amount<10000000)return false;
  lp.status='committed';lp.commitment=amount;
  lp.sideLetter=isAnchor?'共同投資優先権 / 四半期レポート':'';
  lp.relationship=clamp(lp.relationship+(isAnchor?7:3),0,100);
  return true;
}
function m23SelectAnchor(id){
  ensureM23State(state);
  const c=state.pe.fundraising,lp=c&&c.lpProspects.find(function(x){return x.id===id;});
  if(!c||!lp||c.anchorInvestorId||lp.status!=='approved')return false;
  if(!m23CommitLP(c,lp,true))return false;
  c.anchorInvestorId=lp.id;c.stage='anchor';
  c.history.push({week:state.week,event:'anchor',lpId:lp.id,amount:lp.commitment});
  log(lp.name+' がAnchor LPとして '+yen(lp.commitment)+' をコミット。','major');
  save();render();return true;
}
function m23InviteLP(id){
  ensureM23State(state);
  const c=state.pe.fundraising,lp=c&&c.lpProspects.find(function(x){return x.id===id;});
  if(!c||!lp||!c.anchorInvestorId){alert('先にAnchor LPを1社決めてください。');return false;}
  if(!m23CommitLP(c,lp,false))return false;
  c.history.push({week:state.week,event:'lp_commit',lpId:lp.id,amount:lp.commitment});
  log(lp.name+' が '+yen(lp.commitment)+' を出資約束。');
  save();render();return true;
}
function m23FirstClose(){
  ensureM23State(state);
  const c=state.pe.fundraising;if(!c)return false;
  const total=m23FundraiseTotal(c),lps=m23CommittedLPs(c);
  if(!c.anchorInvestorId){alert('Anchor LPが必要です。');return false;}
  if(lps.length<2){alert('First Closeには複数の外部投資家が必要です。');return false;}
  if(total<c.targetSize*.35){alert('First Closeには目標額の35%以上の出資約束が必要です。');return false;}
  c.stage='first_close';c.firstCloseWeek=state.week;
  c.history.push({week:state.week,event:'first_close',amount:total});
  log('第'+c.fundNo+'号ファンド First Close。出資約束 '+yen(total)+'。','major');
  save();render();return true;
}
function m23ExpandLPUniverse(){
  ensureM23State(state);
  const c=state.pe.fundraising;if(!c)return false;
  c.prospectRound=(Number(c.prospectRound)||0)+1;
  c.lpProspects.push.apply(c.lpProspects,m23GenerateLPs(state,c,4));
  c.history.push({week:state.week,event:'new_lp_pipeline',round:c.prospectRound});
  state.pe.network=clamp((Number(state.pe.network)||0)+1,0,100);
  log('追加LP候補を4社開拓。');
  save();render();return true;
}
function m23FinalClose(){
  ensureM23State(state);
  const c=state.pe.fundraising;if(!c)return false;
  if(!c.firstCloseWeek){alert('先にFirst Closeを完了してください。');return false;}
  const lps=m23CommittedLPs(c),commitments=m23FundraiseTotal(c);
  if(lps.length<2){alert('複数の外部投資家が必要です。');return false;}
  if(commitments<c.targetSize*.70){alert('Final Closeには目標額の70%以上の出資約束が必要です。');return false;}
  const gpCommit=c.gpCommit,initialCall=commitments*.10,initialGp=gpCommit*.10;
  if(state.personal.cash<initialGp){alert('First Capital Callに必要な個人資金 '+yen(initialGp)+' が不足しています。');return false;}
  const fundNo=c.fundNo;
  const f={
    id:'F'+fundNo,number:fundNo,size:commitments,commitments:commitments,targetSize:c.targetSize,
    gpCommit:gpCommit,lpCommit:Math.max(0,commitments-gpCommit),
    cash:0,calledCapital:0,gpContributed:0,lpContributed:0,uncalledCommitment:commitments,
    distributed:0,invested:0,coInvestUsed:0,startWeek:state.week,investmentEndWeek:state.week+260,endWeek:state.week+520,
    slots:fundNo<3?3:fundNo<5?5:7,ddUsedYear:0,ddYear:Math.floor((state.week-1)/52)+1,realizedGain:0,
    managementFeeRate:.02,managementFeesPaid:0,carryRate:.20,preferredReturn:.08,carryPaid:0,gpDistributions:0,reserveTarget:.15,
    capitalCallHistory:[],distributionHistory:[],status:'investing',
    fundraisingStage:'final_close',fundraisingStartedWeek:c.startedWeek,firstCloseWeek:c.firstCloseWeek,finalCloseWeek:state.week,
    anchorInvestorId:c.anchorInvestorId,
    lpInvestors:lps.map(function(x){return {id:x.id,name:x.name,type:x.type,commitment:x.commitment,relationship:x.relationship,sideLetter:x.sideLetter||''};})
  };
  state.pe.funds.push(f);state.pe.nextFundNo++;
  if(!callFundCapital(f,initialCall,'first-capital-call')){
    state.pe.funds.pop();state.pe.nextFundNo--;return false;
  }
  c.stage='final_close';c.finalCloseWeek=state.week;c.finalCommitments=commitments;
  c.history.push({week:state.week,event:'final_close',amount:commitments});
  state.pe.fundraiseHistory.push(JSON.parse(JSON.stringify(c)));
  state.pe.fundraising=null;
  log('第'+fundNo+'号ファンド Final Close。総コミット '+yen(commitments)+' / GP '+yen(gpCommit)+' / LP '+yen(commitments-gpCommit)+'。','major');
  save();render();return true;
}

function m23AutoExpand(s,id,u,policy){
  const mandate=M21_EXPANSION[u.expansionMandate]||M21_EXPANSION.off;
  if(u.expansionMandate==='off'||id==='productVentures')return false;
  if(managementTier(s)<1){u.lastExpansionDecision='見送り: Manager委任の組織レベル未達';return false;}
  if(u.lastExpansionWeek&&s.week-u.lastExpansionWeek<13){u.lastExpansionDecision='見送り: 前回出店から13週未満';return false;}
  const stores=s.company.stores.filter(function(x){return x.businessID===id;});
  if(stores.length){
    const rev=stores.reduce(function(a,x){return a+(Number(x.lastRevenue)||0);},0);
    const profit=stores.reduce(function(a,x){return a+(Number(x.lastProfit)||0);},0);
    const margin=rev>0?profit/rev:-1;
    const policyAdjust={premium:.02,growth:-.03,margin:.04,share:-.04,cash:.10}[policy.mode]||0;
    const coo=m21ExecFactor(s,'COO');
    const requiredMargin=mandate.margin+policyAdjust-coo*.015;
    if(margin<requiredMargin){u.lastExpansionDecision='見送り: 利益率 '+pct(margin)+' / 必要 '+pct(requiredMargin);return false;}
  }
  const site=m21BestSite(s,id);
  if(!site){u.lastExpansionDecision='見送り: 候補物件なし';return false;}
  if(site.fit<mandate.fit){u.lastExpansionDecision='見送り: 立地適合 '+Math.round(site.fit)+' / 必要 '+mandate.fit;return false;}
  const authority=Math.max(0,Number(u.capitalBudget)||0);
  if(site.total>authority){u.lastExpansionDecision='見送り: 物件取得額 '+yen(site.total)+' が1件投資上限 '+yen(authority)+' を超過';return false;}
  const cfo=m21ExecFactor(s,'CFO');
  const reserve=Math.max(3000000,(Number(u.weeklyBudget)||0)*13,site.total*mandate.reserve*(1-cfo*.08));
  if(s.company.cash-site.total<reserve){u.lastExpansionDecision='見送り: 出店後の会社現金余力不足';return false;}
  const first=stores.length===0;
  const ok=m21OpenDelegatedStore(s,id,site,u);
  if(ok)u.lastExpansionDecision=(first?'初号店を自動出店: ':'自動出店: ')+site.region+'・'+site.district+' / '+yen(site.total);
  return ok;
}

applyDelegatedPolicies=function(s){
  ensureM23State(s);s.management.delegationLevel=managementTier(s);
  for(const id of Object.keys(s.company.businesses||{})){
    const b=s.company.businesses[id],policy=policyFor(s,id),preset=POLICY_PRESETS[policy.mode],u=businessUnitFor(s,id);
    const cfg=PHASE9_AUTONOMY[u.autonomy]||PHASE9_AUTONOMY.low;
    const review=m21ReviewEffect(u),coo=m21ExecFactor(s,'COO'),cmo=m21ExecFactor(s,'CMO');
    if(policy.delegated&&preset){
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
      const policyReviewEvery=PHASE9_REVIEW[u.reviewCadence]&&PHASE9_REVIEW[u.reviewCadence].weeks||4;
      if(s.week-(u.lastReviewWeek||0)>=policyReviewEvery)u.lastReviewWeek=s.week;
    }
    const expansionReviewEvery=PHASE9_REVIEW[u.reviewCadence]&&PHASE9_REVIEW[u.reviewCadence].weeks||4;
    if(u.expansionMandate!=='off'&&s.week-(u.lastAutoExpansionReviewWeek||0)>=expansionReviewEvery){
      u.lastAutoExpansionReviewWeek=s.week;
      m23AutoExpand(s,id,u,policy);
    }
  }
};

function m23StartTurnaround(id){
  ensureM23State(state);
  const p=state.pe.portfolio.find(function(x){return x.id===id;});
  const f=state.pe.funds.find(function(x){return x.id===(p&&p.fundId);});
  if(!p||!f||p.status!=='held')return false;
  if(p.turnaround&&p.turnaround.status==='in_progress'){alert('この投資先は再建中です。');return false;}
  if(p.turnaround&&p.turnaround.status==='completed'){alert('この投資先は再建プログラムを完了済みです。');return false;}
  const base=Number(p.entryValue)||Number(p.value)||1000000000;
  const cost=m23RoundMoney(Math.max(30000000,Math.min(150000000,base*.025)),1000000);
  if(typeof ensureFundLiquidity==='function'&&!ensureFundLiquidity(f,cost,'portfolio-turnaround'))return false;
  if(f.cash<cost){alert('再建に必要なファンド現金 '+yen(cost)+' が不足しています。');return false;}
  f.cash-=cost;f.invested+=cost;
  p.equityInvested=(Number(p.equityInvested)||0)+cost;
  p.fundCostBasis=(Number(p.fundCostBasis)||0)+cost;
  p.turnaround={status:'in_progress',startWeek:state.week,completeWeek:state.week+26,cost:cost,outcome:null};
  log(p.name+': 26週間の再建プログラムを開始。追加投資 '+yen(cost)+'。','major');
  save();render();return true;
}
function m23ServiceTurnarounds(s){
  ensureM23State(s);
  for(const p of s.pe.portfolio||[]){
    const t=p.turnaround;
    if(!t||t.status!=='in_progress'||t.completeWeek>s.week||p.status!=='held')continue;
    const quality=Number(p.quality)||50,risk=Number(p.risk)||50;
    const failureRisk=clamp(.28+(risk-50)/250-(quality-50)/300,.12,.45);
    const full=u01('m23-turnaround:'+p.id+':'+t.startWeek)>=failureRisk;
    const factor=full?1:.5;
    p.quality=clamp(quality+12*factor,0,100);
    p.risk=clamp(risk-18*factor,0,100);
    p.margin=clamp((Number(p.margin)||.15)+.025*factor,.03,.40);
    p.organicGrowth=clamp((Number(p.organicGrowth)||.03)+.015*factor,-.10,.25);
    p.ebitda=Math.max(0,(Number(p.ebitda)||0)*(1+.12*factor));
    p.improvement=clamp((Number(p.improvement)||0)+25*factor,0,100);
    t.status='completed';t.completedWeek=s.week;t.outcome=full?'full':'partial';t.effectFactor=factor;
    log(p.name+': 再建プログラム '+(full?'完了':'一部達成')+'。EBITDA・品質・リスク構造を改善。',full?'good':'major');
  }
}
servicePE=function(s){
  _m23ServicePE(s);
  m23ServiceTurnarounds(s);
};

function m23RemoveEntryPanel(html){
  const marker='<section class="card m22-business-entry">';
  let at=html.indexOf(marker);
  while(at>=0){
    const end=html.indexOf('</section>',at);
    if(end<0)break;
    html=html.slice(0,at)+html.slice(end+'</section>'.length);
    at=html.indexOf(marker);
  }
  return html;
}
operations=function(){
  let html=_m23Operations();
  html=m23RemoveEntryPanel(html);
  html=html.replace('data-add-business="realEstateAgency">参入</button>','data-add-business="realEstateAgency">参入 · 75万円</button>');
  return html;
};

function m23StageTrack(c){
  const active=m23FundraiseStageIndex(c.stage);
  return '<div class="m23-stage-track">'+M23_FUNDRAISE_STAGES.map(function(x,i){
    return '<span class="'+(i<active?'done':i===active?'active':'')+'">'+(i<active?'✓ ':'')+x[1]+'</span>';
  }).join('')+'</div>';
}
function m23ProspectRow(c,lp){
  let action='';
  if(lp.status==='prospect')action='<button class="btn" data-m23-solicit="'+lp.id+'">出資を打診</button>';
  else if(lp.status==='interested')action='<span class="pill warn">DDQ待ち</span>';
  else if(lp.status==='approved'&&!c.anchorInvestorId)action='<button class="btn primary" data-m23-anchor="'+lp.id+'">Anchor LPに指名</button>';
  else if(lp.status==='approved')action='<button class="btn" data-m23-commit-lp="'+lp.id+'">出資を依頼</button>';
  else if(lp.status==='committed')action='<strong class="positive">'+yen(lp.commitment)+'</strong>';
  else action='<span class="pill">見送り</span>';
  return '<div class="m23-lp-row"><div><b>'+lp.name+'</b><span>'+lp.type+' · 関係 '+Math.round(lp.relationship)+' · 想定枠 '+yen(lp.ticket)+'</span>'+
    (lp.sideLetter?'<small>'+lp.sideLetter+'</small>':'')+'</div><div>'+action+'</div></div>';
}
function m23FundraisingPanel(){
  ensureM23State(state);
  const c=state.pe.fundraising,gate=nextFundEligibility(state);
  if(!c){
    if(!gate.eligible)return '';
    const target=m23DefaultFundTarget(state),gp=m23RoundMoney(target*.0125,1000000);
    return '<section class="card m23-fundraise"><div class="section-row"><div><h2>第'+state.pe.nextFundNo+'号ファンド 資金調達</h2><p class="sub">Pre-Marketing → DDQ → Anchor LP → First Close → Final Closeの順に進めます。個人で約束するGP出資額は自分で決められます。</p></div><span class="pill">段階調達</span></div>'+
      '<div class="m23-fund-inputs"><label>目標ファンド規模<small>最終的に集めたい総額</small><input type="number" inputmode="numeric" step="100000000" min="500000000" max="1000000000000" value="'+target+'" data-m23-target-size></label>'+
      '<label>個人GP出資額<small>あなた個人がファンドへ出資を約束する総額</small><input type="number" inputmode="numeric" step="1000000" min="'+Math.max(5000000,m23RoundMoney(target*.005,1000000))+'" max="'+m23RoundMoney(target*.20,1000000)+'" value="'+gp+'" data-m23-gp-commit></label></div>'+
      '<div class="m23-fund-preview"><span>初回払込の個人負担目安 <b>'+yen(gp*.10)+'</b></span><span>残りは複数の外部投資家（LP）へ募集</span></div>'+
      '<button class="btn primary wide" data-m23-start-fundraise>資金調達を開始</button></section>';
  }
  const total=m23FundraiseTotal(c),external=Math.max(0,total-c.gpCommit),progress=clamp(total/Math.max(1,c.targetSize),0,1);
  const interested=c.lpProspects.filter(function(x){return x.status==='interested';}).length;
  const committed=m23CommittedLPs(c);
  return '<section class="card m23-fundraise"><div class="section-row"><div><h2>第'+c.fundNo+'号ファンド 資金調達</h2><p class="sub">複数LPを個別に募り、Anchor LPを決めて段階的にCloseします。</p></div><span class="pill live">'+M23_FUNDRAISE_STAGES[m23FundraiseStageIndex(c.stage)][1]+'</span></div>'+
    m23StageTrack(c)+
    '<div class="m23-fund-metrics"><div><small>目標額</small><b>'+yen(c.targetSize)+'</b></div><div><small>個人GP出資</small><b>'+yen(c.gpCommit)+'</b></div><div><small>LPコミット</small><b>'+yen(external)+'</b></div><div><small>総コミット</small><b>'+yen(total)+'</b></div></div>'+
    '<div class="progress"><i style="width:'+Math.round(progress*100)+'%"></i></div><p class="tiny">目標進捗 '+pct(progress)+' · First Close 35% / Final Close 70%</p>'+
    '<div class="m23-lp-list">'+c.lpProspects.map(function(lp){return m23ProspectRow(c,lp);}).join('')+'</div>'+
    '<div class="actions">'+(interested?'<button class="btn" data-m23-ddq>未審査LPのDDQを実施</button>':'')+
      '<button class="btn ghost" data-m23-expand-lps>LP候補を追加開拓</button>'+
      (c.anchorInvestorId&&committed.length>=2&&total>=c.targetSize*.35&&!c.firstCloseWeek?'<button class="btn primary" data-m23-first-close>First Close</button>':'')+
      (c.firstCloseWeek&&total>=c.targetSize*.70?'<button class="btn good" data-m23-final-close>Final Closeしてファンド設立</button>':'')+
    '</div></section>';
}
function m23InvestorRoster(){
  const f=currentFund();if(!f)return '';
  const rows=(f.lpInvestors||[]).map(function(lp){
    return '<div class="m23-investor-row"><div><b>'+lp.name+'</b><span>'+lp.type+(lp.sideLetter?' · '+lp.sideLetter:'')+'</span></div><strong>'+yen(lp.commitment)+'</strong></div>';
  }).join('');
  if(!rows)return '<section class="card m23-investors"><h2>出資者構成</h2><p class="sub">このファンドは旧方式で組成されたため、外部投資家は集約表示です。</p><div class="m23-investor-row"><div><b>外部投資家プール</b><span>既存LP</span></div><strong>'+yen(f.lpCommit||0)+'</strong></div></section>';
  return '<section class="card m23-investors"><div class="section-row"><div><h2>出資者構成</h2><p class="sub">GPと複数LPのコミットメントを個別に管理します。</p></div><span class="pill">'+rows.length+' LP</span></div>'+
    '<div class="m23-investor-row gp"><div><b>あなた / GP</b><span>個人出資約束</span></div><strong>'+yen(f.gpCommit)+'</strong></div>'+rows+'</section>';
}
function m23ReplaceHeadingSection(html,heading,replacement){
  const h=html.indexOf('<h2>'+heading+'</h2>');if(h<0)return html;
  const start=html.lastIndexOf('<section',h),end=html.indexOf('</section>',h);
  if(start<0||end<0)return html;
  return html.slice(0,start)+replacement+html.slice(end+'</section>'.length);
}
function m23InjectTurnaroundButtons(html){
  for(const p of state.pe.portfolio.filter(function(x){return x.status==='held';})){
    const token='data-exit-port="'+p.id+'"',at=html.indexOf(token);
    if(at<0)continue;
    const start=html.lastIndexOf('<button',at);if(start<0)continue;
    const t=p.turnaround;
    let btn='';
    if(t&&t.status==='in_progress')btn='<button class="btn m23-turnaround" disabled>再建中 · 第'+t.completeWeek+'週完了</button>';
    else if(t&&t.status==='completed')btn='<button class="btn m23-turnaround" disabled>再建完了</button>';
    else btn='<button class="btn m23-turnaround" data-m23-turnaround="'+p.id+'">再建</button>';
    html=html.slice(0,start)+btn+html.slice(start);
  }
  return html;
}
peView=function(){
  ensureM23State(state);
  let html=_m23PeView();
  if(!state.pe.unlocked)return html;
  html=html.replace(/<button class="btn primary" data-act="raiseFund">次号ファンドを組成<\/button>/g,'');
  let panel=m23FundraisingPanel();
  if(!(state.pe.funds||[]).length&&panel){
    const replaced=m23ReplaceHeadingSection(html,'第1号ファンドを作る',panel);
    if(replaced!==html){html=replaced;panel='';}
  }
  html=m23InjectTurnaroundButtons(html);
  const extra=(panel||'')+m23InvestorRoster();
  return html.replace('</main>',extra+'</main>');
};

bind=function(){
  _m23Bind();
  document.querySelectorAll('[data-m23-start-fundraise]').forEach(function(el){el.onclick=function(){
    const box=el.closest('.m23-fundraise'),target=box&&box.querySelector('[data-m23-target-size]'),gp=box&&box.querySelector('[data-m23-gp-commit]');
    if(target&&gp)m23StartFundraising(target.value,gp.value);
  };});
  document.querySelectorAll('[data-m23-solicit]').forEach(function(el){el.onclick=function(){m23SolicitLP(el.dataset.m23Solicit);};});
  document.querySelectorAll('[data-m23-ddq]').forEach(function(el){el.onclick=function(){m23RunDdq();};});
  document.querySelectorAll('[data-m23-anchor]').forEach(function(el){el.onclick=function(){m23SelectAnchor(el.dataset.m23Anchor);};});
  document.querySelectorAll('[data-m23-commit-lp]').forEach(function(el){el.onclick=function(){m23InviteLP(el.dataset.m23CommitLp);};});
  document.querySelectorAll('[data-m23-first-close]').forEach(function(el){el.onclick=function(){m23FirstClose();};});
  document.querySelectorAll('[data-m23-final-close]').forEach(function(el){el.onclick=function(){m23FinalClose();};});
  document.querySelectorAll('[data-m23-expand-lps]').forEach(function(el){el.onclick=function(){m23ExpandLPUniverse();};});
  document.querySelectorAll('[data-m23-turnaround]').forEach(function(el){el.onclick=function(){m23StartTurnaround(el.dataset.m23Turnaround);};});
};

if(state){ensureM23State(state);save();render();}
