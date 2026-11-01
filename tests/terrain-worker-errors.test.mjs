import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../SHTAB-95/js/terrain/',import.meta.url);
test('worker rejects malformed seeds and unknown regions with job identifiers',()=>{
 const c={Math,performance};c.self=c;vm.createContext(c);
 c.importScripts=(...files)=>{for(const f of files)vm.runInContext(fs.readFileSync(new URL(f,root),'utf8'),c)};
 let result;c.postMessage=data=>{result=data};
 vm.runInContext(fs.readFileSync(new URL('terrain-worker.js',root),'utf8'),c);
 for(const [seed,region] of [[-1,'popovac'],[1.5,'popovac'],[4294967296,'popovac'],[42,'unknown']]){
  c.onmessage({data:{id:17,seed,region}});assert.equal(result.id,17);assert.ok(result.error);
 }
});
test('failed worker or invalid seed preserves the current mission and coordinates',async()=>{
 const source=fs.readFileSync(new URL('../SHTAB-95/js/artillery-map.js',import.meta.url),'utf8');
 const newTask=source.slice(source.indexOf('async function newTask('),source.indexOf('\nfunction simulate('));
 const elements={terrainSeed:{value:'42'},terrainRegion:{value:'lipovac'},newt:{disabled:false},nowind:{disabled:false}};
 const originalState={ws:3,wd:30},origin={x:10000,y:20000};
 let cancelCount=0,errors=0;
 const c={S:originalState,ORG:origin,terrainRequest:0,terrainWorker:null,terrainGenerating:false,terrainRegion:'popovac',
  $:id=>elements[id],cancelProjectiles:()=>cancelCount++,draw:()=>{},alert:()=>errors++,console:{error:()=>{}},
  terrainGenerate:async()=>{throw Error('Test worker failure')}};
 vm.createContext(c);vm.runInContext(newTask,c);
 await c.newTask(false);
 assert.equal(c.S,originalState);assert.equal(c.ORG,origin);assert.equal(c.terrainRegion,'popovac');
 assert.equal(c.terrainGenerating,false);assert.equal(elements.newt.disabled,false);assert.equal(elements.nowind.disabled,false);
 assert.equal(errors,1);assert.equal(cancelCount,1);
 elements.terrainSeed.value='-1';await c.newTask(false);
 assert.equal(cancelCount,1);assert.equal(errors,2);assert.equal(c.ORG,origin);
});
test('map pointer movement waits for terrain before sampling ground',()=>{
 const source=fs.readFileSync(new URL('../SHTAB-95/js/artillery-map.js',import.meta.url),'utf8');
 const code=source.slice(source.indexOf("mapC.addEventListener('pointermove'"),source.indexOf('\nfunction finishGesture('));
 let handler,samples=0;
 const c={mapC:{addEventListener:(_,fn)=>{handler=fn}},HM:null,ORG:undefined,terrainGenerating:true,ground:()=>{samples++;return 1}};
 vm.createContext(c);vm.runInContext(code,c);handler({});assert.equal(samples,0);
 c.HM=new Float32Array(4);c.ORG={x:0,y:0};handler({});assert.equal(samples,0);
});
