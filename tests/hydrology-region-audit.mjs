// Run: node tests/hydrology-region-audit.mjs [region] [seed] [gridSize]
// Experimental, coarse-resolution comparison on actual production-generated
// terrain. Never changes the terrain worker or gameplay.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
const root=new URL('../SHTAB-95/js/terrain/',import.meta.url);
const sources=new Map(fs.readdirSync(root).filter(f=>f.endsWith('.js')).map(f=>[f,fs.readFileSync(new URL(f,root),'utf8')]));
const valid=['donja_bukovica','popovac','lipovac','mckhetovac'];
const region=process.argv[2]||'donja_bukovica',seed=Number(process.argv[3]??42);
if(!valid.includes(region)||!Number.isSafeInteger(seed)||seed<0||seed>4294967295)throw Error('Invalid region/seed');
const runtime={Math,Float32Array,Float64Array,Uint8Array,Int32Array,performance};
runtime.self=runtime;vm.createContext(runtime);
runtime.importScripts=(...files)=>{for(const file of files)vm.runInContext(sources.get(file),runtime)};
let produced;
runtime.postMessage=(data)=>{produced=data};
vm.runInContext(sources.get('terrain-worker.js'),runtime);
runtime.onmessage({data:{id:1,seed,region}});
assert.ok(produced&&!produced.error,produced?.error||'Worker did not produce a map');
const size=Number(process.argv[4]??32),sourceSize=512;
if(!Number.isInteger(size)||size<8||size>sourceSize)throw Error('Invalid audit grid resolution');
const count=size*size;
const heights=new Float64Array(count),volumes=new Float64Array(count);
const cellSize=40000/(size-1),cellArea=cellSize*cellSize;
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const sx=Math.round(x*(sourceSize-1)/(size-1)),sy=Math.round(y*(sourceSize-1)/(size-1));
 const i=y*size+x,j=sy*sourceSize+sx;
 heights[i]=produced.heightMap[j];
 // Deliberately hypothetical 0.1 m annual effective runoff on each cell.
 // This is not calibrated seasonal or permanent lake hydrology.
 volumes[i]=.1*cellArea;
}
const c={window:{},Math,Int32Array,Uint32Array,Float64Array,Uint8Array};vm.createContext(c);
for(const file of ['surface-flow.js','catchments.js','reservoir.js','reservoir-network.js','lake-routing.js','hydrology-scenario.js'])
 vm.runInContext(sources.get(file),c);
const start=performance.now(),a=c.window.SH95HydrologyScenario.analyze(heights,size,volumes,cellArea),elapsedMs=performance.now()-start;
assert.ok(Math.abs(a.input-a.retained-a.exported)<a.input*1e-7);
let wetCells=0,uphill=0,invalidDepth=0;
const indegree=new Int32Array(count);
for(let i=0;i<count;i++){
 if(!Number.isFinite(a.waterDepth[i])||a.waterDepth[i]<0)invalidDepth++;
 if(a.waterDepth[i]>.001)wetCells++;
 const to=a.receiver[i];
 if(to>=0){
  assert.ok(to<count&&Math.abs(i%size-to%size)<=1&&Math.abs(Math.floor(i/size)-Math.floor(to/size))<=1,'non-neighbour receiver');
  if(heights[to]+a.waterDepth[to]>heights[i]+a.waterDepth[i]+.001)uphill++;
  indegree[to]++;
 }
}
assert.equal(uphill,0);assert.equal(invalidDepth,0);
const queue=[];for(let i=0;i<count;i++)if(indegree[i]===0)queue.push(i);
for(let p=0;p<queue.length;p++){const j=a.receiver[queue[p]];if(j>=0&&--indegree[j]===0)queue.push(j)}
assert.equal(queue.length,count,'cycle in hydrological receiver network');
console.log(JSON.stringify({region,seed,grid:size,runoffAssumptionMetres:.1,wetFraction:wetCells/count,basinCount:a.basinCount,spillCount:a.spillCount,validatedCells:queue.length,input:a.input,retained:a.retained,exported:a.exported,uphill,elapsedMs},null,2));
