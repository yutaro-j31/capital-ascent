'use strict';

// City management layer: own stores + rivals + vacancies coexist on the same map.
let selectedCityCompetitor = null;

const _cityBindBase = bind;
const _cityOperationsBase = operations;

const RIVAL_NAMES = {
  ramen:['麺匠いちばん','中華そば東都','RAMEN BASE','麺処みなと','らぁ麺七星','東京製麺所'],
  conveni:['Daily Pocket','Quick Mart','MACHI STORE','OneStop','City Pantry','LOCAL 24'],
  gym:['ACTIVE ONE','CORE FIT','URBAN GYM','MOVE+','BODY LAB','FIT STAGE'],
  realEstateAgency:['中央住販','都市アセット','NEXT HOME','アーバン不動産','東都リアルティ','住まいリンク'],
  productVentures:['NEXCODE','LAYER LAB','BRIDGEWARE','QUANTIX','STACKONE','CLOUDMATE']
};

function cityCompetitors(businessID,region){
  if(!PILLARS[businessID]||businessID==='productVentures')return [];
  const names=RIVAL_NAMES[businessID]||['RIVAL A','RIVAL B','RIVAL C','RIVAL D','RIVAL E','RIVAL F'];
  const districts=DISTRICTS[region]||['駅前','中央','東口','西口','新都心','郊外'];
  const count=5+(hash32(`rival-count:${state.seed}:${businessID}:${region}`)%4);
  return Array.from({length:count},(_,i)=>{
    const key=`rival:${state.seed}:${businessID}:${region}:${i}`;
    const brand=Math.round(38+u01(key+':brand')*57);
    const quality=Math.round(42+u01(key+':quality')*53);
    const priceIndex=.78+u01(key+':price')*.55;
    const traffic=.78+u01(key+':traffic')*.62;
    const threat=clamp(Math.round(brand*.35+quality*.30+traffic*30+(priceIndex<.95?8:0)),25,98);
    return {
      id:uid('rival',key),businessID,region,
      name:names[(hash32(key+':name')+i)%names.length],
      district:districts[hash32(key+':district')%districts.length],
      x:10+u01(key+':x')*80,y:12+u01(key+':y')*72,
      brand,quality,priceIndex,traffic,threat,
      unitsIndex:Math.round(70+u01(key+':units')*95)
    };
  }).sort((a,b)=>b.threat-a.threat);
}

function storeMapPosition(store){
  if(store.property&&Number.isFinite(store.property.x)&&Number.isFinite(store.property.y))return {x:store.property.x,y:store.property.y};
  return {x:10+u01(`own-x:${store.id}`)*80,y:12+u01(`own-y:${store.id}`)*72};
}

function cityCompetitorById(id,businessID,region){
  return cityCompetitors(businessID,region).find(x=>x.id===id)||null;
}

function competitorSheet(c){
  if(!c)return '';
  const priceLabel=c.priceIndex<.92?'低価格':c.priceIndex>1.12?'高価格':'標準価格';
  const threatClass=c.threat>=78?'bad':c.threat>=60?'warn':'live';
  return `<section class="property-sheet rival-sheet"><div class="sheet-grab"></div><div class="property-title"><div><span class="pill ${threatClass}">競合脅威 ${c.threat}</span><h2>${c.name}</h2><p>${c.region} · ${c.district} · ${PILLARS[c.businessID].name}</p></div><div class="rival-mark">RIVAL</div></div><div class="site-kpis"><div><small>ブランド</small><b>${c.brand}</b></div><div><small>品質</small><b>${c.quality}</b></div><div><small>価格戦略</small><b>${priceLabel}</b></div><div><small>集客指数</small><b>${Math.round(c.traffic*100)}</b></div></div><div class="site-bars"><div><span>ブランド</span><i><b style="width:${c.brand}%"></b></i><em>${c.brand}</em></div><div><span>品質</span><i><b style="width:${c.quality}%"></b></i><em>${c.quality}</em></div><div><span>脅威度</span><i class="dangerbar"><b style="width:${c.threat}%"></b></i><em>${c.threat}</em></div></div><p class="city-note">推定販売力 ${c.unitsIndex}。この競合の近辺では、物件の「競合の強さ」が高いほど出店判断を慎重にする必要があります。</p></section>`;
}

function cityPropertySheet(chosen,p){
  if(!chosen)return '';
  return `<section class="property-sheet"><div class="sheet-grab"></div><div class="property-title"><div><span class="pill ${gradeClass(chosen.fit)}">空き物件 · 立地 ${mapGrade(chosen.fit)}</span><h2>${chosen.district} ${chosen.size}㎡</h2><p>${selectedMapRegion} · ${p.name}向け候補物件</p></div><div class="site-score">${chosen.fit}<small>/100</small></div></div><div class="site-kpis"><div><small>家賃 / 週</small><b>${yen(chosen.rent)}</b></div><div><small>敷金</small><b>${yen(chosen.deposit)}</b></div><div><small>初期費用</small><b>${yen(chosen.total)}</b></div><div><small>人流指数</small><b>${(chosen.traffic*100).toFixed(0)}</b></div></div><div class="site-bars"><div><span>アクセス</span><i><b style="width:${chosen.access}%"></b></i><em>${chosen.access}</em></div><div><span>視認性</span><i><b style="width:${chosen.frontage}%"></b></i><em>${chosen.frontage}</em></div><div><span>競合の強さ</span><i class="dangerbar"><b style="width:${chosen.competition}%"></b></i><em>${chosen.competition}</em></div></div><button class="btn primary wide lease-btn" data-sign-lease="${chosen.id}">この物件で出店する · ${yen(chosen.total)}</button></section>`;
}

propertyMapView=function(businessID){
  const p=PILLARS[businessID];
  if(!p)return _cityOperationsBase();
  selectedMapRegion=selectedMapRegion||state.ui.region||REGIONS[0];
  const sites=propertyCandidates(businessID,selectedMapRegion);
  if(selectedMapProperty&&!sites.some(x=>x.id===selectedMapProperty))selectedMapProperty=null;
  const chosen=currentProperty();
  const rivals=cityCompetitors(businessID,selectedMapRegion);
  if(selectedCityCompetitor&&!rivals.some(x=>x.id===selectedCityCompetitor))selectedCityCompetitor=null;
  const competitor=selectedCityCompetitor?cityCompetitorById(selectedCityCompetitor,businessID,selectedMapRegion):null;
  const regionStores=state.company.stores.filter(x=>x.region===selectedMapRegion);
  const businessStores=regionStores.filter(x=>x.businessID===businessID);
  const presence=Math.round(100*businessStores.length/Math.max(1,businessStores.length+rivals.length));
  const avgThreat=rivals.length?Math.round(rivals.reduce((a,x)=>a+x.threat,0)/rivals.length):0;

  const vacancyPins=sites.map((s,i)=>`<button class="city-pin vacancy ${chosen?.id===s.id?'selected':''}" style="left:${s.x.toFixed(1)}%;top:${s.y.toFixed(1)}%" data-map-property="${s.id}" aria-label="空き物件 ${s.district}"><span>${i+1}</span><small>${mapGrade(s.fit)}</small></button>`).join('');
  const rivalPins=rivals.map(r=>`<button class="city-pin rival ${competitor?.id===r.id?'selected':''}" style="left:${r.x.toFixed(1)}%;top:${r.y.toFixed(1)}%" data-city-rival="${r.id}" aria-label="競合 ${r.name}"><span>R</span><small>${r.threat}</small></button>`).join('');
  const ownPins=regionStores.map(s=>{const pos=storeMapPosition(s),sp=PILLARS[s.businessID]||p;return `<button class="city-pin own ${s.businessID===businessID?'same-business':''}" style="left:${pos.x.toFixed(1)}%;top:${pos.y.toFixed(1)}%" data-city-store="${s.id}" aria-label="自店舗 ${s.name}"><span>${sp.icon}</span><small>${s.lastProfit>=0?'＋':'−'}</small></button>`;}).join('');

  const vacancyList=sites.slice(0,5).map((s,i)=>`<button class="property-row ${chosen?.id===s.id?'selected':''}" data-map-property="${s.id}"><span class="property-rank">${i+1}</span><div><b>${s.district}</b><small>${s.size}㎡ · 人流 ${(s.traffic*100).toFixed(0)} · 競合 ${s.competition}</small></div><div><strong>${yen(s.rent)}</strong><small>/週</small></div></button>`).join('');
  const ownList=businessStores.map(s=>`<button class="city-store-row" data-city-store="${s.id}"><div><span class="city-store-icon">${p.icon}</span><b>${s.name}</b><small>${s.property?.district||s.region} · 人流 ${(s.traffic*100).toFixed(0)}</small></div><strong class="${s.lastProfit>=0?'positive':'negative'}">${yen(s.lastProfit)}</strong></button>`).join('');

  const detailSheet=competitor?competitorSheet(competitor):cityPropertySheet(chosen,p);
  return `<main class="map-screen city-management"><div class="screen-head"><button class="back" data-map-back>‹</button><div class="copy"><h1>${selectedMapRegion} · 都市マップ</h1><p>${p.name}の出店・自店舗管理・競合監視を1つの画面で行います。</p></div></div>
  <div class="city-kpi-strip"><div><small>自社全拠点</small><b>${regionStores.length}</b></div><div><small>${p.name}拠点</small><b>${businessStores.length}</b></div><div><small>競合</small><b>${rivals.length}</b></div><div><small>拠点比率</small><b>${presence}%</b></div><div><small>競合脅威</small><b>${avgThreat}</b></div></div>
  <div class="region-strip">${REGIONS.map(r=>`<button class="${r===selectedMapRegion?'active':''}" data-map-region="${r}">${r}</button>`).join('')}</div>
  <div class="city-map management-map"><div class="map-label north">商業中心</div><div class="map-label east">住宅</div><div class="map-label south">駅・交通</div><div class="map-road r1"></div><div class="map-road r2"></div><div class="map-road r3"></div><div class="map-park"></div>${vacancyPins}${rivalPins}${ownPins}<div class="city-map-legend"><span><i class="legend-own"></i>自店舗 ${regionStores.length}</span><span><i class="legend-rival"></i>競合 ${rivals.length}</span><span><i class="legend-vacancy"></i>空き ${sites.length}</span></div></div>
  <div class="city-instruction">ピンをタップ：<b>自店舗</b>は店舗管理、<b>競合</b>は情報確認、<b>空き物件</b>は出店検討へ進みます。</div>
  ${detailSheet}
  <div class="grid city-panels"><section class="card half"><div class="section-row"><h2>自店舗 · ${p.name}</h2><span class="pill live">${businessStores.length}店</span></div><div class="city-store-list">${ownList||'<p class="sub">この地域にはまだ自店舗がありません。</p>'}</div></section><section class="card half"><div class="section-row"><h2>空き物件</h2><span class="pill">上位5件</span></div><div class="property-list">${vacancyList}</div></section></div></main>`;
};

// Keep the city position from the selected vacancy on newly opened stores.
const _cityOpenStoreBase=openStoreFromProperty;
openStoreFromProperty=function(businessID,siteId){
  const site=propertyCandidates(businessID,selectedMapRegion||state.ui.region).find(x=>x.id===siteId)||null;
  const beforeIds=new Set(state.company.stores.map(x=>x.id));
  _cityOpenStoreBase(businessID,siteId);
  if(!site)return;
  const created=state.company.stores.find(x=>!beforeIds.has(x.id));
  if(created){created.property=created.property||{};created.property.x=site.x;created.property.y=site.y;save();}
};

operations=function(){
  const html=_cityOperationsBase();
  return html.replace('🗺 地図から出店','🗺 都市マップ');
};

bind=function(){
  _cityBindBase();
  document.querySelectorAll('[data-city-rival]').forEach(el=>el.onclick=()=>{selectedCityCompetitor=el.dataset.cityRival;selectedMapProperty=null;render();requestAnimationFrame(()=>document.querySelector('.rival-sheet')?.scrollIntoView({behavior:'smooth',block:'end'}));});
  document.querySelectorAll('[data-city-store]').forEach(el=>el.onclick=()=>{selectedStoreDetail=el.dataset.cityStore;selectedCityCompetitor=null;render();});
  document.querySelectorAll('[data-map-property]').forEach(el=>el.onclick=()=>{selectedCityCompetitor=null;selectedMapProperty=el.dataset.mapProperty;render();requestAnimationFrame(()=>document.querySelector('.property-sheet')?.scrollIntoView({behavior:'smooth',block:'end'}));});
  document.querySelectorAll('[data-map-region]').forEach(el=>el.onclick=()=>{selectedMapRegion=el.dataset.mapRegion;selectedMapProperty=null;selectedCityCompetitor=null;render();});
  document.querySelectorAll('[data-map-back]').forEach(el=>el.onclick=()=>{selectedMapBusiness=null;selectedMapProperty=null;selectedCityCompetitor=null;render();});
};

render();
