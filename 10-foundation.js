'use strict';

// Roadmap Phase 0: durable state, migrations, backups and invariant helpers.
const SAVE_SCHEMA_VERSION = 2;
const SAVE_BACKUP_1 = `${SAVE_KEY}_backup_1`;
const SAVE_BACKUP_2 = `${SAVE_KEY}_backup_2`;

function ensureAdvancedState(s){
  if(!s||typeof s!=='object')return s;
  s.version=1; // preserve the public v1 save contract; schemaVersion handles migrations.
  s.schemaVersion=SAVE_SCHEMA_VERSION;
  s.history=s.history||{};
  s.history.companyWeeks=Array.isArray(s.history.companyWeeks)?s.history.companyWeeks:[];
  s.history.briefs=Array.isArray(s.history.briefs)?s.history.briefs:[];
  s.projects=Array.isArray(s.projects)?s.projects:[];
  s.management=s.management||{policies:{},delegationLevel:0};
  s.management.policies=s.management.policies||{};
  s.world=s.world||{events:[],eventCursor:0};
  s.world.events=Array.isArray(s.world.events)?s.world.events:[];
  s.company=s.company||{};
  s.company.subsidiaryPortfolio=Array.isArray(s.company.subsidiaryPortfolio)?s.company.subsidiaryPortfolio:[];
  const heldSubsidiaries=s.company.subsidiaryPortfolio.filter(x=>x.status!=='sold').length;
  s.company.subsidiaries=s.company.subsidiaryPortfolio.length?heldSubsidiaries:Number(s.company.subsidiaries||0);
  s.pe=s.pe||{};
  s.pe.initiatives=Array.isArray(s.pe.initiatives)?s.pe.initiatives:[];
  s.ui=s.ui||{};
  s.ui.region=s.ui.region||'東京';
  for(const [id,b] of Object.entries(s.company.businesses||{})){
    if(!s.management.policies[id])s.management.policies[id]={mode:'manual',delegated:false};
    if(!Number.isFinite(b.price))b.price=PILLARS[id]?.price||100;
    if(!Number.isFinite(b.adSpend))b.adSpend=0;
  }
  // Bound long-run state. Detailed weekly history is intentionally rolling, not infinite.
  if(s.history.companyWeeks.length>260)s.history.companyWeeks=s.history.companyWeeks.slice(-260);
  if(s.history.briefs.length>52)s.history.briefs=s.history.briefs.slice(-52);
  if(s.world.events.length>40)s.world.events=s.world.events.slice(-40);
  if(s.projects.length>120)s.projects=s.projects.slice(-120);
  return s;
}

function migrateState(raw){
  if(!raw||typeof raw!=='object')return null;
  const s=raw;
  const schema=Number(s.schemaVersion||1);
  if(schema> SAVE_SCHEMA_VERSION)return null;
  // v1 -> v2 is additive; legacy fields remain readable by old runtime logic.
  return ensureAdvancedState(s);
}

function finiteStateErrors(value,path='state',errors=[]){
  if(errors.length>30)return errors;
  if(typeof value==='number'&&!Number.isFinite(value))errors.push(`${path} is non-finite`);
  else if(Array.isArray(value))value.forEach((x,i)=>finiteStateErrors(x,`${path}[${i}]`,errors));
  else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))finiteStateErrors(v,`${path}.${k}`,errors);
  return errors;
}

function validateState(s){
  const errors=[];
  if(!s||typeof s!=='object')return ['state missing'];
  if(!s.company||!Number.isFinite(s.company.cash))errors.push('company.cash invalid');
  if(!s.personal||!Number.isFinite(s.personal.cash))errors.push('personal.cash invalid');
  if(!Number.isFinite(s.week)||s.week<1)errors.push('week invalid');
  if(!Array.isArray(s.company?.stores))errors.push('company.stores invalid');
  if(!s.pe||!Array.isArray(s.pe.funds))errors.push('pe.funds invalid');
  return errors.concat(finiteStateErrors(s));
}

function compactStateForSave(s){
  ensureAdvancedState(s);
  // Completed projects are useful for recent explanation, but do not grow forever.
  s.projects=s.projects.filter(p=>p.status!=='completed'||s.week-(p.completedWeek||s.week)<=52);
  if(s.history.companyWeeks.length>260)s.history.companyWeeks=s.history.companyWeeks.slice(-260);
  if(s.history.briefs.length>52)s.history.briefs=s.history.briefs.slice(-52);
  return s;
}

save=function(){
  if(!state)return;
  compactStateForSave(state);
  const errors=validateState(state);
  if(errors.length){console.error('CAPITAL ASCENT save blocked:',errors);return false;}
  try{
    const previous=localStorage.getItem(SAVE_KEY);
    const b1=localStorage.getItem(SAVE_BACKUP_1);
    if(b1)localStorage.setItem(SAVE_BACKUP_2,b1);
    if(previous)localStorage.setItem(SAVE_BACKUP_1,previous);
    localStorage.setItem(SAVE_KEY,JSON.stringify(state));
    return true;
  }catch(err){console.error('save failed',err);return false;}
};

load=function(){
  const keys=[SAVE_KEY,SAVE_BACKUP_1,SAVE_BACKUP_2];
  for(const key of keys){
    try{
      const raw=JSON.parse(localStorage.getItem(key)||'null');
      const migrated=migrateState(raw);
      if(migrated&&!validateState(migrated).length)return migrated;
    }catch(err){console.warn(`load failed: ${key}`,err);}
  }
  return null;
};

function exportSaveText(){
  if(!state)return '';
  compactStateForSave(state);
  return JSON.stringify(state,null,2);
}

function downloadSaveExport(){
  const text=exportSaveText();
  if(!text||typeof Blob==='undefined')return;
  const blob=new Blob([text],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`capital-ascent-w${state.week}-save.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),0);
}

function importSaveText(text){
  try{
    const raw=JSON.parse(text);
    const migrated=migrateState(raw);
    const errors=validateState(migrated);
    if(!migrated||errors.length)return {ok:false,errors:errors.length?errors:['unsupported save']};
    state=migrated;save();return {ok:true,errors:[]};
  }catch(err){return {ok:false,errors:[String(err.message||err)]};}
}

const _foundationFreshState=freshState;
freshState=function(name='ASCENT HOLDINGS',pillar='ramen',region='東京'){
  return ensureAdvancedState(_foundationFreshState(name,pillar,region));
};

// The legacy runtime has already called load() before this file executes.
// Normalize that state now; if the primary was corrupt, retry using backup-aware load().
if(state)state=migrateState(state);
else state=load();
if(state){save();render();}
