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
