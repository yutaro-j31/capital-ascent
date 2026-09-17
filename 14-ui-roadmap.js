'use strict';

// UI for roadmap systems. Keep information dense while preserving one-decision-per-screen flows.
const _roadmapOverview=overview;
const _roadmapOperations=operations;
const _roadmapMarket=market;
const _roadmapPeView=peView;
const _roadmapLegacy=legacy;
const _roadmapBind=bind;

function injectBeforeMainClose(html,extra){const i=html.lastIndexOf('</main>');return i>=0?html.slice(0,i)+extra+html.slice(i):html+extra;}
function signedYen(n){return `${n>=0?'+':'−'}${yen(Math.abs(n))}`;}
function eventLabel(type){return ({raw_materials:'原材料高',labor_shortage:'人手不足',station_redevelopment:'駅前再開発',social_buzz:'SNS需要',cyber_incident:'システム障害'})[type]||type;}
function policyLabel(mode){return ({manual:'Manual',premium:'Premium',growth:'Growth',margin:'Margin',share:'Market Share',cash:'Cash Preservation'})[mode]||mode;}

function briefPanel(){
  const b=state.history?.briefs?.[state.history.briefs.length-1];
  if(!b)return `<section class="card roadmap-card"><h2>Management Brief</h2><p class="sub">1週進めると、売上・利益が変化した理由をここに表示します。</p></section>`;
  const drivers=(b.drivers||[]).map(x=>`<div class="bridge-row"><span>${x.label}</span><b class="${x.amount>=0?'positive':'negative'}">${signedYen(x.amount)}</b></div>`).join('');
  const risks=(b.risks||[]).map(x=>`<span class="risk-chip">${x}</span>`).join('')||'<span class="pill live">重大リスクなし</span>';
  return `<section class="card roadmap-card"><div class="section-row"><div><h2>W${b.week} Management Brief</h2><p class="sub">結果ではなく、変化の理由を見る。</p></div><span class="pill">週次</span></div><div class="brief-kpis"><div><small>売上</small><b>${yen(b.revenue)}</b><em class="${b.revenueDelta>=0?'positive':'negative'}">${signedYen(b.revenueDelta)}</em></div><div><small>利益</small><b>${yen(b.profit)}</b><em class="${b.profitDelta>=0?'positive':'negative'}">${signedYen(b.profitDelta)}</em></div></div><div class="bridge-list">${drivers||'<div class="sub">主要ドライバーを蓄積中です。</div>'}</div><div class="risk-row">${risks}</div></section>`;
}

overview=function(){
  let html=_roadmapOverview();
  const events=activeEvents(state);
  const eventPanel=events.length?`<section class="card"><div class="section-row"><h2>外部環境</h2><span class="pill warn">ACTIVE ${events.length}</span></div><div class="event-list">${events.map(e=>`<div class="event-row"><b>${eventLabel(e.type)}</b><span>W${e.endWeek}まで · 投資能力によって影響が変化</span></div>`).join('')}</div></section>`:'';
  return injectBeforeMainClose(html,`<div class="grid roadmap-grid">${briefPanel()}${eventPanel}</div>`);
};

operations=function(){
  let html=_roadmapOperations();
  if(!selectedBusiness||selectedMapBusiness||selectedStoreDetail)return html;
  const policy=policyFor(state,selectedBusiness),tier=managementTier(state);
  const active=state.projects.filter(p=>p.scope==='business'&&p.targetId===selectedBusiness&&p.status==='in_progress');
  const options=['manual','premium','growth','margin','share','cash'].map(mode=>`<option value="${mode}" ${policy.mode===mode?'selected':''} ${mode!=='manual'&&tier<1?'disabled':''}>${policyLabel(mode)}</option>`).join('');
  const projectRows=active.map(p=>`<div class="project-row"><div><b>${p.kind.toUpperCase()} 改善</b><span>W${p.startWeek}開始 → W${p.completeWeek}完成</span></div><strong>${Math.max(0,p.completeWeek-state.week)}週</strong></div>`).join('')||'<p class="sub">進行中の投資プロジェクトはありません。投資効果は即時ではなく、完成後に発現します。</p>';
  const extra=`<div class="grid roadmap-grid"><section class="card half"><h2>経営ポリシー</h2><div class="control"><div><div class="name">委任レベル ${tier}/4</div><div class="desc">3店舗からManager委任。規模拡大で役割を店舗操作から資本配分へ移します。</div></div><select data-policy-business="${selectedBusiness}">${options}</select></div></section><section class="card half"><div class="section-row"><h2>Projects</h2><span class="pill">${active.length} active</span></div><div class="project-list">${projectRows}</div></section></div>`;
  return injectBeforeMainClose(html,extra);
};

market=function(){
  let html=_roadmapMarket();
  if(marketPane!=='capital')return html;
  ensureAdvancedState(state);
  const t=nextSubsidiaryCandidate(state);
  const held=state.company.subsidiaryPortfolio.filter(x=>x.status==='held');
  const target=`<section class="card half"><div class="section-row"><h2>M&A Target</h2><span class="pill">LIVE</span></div><h3>${t.name}</h3><div class="kpis"><div class="kpi"><div class="label">Revenue</div><div class="value">${yen(t.revenue)}</div></div><div class="kpi"><div class="label">EBITDA</div><div class="value">${yen(t.ebitda)}</div></div><div class="kpi"><div class="label">Debt</div><div class="value">${yen(t.debt)}</div></div><div class="kpi"><div class="label">Growth</div><div class="value">${pct(t.growth)}</div></div></div><p class="sub">買収後は売上・利益・負債・企業価値が毎週動き、親会社へ連結されます。</p></section>`;
  const port=`<section class="card half"><div class="section-row"><h2>Subsidiaries</h2><span class="pill live">${held.length} held</span></div><div class="store-list">${held.map(x=>`<div class="store-card"><div><b>${x.name}</b><span>${PILLARS[x.businessID]?.name||x.businessID} · EBITDA ${yen(x.ebitda)} · Debt ${yen(x.debt)}</span></div><div class="store-profit ${x.lastProfit>=0?'positive':'negative'}">${yen(x.lastProfit||0)}</div></div>`).join('')||'<p class="sub">まだ実体のある子会社ポートフォリオはありません。</p>'}</div></section>`;
  return injectBeforeMainClose(html,`<div class="grid roadmap-grid">${target}${port}</div>`);
};

peView=function(){
  let html=_roadmapPeView();if(!state.pe.unlocked)return html;
  const held=state.pe.portfolio.filter(x=>x.status==='held');
  const rows=held.map(p=>`<div class="underwriting-row"><div><b>${p.name}</b><span>Q${Math.round(p.quality||0)} / R${Math.round(p.risk||0)} · Entry ${(p.entryMultiple||0).toFixed(1)}x → Mark ${((p.value||0)/Math.max(1,p.ebitda||1)).toFixed(1)}x</span></div><div><strong>${((Math.max(0,(p.value||0)-(p.debt||0)+(p.cash||0)))/Math.max(1,p.equityInvested||1)).toFixed(2)}x</strong><small>Equity MOIC</small></div></div>`).join('');
  return injectBeforeMainClose(html,`<section class="card roadmap-card"><div class="section-row"><h2>Underwriting Monitor</h2><span class="pill">DD → Debt → Ops → Exit</span></div>${rows||'<p class="sub">案件取得後、DDで得たQuality/Riskが業績・施策成功率・Debt Capacity・Exitへ接続されます。</p>'}</section>`);
};

legacy=function(){
  let html=_roadmapLegacy();
  const extra=`<section class="card roadmap-card"><h2>Save Safety</h2><p class="sub">Schema V${SAVE_SCHEMA_VERSION} · primary + 2世代バックアップ。旧 capital_ascent_v1 はmigrationして維持します。</p><div class="actions"><button class="btn" data-save-export>セーブを書き出す</button><button class="btn" data-save-import>セーブを読み込む</button></div><input type="file" accept="application/json" data-save-file hidden></section>`;
  return injectBeforeMainClose(html,extra);
};

bind=function(){
  _roadmapBind();
  document.querySelectorAll('[data-policy-business]').forEach(el=>el.onchange=()=>setBusinessPolicy(el.dataset.policyBusiness,el.value));
  document.querySelectorAll('[data-save-export]').forEach(el=>el.onclick=()=>downloadSaveExport());
  document.querySelectorAll('[data-save-import]').forEach(el=>el.onclick=()=>document.querySelector('[data-save-file]')?.click());
  document.querySelectorAll('[data-save-file]').forEach(el=>el.onchange=()=>{
    const file=el.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{const r=importSaveText(String(reader.result||''));if(!r.ok)alert(`読み込み失敗: ${r.errors.join(', ')}`);else{alert('セーブを読み込みました。');render();}};reader.readAsText(file);
  });
};

render();
