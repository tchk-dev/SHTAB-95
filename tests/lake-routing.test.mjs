import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const c={window:{},Math,Int32Array,Uint32Array,Float64Array,Uint8Array};vm.createContext(c);
for(const file of ['surface-flow.js','catchments.js','reservoir.js','reservoir-network.js','lake-routing.js'])vm.runInContext(fs.readFileSync(new URL('../SHTAB-95/js/terrain/'+file,import.meta.url),'utf8'),c);
function scenario(volume){
 const n=7,h=new Float64Array(n*n).fill(10);h[3*n+2]=0;h[3*n+3]=2;h[3*n+4]=0;h[3*n+5]=4;h[3*n+6]=0;
 const ground=c.window.SH95SurfaceFlow.analyze(h,n),g=c.window.SH95Catchments.build(h,ground.receiver,n),rain=new Float64Array(n*n);rain[3*n+2]=volume;
 const input=new Float64Array(g.sinks.length);for(let i=0;i<n*n;i++)input[g.basin[i]]+=rain[i];
 const pools=c.window.SH95ReservoirNetwork.solve(h,n,g,input);
 const route=c.window.SH95LakeRouting.build(h,n,ground,g,pools,rain);
 return {h,n,g,pools,route,volume};
}
test('partial closed pools keep incoming water and preserve downhill surface',()=>{
 const {h,n,pools,route,volume}=scenario(3);assert.ok(Math.abs(route.retained+route.exported-volume)<1e-9);assert.equal(route.exported,0);
 assert.ok(Math.abs(route.retained-pools.stored)<1e-9);assert.ok(route.depth.some(x=>x>0));
 for(let i=0;i<h.length;i++)if(route.receiver[i]>=0){const j=route.receiver[i];assert.ok(h[j]+route.depth[j]<=h[i]+route.depth[i]+.001)}
});
test('overflow traverses merged lakes to the edge and conserves water',()=>{
 const {h,n,pools,route,volume}=scenario(12);assert.ok(pools.exported>0);assert.ok(Math.abs(route.retained-pools.stored)<1e-8);
 assert.ok(Math.abs(route.exported-pools.exported)<1e-8);assert.ok(Math.abs(route.retained+route.exported-volume)<1e-8);
 for(let i=0;i<h.length;i++)if(route.receiver[i]>=0){const j=route.receiver[i];assert.ok(h[j]+route.depth[j]<=h[i]+route.depth[i]+.001)}
});
test('generated nested catchments retain water and route downhill without crossing',()=>{
 let state=239;const random=()=>((state=Math.imul(state,1664525)+1013904223>>>0)/4294967296);
 for(let run=0;run<30;run++){
  const n=8,h=Float64Array.from({length:n*n},()=>Math.floor(random()*30)),rain=Float64Array.from({length:n*n},()=>random());
  const ground=c.window.SH95SurfaceFlow.analyze(h,n),g=c.window.SH95Catchments.build(h,ground.receiver,n),input=new Float64Array(g.sinks.length);
  for(let i=0;i<h.length;i++)input[g.basin[i]]+=rain[i];
  const p=c.window.SH95ReservoirNetwork.solve(h,n,g,input),r=c.window.SH95LakeRouting.build(h,n,ground,g,p,rain),total=rain.reduce((a,b)=>a+b,0);
  assert.ok(Math.abs(total-r.retained-r.exported)<1e-7);
  assert.ok(Math.abs(r.retained-p.stored)<1e-7);assert.ok(Math.abs(r.exported-p.exported)<1e-7);
  for(let i=0;i<h.length;i++)if(r.receiver[i]>=0){const j=r.receiver[i];assert.ok(h[j]+r.depth[j]<=h[i]+r.depth[i]+.001)}
  for(let y=0;y<n-1;y++)for(let x=0;x<n-1;x++){const a=y*n+x,b=a+1,c=a+n,d=c+1,edge=(i,j)=>r.receiver[i]===j||r.receiver[j]===i;assert.ok(!(edge(a,d)&&edge(b,c)))}
 }
});
