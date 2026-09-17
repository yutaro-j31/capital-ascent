'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {runBalance,STRATEGIES}=require('../tools/balance-sim.cjs');

test('strategy bots complete deterministic balance runs with finite metrics',()=>{
  const {rows,summary}=runBalance({seeds:3,weeks:260});
  assert.equal(rows.length,STRATEGIES.length*3);
  for(const row of rows){
    for(const k of ['week','value','cash','debt','stores','personal'])assert.ok(Number.isFinite(row[k]),`${row.strategy}.${k}`);
  }
  assert.ok(summary.dominantShare>=0&&summary.dominantShare<=1);
  assert.equal(Object.keys(summary.strategies).length,STRATEGIES.length);
});
