// Run a candidate ground-flow graph on one production-generated terrain.
// It is diagnostic only: closed sinks are not yet linked to lake storage/spill.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const root=new URL('../SHTAB-95/js/terrain/',import.meta.url);
const sources=new Map(fs.readdirSync(root).filter(f=>f.endsWith('.js')).map(f=>[f,fs.readFileSync(new URL(f,root),'utf8')]));
const c={Math,Float32Array,Float64Array,Uint8Array,Uint32Array,Int32Array,performance};c.self=c;vm.createContext(c);
c.importScripts=(...names)=>{for(const f of names)vm.runInContext(sources.get(f),c)};
let data;c.postMessage=d=>{data=d};vm.runInContext(sources.get('terrain-worker.js'),c);vm.runInContext(sources.get('surface-flow.js'),c);vm.runInContext(sources.get('catchments.js'),c);
const region=process.argv[2]??'donja_bukovica',seed=Number(process.argv[3]??42),n=512;
c.onmessage({data:{id:1,region,seed}});assert.ok(!data.error,data.error);
const start=performance.now(),flow=c.SH95SurfaceFlow.analyze(data.heightMap,n),elapsedMs=performance.now()-start;
const basinStart=performance.now(),catchments=c.SH95Catchments.build(data.heightMap,flow.receiver,n);
const tree=c.SH95Catchments.outletTree(catchments,data.heightMap,n),catchmentMs=performance.now()-basinStart;
const priority=c.SH95Hydrology.analyze(data.heightMap,n);let maximumSpillDifference=0;
for(let id=0;id<catchments.sinks.length;id++)maximumSpillDifference=Math.max(maximumSpillDifference,Math.abs(tree.level[id]-priority.filledHeight[catchments.sinks[id]]));
assert.ok(maximumSpillDifference<.001,`saddle graph disagrees with priority flood: ${maximumSpillDifference}`);
let internalSinks=0,edgeSinks=0,riverSinks=0,uphill=0,crossings=0,total=0;
for(let i=0;i<n*n;i++){
 const j=flow.receiver[i];if(j<0){total+=flow.accumulation[i];if(i<n||i>=n*(n-1)||i%n===0||i%n===n-1)edgeSinks++;else{internalSinks++;if(flow.accumulation[i]>600)riverSinks++}}
 else if(data.heightMap[j]>=data.heightMap[i])uphill++;
}
for(let y=0;y<n-1;y++)for(let x=0;x<n-1;x++){
 const a=y*n+x,b=a+1,c=a+n,e=c+1,r=flow.receiver,edge=(i,j)=>r[i]===j||r[j]===i;
 if(edge(a,e)&&edge(b,c))crossings++;
}
assert.equal(total,n*n);assert.equal(uphill,0);
console.log(JSON.stringify({region,seed,unitRunoff:true,elapsedMs,catchmentMs,catchments:catchments.sinks.length,saddles:catchments.edges.length,maximumSpillDifference,internalSinks,edgeSinks,riverSinks,uphill,crossings},null,2));
