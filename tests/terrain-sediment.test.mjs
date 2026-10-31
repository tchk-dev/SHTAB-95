import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const c={window:{}};vm.createContext(c);
for(const f of ['hydrology','erosion','sediment'])vm.runInContext(fs.readFileSync(new URL('../SHTAB-95/js/terrain/'+f+'.js',import.meta.url),'utf8'),c);
test('sediment conserves eroded volume, diffuses slopes and preserves inputs',()=>{
 const n=32,h=Float32Array.from({length:n*n},(_,i)=>200-Math.floor(i/n)*2+Math.abs(i%n-16)*3);
 const e=c.window.SH95Erosion.erode(h,n,c.window.SH95Hydrology,{iterations:4,strength:10,channelThreshold:4});
 const before=e.heightMap.slice();
 const a=c.window.SH95Sediment.evolve(e,n,c.window.SH95Hydrology);
 const b=c.window.SH95Sediment.evolve(e,n,c.window.SH95Hydrology);
 assert.deepEqual(a.heightMap,b.heightMap);assert.deepEqual(e.heightMap,before);
 assert.ok(a.heightMap.every(Number.isFinite));
 assert.ok(a.deposition.every(v=>v>=0&&v<=6));
 assert.ok(a.budget.depositedVolume>0);assert.ok(a.budget.exportedVolume>0);
 assert.ok(Math.abs(a.budget.erodedVolume-a.budget.depositedVolume-a.budget.exportedVolume)<1e-6*a.budget.erodedVolume);
 assert.ok(Math.abs(a.hillslope.reduce((s,v)=>s+v,0))<.001);
 const observed=a.heightMap.reduce((s,v,i)=>s+v-before[i],0);
 const deposited=a.deposition.reduce((s,v)=>s+v,0);
 assert.ok(Math.abs(observed-deposited)<.02);
});
test('lake deposition cannot overtop the initial spill surface and create routing-tree dams',()=>{
 const n=16,h=new Float32Array(n*n).fill(12);
 for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++)h[y*n+x]=7+x*.12+y*.05;
 h[8*n]=10;
 const eroded={heightMap:h,incision:new Float32Array(n*n).fill(3)};
 let before,filled;
 const hydrology={analyze(heights,size){
  const result=c.window.SH95Hydrology.analyze(heights,size);
  if(!before){before=heights.slice();filled=result.filledHeight.slice()}
  return result;
 }};
 const result=c.window.SH95Sediment.evolve(eroded,n,hydrology);
 let ponded=0;
 for(let i=0;i<h.length;i++)if(filled[i]-before[i]>.001){
  ponded++;assert.ok(result.heightMap[i]<=filled[i]+.001,'deposition protrudes above the lake surface');
 }
 assert.ok(ponded>50);
 const budget=result.budget;
 assert.ok(Math.abs(budget.erodedVolume-budget.depositedVolume-budget.exportedVolume)<budget.erodedVolume*1e-8);
});
