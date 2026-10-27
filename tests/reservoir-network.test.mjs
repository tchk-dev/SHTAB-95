import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const c={window:{},Math,Int32Array,Float64Array,Uint8Array};vm.createContext(c);
for(const file of ['reservoir.js','reservoir-network.js'])vm.runInContext(fs.readFileSync(new URL('../SHTAB-95/js/terrain/'+file,import.meta.url),'utf8'),c);
const h=new Float64Array(25).fill(100);h[12]=0;h[13]=0;h[0]=0;
const basin=new Int32Array(25).fill(2);basin[12]=0;basin[13]=1;
const graph={basin,sinks:[12,13,0],edges:[{a:0,b:1,level:2},{a:1,b:2,level:4}]};
function solve(a,b){return c.window.SH95ReservoirNetwork.solve(h,5,graph,[a,b,0])}
test('a partial lake remains isolated and overflow feeds its neighbour',()=>{
 const r=solve(3,0);assert.equal(r.stored,3);assert.equal(r.exported,0);
 assert.equal(r.levels[r.groups[0]],2);assert.equal(r.levels[r.groups[1]],1);assert.notEqual(r.groups[0],r.groups[1]);
});
test('full neighbouring lakes merge and spill without losing water',()=>{
 const r=solve(10,0);assert.equal(r.groups[0],r.groups[1]);assert.equal(r.levels[r.groups[0]],4);
 assert.equal(r.stored,8);assert.equal(r.exported,2);assert.equal(r.stored+r.exported,10);
});
test('input distributed across catchments yields the same equilibrium',()=>{
 const a=solve(10,0),b=solve(5,5);assert.equal(a.stored,b.stored);assert.equal(a.exported,b.exported);
});
test('generated nested catchments conserve water and cannot overtop an unmerged saddle',()=>{
 for(const file of ['surface-flow.js','catchments.js'])vm.runInContext(fs.readFileSync(new URL('../SHTAB-95/js/terrain/'+file,import.meta.url),'utf8'),c);
 let state=12345;const random=()=>((state=Math.imul(state,1664525)+1013904223>>>0)/4294967296);
 for(let run=0;run<30;run++){
  const n=8,terrain=Float64Array.from({length:n*n},()=>Math.floor(random()*20));
  const flow=c.window.SH95SurfaceFlow.analyze(terrain,n),g=c.window.SH95Catchments.build(terrain,flow.receiver,n);
  const input=Float64Array.from({length:g.sinks.length},()=>random()*20),total=input.reduce((a,b)=>a+b,0);
  const r=c.window.SH95ReservoirNetwork.solve(terrain,n,g,input);
  assert.ok(Math.abs(total-r.stored-r.exported)<1e-7);
  for(const edge of g.edges){const a=r.groups[edge.a],b=r.groups[edge.b];if(a===b)continue;
   for(const group of [a,b])if(Number.isFinite(r.levels[group]))assert.ok(r.levels[group]<=edge.level+1e-8);
  }
 }
});
