import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
const c={window:{},Math,Int32Array,Uint32Array,Float64Array};vm.createContext(c);
vm.runInContext(fs.readFileSync(new URL('../SHTAB-95/js/terrain/surface-flow.js',import.meta.url),'utf8'),c);
const analyze=c.window.SH95SurfaceFlow.analyze;
test('closed ground depression remains a sink and retains all runoff',()=>{
 const n=5,h=new Float32Array(n*n).fill(10);h[12]=0;h[11]=4;h[7]=3;h[13]=4;h[17]=3;
 const before=Array.from(h),runoff=new Float32Array(n*n).fill(2),d=analyze(h,n,runoff);
 assert.equal(d.receiver[12],-1);assert.equal(d.receiver[7],12);assert.ok(d.accumulation[12]>2);
 assert.deepEqual(Array.from(h),before);assert.equal(d.accumulation.reduce((s,v,i)=>s+(d.receiver[i]<0?v:0),0),50);
 for(let i=0;i<h.length;i++)if(d.receiver[i]>=0)assert.ok(h[d.receiver[i]]<h[i]);
});
test('open slopes route by distance-corrected descent and flats terminate',()=>{
 const n=5,h=new Float32Array(n*n).fill(100);h[12]=50;h[11]=10;h[6]=0;h[5]=0;
 const d=analyze(h,n);assert.equal(d.receiver[12],11);
 const flat=analyze(new Float32Array(25).fill(1),5);assert.ok(flat.receiver.every(x=>x===-1));
 assert.throws(()=>analyze(h,n,new Float32Array(3)),/Invalid/);
});
