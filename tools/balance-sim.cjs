'use strict';
const {createRuntime}=require('../tests/harness.cjs');

const STRATEGIES=['conservative','low_price','premium','advertising','efficiency','expansion','diversified','leveraged'];

function act(r,strategy,turn){
  const a=r.api;
  if(strategy==='conservative'){
    a.eval(`state.company.businesses.ramen.adSpend=0;state.company.businesses.ramen.price=PILLARS.ramen.price;`);
  }else if(strategy==='low_price'){
    a.eval(`state.company.businesses.ramen.price=Math.round(PILLARS.ramen.price*.90);state.company.businesses.ramen.adSpend=200000;`);
  }else if(strategy==='premium'){
    a.eval(`state.company.businesses.ramen.price=Math.round(PILLARS.ramen.price*1.16);state.company.businesses.ramen.adSpend=250000;`);
    if(turn%4===0)a.invest('ramen','quality',500000);
  }else if(strategy==='advertising'){
    a.eval(`state.company.businesses.ramen.adSpend=650000;`);
    if(turn%6===0)a.invest('ramen','brand',500000);
  }else if(strategy==='efficiency'){
    a.eval(`state.company.businesses.ramen.adSpend=100000;`);
    if(turn%4===0)a.invest('ramen',turn%8===0?'digital':'efficiency',500000);
  }else if(strategy==='expansion'){
    if(turn%3===0)a.eval(`if(state.company.cash>5000000)openStore('ramen');`);
  }else if(strategy==='diversified'){
    const order=['conveni','gym','realEstateAgency','productVentures'];const id=order[Math.floor(turn/6)%order.length];
    if(turn%6===0)a.eval(`if(state.company.cash>15000000&&!state.company.businesses['${id}'])addBusiness('${id}');`);
    if(turn%4===0)a.eval(`if(state.company.cash>9000000&&state.company.businesses.conveni)openStore('conveni');`);
  }else if(strategy==='leveraged'){
    if(turn%8===0)a.eval(`if(state.company.debt<companyValue(state)*.25)borrowCompany();`);
    if(turn%3===0)a.eval(`if(state.company.cash>6000000)openStore('ramen');`);
  }
}

function runOne(strategy,seedIndex,weeks=1040){
  const r=createRuntime();r.api.fresh(`BOT-${seedIndex}`,'ramen',['東京','大阪','福岡','愛知'][seedIndex%4]);
  r.api.eval('state.company.cash+=12000000;');
  let turn=0;
  for(let elapsed=0;elapsed<weeks;elapsed+=13){
    if(r.api.get().gameOver)break;
    act(r,strategy,turn++);r.api.simulate(Math.min(13,weeks-elapsed));
    const errors=r.api.validate();if(errors.length)throw new Error(`${strategy}/${seedIndex}: ${errors.join(',')}`);
  }
  const s=r.api.get();
  return {strategy,seedIndex,survived:!s.gameOver,week:s.week,value:r.api.companyValue(),cash:s.company.cash,debt:s.company.debt,stores:s.company.stores.length,public:s.company.public,personal:r.api.personalNetWorth()};
}

function summarize(rows){
  const out={};
  for(const strategy of STRATEGIES){
    const xs=rows.filter(x=>x.strategy===strategy),n=xs.length;
    const avg=k=>xs.reduce((a,x)=>a+(Number(x[k])||0),0)/Math.max(1,n);
    out[strategy]={runs:n,survival:xs.filter(x=>x.survived).length/n,ipoRate:xs.filter(x=>x.public).length/n,avgValue:avg('value'),avgCash:avg('cash'),avgDebt:avg('debt'),avgStores:avg('stores'),avgPersonal:avg('personal')};
  }
  const wins={};for(const s of STRATEGIES)wins[s]=0;
  const seeds=[...new Set(rows.map(x=>x.seedIndex))];
  for(const seed of seeds){const xs=rows.filter(x=>x.seedIndex===seed);xs.sort((a,b)=>b.value-a.value);if(xs[0])wins[xs[0].strategy]++;}
  const dominant=Object.entries(wins).sort((a,b)=>b[1]-a[1])[0];
  return {strategies:out,wins,dominantStrategy:dominant?.[0]||null,dominantShare:dominant?dominant[1]/Math.max(1,seeds.length):0};
}

function runBalance({seeds=8,weeks=1040}={}){
  const rows=[];for(let seed=0;seed<seeds;seed++)for(const strategy of STRATEGIES)rows.push(runOne(strategy,seed,weeks));
  return {rows,summary:summarize(rows)};
}

if(require.main===module){
  const ci=process.argv.includes('--ci');const result=runBalance({seeds:ci?6:12,weeks:ci?520:1040});
  console.log(JSON.stringify(result.summary,null,2));
  if(!Number.isFinite(result.summary.dominantShare))process.exitCode=1;
  if(result.summary.dominantShare>.80)console.warn(`BALANCE WARNING: ${result.summary.dominantStrategy} wins ${(result.summary.dominantShare*100).toFixed(0)}% of seeds`);
}

module.exports={STRATEGIES,runOne,runBalance,summarize};
