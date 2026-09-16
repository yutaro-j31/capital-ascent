'use strict';

// Make the visible city layout economically meaningful without consuming RNG.
const _cityPropertyCandidatesBase = propertyCandidates;
const _cityRunStoreBase = runStore;

function cityDistance(a,b){
  const dx=(a.x||0)-(b.x||0),dy=(a.y||0)-(b.y||0);
  return Math.sqrt(dx*dx+dy*dy);
}

function cityPressureAt(businessID,region,point){
  const rivals=cityCompetitors(businessID,region);
  let pressure=0;
  for(const r of rivals){
    const proximity=clamp(1-cityDistance(point,r)/36,0,1);
    const priceAggression=r.priceIndex<1?1+(1-r.priceIndex)*.9:.92;
    pressure+=proximity*(r.threat/100)*priceAggression*.095;
  }
  return clamp(pressure,0,.28);
}

propertyCandidates=function(businessID,region){
  const base=_cityPropertyCandidatesBase(businessID,region);
  return base.map(site=>{
    const pressure=cityPressureAt(businessID,region,site);
    const competition=clamp(Math.round(18+pressure/.28*80),18,98);
    const fit=clamp(Math.round(48+site.traffic*24+site.frontage*.14+site.access*.12-competition*.12),35,98);
    return {...site,competition,fit,cityPressure:pressure};
  }).sort((a,b)=>b.fit-a.fit);
};

runStore=function(s,store){
  if(!store||!store.businessID||store.businessID==='productVentures')return _cityRunStoreBase(s,store);
  const point=storeMapPosition(store);
  const pressure=cityPressureAt(store.businessID,store.region,point);
  if(pressure<=0)return _cityRunStoreBase(s,store);
  const originalTraffic=store.traffic;
  // Competition works through effective footfall so every physical pillar keeps its native economics.
  store.traffic=originalTraffic*(1-pressure);
  try{
    const result=_cityRunStoreBase(s,store);
    result.cityCompetitionPressure=pressure;
    return result;
  }finally{
    store.traffic=originalTraffic;
  }
};

function storeCityPressure(store){
  if(!store||!store.businessID)return 0;
  return cityPressureAt(store.businessID,store.region,storeMapPosition(store));
}
