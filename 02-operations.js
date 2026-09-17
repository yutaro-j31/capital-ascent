function marketingLift(adSpend){return 1+Math.log1p(Math.max(0,Number(adSpend)||0)/50000)*.08;}
function runStore(s,store){const b=s.company.businesses[store.businessID], p=PILLARS[store.businessID];const price=store.priceOverride||b.price;const sibling=s.company.stores.filter(x=>x.businessID===store.businessID&&x.region===store.region).length-1;const cannibal=Math.pow(.82,sibling);const macro=1+s.macro.cycle*.08;const quality=1+(b.quality-50)/120;const brand=1+(b.brand-45)/150;const eff=1+(b.efficiency-35)/220;const priceSens=Math.pow(p.price/price,1.25);const hours=.85+store.operatingHours/80;const marketing=marketingLift(b.adSpend);
  if(store.businessID==='gym'){
    const occ=store.members/store.capacity, strat=b.gymStrategy==='premium'?0.8:b.gymStrategy==='offPeak'?1.12:1;const adds=Math.max(0,Math.round((15+store.traffic*16+ b.brand*.12)*strat*marketing*(occ>.8?.55:1)*(1+s.macro.cycle*.05)+noise(`gymadd:${store.id}:${s.week}`,5)));const churnRate=clamp(.025+(price/p.price-1)*.025+(occ>.9?.035:0)-(b.quality-50)/2500,.008,.11);const churn=Math.round(store.members*churnRate);store.members=clamp(store.members+adds-churn,0,store.capacity);const revenue=store.members*price;const variable=revenue*.18;const cost=variable+p.fixed+p.wage+store.rent+b.adSpend/Math.max(1,s.company.stores.filter(x=>x.businessID===store.businessID).length);return {revenue,cost,units:store.members};
  }
  if(store.businessID==='realEstateAgency'){
    if(!store.pipeline)store.pipeline=[];const leads=Math.max(0,Math.round((p.baseDemand/4)*store.traffic*(1+b.brand/140)*marketing*(1+s.macro.realEstate*.16)+noise(`relead:${store.id}:${s.week}`,2)));
    for(let i=0;i<leads;i++) if(store.pipeline.length<24)store.pipeline.push({age:0,segment:['residential','luxury','investment','corporate'][hash32(`${store.id}:${s.week}:${i}`)%4]});
    let closings=0,fee=0,next=[];for(const q of store.pipeline){q.age++;const prob=.035+.018*(b.quality/100)+.012*(b.digital/100)+.02*(q.age>5?1:0);if(u01(`close:${store.id}:${s.week}:${q.age}:${q.segment}`)<prob){closings++;const base={residential:1150000,luxury:2400000,investment:1800000,corporate:3600000}[q.segment];fee+=base*(.9+.25*u01(`fee:${store.id}:${s.week}:${q.age}`));}else if(q.age<18)next.push(q);}store.pipeline=next;const revenue=fee;const cost=p.fixed+p.wage+store.rent+leads*18000+b.adSpend/Math.max(1,s.company.stores.filter(x=>x.businessID===store.businessID).length);return {revenue,cost,units:closings};
  }
  let demand=p.baseDemand*store.traffic*cannibal*macro*quality*brand*eff*priceSens*hours*marketing;
  if(store.businessID==='ramen')demand*=.9+b.menuBuzz/500;
  if(store.businessID==='conveni'){
    const samePref=s.company.stores.filter(x=>x.businessID==='conveni'&&x.region===store.region).length;demand*=1+Math.min(.18,(samePref-1)*.045)+b.pbRatio*.15;
  }
  const units=Math.max(0,Math.round(demand*(.96+noise(`demand:${store.id}:${s.week}`,.08))));let unitCost=p.unitCost*(1+(b.quality-50)/900)*(1-Math.min(.2,b.efficiency/350));
  if(store.businessID==='conveni'){const chain=s.company.stores.filter(x=>x.businessID==='conveni').length;unitCost*=1-Math.min(.12,Math.log2(chain+1)*.022);unitCost*=1-b.pbRatio*.06;}
  const revenue=units*price;const waste=store.businessID==='conveni'?revenue*(.025+Math.max(0,b.pbRatio-.3)*.03):0;const cost=units*unitCost+p.fixed+p.wage+store.rent+waste+b.adSpend/Math.max(1,s.company.stores.filter(x=>x.businessID===store.businessID).length);return {revenue,cost,units};
}
function runProduct(s,b){let p=b.product;if(!p){return {revenue:0,cost:PILLARS.productVentures.fixed+PILLARS.productVentures.wage,units:0};}
  const marketing=marketingLift(b.adSpend);const awGrowth=(35+b.brand*.65+b.digital*.55)*marketing*(1+s.macro.cycle*.08);p.awareness=Math.max(0,p.awareness+awGrowth*(.9+noise(`aw:${s.week}`,.12)));p.registrations+=Math.max(0,p.awareness*.008*(b.quality/70));p.mau=Math.min(p.registrations,p.mau*.96+p.registrations*.04*(1+b.digital/150));const conv=clamp(.08+(b.quality-50)/600-(b.price/980-1)*.04,.025,.22);p.paid=p.mau*conv;p.techDebt=clamp(p.techDebt+.25-b.efficiency/500,0,100);const revenue=p.paid*b.price*4.33;const server=p.mau*35;const cost=PILLARS.productVentures.fixed+PILLARS.productVentures.wage+server+b.adSpend+Math.max(0,p.techDebt-60)*3000;return {revenue,cost,units:Math.round(p.paid)};
}
function processCompanyWeek(s){let rev=0,cost=0,units=0;for(const store of s.company.stores){const r=runStore(s,store);store.lastRevenue=r.revenue;store.lastProfit=r.revenue-r.cost;store.lastUnits=r.units;rev+=r.revenue;cost+=r.cost;units+=r.units;}
  const it=s.company.businesses.productVentures;if(it){const r=runProduct(s,it);rev+=r.revenue;cost+=r.cost;}
  const interest=s.company.debt*(.035+s.macro.rate)/52;cost+=interest;const profit=rev-cost;s.company.cash+=profit;s.company.lastWeekRevenue=rev;s.company.lastWeekProfit=profit;s.company.cumulativeProfit+=profit;
  for(const b of Object.values(s.company.businesses)){b.menuBuzz=Math.max(15,b.menuBuzz*.992);b.brand=clamp(b.brand+Math.log1p(Math.max(0,b.adSpend)/50000)*.045-.025,0,100);}
  if(s.company.cash< -3000000){s.gameOver=true;log('会社現金が危険水準を割り込み、事業継続不能となった。','bad');}
}
