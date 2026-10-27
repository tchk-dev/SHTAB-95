import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const c={window:{},Math};vm.createContext(c);vm.runInContext(fs.readFileSync(new URL('../SHTAB-95/js/terrain/reservoir.js',import.meta.url),'utf8'),c);
const fill=c.window.SH95Reservoir.fill;
test('finite water volume raises a lake through its terrain hypsometry',()=>{
 const h=new Float32Array([0,2,7]),cells=[0,1,2],before=Array.from(h);
 let r=fill(h,cells,4,3);assert.equal(r.level,2.5);assert.equal(r.stored,3);assert.equal(r.overflow,0);
 r=fill(h,cells,4,8);assert.equal(r.level,4);assert.equal(r.stored,6);assert.equal(r.overflow,2);
 r=fill(h,cells,4,0);assert.equal(r.level,null);assert.equal(r.stored,0);assert.deepEqual(Array.from(h),before);
});
test('area scaling, tied elevations and invalid inputs',()=>{
 const h=[1,1,3],cells=[0,1,2];let r=fill(h,cells,3,4,2);assert.equal(r.level,2);assert.equal(r.stored,4);
 r=fill(h,cells,3,10,2);assert.equal(r.stored,8);assert.equal(r.overflow,2);
 assert.throws(()=>fill(h,[5],3,1),/Invalid/);assert.throws(()=>fill(h,[0,0],3,1),/Duplicate/);assert.throws(()=>fill(h,cells,3,-1),/Invalid/);
});
test('stored volume equals the sum of submerged cell volumes',()=>{
 const h=[0,1,1.5,3,9],cells=[0,1,2,3,4],area=7,spill=4;
 let previous=-Infinity;
 for(const volume of [.01,3,14,25,48,100,500]){
  const r=fill(h,cells,spill,volume,area);
  assert.ok(r.level>=previous);previous=r.level;
  const physical=h.reduce((sum,elevation)=>sum+Math.max(0,r.level-elevation)*area,0);
  assert.ok(Math.abs(physical-r.stored)<1e-9);assert.ok(Math.abs(r.stored+r.overflow-volume)<1e-9);
 }
});
