import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx={window:{}};vm.createContext(ctx);
for(const file of ['geology.js','macrorelief.js'])vm.runInContext(fs.readFileSync(new URL('../SHTAB-95/js/terrain/'+file,import.meta.url),'utf8'),ctx);
const {SH95Geology:g,SH95Macrorelief:m}=ctx.window;
test('regional ridge geometry varies with seed',()=>{
 const a=g.generate('lipovac',12),b=g.generate('lipovac',13);
 assert.notEqual(a.ridges[0].dx,b.ridges[0].dx);
 assert.ok(a.ridges.length>g.REGIONS.lipovac.ridges);
});
test('lowlands have fewer primary ridges than highlands',()=>{
 for(let seed=1;seed<=12;seed++){
  assert.ok(g.generate('donja_bukovica',seed).ridges.length<=1);
  assert.ok(g.generate('popovac',seed).ridges.length<g.generate('mckhetovac',seed).ridges.length);
 }
});
test('faults affect rock hardness but not terrain elevation',()=>{
 const geology=g.generate('lipovac',99),a=m.generate(geology,64);
 const without={...geology,faults:[]},b=m.generate(without,64);
 assert.deepEqual(a.heightMap,b.heightMap);
 assert.ok(a.rockHardness.some((value,i)=>value!==b.rockHardness[i]));
});
