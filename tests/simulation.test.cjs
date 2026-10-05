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


test('NG-0 migrates legacy saves into next-generation foundations',()=>{
  const r=createRuntime();const s=plain(r.api.fresh('NG MIGRATION'));
  assert.equal(s.schemaVersion,2);
  assert.ok(Array.isArray(s.ledger));assert.ok(Array.isArray(s.organization.employees));
  assert.ok(Array.isArray(s.supplyChain.orders));assert.ok(Array.isArray(s.publicUniverse.companies));
  assert.equal(r.api.validate().length,0);
});

test('NG-0 transaction journal rejects unbalanced transfers and stays deterministic',()=>{
  const a=createRuntime(),b=createRuntime();a.api.fresh('LEDGER');b.api.fresh('LEDGER');
  const entries=[{entity:'company',account:'cash',amount:-1000},{entity:'supplier',account:'receivable',amount:1000}];
  const ta=plain(a.api.recordTx('supplier_payment',entries,{supplier:'A'}));
  const tb=plain(b.api.recordTx('supplier_payment',entries,{supplier:'A'}));
  assert.deepEqual(ta,tb);assert.throws(()=>a.api.recordTx('bad',[{entity:'company',amount:-1}]));
});

test('NG-0 deterministic choice uses stable scoring and tie break',()=>{
  const a=createRuntime(),b=createRuntime();a.api.fresh('AI');b.api.fresh('AI');
  const rows=[{id:'a',utility:10},{id:'b',utility:10},{id:'c',utility:9}];
  assert.deepEqual(plain(a.api.choose('quarter:1',rows,'utility')),plain(b.api.choose('quarter:1',rows,'utility')));
});


test('NG-1 initializes workforce suppliers and inventory deterministically',()=>{
 const a=createRuntime(),b=createRuntime();a.api.fresh('SUPPLY');b.api.fresh('SUPPLY');a.api.ng1Ensure();b.api.ng1Ensure();
 assert.deepEqual(plain(a.api.get().organization),plain(b.api.get().organization));
 assert.deepEqual(plain(a.api.get().supplyChain),plain(b.api.get().supplyChain));
 const store=a.api.get().company.stores[0];assert.ok(store.workforce.required>=1);assert.ok(a.api.get().supplyChain.inventory[store.id].units>0);
});

test('NG-1 understaffing reduces realized store sales',()=>{
 const full=createRuntime(),low=createRuntime();full.api.fresh('STAFF');low.api.fresh('STAFF');full.api.ng1Ensure();low.api.ng1Ensure();
 const id=full.api.get().company.stores[0].id;const id2=low.api.get().company.stores[0].id;
 full.api.ng1Staff(id,full.api.get().company.stores[0].workforce.required);low.api.ng1Staff(id2,1);
 full.api.simulate(1);low.api.simulate(1);assert.ok(full.api.get().company.lastWeekRevenue>low.api.get().company.lastWeekRevenue);
});

test('NG-1 stockouts cap realized unit sales and replenishment orders arrive',()=>{
 const r=createRuntime();r.api.fresh('STOCK');r.api.ng1Ensure();const store=r.api.get().company.stores[0];
 r.api.eval('state.supplyChain.inventory[state.company.stores[0].id].units=1;');r.api.simulate(1);
 assert.ok(r.api.get().supplyChain.inventory[store.id].stockouts>0);assert.ok(r.api.get().supplyChain.orders.length>0);
 r.api.simulate(2);assert.ok(r.api.get().supplyChain.orders.some(x=>x.status==='received'));
});


test('NG-2..10 seeds a persistent deterministic public company universe',()=>{const a=createRuntime(),b=createRuntime();a.api.fresh('UNIVERSE');b.api.fresh('UNIVERSE');assert.equal(a.api.get().publicUniverse.companies.length,60);assert.deepEqual(plain(a.api.get().publicUniverse.companies),plain(b.api.get().publicUniverse.companies));a.api.simulate(13);b.api.simulate(13);assert.deepEqual(plain(a.api.get().publicUniverse.companies),plain(b.api.get().publicUniverse.companies));});
test('NG-4 ownership path supports stake building and tender control without mixing personal cash',()=>{const r=createRuntime();r.api.fresh('CONTROL');r.api.eval('state.company.cash=100000000000;state.personal.cash=1234567;');const id=r.api.get().publicUniverse.companies[0].id;const personal=r.api.get().personal.cash;assert.equal(r.api.ngBuyStake(id,.12),true);assert.equal(r.api.ngTender(id,.51),true);assert.equal(r.api.get().personal.cash,personal);assert.equal(r.api.get().publicUniverse.companies[0].status,'controlled');assert.ok(r.api.get().ng.integrations.length===1);});
test('NG-5 PMI synergy is delayed rather than instant',()=>{const r=createRuntime();r.api.fresh('PMI');r.api.eval('state.company.cash=100000000000;');const id=r.api.get().publicUniverse.companies[0].id;r.api.ngTender(id,.51);const before=r.api.get().publicUniverse.companies[0].ebitda;r.api.simulate(25);assert.equal(r.api.get().ng.integrations[0].status,'integrating');r.api.simulate(1);assert.equal(r.api.get().ng.integrations[0].status,'integrated');assert.ok(r.api.get().publicUniverse.companies[0].ebitda>before);});
test('NG-6 VC investment uses company capital and creates ownership',()=>{const r=createRuntime();r.api.fresh('VC');r.api.eval('state.company.cash=1000000000;');const v=r.api.ngVC()||r.api.get().ng.vc[0];assert.ok(v);assert.equal(r.api.ngInvestVC(v.id,10000000),true);const p=r.api.get().ng.vc.find(x=>x.id===v.id);assert.equal(p.status,'portfolio');assert.ok(p.ownership>0);});
test('NG-8 capital allocation changes the intended company balance-sheet bucket',()=>{const r=createRuntime();r.api.fresh('ALLOC');r.api.eval('state.company.cash=100000000;state.company.debt=20000000;');assert.equal(r.api.ngAllocate('debt',5000000),true);assert.equal(r.api.get().company.debt,15000000);assert.equal(r.api.get().company.cash,95000000);});
test('NG-10 release audit remains finite and bounded after 100 years',()=>{const r=createRuntime();r.api.fresh('NG CENTURY');r.api.eval('state.company.cash=1000000000000;state.company.debt=0;');r.api.simulate(5200);const a=plain(r.api.ngAudit());assert.equal(a.finite,true);assert.ok(a.saveBytes<5*1024*1024);assert.ok(a.companies>=60);assert.ok(a.companies<=180);});


test('NG VC lifecycle records start week and realizes company proceeds after maturity',()=>{const r=createRuntime(),a=r.api;a.fresh('NGVC','ramen','東京');a.eval('state.company.cash=1e9;ngSourceVC();');let s=a.get(),v=s.ng.vc[0];assert.equal(v.startWeek,s.week);assert.equal(a.ngInvestVC(v.id,20000000),true);a.eval("state.ng.vc[0].valuation=100000000;state.ng.vc[0].exitReady=true;");const before=a.get().company.cash;a.eval("ngExitVC(state.ng.vc[0].id)");s=a.get();assert.equal(s.ng.vc[0].status,'exited');assert.ok(s.company.cash>before);});


test('NG corporate M&A follows DD financing bid close and preserves personal cash',()=>{const r=createRuntime(),a=r.api;a.fresh('NGMA','ramen','東京');a.eval('state.company.cash=2e10;ngEnsureIntegrated(state);state.publicUniverse.companies[0].ownership.player=.10;');const before=a.get().personal.cash,target=a.get().publicUniverse.companies[0].id,id=a.ngStartMA(target);assert.ok(id);assert.equal(a.ngRunMADD(id),true);assert.equal(a.ngArrangeMAFinancing(id),true);assert.equal(a.ngSubmitMABid(id),true);assert.equal(a.ngCloseMA(id),true);const s=a.get(),d=s.ng.deals.find(x=>x.id===id),t=s.publicUniverse.companies.find(x=>x.id===target);assert.equal(d.status,'closed');assert.equal(t.status,'controlled');assert.equal(t.ownership.player,.51);assert.equal(s.personal.cash,before);assert.ok(s.ng.integrations.some(x=>x.dealId===id));});


test('NG shared universe links PE deal and ownership lifecycle to the same company',()=>{const r=createRuntime(),a=r.api;a.fresh('UNIVERSE','ramen','東京');a.eval("state.pe.unlocked=true;state.pe.funds=[{id:'Fund I',number:1,size:3e9,commitments:3e9,cash:3e9,invested:0,slots:5,investmentEndWeek:999,endWeek:1200,ddUsedYear:0}];state.pe.deals=[{id:'pe_link',name:'Legacy Target',businessID:'ramen',value:5e8,ebitda:5e7,status:'open',expires:99,dd:false}];ngLinkPEUniverse(state);");let s=a.get(),d=s.pe.deals[0];assert.ok(d.universeCompanyId);const cid=d.universeCompanyId;a.eval("state.pe.portfolio=[{id:'pe_link',name:state.pe.deals[0].name,businessID:'ramen',fundId:'Fund I',entryWeek:1,age:1,entryValue:state.pe.deals[0].value,value:state.pe.deals[0].value,equityInvested:2e8,debt:2e8,improvement:0,cash:1e7,status:'held',universeCompanyId:state.pe.deals[0].universeCompanyId}];ngSyncPEOwnership(state);");s=a.get();assert.equal(s.publicUniverse.companies.find(x=>x.id===cid).status,'private_pe');a.eval("state.pe.portfolio[0].status='exited';state.pe.portfolio[0].exitValue=900000000;ngSyncPEOwnership(state);");s=a.get();assert.equal(s.publicUniverse.companies.find(x=>x.id===cid).status,'listed');});


test('NG VC startup keeps one company identity from seed investment through IPO exit',()=>{const r=createRuntime(),a=r.api;a.fresh('VCUNIVERSE','ramen','東京');a.eval('state.company.cash=1e9;ngSourceVC();');let s=a.get(),v=s.ng.vc[0],cid=v.universeCompanyId,c=s.publicUniverse.companies.find(x=>x.id===cid);assert.ok(c);assert.equal(c.status,'startup');const personal=s.personal.cash;assert.equal(a.ngInvestVC(v.id,20000000),true);s=a.get();c=s.publicUniverse.companies.find(x=>x.id===cid);assert.equal(c.status,'vc_backed');assert.ok(c.ownership.player>0);assert.equal(s.personal.cash,personal);a.eval("state.ng.vc[0].valuation=120000000;state.ng.vc[0].exitReady=true;ngExitVC(state.ng.vc[0].id);");s=a.get();c=s.publicUniverse.companies.find(x=>x.id===cid);assert.equal(c.status,'listed');assert.equal(c.public,true);assert.equal(c.ownership.player,0);assert.equal(s.ng.vc[0].universeCompanyId,cid);});


test('NG company universe compaction preserves active VC company references',()=>{const r=createRuntime(),a=r.api;a.fresh('BOUNDVC','ramen','東京');a.eval("state.company.cash=1e12;for(let i=0;i<200;i++){state.week=i*13+1;const v=ngSourceVC();if(v&&i===199)ngInvestVC(v.id,10000000);if(v&&i<199){v.status='exited';const c=state.publicUniverse.companies.find(x=>x.id===v.universeCompanyId);if(c){c.status='listed';c.public=true;c.ipoWeek=state.week;}}}ngBoundCompanyUniverse(state);");const s=a.get(),active=s.ng.vc.find(v=>v.status==='portfolio');assert.ok(s.publicUniverse.companies.length<=180);assert.ok(active);assert.ok(s.publicUniverse.companies.some(c=>c.id===active.universeCompanyId));});


test('NG universe compaction archives stale uninvested startups while preserving history',()=>{const r=createRuntime(),a=r.api;a.fresh('ARCHIVEVC','ramen','東京');a.eval("for(let i=0;i<190;i++){state.week=i*13+1;ngSourceVC();}ngBoundCompanyUniverse(state);");const s=a.get();assert.ok(s.publicUniverse.companies.length<=180);const archived=s.ng.vc.filter(v=>v.companyArchive);assert.ok(archived.length>0);assert.ok(archived.every(v=>v.status==='passed'));assert.ok(archived.every(v=>v.companyArchive.id===v.universeCompanyId));});


test('NG company lifecycle ledger records ownership and control transitions',()=>{const r=createRuntime(),a=r.api;a.fresh('LIFECYCLE','ramen','東京');a.eval('state.company.cash=1e12;');const id=a.get().publicUniverse.companies[0].id;assert.equal(a.ngBuyStake(id,.12),true);assert.equal(a.ngTender(id,.51),true);const co=a.get().publicUniverse.companies.find(c=>c.id===id);assert.equal(co.status,'controlled');assert.equal(co.control.controller,'player');assert.equal(co.control.pct,.51);assert.ok(co.events.some(e=>e.type==='stake_purchase'));assert.ok(co.events.some(e=>e.type==='status_change'&&e.to==='controlled'));});

test('NG PE lifecycle records private and relisted transitions on one company',()=>{const r=createRuntime(),a=r.api;a.fresh('PELIFE','ramen','東京');a.eval("const c=state.publicUniverse.companies[0];state.pe.deals=[{id:'pd1',universeCompanyId:c.id}];state.pe.portfolio=[{id:'pd1',fundId:'f1',status:'held',universeCompanyId:c.id,value:c.revenue,ebitda:c.ebitda,cash:1e7}];ngSyncPEOwnership(state);state.pe.portfolio[0].status='exited';state.pe.portfolio[0].exitValue=c.price*c.shares;ngSyncPEOwnership(state);");const co=a.get().publicUniverse.companies[0];assert.equal(co.status,'listed');assert.ok(co.events.some(e=>e.type==='status_change'&&e.to==='private_pe'));assert.ok(co.events.some(e=>e.type==='status_change'&&e.to==='listed'&&e.method==='pe_exit'));});


test('NG1 staffing payroll is causal in weekly store economics',()=>{const r=createRuntime(),a=r.api;a.fresh('PAYROLL','ramen','東京');const id=a.get().company.stores[0].id;a.eval("const st=state.company.stores[0];ng1EnsureStore(state,st);st.workforce.assigned=st.workforce.required;st.workforce.wageWeekly=10000;");const low=a.eval("(()=>{const st=state.company.stores[0];return runStore(state,st).cost})()");a.eval("state.supplyChain.inventory[state.company.stores[0].id].units=100000;state.supplyChain.inventory[state.company.stores[0].id].assetValue=100000*PILLARS.ramen.unitCost;state.company.stores[0].workforce.wageWeekly=20000;");const high=a.eval("(()=>runStore(state,state.company.stores[0]).cost)()");assert.ok(high>low);});

test('NG1 received procurement converts company cash into inventory asset without personal cash movement',()=>{const r=createRuntime(),a=r.api;a.fresh('PROCURE','ramen','東京');a.eval("state.company.cash=1e9;const st=state.company.stores[0];ng1EnsureStore(state,st);state.supplyChain.inventory[st.id].units=0;state.supplyChain.inventory[st.id].assetValue=0;const o=ng1OrderForStore(state,st);o.arrivalWeek=state.week;");const before=a.get(),personal=before.personal.cash,cash=before.company.cash;a.eval("ng1ReceiveOrders(state)");const s=a.get(),inv=s.supplyChain.inventory[s.company.stores[0].id];assert.ok(s.company.cash<cash);assert.ok(inv.units>0);assert.ok(inv.assetValue>0);assert.equal(s.personal.cash,personal);});


test('NG1 inventory COGS is recognized in profit but not paid twice in company cash',()=>{const r=createRuntime(),a=r.api;a.fresh('COGSBRIDGE','ramen','東京');a.eval("state.company.cash=1e9;const st=state.company.stores[0];ng1EnsureStore(state,st);state.supplyChain.inventory[st.id].units=100000;state.supplyChain.inventory[st.id].assetValue=100000*PILLARS.ramen.unitCost;state.supplyChain.orders=[];");const before=a.get().company.cash;a.eval("processCompanyWeek(state)");const s=a.get();assert.ok(Number.isFinite(s.company.cash));assert.ok(Number.isFinite(s.company.lastWeekProfit));assert.equal(s.supplyChain._weeklyInventoryExpense,0);assert.ok(s.company.cash>before-5e7);});


test('NG1 default staffed payroll preserves legacy store wage envelope',()=>{const r=createRuntime(),a=r.api;a.fresh('WAGECAL','ramen','東京');a.eval("const st=state.company.stores[0];ng1EnsureStore(state,st);");const s=a.get(),st=s.company.stores[0];assert.ok(Math.abs(st.workforce.assigned*st.workforce.wageWeekly-52500)<1);});


test('NG1 individual employees are deterministic and aggregate into store workforce',()=>{const r1=createRuntime(),r2=createRuntime();r1.api.fresh('PEOPLE','ramen','東京');r2.api.fresh('PEOPLE','ramen','東京');r1.api.eval("ng1EnsureAll(state)");r2.api.eval("ng1EnsureAll(state)");const a=r1.api.get(),b=r2.api.get(),id=a.company.stores[0].id,id2=b.company.stores[0].id,ea=a.organization.employees.filter(e=>e.storeId===id&&e.status==='active'),eb=b.organization.employees.filter(e=>e.storeId===id2&&e.status==='active'),shape=xs=>xs.map(({role,skill,training,morale,wageWeekly,status,hiredWeek})=>({role,skill,training,morale,wageWeekly,status,hiredWeek}));assert.equal(ea.length,3);assert.deepEqual(shape(ea),shape(eb));assert.equal(ea.filter(e=>e.role==='manager').length,1);assert.ok(ea.every(e=>Number.isFinite(e.skill)&&Number.isFinite(e.wageWeekly)));assert.equal(a.company.stores[0].workforce.assigned,ea.length);});

test('NG1 employee payroll remains company-only and preserves calibrated initial wage',()=>{const r=createRuntime(),a=r.api;a.fresh('PEOPLEPAY','ramen','東京');a.eval("ng1EnsureAll(state)");const s=a.get(),id=s.company.stores[0].id,emps=s.organization.employees.filter(e=>e.storeId===id&&e.status==='active');assert.ok(Math.abs(emps.reduce((n,e)=>n+e.wageWeekly,0)-52500)<1);const personal=s.personal.cash;a.eval("processCompanyWeek(state)");assert.equal(a.get().personal.cash,personal);});
