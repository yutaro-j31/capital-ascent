'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createRuntime}=require('./harness.cjs');

function seedHeldPortfolio(a,rows){
  const json=JSON.stringify(rows);
  a.eval("const f=state.pe.funds[0]; state.pe.portfolio="+json+".map((p,i)=>Object.assign({fundId:f.id,status:'held',entryWeek:1,age:80,businessID:'ramen',entryValue:500000000,value:500000000,enterpriseValue:500000000,equityInvested:220000000,fundCostBasis:220000000,debt:240000000,leverage:.48,entryMultiple:8,ebitda:62500000,quality:60,risk:45,margin:.15,organicGrowth:.04,cyclicality:40,thesis:'Operational improvement',improvement:20,cash:10000000,initiatives:[]},p));");
}

test('an interested LP exposes an individual DDQ response action instead of a dead waiting state',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('LP DDQ FLOW','ramen','東京');
  a.eval('state.pe.unlocked=true;state.personal.cash=2000000000;state.pe.lpTrust=95;state.pe.network=95;');
  assert.equal(a.fundraiseStart(2900000000,100000000),true);
  const lp=a.get().pe.fundraising.lpProspects[0];
  a.eval('state.pe.fundraising.lpProspects[0].relationship=98;');
  assert.equal(a.fundraiseSolicit(lp.id),true);
  let html=a.peHtml();
  assert.match(html,new RegExp('data-m24-lp-ddq="'+lp.id+'"'));
  assert.match(html,/関心あり/);
  assert.equal(a.lpDdq(lp.id),true);
  assert.equal(a.get().pe.fundraising.lpProspects[0].status,'approved');
  html=a.peHtml();
  assert.match(html,/DDQ通過/);
});

test('deal pipeline scales from 2 to 6 open deals as the network reaches 100',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('NETWORK PIPELINE','ramen','東京');
  a.eval('state.pe.unlocked=true;state.personal.cash=2000000000;');
  assert.equal(a.raiseFund(),true);
  a.eval('state.pe.deals=[];state.pe.network=0;');
  a.sourceDeals();
  assert.equal(a.dealTarget(),2);
  assert.equal(a.get().pe.deals.filter(d=>d.status==='open').length,2);
  a.eval('state.pe.deals=[];state.pe.network=100;');
  a.sourceDeals();
  assert.equal(a.dealTarget(),6);
  assert.equal(a.get().pe.deals.filter(d=>d.status==='open').length,6);
  const html=a.peHtml();
  assert.match(html,/Network 100/);
  assert.match(html,/6件/);
});

test('PE screen shows exact value-creation costs, turnaround cost, fund liquidity and successor-fund requirements',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('PE CLARITY','ramen','東京');
  a.eval('state.pe.unlocked=true;state.personal.cash=2000000000;state.company.cash=1000000000;');
  assert.equal(a.raiseFund(),true);
  seedHeldPortfolio(a,[{id:'clarity1',name:'明示テスト社',entryValue:1000000000,value:1000000000,enterpriseValue:1000000000,debt:500000000,cash:20000000,ebitda:120000000,equityInvested:400000000,fundCostBasis:400000000}]);
  const html=a.peHtml();
  assert.match(html,/コスト改善 · 2,500万 \/ 8週/);
  assert.match(html,/人材強化 · 3,500万 \/ 12週/);
  assert.match(html,/設備投資 · 5,000万 \/ 16週/);
  assert.match(html,/販路拡大 · 3,000万 \/ 10週/);
  assert.match(html,/再建 · 3,000万 \/ 26週/);
  assert.match(html,/ファンド別の投資余力/);
  assert.match(html,/ファンド手元現金/);
  assert.match(html,/現在追加Call可能/);
  assert.match(html,/理論上の投資余力/);
  assert.match(html,/次号ファンド解禁条件/);
  assert.match(html,/回収済倍率 1\.20x以上/);
  assert.match(html,/投資済み比率 80%以上/);
  assert.match(html,/外部投資家からの信頼 45以上/);
  assert.match(html,/あと /);
});

test('a PE portfolio company can be acquired by the operating company at fund fair value without mixing cash buckets',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('PE TO COMPANY','ramen','東京');
  a.eval('state.pe.unlocked=true;state.personal.cash=2000000000;state.company.cash=1000000000;');
  assert.equal(a.raiseFund(),true);
  seedHeldPortfolio(a,[{id:'transfer1',name:'移管テスト社',value:500000000,enterpriseValue:500000000,debt:200000000,cash:20000000,equityInvested:220000000,fundCostBasis:220000000,ebitda:70000000}]);
  const price=a.transferPrice('transfer1');
  assert.equal(price,320000000);
  const companyBefore=a.get().company.cash;
  const personalBefore=a.get().personal.cash;
  const distributedBefore=a.get().pe.funds[0].distributed;
  const result=a.transferPeToCompany('transfer1');
  assert.ok(result);
  const s=a.get(),p=s.pe.portfolio.find(x=>x.id==='transfer1');
  const sub=s.company.subsidiaryPortfolio.find(x=>x.sourcePortfolioId==='transfer1');
  assert.equal(s.company.cash,companyBefore-price);
  assert.equal(p.status,'exited');
  assert.equal(p.exitType,'sale-to-player-company');
  assert.ok(sub);
  assert.equal(sub.acquisitionPrice,price);
  assert.equal(sub.debt,200000000);
  assert.equal(s.pe.funds[0].distributed,distributedBefore+price);
  assert.ok(s.personal.cash>personalBefore);
  assert.equal(s.pe.relatedPartyTransfers.length,1);
});

test('all held companies in a fund can be acquired by the operating company in one fund-level transaction',()=>{
  const r=createRuntime(),a=r.api;
  a.fresh('FUND TO COMPANY','ramen','東京');
  a.eval('state.pe.unlocked=true;state.personal.cash=2000000000;state.company.cash=2000000000;');
  assert.equal(a.raiseFund(),true);
  seedHeldPortfolio(a,[
    {id:'bulk1',name:'一括A社',value:400000000,enterpriseValue:400000000,debt:160000000,cash:10000000,equityInvested:180000000},
    {id:'bulk2',name:'一括B社',businessID:'gym',value:300000000,enterpriseValue:300000000,debt:120000000,cash:5000000,equityInvested:140000000,margin:.18,ebitda:54000000}
  ]);
  const total=a.transferPrice('bulk1')+a.transferPrice('bulk2');
  const before=a.get().company.cash;
  assert.equal(a.transferFundToCompany('F1'),true);
  const s=a.get();
  assert.equal(s.company.cash,before-total);
  assert.equal(s.pe.portfolio.filter(p=>p.status==='held').length,0);
  assert.equal(s.company.subsidiaryPortfolio.filter(x=>x.status==='held'&&x.source==='pe-portfolio').length,2);
  assert.equal(s.pe.relatedPartyTransfers.length,2);
  assert.match(a.peHtml(),/投資案件のExit実績/);
});
