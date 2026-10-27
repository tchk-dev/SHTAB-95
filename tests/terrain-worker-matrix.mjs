// Full-resolution manual integration suite; executes the production worker
// handler, including importScripts and transferable-buffer message delivery.
// Run: node tests/terrain-worker-matrix.mjs [report.json] [baseline.json]
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=new URL('../SHTAB-95/js/terrain/',import.meta.url);
const sources=new Map(fs.readdirSync(root).filter(f=>f.endsWith('.js')).map(f=>[f,fs.readFileSync(new URL(f,root),'utf8')]));
const sourceSha256=createHash('sha256').update([...sources].sort().map(([f,s])=>f+'\n'+s).join('\n')).digest('hex');
const names=['heightMap','incision','deposition','hillslope','accumulation','receiver','waterDepth','biome','temperature','rainfall','waterMask'];
function generate(region,seed){
 let result;
 const c={Math,Float32Array,Float64Array,Uint8Array,Int32Array,performance};c.self=c;
 vm.createContext(c);
 c.importScripts=(...files)=>{for(const f of files)vm.runInContext(sources.get(f),c)};
 c.postMessage=(data,transfer=[])=>{
  result=structuredClone(data,{transfer});
  for(const buffer of transfer)assert.equal(buffer.byteLength,0,'worker buffer must detach');
 };
 vm.runInContext(sources.get('terrain-worker.js'),c);
 const start=performance.now();c.onmessage({data:{id:1,region,seed}});
 assert.ok(!result.error,result.error);assert.equal(result.generationVersion,'terrain-v2');
 return {data:result,elapsedMs:performance.now()-start};
}
function fingerprint(data,fields=names){
 const h=createHash('sha256');
 for(const key of fields)h.update(new Uint8Array(data[key].buffer));
 h.update(JSON.stringify(data.sedimentBudget));return h.digest('hex');
}
function verify(d){
 const n=512,count=n*n;
 for(const key of names){assert.equal(d[key].length,count,key);assert.ok(d[key].every(Number.isFinite),key)}
 assert.ok(d.deposition.every(v=>v>=0&&v<=6));
 assert.ok(d.waterMask.every(v=>v===0||v===1));
 for(let i=0;i<count;i++)if(d.waterDepth[i]>.4)assert.equal(d.waterMask[i],1);
 assert.ok(d.biome.every(v=>v>=0&&v<6));
 assert.ok(d.rainfall.every(v=>v>=250&&v<=2400));
 assert.ok(d.accumulation.every(v=>v>=0));
 const state=new Uint8Array(count);
 for(let i=0;i<count;i++){
  let j=i;const path=[];
  while(j>=0&&!state[j]){
   assert.ok(j<count);state[j]=1;path.push(j);
   const next=d.receiver[j];
   if(next<0){assert.ok(j<n||j>=n*(n-1)||j%n===0||j%n===n-1)}
   else {
    assert.ok(Math.abs(j%n-next%n)<=1&&Math.abs(Math.floor(j/n)-Math.floor(next/n))<=1);
    assert.ok(d.heightMap[next]+d.waterDepth[next]<=d.heightMap[j]+d.waterDepth[j]+.001);
   }
   j=next;
  }
  assert.ok(j<0||state[j]===2,'drainage cycle');
  for(const cell of path)state[cell]=2;
 }
 const b=d.sedimentBudget;
 assert.ok(Math.abs(b.erodedVolume-b.depositedVolume-b.exportedVolume)<Math.max(1,b.erodedVolume)*1e-8);
 assert.ok(Math.abs(d.waterBudget.input-d.waterBudget.outlets)<d.waterBudget.input*2e-6);
 // The production projectile model must intersect the generated terrain.
 const c={window:{},Math};vm.createContext(c);
 vm.runInContext(fs.readFileSync(new URL('../ballistics.js',root),'utf8'),c);
 const cell=40000/511;
 const ground=(x,y)=>{
  const u=Math.max(0,Math.min(510.999,x/cell)),v=Math.max(0,Math.min(510.999,y/cell));
  const ix=Math.floor(u),iy=Math.floor(v),a=u-ix,b=v-iy;
  return d.heightMap[iy*n+ix]*(1-a)*(1-b)+d.heightMap[iy*n+ix+1]*a*(1-b)+d.heightMap[(iy+1)*n+ix]*(1-a)*b+d.heightMap[(iy+1)*n+ix+1]*a*b;
 };
 const shot=c.window.SH95Ballistics.simulate(0,Math.PI/4,250,{g:{x:20000,y:15000}},{weather:{ws:0,wd:0},ground});
 assert.ok(shot&&Number.isFinite(shot.t)&&shot.t>0);assert.ok(shot.y>15000);
}
const baseline=process.argv[3]?JSON.parse(fs.readFileSync(process.argv[3],'utf8')):null;
const runs=[];
for(const region of ['donja_bukovica','popovac','lipovac','mckhetovac']){
 const hashes=new Set();
 const seeds=region==='donja_bukovica'?[0,42,4294967295,501738173]:[0,42,4294967295];
 for(const seed of seeds){
  const a=generate(region,seed),b=generate(region,seed);verify(a.data);
  const hash=fingerprint(a.data);assert.equal(hash,fingerprint(b.data),'seed reproducibility');hashes.add(hash);
  const physicalSha256=fingerprint(a.data,names.filter(f=>f!=='waterMask'));
  const prior=baseline?.runs.find(r=>r.region===region&&r.seed===seed);
  if(prior)assert.equal(a.data.sedimentBudget.erodedVolume,prior.sedimentBudget.erodedVolume,'upstream bedrock erosion must remain unchanged');
  if(region==='donja_bukovica'&&seed===501738173){
   // Lake marked by the user: no enclosed dry threads/islets in this basin.
   const n=512,mask=a.data.waterMask,x0=294,x1=363,y0=194,y1=250;
   const visited=new Uint8Array(n*n),queue=[];
   function push(x,y){const i=y*n+x;if(!mask[i]&&!visited[i]){visited[i]=1;queue.push(i)}}
   for(let x=x0;x<=x1;x++){push(x,y0);push(x,y1)}
   for(let y=y0;y<=y1;y++){push(x0,y);push(x1,y)}
   for(let p=0;p<queue.length;p++){
    const i=queue[p],x=i%n,y=Math.floor(i/n);
    if(x>x0)push(x-1,y);if(x<x1)push(x+1,y);if(y>y0)push(x,y-1);if(y<y1)push(x,y+1);
   }
   let holes=0;
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(!mask[y*n+x]&&!visited[y*n+x])holes++;
   assert.equal(holes,0,'reported lake still contains spurious dry threads');
  }
  const h=a.data.heightMap;
  let min=Infinity,max=-Infinity,lakeCells=0,riverCells=0,maskCells=0,recoveredShallowCells=0,recoveredSeamCells=0;
  for(let i=0;i<h.length;i++){min=Math.min(min,h[i]);max=Math.max(max,h[i]);if(a.data.waterDepth[i]>.4)lakeCells++;else if(a.data.accumulation[i]>600)riverCells++}
  for(let i=0;i<h.length;i++)if(a.data.waterMask[i]){maskCells++;if(a.data.waterDepth[i]<=.4)recoveredShallowCells++;if(a.data.waterDepth[i]<=.001)recoveredSeamCells++}
  const run={region,seed,sha256:hash,physicalSha256,waterMaskFraction:maskCells/h.length,recoveredShallowCells,recoveredSeamCells,min,max,lakeFraction:lakeCells/h.length,riverCells,elapsedMs:a.elapsedMs,repeatMs:b.elapsedMs,timings:a.data.timings,sedimentBudget:a.data.sedimentBudget,waterBudget:a.data.waterBudget};
  runs.push(run);console.log(JSON.stringify(run));
 }
 assert.equal(hashes.size,seeds.length,'different seeds must differ');
}
const means=Object.fromEntries(['donja_bukovica','popovac','lipovac','mckhetovac'].map(r=>[r,runs.filter(x=>x.region===r).reduce((s,x)=>s+x.max-x.min,0)/runs.filter(x=>x.region===r).length]));
assert.ok(means.mckhetovac>means.lipovac&&means.lipovac>means.popovac&&means.popovac>means.donja_bukovica);
const report={runtime:process.version,sourceSha256,grid:512,worldMetres:40000,seeds:[0,42,4294967295],regressionCase:{region:'donja_bukovica',seed:501738173},generations:runs.length*2,checks:'Water-mask coverage, upstream erosion baseline (when supplied), finite fields, exact repeat hash, transferable detachment, acyclic neighbouring drainage to edge, water budget, sediment budget, regional relief ordering, terrain-aware projectile impact',means,runs};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log('PASS: '+runs.length+' region/seed combinations, each repeated; '+runs.length*2+' full-resolution worker generations.');
