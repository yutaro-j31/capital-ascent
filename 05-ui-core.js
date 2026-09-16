let selectedBusiness=null, marketPane='capital';

function topbar(){
  const profitClass=state.company.lastWeekProfit>=0?'positive':'negative';
  return `<header class="topbar"><div class="toprow"><div class="company-title"><b>${state.player.name}</b><span>CAPITAL ASCENT</span></div><div class="time-ctrl"><div class="week-badge"><b>Y${state.year} · W${state.week}</b><small>週次進行</small></div><button class="advance-btn" data-act="advance" aria-label="1週進める">▶</button></div></div><div class="metrics"><div class="metric"><small>会社現金</small><b>${yen(state.company.cash)}</b></div><div class="metric"><small>今週利益</small><b class="${profitClass}">${yen(state.company.lastWeekProfit)}</b></div><div class="metric"><small>個人純資産</small><b>${yen(personalNetWorth(state))}</b></div></div></header>`;
}

function nav(){
  const items=[['overview','⌂','ホーム'],['operations','▦','事業'],['market','↗','市場'],['pe','▤','PE'],['legacy','★','記録']];
  return `<nav class="nav">${items.map(([id,ic,l])=>`<button data-tab="${id}" class="${tab===id?'active':''}"><span class="ico">${ic}</span>${l}</button>`).join('')}</nav>`;
}

function overview(){
  const v=companyValue(state), ex=state.career.exitRecords.length;
  const active=Object.keys(state.company.businesses).length;
  const storeCount=state.company.stores.length;
  return `<main><div class="hero"><h1>${state.player.name}</h1><div class="strap">会社を育てる。Exitする。資本を再配分する。まずは目の前の事業を1つずつ強くする。</div><div class="hero-row"><div class="hero-kpi"><small>企業価値</small><b>${yen(v)}</b></div><button class="btn primary" data-act="advance13">13週進める</button></div></div>
  <div class="hub-grid">
    <button class="hub-tile" data-tab="operations"><div><div class="hub-icon">🏬</div><b>事業を管理</b><span>価格・広告・投資・出店を事業ごとに操作</span></div><div class="hub-value">${active}事業 / ${storeCount}拠点</div></button>
    <button class="hub-tile" data-tab="market"><div><div class="hub-icon">📈</div><b>資本市場</b><span>IPO、借入、M&A、小型株投資</span></div><div class="hub-value">負債 ${yen(state.company.debt)}</div></button>
    <button class="hub-tile" data-tab="pe"><div><div class="hub-icon">💼</div><b>PEファーム</b><span>Exit後にファンド組成・LBO・経営改善</span></div><div class="hub-value">${state.pe.unlocked?'OPEN':'LOCKED'}</div></button>
    <button class="hub-tile" data-tab="legacy"><div><div class="hub-icon">🏆</div><b>キャリア</b><span>Exit履歴・称号・財団・長期目標</span></div><div class="hub-value">Exit ${ex}回</div></button>
  </div>
  <div class="grid" style="margin-top:10px"><section class="card half"><h2>会社の現在地</h2><div class="kpis"><div class="kpi"><div class="label">売上 / 週</div><div class="value">${yen(state.company.lastWeekRevenue)}</div></div><div class="kpi"><div class="label">利益 / 週</div><div class="value ${state.company.lastWeekProfit>=0?'positive':'negative'}">${yen(state.company.lastWeekProfit)}</div></div><div class="kpi"><div class="label">政策金利</div><div class="value">${pct(state.macro.rate)}</div></div><div class="kpi"><div class="label">景気</div><div class="value">${state.macro.cycle.toFixed(2)}</div></div></div><div class="actions"><button class="btn good" data-act="ipo" ${state.company.public?'disabled':''}>IPO</button><button class="btn danger" data-act="sellCompany">会社売却</button></div><p class="sub">IPO条件: 企業価値8,000万円以上＋直近黒字。会社売却: 企業価値1.2億円以上＋80週以上。</p></section>
  <section class="card half"><h2>最近の出来事</h2><div class="news">${state.news.slice(0,6).map(n=>`<div class="news-item ${n.type||''}"><span class="tiny">W${n.week}</span> ${n.msg}</div>`).join('')||'<div class="sub">まだイベントはありません。</div>'}</div></section></div></main>`;
}

function businessSummary(p){
  const b=state.company.businesses[p.id];
  const stores=state.company.stores.filter(x=>x.businessID===p.id);
  const revenue=stores.reduce((a,s)=>a+(s.lastRevenue||0),0);
  const profit=stores.reduce((a,s)=>a+(s.lastProfit||0),0);
  const extra=p.id==='productVentures'&&b&&b.product?`MAU ${Math.round(b.product.mau||0).toLocaleString()}`:`${stores.length}拠点`;
  return {b,stores,revenue,profit,extra};
}

function operations(){
  if(selectedBusiness && !PILLARS[selectedBusiness]) selectedBusiness=null;
  if(!selectedBusiness){
    const rows=Object.entries(PILLARS).map(([id,p])=>{
      const x=businessSummary({...p,id});
      if(!x.b) return `<div class="business-row inactive"><div class="business-icon">${p.icon}</div><div class="business-main"><b>${p.name}</b><span>${p.desc}</span></div><div class="business-numbers"><button class="btn primary" data-add-business="${id}">参入</button></div></div>`;
      return `<button class="business-row" data-manage-business="${id}"><div class="business-icon">${p.icon}</div><div class="business-main"><b>${p.name}</b><span>${x.extra} · 品質 ${x.b.quality.toFixed(0)} · ブランド ${x.b.brand.toFixed(0)}</span></div><div class="business-numbers"><strong class="${x.profit>=0?'positive':'negative'}">${yen(x.profit)}</strong><small>今週利益</small></div></button>`;
    }).join('');
    return `<main><div class="screen-head"><div class="copy"><h1>事業</h1><p>管理したい事業を選択してください。設定は事業ごとの画面に集約しています。</p></div></div><div class="business-list">${rows}</div></main>`;
  }

  const p={...PILLARS[selectedBusiness],id:selectedBusiness};
  const {b,stores,revenue,profit}=businessSummary(p);
  if(!b){selectedBusiness=null;return operations();}
  const priceStep=Math.max(10,Math.round((p.price||100)/20/10)*10);
  const adStep=100000;
  const strategyControl=p.id==='conveni'?`<div class="control"><div><div class="name">PB比率</div><div class="desc">粗利と廃棄リスクのバランス</div></div><select data-business-field="pbRatio" data-business="${p.id}"><option value="0" ${b.pbRatio===0?'selected':''}>0%</option><option value="0.15" ${b.pbRatio===.15?'selected':''}>15%</option><option value="0.3" ${b.pbRatio===.3?'selected':''}>30%</option><option value="0.45" ${b.pbRatio===.45?'selected':''}>45%</option></select></div>`:p.id==='gym'?`<div class="control"><div><div class="name">会員戦略</div><div class="desc">顧客構成と単価を調整</div></div><select data-business-field="gymStrategy" data-business="${p.id}"><option value="standard" ${b.gymStrategy==='standard'?'selected':''}>Standard</option><option value="offPeak" ${b.gymStrategy==='offPeak'?'selected':''}>Off-Peak</option><option value="premium" ${b.gymStrategy==='premium'?'selected':''}>Premium</option></select></div>`:'';
  const storeBlock=p.id==='productVentures'?`<section class="card"><h2>プロダクト</h2><p class="sub">店舗を持たない事業です。プロダクトの認知・登録・MAU・有料化は週次で進行します。</p>${b.product?`<div class="kpis"><div class="kpi"><div class="label">Awareness</div><div class="value">${Math.round(b.product.awareness||0).toLocaleString()}</div></div><div class="kpi"><div class="label">MAU</div><div class="value">${Math.round(b.product.mau||0).toLocaleString()}</div></div><div class="kpi"><div class="label">Paid</div><div class="value">${Math.round(b.product.paid||0).toLocaleString()}</div></div><div class="kpi"><div class="label">Tech Debt</div><div class="value">${(b.product.techDebt||0).toFixed(0)}</div></div></div>`:''}</section>`:`<section class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h2>拠点</h2><button class="btn primary" data-open-store="${p.id}">＋ 新規出店</button></div><div class="store-list">${stores.map(s=>`<div class="store-card"><div><b>${s.name}</b><span>${s.region} · 売上 ${yen(s.lastRevenue)} · ${Math.round(s.lastUnits).toLocaleString()} units</span></div><div class="store-profit ${s.lastProfit>=0?'positive':'negative'}">${yen(s.lastProfit)}</div></div>`).join('')||'<div class="sub">拠点がありません。</div>'}</div></section>`;

  return `<main><div class="screen-head"><button class="back" data-business-back>‹</button><div class="copy"><h1>${p.name}</h1><p>1つの事業だけに集中して意思決定します。</p></div></div><div class="business-banner"><div class="big-icon">${p.icon}</div><div><h2>${p.name}</h2><p>${p.desc}</p></div></div>
  <div class="grid"><section class="card"><h2>今週の成績</h2><div class="kpis"><div class="kpi"><div class="label">売上</div><div class="value">${yen(revenue)}</div></div><div class="kpi"><div class="label">利益</div><div class="value ${profit>=0?'positive':'negative'}">${yen(profit)}</div></div><div class="kpi"><div class="label">品質</div><div class="value">${b.quality.toFixed(0)}</div></div><div class="kpi"><div class="label">ブランド</div><div class="value">${b.brand.toFixed(0)}</div></div></div></section>
  <section class="card half"><h2>価格と集客</h2><div class="control"><div><div class="name">価格</div><div class="desc">需要と粗利の中心レバー</div></div><div class="stepper"><button data-step-business="${p.id}" data-field="price" data-delta="-${priceStep}">−</button><output>${yen(b.price)}</output><button data-step-business="${p.id}" data-field="price" data-delta="${priceStep}">＋</button></div></div><div class="control"><div><div class="name">広告 / 週</div><div class="desc">ブランドと需要を押し上げる</div></div><div class="stepper compact"><button data-step-business="${p.id}" data-field="adSpend" data-delta="-${adStep}">−</button><output>${yen(b.adSpend)}</output><button data-step-business="${p.id}" data-field="adSpend" data-delta="${adStep}">＋</button></div></div>${strategyControl}</section>
  <section class="card half"><h2>投資</h2><div class="invest-grid"><button class="invest-card" data-invest="quality" data-business="${p.id}"><b>品質を上げる</b><span>商品・サービスの魅力</span><strong>50万円</strong></button><button class="invest-card" data-invest="brand" data-business="${p.id}"><b>ブランド</b><span>認知と選好を強化</span><strong>50万円</strong></button><button class="invest-card" data-invest="efficiency" data-business="${p.id}"><b>効率化</b><span>オペレーション改善</span><strong>50万円</strong></button><button class="invest-card" data-invest="digital" data-business="${p.id}"><b>DX</b><span>デジタル能力を強化</span><strong>50万円</strong></button></div></section>${storeBlock}</div></main>`;
}

function market(){
  if(marketPane==='microcap') return microcap();
  return `<main><div class="screen-head"><div class="copy"><h1>市場</h1><p>会社の資本政策と個人の公開市場投資を切り替えます。</p></div></div><div class="segment"><button class="active" data-market-pane="capital">会社金融</button><button data-market-pane="microcap">小型株</button></div><div class="grid"><section class="card half"><h2>資本市場</h2><div class="kpis"><div class="kpi"><div class="label">公開会社</div><div class="value">${state.company.public?'YES':'NO'}</div></div><div class="kpi"><div class="label">Founder持分</div><div class="value">${pct(state.company.founderOwnership)}</div></div><div class="kpi"><div class="label">企業価値</div><div class="value">${yen(companyValue(state))}</div></div><div class="kpi"><div class="label">Exit履歴</div><div class="value">${state.career.exitRecords.length}</div></div></div><div class="actions"><button class="btn good" data-act="ipo" ${state.company.public?'disabled':''}>IPOを実行</button><button class="btn danger" data-act="sellCompany">会社を売却</button></div></section>
  <section class="card half"><h2>銀行・M&A</h2><div class="kpis"><div class="kpi"><div class="label">会社負債</div><div class="value">${yen(state.company.debt)}</div></div><div class="kpi"><div class="label">信用</div><div class="value">${state.company.credit.toFixed(0)}</div></div><div class="kpi"><div class="label">子会社</div><div class="value">${state.company.subsidiaries}</div></div><div class="kpi"><div class="label">個人現金</div><div class="value">${yen(state.personal.cash)}</div></div></div><div class="actions"><button class="btn" data-act="borrow">銀行借入</button><button class="btn" data-act="repay">返済</button><button class="btn primary" data-act="acquireSub">子会社をM&A</button><button class="btn danger" data-act="sellSub" ${state.company.subsidiaries<=0?'disabled':''}>子会社売却</button></div></section>
  <section class="card"><h2>Exit Record</h2>${state.career.exitRecords.length?`<div class="scroll"><table class="table"><tr><th>種類</th><th>週</th><th>実現額</th><th>企業価値</th></tr>${state.career.exitRecords.slice().reverse().map(x=>`<tr><td>${x.type}</td><td>${x.week}</td><td>${yen(x.realized)}</td><td>${yen(x.value)}</td></tr>`).join('')}</table></div>`:'<p class="sub">Exitを1回経験するとPEモードが永久解禁されます。</p>'}</section></div></main>`;
}
