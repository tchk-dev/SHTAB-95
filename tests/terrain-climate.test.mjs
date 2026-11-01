import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const c={window:{}};vm.createContext(c);
for(const f of ['climate','hydrology'])vm.runInContext(fs.readFileSync(new URL('../SHTAB-95/js/terrain/'+f+'.js',import.meta.url),'utf8'),c);
test('climate has lapse rate, windward rainfall and a leeward rain shadow',()=>{
 const n=64,h=new Float32Array(n*n);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)h[y*n+x]=1800*Math.exp(-(((x-30)/9)**2));
 const a=c.window.SH95Climate.analyze(h,n,42),b=c.window.SH95Climate.analyze(h,n,42);
 assert.deepEqual(a,b);
 assert.ok(a.temperature[30]<a.temperature[0]-8);
 assert.ok(a.rainfall[24]>a.rainfall[40]);
 assert.ok(a.runoff.every(v=>Number.isFinite(v)&&v>=0));
 assert.ok(a.biome.every(v=>v<6));
});
test('runoff routing conserves supplied water at outlets',()=>{
 const n=20,h=Float32Array.from({length:n*n},(_,i)=>100-i);
 const water=Float32Array.from({length:n*n},(_,i)=>.1+i%7*.2);
 const d=c.window.SH95Hydrology.analyze(h,n,water);
 const input=water.reduce((a,v)=>a+v,0),output=d.accumulation.reduce((a,v,i)=>a+(d.receiver[i]<0?v:0),0);
 assert.ok(Math.abs(input-output)<input*1e-6);
});
