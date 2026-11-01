import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const c={window:{},Math,Int32Array,Uint32Array,Float64Array,Uint8Array};
vm.createContext(c);
for(const f of ['surface-flow.js','catchments.js','reservoir.js','reservoir-network.js','lake-routing.js','hydrology-scenario.js'])
 vm.runInContext(fs.readFileSync(new URL('../SHTAB-95/js/terrain/'+f,import.meta.url),'utf8'),c);
const analyze=c.window.SH95HydrologyScenario.analyze;
test('linked-lake scenario conserves finite runoff and does not mutate inputs',()=>{
 const size=7,heights=new Float64Array(size*size).fill(10),rain=new Float64Array(size*size);
 heights[3*size+2]=0;heights[3*size+3]=2;heights[3*size+4]=0;
 rain[3*size+2]=12;
 const h=heights.slice(),r=rain.slice(),a=analyze(heights,size,rain),b=analyze(heights,size,rain);
 assert.deepEqual(heights,h);assert.deepEqual(rain,r);
 assert.deepEqual(a.receiver,b.receiver);
 assert.deepEqual(a.waterDepth,b.waterDepth);
 assert.ok(Math.abs(a.retained+a.exported-a.input)<1e-7);
 assert.ok(a.basinCount>0);
 for(let i=0;i<heights.length;i++){
  const j=a.receiver[i];
  if(j>=0)assert.ok(heights[j]+a.waterDepth[j]<=heights[i]+a.waterDepth[i]+.001);
 }
});
test('hydrology pipeline rejects malformed or negative volume data',()=>{
 const size=3,h=new Float64Array(9).fill(2),rain=new Float64Array(9);
 assert.throws(()=>analyze(h,4,rain));
 assert.throws(()=>analyze(h,size,rain,0));
 rain[4]=-1;assert.throws(()=>analyze(h,size,rain));
 rain[4]=Infinity;assert.throws(()=>analyze(h,size,rain));
});
test('dry flat map has no invented water storage',()=>{
 const size=5,h=new Float64Array(25).fill(10),rain=new Float64Array(25);
 const result=analyze(h,size,rain);
 assert.equal(result.retained,0);
 assert.equal(result.exported,0);
 assert.ok(result.waterDepth.every(v=>v===0));
});
