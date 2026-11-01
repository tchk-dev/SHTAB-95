import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{}};vm.createContext(context);
for(const name of ['hydrology.js','erosion.js']){
 vm.runInContext(fs.readFileSync(new URL('../SHTAB-95/js/terrain/'+name,import.meta.url),'utf8'),context);
}
const hyd=context.window.SH95Hydrology,erosion=context.window.SH95Erosion;
test('fluvial incision is deterministic, finite and never raises terrain',()=>{
 const n=48,h=new Float32Array(n*n);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)h[y*n+x]=350+(n-y)*3+Math.abs(x-24)*2;
 const options={iterations:5,cellSize:80,channelThreshold:12,strength:10,maxCut:4};
 const a=erosion.erode(h,n,hyd,options),b=erosion.erode(h,n,hyd,options);
 assert.deepEqual(a.heightMap,b.heightMap);
 assert.ok(a.heightMap.every(Number.isFinite));
 assert.ok(a.heightMap.every((v,i)=>v<=h[i]));
 assert.ok(a.heightMap.some((v,i)=>v<h[i]-.01));
 assert.equal(a.hydrology.receiver.length,n*n);
});
test('zero iterations preserves terrain and input is not mutated',()=>{
 const n=8,h=Float32Array.from({length:n*n},(_,i)=>100-i);
 const before=h.slice(),result=erosion.erode(h,n,hyd,{iterations:0});
 assert.deepEqual(h,before);assert.deepEqual(Array.from(result.heightMap),Array.from(before));
});
