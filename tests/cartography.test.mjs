import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../SHTAB-95/js/cartography.js',import.meta.url),'utf8');
const window={};
vm.runInNewContext(source,{window,Math,Float32Array,Set,Array});
const map=window.SH95Cartography;
const n=64,world=32000;
const heights=new Float32Array(n*n);
for(let j=0;j<n;j++)for(let i=0;i<n;i++)heights[j*n+i]=100+((i-32)**2+(j-32)**2)*.25;
test('regional biome profiles are defined for all six areas',()=>{
 assert.equal(Object.keys(map.profiles).length,6);
 for(const key of ['velikograd','donja_bukovica','popovac','lipovac','pribrezje','mckhetovac'])assert.ok(map.profiles[key]);
});
test('generated settlements and roads stay inside map bounds',()=>{
 const a=map.generate(heights,'popovac',12345,world,n);
 const b=map.generate(heights,'popovac',12345,world,n);
 assert.equal(JSON.stringify(a.settlements),JSON.stringify(b.settlements));
 assert.equal(JSON.stringify(a.roads),JSON.stringify(b.roads));
 for(const s of a.settlements){assert.ok(s.x>=0&&s.x<=world);assert.ok(s.y>=0&&s.y<=world);assert.ok(a.slope(s.x,s.y)<=.15)}
 for(const path of a.roads)for(const [x,y] of path){assert.ok(x>=0&&x<=world);assert.ok(y>=0&&y<=world)}
});
test('river paths run downhill on sampled heightmap',()=>{
 const a=map.generate(heights,'lipovac',12345,world,n);
 for(const river of a.rivers)for(let i=1;i<river.length;i++){
  assert.ok(a.at(...river[i])<=a.at(...river[i-1])+.02);
 }
});
