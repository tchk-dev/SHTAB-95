// Exploratory static water budget; 0.1 m uniform effective runoff is a test
// input, not calibrated annual climate or a forecast of persistent lakes.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const root=new URL('../SHTAB-95/js/terrain/',import.meta.url),sources=new Map(fs.readdirSync(root).filter(f=>f.endsWith('.js')).map(f=>[f,fs.readFileSync(new URL(f,root),'utf8')]));
const c={Math,Float32Array,Float64Array,Uint8Array,Uint32Array,Int32Array,performance};c.self=c;vm.createContext(c);c.importScripts=(...names)=>{for(const f of names)vm.runInContext(sources.get(f),c)};
let d;c.postMessage=data=>{d=data};vm.runInContext(sources.get('terrain-worker.js'),c);
for(const name of ['surface-flow.js','catchments.js','reservoir.js','reservoir-network.js'])vm.runInContext(sources.get(name),c);
const region=process.argv[2]??'donja_bukovica',seed=Number(process.argv[3]??42),n=512;
c.onmessage({data:{id:1,region,seed}});assert.ok(!d.error,d.error);
const f=c.SH95SurfaceFlow.analyze(d.heightMap,n),g=c.SH95Catchments.build(d.heightMap,f.receiver,n);
const input=new Float64Array(g.sinks.length);for(let i=0;i<n*n;i++)input[g.basin[i]]+=.1;
const initial=input.reduce((a,b)=>a+b,0),start=performance.now(),result=c.SH95ReservoirNetwork.solve(d.heightMap,n,g,input),elapsedMs=performance.now()-start;
assert.ok(Math.abs(initial-result.stored-result.exported)<initial*1e-9,'water balance');
let wet=0;for(let i=0;i<n*n;i++){const level=result.levels[result.groups[g.basin[i]]];if(Number.isFinite(level)&&d.heightMap[i]<level)wet++}
console.log(JSON.stringify({region,seed,runoffMetres:.1,cellArea:1,initial,stored:result.stored,exported:result.exported,wetFraction:wet/(n*n),elapsedMs},null,2));
