import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{}};
vm.createContext(context);
for(const file of ['geology.js','macrorelief.js','hydrology.js']){
 vm.runInContext(fs.readFileSync(new URL('../SHTAB-95/js/terrain/'+file,import.meta.url),'utf8'),context);
}
test('only four supported regions remain',()=>{
 assert.deepEqual(Object.keys(context.window.SH95Geology.REGIONS).sort(),['donja_bukovica','lipovac','mckhetovac','popovac']);
});
test('macrorelief is reproducible and less mountainous outside Mckhetovac',()=>{
 const g=context.window.SH95Geology,m=context.window.SH95Macrorelief;
 for(const region of Object.keys(g.REGIONS)){
  const a=m.generate(g.generate(region,42),64).heightMap;
  const b=m.generate(g.generate(region,42),64).heightMap;
  assert.deepEqual(a,b);
  assert.equal(a.length,4096);
  assert.ok(a.every(Number.isFinite));
 }
 assert.ok(g.REGIONS.mckhetovac.relief>g.REGIONS.lipovac.relief);
});
test('drainage reaches map edge and accumulates upstream cells',()=>{
 const n=32,h=new Float32Array(n*n);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)h[y*n+x]=100-y+Math.abs(x-16)*.1;
 const d=context.window.SH95Hydrology.analyze(h,n);
 for(let i=0;i<h.length;i++){
  let p=i,steps=0;
  while(d.receiver[p]>=0){p=d.receiver[p];assert.ok(++steps<h.length)}
  assert.ok(p<n||p>=n*(n-1)||p%n===0||p%n===n-1);
  assert.ok(d.accumulation[i]>=1);
 }
});
test('routing chooses steepest distance-corrected descent rather than flood parent',()=>{
 const n=5,h=new Float32Array(n*n).fill(100);
 h[12]=50;h[11]=10;h[6]=0;h[5]=0;
 const d=context.window.SH95Hydrology.analyze(h,n);
 assert.equal(d.receiver[12],11); // 40 m west beats 50/sqrt(2) northwest
 let total=0;
 for(let i=0;i<h.length;i++)if(d.receiver[i]<0)total+=d.accumulation[i];
 assert.equal(total,h.length);
});
test('closed flat depression has acyclic drainage and no water loss',()=>{
 const n=20,h=new Float32Array(n*n).fill(10);h[0]=0;
 const d=context.window.SH95Hydrology.analyze(h,n);
 const rank=new Int32Array(h.length);d.order.forEach((i,p)=>rank[i]=p);
 for(let i=0;i<h.length;i++)if(d.receiver[i]>=0)assert.ok(rank[d.receiver[i]]<rank[i]);
 assert.equal(d.accumulation.reduce((a,v,i)=>a+(d.receiver[i]<0?v:0),0),n*n);
});
