'use strict';

// NG-1 — people, inventory and supply-chain economics.
const NG1_STOCKED_BUSINESSES=new Set(['ramen','conveni']);
function ng1StoreProfile(id){return id==='conveni'?{staff:4,wage:48750,cover:2.2,waste:.018}:{staff:3,wage:52500,cover:1.6,waste:.008};}
function ng1EnsureStore(s,store){
  ensureAdvancedState(s);const p=ng1StoreProfile(store.businessID);
  if(!store.workforce)store.workforce={required:p.staff,assigned:p.staff,wageWeekly:p.wage,training:50,morale:60};
  if(!Number.isFinite(store.workforce.required))store.workforce.required=p.staff;
  if(!Number.isFinite(store.workforce.assigned))store.workforce.assigned=p.staff;
  if(!Number.isFinite(store.workforce.wageWeekly))store.workforce.wageWeekly=p.wage;
  if(NG1_STOCKED_BUSINESSES.has(store.businessID)){
    const key=store.id;if(!s.supplyChain.inventory[key]){const units=Math.ceil((PILLARS[store.businessID].baseDemand||100)*p.cover),uc=PILLARS[store.businessID].unitCost;s.supplyChain.inventory[key]={units,waste:0,stockouts:0,assetValue:units*uc};}else if(!Number.isFinite(s.supplyChain.inventory[key].assetValue))s.supplyChain.inventory[key].assetValue=s.supplyChain.inventory[key].units*PILLARS[store.businessID].unitCost;
    if(!s.supplyChain.suppliers.some(x=>x.businessID===store.businessID))s.supplyChain.suppliers.push({id:'supplier_'+store.businessID,businessID:store.businessID,name:PILLARS[store.businessID].name+'標準仕入先',costIndex:1,reliability:.94,leadWeeks:1});
  }
  return store;
}
function ng1EnsureAll(s){for(const store of s.company.stores||[])ng1EnsureStore(s,store);}
function ng1ReceiveOrders(s){for(const o of s.supplyChain.orders){if(o.status==='ordered'&&o.arrivalWeek<=s.week){const inv=s.supplyChain.inventory[o.storeId],cost=o.units*o.unitCost;if(!inv)continue;if(s.company.cash<cost){o.arrivalWeek=s.week+1;o.paymentDelayed=(o.paymentDelayed||0)+1;continue;}s.company.cash-=cost;inv.units+=o.units;inv.assetValue=(Number(inv.assetValue)||0)+cost;o.status='received';o.receivedWeek=s.week;o.paid=cost;if(typeof recordTransaction==='function')recordTransaction('inventory_purchase',[{entity:'company',account:'cash',amount:-cost},{entity:'company',account:'inventory_asset',amount:cost}],{orderId:o.id,storeId:o.storeId});}}}
function ng1OrderForStore(s,store){if(!NG1_STOCKED_BUSINESSES.has(store.businessID))return null;const inv=s.supplyChain.inventory[store.id],p=PILLARS[store.businessID],profile=ng1StoreProfile(store.businessID);const target=Math.ceil(Math.max(p.baseDemand,store.lastUnits||0)*profile.cover);const inbound=s.supplyChain.orders.filter(o=>o.storeId===store.id&&o.status==='ordered').reduce((a,o)=>a+o.units,0);const qty=Math.max(0,target-inv.units-inbound);if(qty<=0)return null;const supplier=s.supplyChain.suppliers.find(x=>x.businessID===store.businessID);const unitCost=p.unitCost*(supplier?.costIndex||1);const o={id:uid('po',store.id+':'+s.week+':'+s.supplyChain.orders.length),storeId:store.id,businessID:store.businessID,supplierId:supplier?.id||'',units:qty,unitCost,orderedWeek:s.week,arrivalWeek:s.week+Math.max(1,supplier?.leadWeeks||1),status:'ordered'};s.supplyChain.orders.push(o);return o;}
function ng1StaffFactor(store){const w=store.workforce||ng1StoreProfile(store.businessID);return clamp((w.assigned||0)/Math.max(1,w.required||1),.45,1.08)*(0.9+clamp(Number(w.training)||50,0,100)/500);}
function ng1ConsumeStock(s,store,demandUnits){if(!NG1_STOCKED_BUSINESSES.has(store.businessID))return {sold:demandUnits,cogs:null,wasteCost:0};const inv=s.supplyChain.inventory[store.id],before=Math.max(0,inv.units),avg=before>0?(Number(inv.assetValue)||0)/before:PILLARS[store.businessID].unitCost;const sold=Math.min(demandUnits,Math.floor(inv.units));if(sold<demandUnits)inv.stockouts+=(demandUnits-sold);inv.units-=sold;const profile=ng1StoreProfile(store.businessID);const waste=Math.min(inv.units,Math.floor(inv.units*profile.waste));inv.units-=waste;inv.waste+=waste;const cogs=sold*avg,wasteCost=waste*avg;inv.assetValue=Math.max(0,(Number(inv.assetValue)||0)-cogs-wasteCost);return {sold,cogs,wasteCost};}
function ng1BeforeCompanyWeek(s){ng1EnsureAll(s);ng1ReceiveOrders(s);for(const store of s.company.stores)ng1OrderForStore(s,store);}
function ng1StoreEconomics(s,store,result){ng1EnsureStore(s,store);const factor=ng1StaffFactor(store),legacyWage=PILLARS[store.businessID].wage||0,payroll=Math.max(0,store.workforce.assigned*store.workforce.wageWeekly);if(store.businessID==='gym'||store.businessID==='realEstateAgency')return {...result,revenue:result.revenue*factor,cost:Math.max(0,result.cost-legacyWage)+payroll,units:Math.round(result.units*factor)};if(!NG1_STOCKED_BUSINESSES.has(store.businessID))return result;const desired=Math.max(0,Math.round(result.units*factor));const stock=ng1ConsumeStock(s,store,desired);const price=store.priceOverride||s.company.businesses[store.businessID].price;const legacyVariable=result.units?Math.max(0,result.cost-(PILLARS[store.businessID].fixed||0)-legacyWage-store.rent-(s.company.businesses[store.businessID].adSpend/Math.max(1,s.company.stores.filter(x=>x.businessID===store.businessID).length))-(store.businessID==='conveni'?result.revenue*(.025+Math.max(0,s.company.businesses.conveni.pbRatio-.3)*.03):0)):0;return {revenue:stock.sold*price,cost:Math.max(0,result.cost-legacyVariable-legacyWage)+stock.cogs+stock.wasteCost+payroll,units:stock.sold};}
function ng1SetStaff(storeId,assigned){const store=state.company.stores.find(x=>x.id===storeId);if(!store)return false;ng1EnsureStore(state,store);store.workforce.assigned=clamp(Math.floor(Number(assigned)||0),0,store.workforce.required*2);return true;}

// Attach NG-1 to the authoritative weekly/store paths without duplicating cash mutation.
const _ng1LegacyRunStore=runStore;
runStore=function(s,store){ng1EnsureStore(s,store);return ng1StoreEconomics(s,store,_ng1LegacyRunStore(s,store));};
const _ng1LegacyProcessCompanyWeek=processCompanyWeek;
processCompanyWeek=function(s){ng1BeforeCompanyWeek(s);return _ng1LegacyProcessCompanyWeek(s);};
