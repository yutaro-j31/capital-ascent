'use strict';

// Live city layer: own stores, rivals and vacancies share one deterministic city board.
let selectedCityEntity = null;
const _cityBasePropertyMapView = propertyMapView;
const _cityBaseBind = bind;
const _cityBaseRunStore = runStore;

const RIVAL_BRANDS = {
  ramen:['麺座','中華そば一番','RAMEN BASE','麺処いち','北斗軒','鶏白湯LAB'],
  conveni:['Quick24','Daily One','MART7','City Stop','Pocket Mart','Loop'],
  gym:['CORE GYM','AXIS Fitness','MOVE24','URBAN FIT','BODY LAB','NEXT GYM'],
  realEstateAgency:['都市住販','City Estate','住まいリンク','中央不動産','NEXT HOME','Asset Room'],
  productVentures:['Cloud Arc','Nexbit','MonoStack','Orbit Labs','Gridware','Peak Systems']
};

function cityDistricts(region){
  return DISTRICTS[region] || ['駅前','中央','東口','西口','新都心','郊外'];
}

function districtAnchor(region,district){
  const key=`district:${state.seed}:${region}:${district}`;
  return {x:14+u01(key+':x')*72,y:15+u01(key+':y')*66};
}

function cityPoint(key,region,district,spread=12){
  const a=districtAnchor(region,district);
  return {x:clamp(a.x+noise(key+':x',spread),7,93),y:clamp(a.y+noise(key+':y',spread),8,89)};
}

function cityCompetitors(businessID,region){
  if(!PILLARS[businessID])return [];
  const districts=cityDistricts(region);
  const brands=RIVAL_BRANDS[businessID] || RIVAL_BRANDS.ramen;
  const count=8+(hash32(`rival-count:${state.seed}:${businessID}:${region}`)%5);
  const yearBand=Math.floor((state.week-1)/52);
  return Array.from({length:count},(_,i)=>{
    const key=`rival:${state.seed}:${businessID}:${region}:${i}`;
    const district=districts[hash32(key+':d')%districts.length];
    const pos=cityPoint(key,region,district,15);
    return {
      id:uid('rival',key),
      name:brands[i%brands.length]+(i>=brands.length?` ${i+1}`:''),
      businessID,region,district,x:pos.x,y:pos.y,
      strength:clamp(Math.round(38+u01(key+':s')*48+noise(`${key}:yr:${yearBand}`,7)),20,96),
      priceIndex:.82+u01(key+':p')*.38,
      quality:Math.round(35+u01(key+':q')*60),
      brand:Math.round(32+u01(key+':b')*64),
      traffic:.75+u01(key+':t')*.62
    };
  });
}

function storeDistrict(store){
  const districts=cityDistricts(store.region);
  return store.property?.district || districts[hash32(store.id)%districts.length];
}

function ownStorePoint(store){
  return cityPoint(`own:${store.id}`,store.region,storeDistrict(store),9);
}

function competitorPressureForStore(store){
  const district=storeDistrict(store);
  return Math.min(.24,cityCompetitors(store.businessID,store.region)
    .filter(x=>x.district===district)
    .reduce((sum,r)=>sum+(r.strength/100)*.032,0));
}

runStore=function(s,store){
  const result=_cityBaseRunStore(s,store);
  const pressure=competitorPressureForStore(store);
  if(pressure>0){
    result.revenue*=1-pressure;
    result.units=Math.max(0,Math.round(result.units*(1-pressure)));
  }
  return result;
};

function cityEntitySheet(businessID,entity){
  const p=PILLARS[businessID];
  if(!entity)return '';

  if(entity.type==='site'){
    const x=entity.data;
    return `<section class="property-sheet city-sheet">
      <div class="sheet-grab"></div>
      <div class="property-title"><div><span class="pill ${gradeClass(x.fit)}">空き物件 · 立地 ${mapGrade(x.fit)}</span><h2>${x.district} ${x.size}㎡</h2><p>${x.region} · ${p.name}向け候補</p></div><div class="site-score">${x.fit}<small>/100</small></div></div>
      <div class="site-kpis"><div><small>家賃 / 週</small><b>${yen(x.rent)}</b></div><div><small>敷金</small><b>${yen(x.deposit)}</b></div><div><small>初期費用</small><b>${yen(x.total)}</b></div><div><small>人流指数</small><b>${(x.traffic*100).toFixed(0)}</b></div></div>
      <div class="site-bars"><div><span>アクセス</span><i><b style="width:${x.access}%"></b></i><em>${x.access}</em></div><div><span>視認性</span><i><b style="width:${x.frontage}%"></b></i><em>${x.frontage}</em></div><div><span>競合</span><i class="dangerbar"><b style="width:${x.competition}%"></b></i><em>${x.competition}</em></div></div>
      <button class="btn primary wide lease-btn" data-sign-lease="${x.id}">この物件で出店する · ${yen(x.total)}</button>
    </section>`;
  }

  if(entity.type==='rival'){
    const r=entity.data;
    const estSales=PILLARS[businessID].price*PILLARS[businessID].baseDemand*r.traffic*(.7+r.strength/100*.7);
    const threat=r.strength>=78?'HIGH':r.strength>=58?'MEDIUM':'LOW';
    return `<section class="property-sheet city-sheet rival-sheet">
      <div class="sheet-grab"></div>
      <div class="property-title"><div><span class="pill bad">競合店舗 · ${threat}</span><h2>${r.name}</h2><p>${r.region} · ${r.district} · ${p.name}</p></div><div class="site-score rival-score">${r.strength}<small>競争力</small></div></div>
      <div class="site-kpis"><div><small>推定売上 / 週</small><b>${yen(estSales)}</b></div><div><small>価格指数</small><b>${Math.round(r.priceIndex*100)}</b></div><div><small>品質</small><b>${r.quality}</b></div><div><small>ブランド</small><b>${r.brand}</b></div></div>
      <p class="city-note">同じ地区へ出店すると、この競合の強さに応じて自店舗需要が減少します。家賃だけでなく競争密度も確認してください。</p>
    </section>`;
  }

  if(entity.type==='own'){
    const s=entity.data;
    const pressure=competitorPressureForStore(s);
    return `<section class="property-sheet city-sheet own-sheet">
      <div class="sheet-grab"></div>
      <div class="property-title"><div><span class="pill live">自店舗 · 営業中</span><h2>${s.name}</h2><p>${s.region} · ${storeDistrict(s)} · ${p.name}</p></div><div class="site-score ${s.lastProfit>=0?'positive':'negative'}">${yen(s.lastProfit)}<small>今週利益</small></div></div>
      <div class="site-kpis"><div><small>売上</small><b>${yen(s.lastRevenue)}</b></div><div><small>人流</small><b>${Math.round(s.traffic*100)}</b></div><div><small>家賃 / 週</small><b>${yen(s.rent)}</b></div><div><small>競争圧力</small><b>${pct(pressure,0)}</b></div></div>
      <button class="btn primary wide" data-city-open-store="${s.id}">店舗へ入る</button>
    </section>`;
  }
  return '';
}

propertyMapView=function(businessID){
  const p=PILLARS[businessID];
  if(!p)return _cityBasePropertyMapView(businessID);
  selectedMapRegion=selectedMapRegion||state.ui.region||REGIONS[0];

  const sites=propertyCandidates(businessID,selectedMapRegion);
  const rivals=cityCompetitors(businessID,selectedMapRegion);
  const own=state.company.stores.filter(s=>s.businessID===businessID&&s.region===selectedMapRegion);
  let entity=null;

  if(selectedCityEntity){
    if(selectedCityEntity.type==='rival')entity={type:'rival',data:rivals.find(x=>x.id===selectedCityEntity.id)};
    else if(selectedCityEntity.type==='own')entity={type:'own',data:own.find(x=>x.id===selectedCityEntity.id)};
    if(!entity?.data)selectedCityEntity=null;
  }
  if(!selectedCityEntity&&selectedMapProperty){
    const site=sites.find(x=>x.id===selectedMapProperty);
    if(site)entity={type:'site',data:site}; else selectedMapProperty=null;
  }

  const ownPins=own.map(s=>{
    const q=ownStorePoint(s);
    return `<button class="city-pin own-pin ${entity?.type==='own'&&entity.data.id===s.id?'selected':''}" style="left:${q.x.toFixed(1)}%;top:${q.y.toFixed(1)}%" data-city-own="${s.id}" aria-label="自店舗 ${s.name}"><span>${p.icon}</span><small>YOU</small></button>`;
  }).join('');
  const rivalPins=rivals.map(r=>`<button class="city-pin rival-pin ${entity?.type==='rival'&&entity.data.id===r.id?'selected':''}" style="left:${r.x.toFixed(1)}%;top:${r.y.toFixed(1)}%" data-city-rival="${r.id}" aria-label="競合 ${r.name}"><span>◆</span><small>${r.strength}</small></button>`).join('');
  const sitePins=sites.map((s,i)=>`<button class="city-pin site-pin ${entity?.type==='site'&&entity.data.id===s.id?'selected':''}" style="left:${s.x.toFixed(1)}%;top:${s.y.toFixed(1)}%" data-map-property="${s.id}" aria-label="空き物件 ${s.district}"><span>${i+1}</span><small>${mapGrade(s.fit)}</small></button>`).join('');

  const districtRows=cityDistricts(selectedMapRegion).map(d=>{
    const o=own.filter(s=>storeDistrict(s)===d).length;
    const rs=rivals.filter(r=>r.district===d);
    const strength=rs.length?Math.round(rs.reduce((a,r)=>a+r.strength,0)/rs.length):0;
    return `<div class="district-row"><div><b>${d}</b><small>自店舗 ${o} · 競合 ${rs.length}</small></div><span class="${strength>=72?'negative':strength>=55?'accent':'positive'}">${strength||'—'}</span></div>`;
  }).join('');

  const share=own.length/(own.length+rivals.length||1);
  const avgRival=rivals.length?rivals.reduce((a,r)=>a+r.strength,0)/rivals.length:0;
  const sheet=cityEntitySheet(businessID,entity);

  return `<main class="map-screen city-world-screen">
    <div class="screen-head"><button class="back" data-map-back>‹</button><div class="copy"><h1>${selectedMapRegion} · ${p.name}</h1><p>自店舗、競合、空き物件を同じ都市盤面で管理します。</p></div></div>
    <div class="region-strip">${REGIONS.map(r=>`<button class="${r===selectedMapRegion?'active':''}" data-map-region="${r}">${r}</button>`).join('')}</div>
    <div class="city-stats"><div><small>自店舗</small><b>${own.length}</b></div><div><small>競合</small><b>${rivals.length}</b></div><div><small>店舗シェア</small><b>${pct(share,0)}</b></div><div><small>競合強度</small><b>${avgRival.toFixed(0)}</b></div></div>
    <div class="city-map live-city-map"><div class="map-label north">商業中心</div><div class="map-label east">住宅</div><div class="map-label south">駅・交通</div><div class="map-road r1"></div><div class="map-road r2"></div><div class="map-road r3"></div><div class="map-park"></div>${sitePins}${rivalPins}${ownPins}<div class="city-legend"><span><i class="legend-own"></i>自店舗</span><span><i class="legend-rival"></i>競合</span><span><i class="legend-site"></i>空き物件</span></div></div>
    <div class="grid city-after-map"><section class="card half"><div class="section-row"><h2>エリア競争</h2><span class="pill">競争力 0–100</span></div><div class="district-list">${districtRows}</div></section><section class="card half"><div class="section-row"><h2>空き物件</h2><span class="pill">${sites.length}件</span></div><div class="property-list">${sites.slice(0,6).map((s,i)=>`<button class="property-row ${entity?.type==='site'&&entity.data.id===s.id?'selected':''}" data-map-property="${s.id}"><span class="property-rank">${i+1}</span><div><b>${s.district}</b><small>${s.size}㎡ · 人流 ${(s.traffic*100).toFixed(0)}</small></div><div><strong>${yen(s.rent)}</strong><small>/週</small></div></button>`).join('')}</div></section></div>
    ${sheet}
  </main>`;
};

bind=function(){
  _cityBaseBind();
  document.querySelectorAll('[data-open-map-business]').forEach(el=>el.onclick=()=>{
    selectedMapBusiness=el.dataset.openMapBusiness;
    selectedMapRegion=state.ui.region||REGIONS[0];
    selectedMapProperty=null;selectedStoreDetail=null;selectedCityEntity=null;render();
  });
  document.querySelectorAll('[data-city-own]').forEach(el=>el.onclick=()=>{
    selectedCityEntity={type:'own',id:el.dataset.cityOwn};selectedMapProperty=null;render();
  });
  document.querySelectorAll('[data-city-rival]').forEach(el=>el.onclick=()=>{
    selectedCityEntity={type:'rival',id:el.dataset.cityRival};selectedMapProperty=null;render();
    requestAnimationFrame(()=>document.querySelector('.city-sheet')?.scrollIntoView({behavior:'smooth',block:'end'}));
  });
  document.querySelectorAll('[data-map-property]').forEach(el=>el.onclick=()=>{
    selectedCityEntity=null;selectedMapProperty=el.dataset.mapProperty;render();
    requestAnimationFrame(()=>document.querySelector('.city-sheet')?.scrollIntoView({behavior:'smooth',block:'end'}));
  });
  document.querySelectorAll('[data-map-region]').forEach(el=>el.onclick=()=>{
    selectedMapRegion=el.dataset.mapRegion;selectedMapProperty=null;selectedCityEntity=null;render();
  });
  document.querySelectorAll('[data-map-back]').forEach(el=>el.onclick=()=>{
    selectedMapBusiness=null;selectedMapProperty=null;selectedCityEntity=null;render();
  });
  document.querySelectorAll('[data-city-open-store]').forEach(el=>el.onclick=()=>{
    selectedStoreDetail=el.dataset.cityOpenStore;selectedCityEntity=null;render();
  });
};

render();
