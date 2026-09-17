'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createRuntime}=require('./harness.cjs');

function plain(x){return JSON.parse(JSON.stringify(x));}

function assertFinite(value,path='state'){
  if(typeof value==='number')assert.ok(Number.isFinite(value),`${path} must be finite`);
  else if(Array.isArray(value))value.forEach((v,i)=>assertFinite(v,`${path}[${i}]`));
  else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))assertFinite(v,`${path}.${k}`);
}

test('runtime boots with roadmap layers',()=>{
  const r=createRuntime();
  assert.ok(r.api);assert.equal(typeof r.api.fresh,'function');
  const s=plain(r.api.fresh());
  assert.equal(s.schemaVersion,2);
  assert.equal(r.api.validate().length,0);
});

test('same seed and actions are deterministic for 10 years',()=>{
  const a=createRuntime(),b=createRuntime();
  a.api.fresh('DETERMINISTIC','ramen','東京');b.api.fresh('DETERMINISTIC','ramen','東京');
  a.api.eval('state.company.cash=5000000000;');b.api.eval('state.company.cash=5000000000;');
  a.api.invest('ramen','quality',500000);b.api.invest('ramen','quality',500000);
  a.api.simulate(520);b.api.simulate(520);
  assert.equal(a.api.snapshot(),b.api.snapshot());
});

test('100-year simulation stays finite and save remains bounded',()=>{
  const r=createRuntime();r.api.fresh('CENTURY','ramen','東京');
  r.api.eval('state.company.cash=1000000000000;state.company.debt=0;');
  r.api.simulate(5200);const s=plain(r.api.get());
  assertFinite(s);assert.equal(r.api.validate().length,0);
  r.api.compact();const bytes=Buffer.byteLength(r.api.exportText(),'utf8');
  assert.ok(bytes<5*1024*1024,`save ${bytes} bytes should stay under 5MB`);
  assert.ok(s.week>=5200,'simulation should reach roughly a century');
});

test('legacy v1 save migrates additively to schema v2',()=>{
  const r=createRuntime();const legacy=plain(r.api.fresh('LEGACY'));
  delete legacy.schemaVersion;delete legacy.history;delete legacy.projects;delete legacy.management;delete legacy.world;
  delete legacy.company.subsidiaryPortfolio;
  const migrated=plain(r.api.migrate(legacy));
  assert.equal(migrated.version,1);assert.equal(migrated.schemaVersion,2);
  assert.ok(Array.isArray(migrated.history.companyWeeks));assert.ok(Array.isArray(migrated.projects));
});

test('save uses rolling backups and recovers from corrupt primary',()=>{
  const r=createRuntime();r.api.fresh('SAVE TEST');r.api.save();
  r.api.eval('state.week=2;');r.api.save();
  r.storage.setItem('capital_ascent_v1','{broken json');
  const loaded=plain(r.api.load());
  assert.ok(loaded);assert.ok(loaded.week===1||loaded.week===2);
});

test('city property competition uses visible rivals and leased store keeps exact site',()=>{
  const r=createRuntime();r.api.fresh('CITY','ramen','東京');
  const site=plain(r.api.sites('ramen','東京')[0]);
  const pressure=r.api.pressure('ramen','東京',site);
  assert.ok(Math.abs(site.cityPressure-pressure)<1e-12);
  r.api.eval(`state.company.cash=1000000000;selectedMapRegion='東京';selectedMapBusiness='ramen';openStoreFromProperty('ramen','${site.id}');`);
  const stores=plain(r.api.get().company.stores);const created=stores[stores.length-1];
  assert.equal(created.property.siteId,site.id);
  assert.ok(Math.abs(created.property.x-site.x)<1e-9);assert.ok(Math.abs(created.property.y-site.y)<1e-9);
});

test('major business investment has delayed effect',()=>{
  const r=createRuntime();r.api.fresh('PROJECT','ramen','東京');r.api.eval('state.company.cash=100000000;');
  const before=r.api.get().company.businesses.ramen.quality;
  r.api.invest('ramen','quality',500000);
  assert.equal(r.api.get().company.businesses.ramen.quality,before);
  r.api.simulate(4);assert.equal(r.api.get().company.businesses.ramen.quality,before);
  r.api.simulate(1);assert.ok(r.api.get().company.businesses.ramen.quality>before);
});

test('valuation does not double count cumulative profit',()=>{
  const r=createRuntime();r.api.fresh('VALUE','ramen','東京');
  r.api.eval('state.company.cash=100000000;state.company.debt=0;state.company.lastWeekProfit=1000000;state.history.companyWeeks=[{week:1,revenue:5000000,profit:1000000,cash:100000000,debt:0,companyValue:0}];state.company.cumulativeProfit=1000000;');
  const a=r.api.companyValue();r.api.eval('state.company.cumulativeProfit=999999999999;');const b=r.api.companyValue();
  assert.equal(a,b);
});

test('donated foundation assets are excluded from personal net worth',()=>{
  const r=createRuntime();r.api.fresh('NW','ramen','東京');
  r.api.eval('state.personal.cash=10000000;state.personal.debt=1000000;state.legacy.foundationFund=500000000;');
  assert.equal(r.api.personalNetWorth(),9000000);
});

test('M&A creates an operating subsidiary object rather than only a counter',()=>{
  const r=createRuntime();r.api.fresh('MA','ramen','東京');r.api.eval('state.company.cash=100000000000;');
  r.api.acquireSub();const s=plain(r.api.get());
  assert.equal(s.company.subsidiaryPortfolio.length,1);assert.equal(s.company.subsidiaries,1);
  const sub=s.company.subsidiaryPortfolio[0];
  for(const k of ['revenue','ebitda','debt','growth','enterpriseValue','managementQuality','synergy'])assert.ok(Number.isFinite(sub[k]),k);
  const before=sub.debt;r.api.simulate(13);const after=plain(r.api.get().company.subsidiaryPortfolio[0]);
  assert.ok(Number.isFinite(after.lastProfit));assert.ok(after.debt<=before||after.lastProfit<=0);
});

test('PE DD quality and risk flow into acquired portfolio and initiative lifecycle',()=>{
  const r=createRuntime();r.api.fresh('PE','ramen','東京');
  r.api.eval('state.personal.cash=10000000000;state.pe.unlocked=true;raiseFund();generatePeDeals(state);');
  const dealId=r.api.get().pe.deals.find(d=>d.status==='open').id;
  r.api.dd(dealId);const d=plain(r.api.get().pe.deals.find(x=>x.id===dealId));
  assert.ok(Number.isFinite(d.quality)&&Number.isFinite(d.risk)&&Number.isFinite(d.entryMultiple));
  r.api.acquirePe(dealId);let p=plain(r.api.get().pe.portfolio.find(x=>x.id===dealId));
  assert.equal(p.quality,d.quality);assert.equal(p.risk,d.risk);assert.ok(p.leverage>=.35&&p.leverage<=.68);
  r.api.improvePe(dealId,'cost');r.api.simulate(20);p=plain(r.api.get().pe.portfolio.find(x=>x.id===dealId));
  assert.ok(p.initiatives[0].status!=='in_progress');assert.ok(Number.isFinite(p.value));assert.ok(Number.isFinite(p.debt));
});

test('management policy automates business controls after delegation unlock',()=>{
  const r=createRuntime();r.api.fresh('DELEGATE','ramen','東京');
  r.api.eval(`state.company.cash=1000000000;for(let i=0;i<2;i++){const p=PILLARS.ramen;state.company.stores.push({id:'manual_'+i,businessID:'ramen',region:'東京',name:'追加'+i,traffic:1,rent:50000,deposit:300000,priceOverride:null,operatingHours:12,members:0,capacity:0,pipeline:null,lastRevenue:0,lastProfit:0,lastUnits:0,property:{district:'渋谷',x:30+i*3,y:40}});}`);
  const before=r.api.get().company.businesses.ramen.price;r.api.policy('ramen','premium');r.api.simulate(2);
  assert.ok(r.api.get().company.businesses.ramen.price>before);
});

test('Phase 9 executive brief contains operating review, movers and deterministic outlook',()=>{
  const r=createRuntime();r.api.fresh('EXEC BRIEF','ramen','東京');r.api.eval('state.company.cash=1000000000;');
  r.api.simulate(3);const b=plain(r.api.get().history.briefs.at(-1));
  assert.ok(b.executive);assert.ok(Number.isFinite(b.executive.operatingMargin));assert.ok(Number.isFinite(b.executive.cashRunwayWeeks));
  assert.ok(Array.isArray(b.storeMovers));assert.ok(Array.isArray(b.decisions));assert.ok(b.decisions.length>0);
  assert.ok(b.outlook&&Number.isFinite(b.outlook.revenueLow)&&Number.isFinite(b.outlook.revenueHigh));
});

test('Phase 9 delegated manager execution is deterministic and autonomy changes convergence',()=>{
  const setup=r=>{r.api.fresh('MANAGER DEPTH','ramen','東京');r.api.eval(`state.company.cash=1000000000;for(let i=0;i<2;i++)state.company.stores.push({id:'m_'+i,businessID:'ramen',region:'東京',name:'追加'+i,traffic:1,rent:50000,deposit:0,priceOverride:null,operatingHours:12,members:0,capacity:0,pipeline:null,lastRevenue:0,lastProfit:0,lastUnits:0,property:{district:'渋谷',x:32+i,y:40}});`);r.api.policy('ramen','premium');};
  const a=createRuntime(),b=createRuntime(),low=createRuntime();setup(a);setup(b);setup(low);a.api.autonomy('ramen','high');b.api.autonomy('ramen','high');low.api.autonomy('ramen','low');
  a.api.simulate(4);b.api.simulate(4);low.api.simulate(4);
  assert.equal(a.api.get().company.businesses.ramen.price,b.api.get().company.businesses.ramen.price);
  assert.equal(plain(a.api.get().management.businessUnits.ramen).managerQuality,plain(b.api.get().management.businessUnits.ramen).managerQuality);
  assert.ok(a.api.get().company.businesses.ramen.price>=low.api.get().company.businesses.ramen.price);
});

test('Phase 9 competitors remember and react to player strategy only at quarter boundaries',()=>{
  const r=createRuntime();r.api.fresh('RIVAL MEMORY','ramen','東京');
  r.api.eval('state.company.cash=1000000000;state.company.businesses.ramen.price=PILLARS.ramen.price*.90;');
  const before=plain(r.api.get().world.competitorMemory);assert.equal(Object.keys(before).length,0);
  r.api.simulate(12);assert.equal(Object.keys(plain(r.api.get().world.competitorMemory)).length,0);
  r.api.simulate(1);const memory=plain(r.api.get().world.competitorMemory);assert.ok(Object.keys(memory).length>0);
  const rows=plain(r.api.competitors('ramen','東京'));assert.ok(rows.some(x=>x.playerSignal==='price_attack'&&x.strategicPosture));
  const snap=JSON.stringify(memory);r.api.competitors('ramen','東京');r.api.competitors('ramen','東京');assert.equal(JSON.stringify(plain(r.api.get().world.competitorMemory)),snap);
});

test('Phase 9 capex is constrained by management capacity and has delayed completion',()=>{
  const r=createRuntime();r.api.fresh('CAPEX DEPTH','ramen','東京');r.api.eval('state.company.cash=1000000000;');
  assert.equal(r.api.projectCapacity(),1);
  assert.equal(r.api.capex('ramen','renovation'),true);assert.equal(r.api.capex('ramen','automation'),false);
  r.api.simulate(7);let s=plain(r.api.get());const p=s.projects.find(x=>x.scope==='capex');const preCompletionBrand=s.company.businesses.ramen.brand;assert.equal(p.status,'in_progress');
  r.api.simulate(1);s=plain(r.api.get());assert.ok(s.company.businesses.ramen.brand>preCompletionBrand);assert.equal(s.projects.find(x=>x.scope==='capex').status,'completed');
});
