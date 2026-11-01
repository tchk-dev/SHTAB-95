import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const c={window:{},Math,Map,Int32Array};vm.createContext(c);
for(const file of ['surface-flow.js','catchments.js'])vm.runInContext(fs.readFileSync(new URL('../SHTAB-95/js/terrain/'+file,import.meta.url),'utf8'),c);
test('catchments terminate at sinks and share their lowest saddle',()=>{
 const n=5,h=Float32Array.from([9,9,9,9,9,9,1,4,2,9,9,2,5,3,9,9,3,6,4,9,9,9,9,9,9]);
 const r=c.window.SH95SurfaceFlow.analyze(h,n).receiver,d=c.window.SH95Catchments.build(h,r,n);
 for(let i=0;i<h.length;i++){let j=i;while(r[j]>=0)j=r[j];assert.equal(d.sinks[d.basin[i]],j)}
 const left=d.basin[6],right=d.basin[8],e=d.edges.find(e=>(e.a===left&&e.b===right)||(e.a===right&&e.b===left));
 assert.ok(e);assert.equal(e.level,4);assert.equal(Math.max(h[e.from],h[e.to]),e.level);
});
test('rejects uphill, non-neighbour, self-loop and non-finite inputs',()=>{
 const n=3,h=new Float32Array(9).fill(1),r=new Int32Array(9).fill(-1);
 r[4]=5;assert.throws(()=>c.window.SH95Catchments.build(h,r,n),/lower/);
 r[4]=4;assert.throws(()=>c.window.SH95Catchments.build(h,r,n),/lower/);
 r[4]=-1;h[0]=NaN;assert.throws(()=>c.window.SH95Catchments.build(h,r,n),/Invalid/);
});
test('basin outlet tree chooses the lowest maximum saddle and is acyclic',()=>{
 const graph={sinks:[4,0,8],edges:[{a:0,b:1,level:5},{a:0,b:2,level:3}]};
 const h=new Float32Array(9).fill(0),tree=c.window.SH95Catchments.outletTree(graph,h,3);
 assert.equal(tree.level[0],3);assert.equal(tree.downstream[0],2);
 const rank=new Int32Array(3);tree.order.forEach((id,i)=>rank[id]=i);
 for(let i=0;i<3;i++)if(tree.downstream[i]>=0)assert.ok(rank[tree.downstream[i]]<rank[i]);
});
