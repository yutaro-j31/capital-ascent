'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createRuntime}=require('./harness.cjs');

function plain(x){return JSON.parse(JSON.stringify(x));}

test('Phase 12 export/import round-trip preserves schema and accounting buckets',()=>{
  const r=createRuntime();r.api.fresh('RC SAVE','ramen','東京');
  r.api.eval('state.company.cash=123456789;state.personal.cash=9876543;state.pe.unlocked=true;');
  const exported=r.api.exportText(),before=plain(r.api.get());
  const t=createRuntime();t.api.fresh('OTHER');
  const result=t.api.importText(exported);
  assert.equal(result.ok,true);const after=plain(t.api.get());
  assert.equal(after.schemaVersion,2);assert.equal(after.company.cash,before.company.cash);assert.equal(after.personal.cash,before.personal.cash);
  assert.equal(t.api.validate().length,0);
});

test('Phase 12 rejects unsupported future save schema',()=>{
  const r=createRuntime();r.api.fresh('FUTURE SAVE');
  const raw=plain(r.api.get());raw.schemaVersion=999;
  const result=r.api.importText(JSON.stringify(raw));
  assert.equal(result.ok,false);
});

test('Phase 12 PE capital call is isolated from company cash',()=>{
  const r=createRuntime();r.api.fresh('RC FUND','ramen','東京');
  r.api.eval('state.pe.unlocked=true;state.personal.cash=100000000;state.company.cash=50000000;');
  const company=r.api.get().company.cash,personal=r.api.get().personal.cash;
  assert.equal(r.api.raiseFund(),true);
  const s=plain(r.api.get()),f=s.pe.funds[0];
  assert.equal(s.company.cash,company);assert.ok(s.personal.cash<personal);assert.equal(f.calledCapital,f.cash);
});
