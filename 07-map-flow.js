'use strict';

// Coffee-like location flow: business -> map -> property -> lease -> store detail.
let selectedMapBusiness = null;
let selectedMapProperty = null;
let selectedStoreDetail = null;
let selectedMapRegion = null;

const _baseOperations = operations;
const _baseBind = bind;

const DISTRICTS = {
  '東京':['丸の内','渋谷','新宿','恵比寿','上野','品川'],
  '神奈川':['横浜駅西口','みなとみらい','関内','武蔵小杉','川崎','藤沢'],
  '千葉':['千葉駅前','海浜幕張','船橋','柏','松戸','市川'],
  '埼玉':['大宮','浦和','川越','越谷','所沢','川口'],
  '大阪':['梅田','本町','難波','天王寺','京橋','心斎橋'],
  '愛知':['名駅','栄','金山','大曽根','星ヶ丘','豊田'],
  '福岡':['天神','博多駅前','薬院','大濠','西新','香椎'],
  '北海道':['札幌駅前','大通','すすきの','円山','琴似','新札幌']
};

function propertyCandidates(businessID, region){
  const p=PILLARS[businessID];
  if(!p || businessID==='productVentures') return [];
  const districts=DISTRICTS[region]||['駅前','中央','東口','西口','新都心','郊外'];
  const quarter=Math.floor((state.week-1)/13);
  return Array.from({length:8},(_,i)=>{
    const key=`site:${state.seed}:${businessID}:${region}:${quarter}:${i}`;
    const district=districts[hash32(key+':d')%districts.length];
    const traffic=.78+u01(key+':t')*.65;
    const rent=Math.round(p.fixed*(.55+u01(key+':r')*.95));
    const size=Math.round(35+u01(key+':s')*(businessID==='gym'?260:businessID==='realEstateAgency'?130:85));
    const frontage=Math.round(35+u01(key+':f')*65);
    const access=Math.round(40+u01(key+':a')*60);
    const competition=Math.round(18+u01(key+':c')*80);
    const fit=clamp(Math.round(48+traffic*24+frontage*.14+access*.12-competition*.12),35,98);
    const deposit=rent*(4+(hash32(key+':dep')%5));
    const x=10+u01(key+':x')*80;
    const y=12+u01(key+':y')*72;
    return {id:uid('site',key),businessID,region,district,traffic,rent,deposit,size,frontage,access,competition,fit,x,y,
      total:p.storeCost+deposit};
  }).sort((a,b)=>b.fit-a.fit);
}

function currentProperty(){
  if(!selectedMapBusiness||!selectedMapProperty)return null;
  return propertyCandidates(selectedMapBusiness,selectedMapRegion||state.ui.region).find(x=>x.id===selectedMapProperty)||null;
}

function mapGrade(n){return n>=88?'S':n>=78?'A':n>=66?'B':'C';}
function gradeClass(n){return n>=78?'live':n>=60?'warn':'bad';}

function propertyMapView(businessID){
  const p=PILLARS[businessID];
  if(!p)return _baseOperations();
  selectedMapRegion=selectedMapRegion||state.ui.region||REGIONS[0];
  const sites=propertyCandidates(businessID,selectedMapRegion);
  if(selectedMapProperty && !sites.some(x=>x.id===selectedMapProperty))selectedMapProperty=null;
  const chosen=currentProperty();
  const pins=sites.map((s,i)=>`<button class="map-pin ${chosen?.id===s.id?'selected':''}" style="left:${s.x.toFixed(1)}%;top:${s.y.toFixed(1)}%" data-map-property="${s.id}" aria-label="${s.district}の物件"><span>${i+1}</span><small>${mapGrade(s.fit)}</small></button>`).join('');
  const list=sites.map((s,i)=>`<button class="property-row ${chosen?.id===s.id?'selected':''}" data-map-property="${s.id}"><span class="property-rank">${i+1}</span><div><b>${s.district}</b><small>${s.size}㎡ · 人流 ${(s.traffic*100).toFixed(0)} · 競合 ${s.competition}</small></div><div><strong>${yen(s.rent)}</strong><small>/週</small></div></button>`).join('');
  const sheet=chosen?`<section class="property-sheet"><div class="sheet-grab"></div><div class="property-title"><div><span class="pill ${gradeClass(chosen.fit)}">立地 ${mapGrade(chosen.fit)}</span><h2>${chosen.district} ${chosen.size}㎡</h2><p>${selectedMapRegion} · ${p.name}向け候補物件</p></div><div class="site-score">${chosen.fit}<small>/100</small></div></div><div class="site-kpis"><div><small>家賃 / 週</small><b>${yen(chosen.rent)}</b></div><div><small>敷金</small><b>${yen(chosen.deposit)}</b></div><div><small>初期費用</small><b>${yen(chosen.total)}</b></div><div><small>人流指数</small><b>${(chosen.traffic*100).toFixed(0)}</b></div></div><div class="site-bars"><div><span>アクセス</span><i><b style="width:${chosen.access}%"></b></i><em>${chosen.access}</em></div><div><span>視認性</span><i><b style="width:${chosen.frontage}%"></b></i><em>${chosen.frontage}</em></div><div><span>競合の強さ</span><i class="dangerbar"><b style="width:${chosen.competition}%"></b></i><em>${chosen.competition}</em></div></div><button class="btn primary wide lease-btn" data-sign-lease="${chosen.id}">この物件で出店する · ${yen(chosen.total)}</button></section>`:'';
  return `<main class="map-screen"><div class="screen-head"><button class="back" data-map-back>‹</button><div class="copy"><h1>${p.name} · 出店</h1><p>地図からエリアを選び、物件条件を比較して出店します。</p></div></div><div class="region-strip">${REGIONS.map(r=>`<button class="${r===selectedMapRegion?'active':''}" data-map-region="${r}">${r}</button>`).join('')}</div><div class="city-map"><div class="map-label north">商業中心</div><div class="map-label east">住宅</div><div class="map-label south">駅・交通</div><div class="map-road r1"></div><div class="map-road r2"></div><div class="map-road r3"></div><div class="map-park"></div>${pins}<div class="map-legend"><span>物件ピンをタップ</span><b>${selectedMapRegion}</b></div></div><section class="card property-list-card"><div class="section-row"><h2>候補物件</h2><span class="pill">${sites.length}件</span></div><div class="property-list">${list}</div></section>${sheet}</main>`;
}

function storeDetailView(storeId){
  const s=state.company.stores.find(x=>x.id===storeId);
  if(!s){selectedStoreDetail=null;return _baseOperations();}
  const p=PILLARS[s.businessID], b=state.company.businesses[s.businessID];
  const effective=s.priceOverride??b.price;
  const unitsLabel=s.businessID==='gym'?'会員':s.businessID==='realEstateAgency'?'成約':'Units';
  const detail=s.property||{};
  return `<main><div class="screen-head"><button class="back" data-store-back>‹</button><div class="copy"><h1>${s.name}</h1><p>${s.region}${detail.district?' · '+detail.district:''} · ${p.name}</p></div></div><div class="store-hero"><div class="store-building"><span>${p.icon}</span><i></i><i></i><i></i></div><div><span class="pill live">営業中</span><h2>${s.name}</h2><p>${detail.size?detail.size+'㎡ · ':''}人流 ${(s.traffic*100).toFixed(0)} · 家賃 ${yen(s.rent)}/週</p></div></div><div class="grid"><section class="card"><h2>今週の店舗成績</h2><div class="kpis"><div class="kpi"><div class="label">売上</div><div class="value">${yen(s.lastRevenue)}</div></div><div class="kpi"><div class="label">利益</div><div class="value ${s.lastProfit>=0?'positive':'negative'}">${yen(s.lastProfit)}</div></div><div class="kpi"><div class="label">${unitsLabel}</div><div class="value">${Math.round(s.lastUnits||0).toLocaleString()}</div></div><div class="kpi"><div class="label">立地評価</div><div class="value">${detail.fit?mapGrade(detail.fit):'—'}</div></div></div></section><section class="card half"><h2>店舗設定</h2><div class="control"><div><div class="name">店舗価格</div><div class="desc">この店舗だけ価格を上書き</div></div><div class="stepper"><button data-store-step="${s.id}" data-field="price" data-delta="-${Math.max(10,Math.round(p.price/20/10)*10)}">−</button><output>${yen(effective)}</output><button data-store-step="${s.id}" data-field="price" data-delta="${Math.max(10,Math.round(p.price/20/10)*10)}">＋</button></div></div><div class="control"><div><div class="name">営業時間</div><div class="desc">需要と運営負荷に影響</div></div><div class="stepper compact"><button data-store-step="${s.id}" data-field="hours" data-delta="-1">−</button><output>${s.operatingHours}h</output><button data-store-step="${s.id}" data-field="hours" data-delta="1">＋</button></div></div><button class="btn ghost wide" data-store-price-reset="${s.id}">事業標準価格に戻す</button></section><section class="card half"><h2>物件</h2><div class="site-kpis"><div><small>家賃</small><b>${yen(s.rent)}</b></div><div><small>敷金</small><b>${yen(s.deposit)}</b></div><div><small>人流</small><b>${(s.traffic*100).toFixed(0)}</b></div><div><small>面積</small><b>${detail.size?detail.size+'㎡':'—'}</b></div></div>${detail.fit?`<div class="site-bars"><div><span>アクセス</span><i><b style="width:${detail.access}%"></b></i><em>${detail.access}</em></div><div><span>視認性</span><i><b style="width:${detail.frontage}%"></b></i><em>${detail.frontage}</em></div><div><span>競合</span><i class="dangerbar"><b style="width:${detail.competition}%"></b></i><em>${detail.competition}</em></div></div>`:'<p class="sub">旧セーブから引き継いだ店舗のため、詳細な物件情報はありません。</p>'}</section></div></main>`;
}

function openStoreFromProperty(businessID, siteId){
  const site=propertyCandidates(businessID,selectedMapRegion||state.ui.region).find(x=>x.id===siteId);
  const p=PILLARS[businessID];
  if(!site||!p)return;
  const count=state.company.stores.filter(x=>x.businessID===businessID).length;
  const needed=site.total;
  if(businessID==='gym'&&state.company.cash<needed+2000000){
    const loan=Math.min(15000000,needed+2000000-state.company.cash);
    if(loan>0){state.company.debt+=loan;state.company.cash+=loan;log(`ジム開業ローン ${yen(loan)} を実行。`);}
  }
  if(state.company.cash<needed){alert(`出店資金 ${yen(needed)} が必要です。`);return;}
  state.company.cash-=needed;
  const id=uid('store',`${state.seed}:${businessID}:${site.id}:${state.week}:${count+1}`);
  state.company.stores.push({id,businessID,region:site.region,name:`${site.district}${count+1}号店`,traffic:site.traffic,rent:site.rent,deposit:site.deposit,priceOverride:null,operatingHours:12,members:businessID==='gym'?50:0,capacity:businessID==='gym'?Math.max(260,Math.round(site.size*2.3)):0,pipeline:businessID==='realEstateAgency'?[]:null,lastRevenue:0,lastProfit:0,lastUnits:0,property:{district:site.district,size:site.size,frontage:site.frontage,access:site.access,competition:site.competition,fit:site.fit,leaseWeek:state.week}});
  log(`${p.name}: ${site.region}・${site.district}で賃貸契約。新店舗を開業。`,'major');
  selectedMapBusiness=null;selectedMapProperty=null;selectedStoreDetail=id;save();render();
}

operations=function(){
  if(selectedStoreDetail)return storeDetailView(selectedStoreDetail);
  if(selectedMapBusiness)return propertyMapView(selectedMapBusiness);
  const html=_baseOperations();
  return html.replace(/data-open-store="([^"]+)"/g,'data-open-map-business="$1"').replace('＋ 新規出店','🗺 地図から出店');
};

bind=function(){
  _baseBind();
  document.querySelectorAll('[data-open-map-business]').forEach(el=>el.onclick=()=>{selectedMapBusiness=el.dataset.openMapBusiness;selectedMapRegion=state.ui.region||REGIONS[0];selectedMapProperty=null;selectedStoreDetail=null;render();});
  document.querySelectorAll('[data-map-back]').forEach(el=>el.onclick=()=>{selectedMapBusiness=null;selectedMapProperty=null;render();});
  document.querySelectorAll('[data-map-region]').forEach(el=>el.onclick=()=>{selectedMapRegion=el.dataset.mapRegion;selectedMapProperty=null;render();});
  document.querySelectorAll('[data-map-property]').forEach(el=>el.onclick=()=>{selectedMapProperty=el.dataset.mapProperty;render();requestAnimationFrame(()=>document.querySelector('.property-sheet')?.scrollIntoView({behavior:'smooth',block:'end'}));});
  document.querySelectorAll('[data-sign-lease]').forEach(el=>el.onclick=()=>openStoreFromProperty(selectedMapBusiness,el.dataset.signLease));
  document.querySelectorAll('[data-store-back]').forEach(el=>el.onclick=()=>{selectedStoreDetail=null;render();});
  document.querySelectorAll('[data-store-step]').forEach(el=>el.onclick=()=>{const s=state.company.stores.find(x=>x.id===el.dataset.storeStep);if(!s)return;const field=el.dataset.field,delta=Number(el.dataset.delta||0);if(field==='price'){const b=state.company.businesses[s.businessID];s.priceOverride=Math.max(10,(s.priceOverride??b.price)+delta);}else if(field==='hours'){s.operatingHours=clamp((s.operatingHours||12)+delta,6,24);}save();render();});
  document.querySelectorAll('[data-store-price-reset]').forEach(el=>el.onclick=()=>{const s=state.company.stores.find(x=>x.id===el.dataset.storePriceReset);if(!s)return;s.priceOverride=null;save();render();});
  if(tab==='operations'&&selectedBusiness&&!selectedMapBusiness&&!selectedStoreDetail){
    const stores=state.company.stores.filter(x=>x.businessID===selectedBusiness);
    document.querySelectorAll('.store-list .store-card').forEach((card,i)=>{if(!stores[i])return;card.classList.add('clickable-store');card.setAttribute('role','button');card.onclick=()=>{selectedStoreDetail=stores[i].id;render();};});
  }
};

render();
