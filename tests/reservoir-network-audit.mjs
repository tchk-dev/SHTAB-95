// Exploratory static water budget; 0.1 m uniform effective runoff is a test
// input, not calibrated annual climate or a forecast of persistent lakes.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const root=new URL('../SHTAB-95/js/terrain/',import.meta.url),sources=new Map(fs.readdirSync(root).filter(f=>f.endsWith('.js')).map(f=>[f,fs.readFileSync(new URL(f,root),'utf8')]));
const c={Math,Float32Array,Float64Array,Uint8Array,Uint32Array,Int32Array,performance};c.self=c;vm.createContext(c);c.importScripts=(...names)=>{for(const f of names)vm.runInContext(sources.get(f),c)};
let d;c.postMessage=data=>{d=data};vm.runInContext(sources.get('terrain-worker.js'),c);
for(const name of ['surface-flow.js','catchments.js','reservoir.js','reservoir-network.js','lake-routing.js'])vm.runInContext(sources.get(name),c);
const region=process.argv[2]??'donja_bukovica',seed=Number(process.argv[3]??42),n=512;
c.onmessage({data:{id:1,region,seed}});assert.ok(!d.error,d.error);
const f=c.SH95SurfaceFlow.analyze(d.heightMap,n),g=c.SH95Catchments.build(d.heightMap,f.receiver,n);
const mode=process.argv[4]??'uniform';let rainfall;
if(mode==='climate'){
 const geology=c.SH95Geology.generate(region,seed),macro=c.SH95Macrorelief.generate(geology,n);
 const climate=c.SH95Climate.analyze(macro.heightMap,n,seed);rainfall=Float64Array.from(climate.runoff,x=>x*.6);
}else if(mode==='uniform')rainfall=new Float64Array(n*n).fill(.1);else throw Error('Unknown runoff scenario');
const input=new Float64Array(g.sinks.length);for(let i=0;i<n*n;i++)input[g.basin[i]]+=rainfall[i];
const initial=input.reduce((a,b)=>a+b,0),start=performance.now(),result=c.SH95ReservoirNetwork.solve(d.heightMap,n,g,input),elapsedMs=performance.now()-start;
assert.ok(Math.abs(initial-result.stored-result.exported)<initial*1e-9,'water balance');
const routeStart=performance.now(),route=c.SH95LakeRouting.build(d.heightMap,n,f,g,result,rainfall),routingMs=performance.now()-routeStart;
assert.ok(Math.abs(route.retained-result.stored)<initial*1e-8,'routing retained water');
assert.ok(Math.abs(route.exported-result.exported)<initial*1e-8,'routing exported water');
let crossings=0,dryCrossings=0,crossingExamples=[];const receiver=route.receiver;
for(let y=0;y<n-1;y++)for(let x=0;x<n-1;x++){
 const a=y*n+x,b=a+1,c=a+n,e=c+1,edge=(i,j)=>receiver[i]===j||receiver[j]===i;
 if(edge(a,e)&&edge(b,c)){crossings++;if(crossingExamples.length<3)crossingExamples.push({cells:[a,b,c,e],receivers:[receiver[a],receiver[b],receiver[c],receiver[e]],depths:[route.depth[a],route.depth[b],route.depth[c],route.depth[e]]});if([a,b,c,e].every(i=>route.depth[i]<=.001))dryCrossings++}
}
let wet=0,historicalAboveFinal=0,dryTransitEvents=0,examples=[];const balance=new Float64Array(g.sinks.length),targets=new Map();
for(let i=0;i<input.length;i++)balance[result.groups[i]]+=input[i];
for(let i=0;i<n*n;i++){const group=result.groups[g.basin[i]],level=result.levels[group];if(Number.isFinite(level)&&d.heightMap[i]<level){wet++;balance[group]-=level-d.heightMap[i]}}
for(const t of result.transfers){
 const a=result.groups[g.basin[t.fromCell]],b=result.groups[g.basin[t.toCell]];balance[a]-=t.amount;balance[b]+=t.amount;
 if(!targets.has(a))targets.set(a,new Set());targets.get(a).add(b);
 if(!Number.isFinite(result.levels[a]))dryTransitEvents++;else if(result.levels[a]+.001<Math.max(d.heightMap[t.fromCell],d.heightMap[t.toCell])){historicalAboveFinal++;if(examples.length<3)examples.push({level:result.levels[a],saddle:Math.max(d.heightMap[t.fromCell],d.heightMap[t.toCell])})}
}
let maximumResidual=0,multipleOutlets=0;
for(let i=0;i<g.sinks.length;i++)if(result.groups[i]===i&&Number.isFinite(result.levels[i]))maximumResidual=Math.max(maximumResidual,Math.abs(balance[i]));
for(const set of targets.values())if(set.size>1)multipleOutlets++;
assert.ok(maximumResidual<initial*1e-8,`group budget mismatch ${maximumResidual}`);
console.log(JSON.stringify({region,seed,mode,runoffMetres:mode==='uniform'?.1:'0.6 × climate runoff',cellArea:1,initial,stored:result.stored,exported:result.exported,wetFraction:wet/(n*n),transfers:result.transfers.length,historicalAboveFinal,dryTransitEvents,examples,multipleOutlets,maximumResidual,crossings,dryCrossings,crossingExamples,elapsedMs,routingMs},null,2));
