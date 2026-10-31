import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('gun crews and hidden targets avoid rendered lake basins',()=>{
 const source=fs.readFileSync(new URL('../SHTAB-95/js/artillery-map.js',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('function isDryTerrain('),source.indexOf('let missionConditions='));
 const n=64,water=new Float32Array(n*n);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(x<20||x>43)water[y*n+x]=10;
 let seed=1;
 const c={Math,N:n,CELL:40000/(n-1),WS:40000,ORG:{x:10000,y:10000},terrainDiagnostics:{waterDepth:new Float32Array(n*n),waterMask:Uint8Array.from(water,v=>v>0?1:0)},ground:()=>100,
  rnd:(a,b)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return a+(b-a)*seed/4294967296}};
 vm.createContext(c);vm.runInContext(code,c);
 for(let k=0;k<100;k++){
  const {g,t}=c.place(12000);
  assert.ok(c.isDryTerrain(g));assert.ok(c.isDryTerrain(t));
  assert.ok(Math.hypot(g.x-t.x,g.y-t.y)>=3000);assert.ok(Math.hypot(g.x-t.x,g.y-t.y)<=12000);
  for(const point of [g,t]){assert.equal(c.terrainDiagnostics.waterMask[Math.round((point.y-10000)/c.CELL)*n+Math.round((point.x-10000)/c.CELL)],0);assert.ok(point.x>=11200&&point.x<=48800);assert.ok(point.y>=11200&&point.y<=48800);assert.equal(point.z,100)}
 }
});
