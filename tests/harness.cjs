'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.resolve(__dirname,'..');
const RUNTIME_FILES=[
  '01-core.js','02-operations.js','03-markets-pe.js','04-finance.js','05-ui-core.js','06-ui-extra.js',
  '07-map-flow.js','08-city-world.js','10-foundation.js','11-city-economics.js','12-simulation-depth.js','13-endgame-depth.js','15-balance-calibration.js','14-ui-roadmap.js','16-phase9-management.js'
];

function createStorage(){
  const m=new Map();
  return {getItem:k=>m.has(String(k))?m.get(String(k)):null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(String(k)),clear:()=>m.clear(),_map:m};
}

function createRuntime(){
  const storage=createStorage();
  const app={innerHTML:''};
  const doc={
    documentElement:{dataset:{}},
    getElementById:id=>id==='app'?app:{value:'',innerHTML:''},
    querySelectorAll:()=>[],querySelector:()=>null,
    createElement:()=>({click(){},set href(v){this._href=v;},set download(v){this._download=v;}})
  };
  const context={
    console,Math,JSON,Date,Object,Array,Number,String,Boolean,Map,Set,WeakMap,WeakSet,RegExp,Error,TypeError,
    parseInt,parseFloat,isNaN,Infinity,NaN,
    document:doc,localStorage:storage,
    window:{scrollTo(){}},navigator:{userAgent:'node-test'},
    alert(){},confirm(){return true;},prompt(_m,d){return d==null?'0':String(d);},
    requestAnimationFrame(cb){cb();return 1;},cancelAnimationFrame(){},setTimeout,clearTimeout,
    Blob:globalThis.Blob,URL:{createObjectURL(){return 'blob:test';},revokeObjectURL(){}},
    FileReader:function(){this.readAsText=()=>{};},
  };
  context.globalThis=context;
  vm.createContext(context);
  for(const file of RUNTIME_FILES){
    const src=fs.readFileSync(path.join(ROOT,file),'utf8');
    vm.runInContext(src,context,{filename:file});
  }
  vm.runInContext(`
    globalThis.__testApi={
      fresh:(name='TEST HOLDINGS',pillar='ramen',region='東京')=>{state=freshState(name,pillar,region);ensureAdvancedState(state);return state;},
      get:()=>state,
      snapshot:()=>JSON.stringify(state),
      simulate:(weeks)=>{for(let i=0;i<weeks;i++){if(state.gameOver)break;state.week++;state.year=Math.floor((state.week-1)/52)+1;state.season=Math.floor(((state.week-1)%52)/13)+1;macroStep(state);processCompanyWeek(state);updateMicrocaps(state);generatePeDeals(state);servicePE(state);checkEndings();}return state;},
      validate:()=>validateState(state),
      save:()=>save(),load:()=>load(),migrate:x=>migrateState(x),
      companyValue:()=>companyValue(state),personalNetWorth:()=>personalNetWorth(state),
      sites:(id,region)=>propertyCandidates(id,region),pressure:(id,region,p)=>competitionPressureAt(id,region,p),
      invest:(id,kind,amt)=>investBusiness(id,kind,amt),policy:(id,mode)=>setBusinessPolicy(id,mode),
      autonomy:(id,level)=>setManagementAutonomy(id,level),reviewCadence:(id,c)=>setManagementReviewCadence(id,c),
      capex:(id,kind,cost)=>scheduleCapexProject(id,kind,cost),projectCapacity:()=>projectCapacity(state),
      competitors:(id,region)=>cityCompetitors(id,region),signal:(id,region)=>playerSignalFor(state,id,region),
      acquireSub:()=>acquireSubsidiary(),sellSub:()=>sellSubsidiary(),
      dd:id=>ddDeal(id),acquirePe:id=>acquireDeal(id),improvePe:(id,k)=>improvePortfolio(id,k),exitPe:id=>exitPortfolio(id),
      compact:()=>compactStateForSave(state),exportText:()=>exportSaveText(),
      eval:(code)=>eval(code)
    };
  `,context);
  return {context,api:context.__testApi,storage,app};
}

module.exports={createRuntime,RUNTIME_FILES,ROOT};
