'use strict';

// Roadmap Phase 1: the visible city board is the source of truth for competition economics.
const _roadmapPropertyCandidates=propertyCandidates;
const _roadmapOwnStorePoint=typeof ownStorePoint==='function'?ownStorePoint:null;
const _roadmapBaseRunStore=(typeof _cityBaseRunStore!=='undefined'&&typeof _cityBaseRunStore==='function')?_cityBaseRunStore:runStore;
const _roadmapOpenStoreFromProperty=openStoreFromProperty;

function distance2d(a,b){
  const dx=(Number(a?.x)||0)-(Number(b?.x)||0);
  const dy=(Number(a?.y)||0)-(Number(b?.y)||0);
  return Math.sqrt(dx*dx+dy*dy);
}

function competitionPressureAt(businessID,region,point){
  if(!businessID||businessID==='productVentures'||!point)return 0;
  const rivals=cityCompetitors(businessID,region);
  let pressure=0;
  for(const r of rivals){
    const proximity=clamp(1-distance2d(point,r)/38,0,1);
    const priceAggression=r.priceIndex<1?1+(1-r.priceIndex)*.9:.92;
    const strength=(Number(r.strength)||50)/100;
    pressure+=proximity*strength*priceAggression*.095;
  }
  return clamp(pressure,0,.30);
}

propertyCandidates=function(businessID,region){
  const base=_roadmapPropertyCandidates(businessID,region);
  return base.map(site=>{
    const pressure=competitionPressureAt(businessID,region,site);
    const competition=clamp(Math.round(18+(pressure/.30)*80),18,98);
    const fit=clamp(Math.round(48+site.traffic*24+site.frontage*.14+site.access*.12-competition*.12),35,98);
    return {...site,siteId:site.id,competition,fit,cityPressure:pressure};
  }).sort((a,b)=>b.fit-a.fit);
};

ownStorePoint=function(store){
  if(Number.isFinite(store?.property?.x)&&Number.isFinite(store?.property?.y))return {x:store.property.x,y:store.property.y};
  if(_roadmapOwnStorePoint)return _roadmapOwnStorePoint(store);
  return {x:50,y:50};
};

function storeCompetitionPressure(store){
  if(!store||store.businessID==='productVentures')return 0;
  return competitionPressureAt(store.businessID,store.region,ownStorePoint(store));
}

runStore=function(s,store){
  if(!store||store.businessID==='productVentures')return _roadmapBaseRunStore(s,store);
  const pressure=storeCompetitionPressure(store);
  const originalTraffic=store.traffic;
  store.traffic=originalTraffic*(1-pressure);
  try{
    const result=_roadmapBaseRunStore(s,store);
    const b=s.company.businesses[store.businessID],p=PILLARS[store.businessID];
    const effectivePrice=store.priceOverride||b.price;
    const siblings=s.company.stores.filter(x=>x.businessID===store.businessID&&x.region===store.region).length-1;
    result.cityCompetitionPressure=pressure;
    result.breakdown={
      priceIndex:p.price/Math.max(1,effectivePrice),
      locationIndex:originalTraffic,
      competitionPressure:pressure,
      qualityIndex:1+(b.quality-50)/120,
      brandIndex:1+(b.brand-45)/150,
      efficiencyIndex:1+(b.efficiency-35)/220,
      hoursIndex:.85+(store.operatingHours||12)/80,
      cannibalization:1-Math.pow(.82,Math.max(0,siblings)),
      adSpend:b.adSpend||0,
      rent:store.rent||0,
      units:result.units,
      revenue:result.revenue,
      cost:result.cost
    };
    return result;
  }finally{
    store.traffic=originalTraffic;
  }
};

openStoreFromProperty=function(businessID,siteId){
  const region=selectedMapRegion||state.ui.region;
  const site=propertyCandidates(businessID,region).find(x=>x.id===siteId)||null;
  const before=new Set(state.company.stores.map(x=>x.id));
  _roadmapOpenStoreFromProperty(businessID,siteId);
  if(!site)return;
  const created=state.company.stores.find(x=>!before.has(x.id));
  if(created){
    created.property=created.property||{};
    Object.assign(created.property,{
      siteId:site.id,x:site.x,y:site.y,district:site.district,size:site.size,
      frontage:site.frontage,access:site.access,competition:site.competition,
      fit:site.fit,cityPressure:site.cityPressure,leaseWeek:created.property.leaseWeek||state.week
    });
    save();render();
  }
};
