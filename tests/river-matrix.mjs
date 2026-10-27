// Full-resolution drainage/display audit. Run: node tests/river-matrix.mjs [output.json]
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const root=new URL('../SHTAB-95/js/terrain/',import.meta.url);
const sources=new Map(fs.readdirSync(root).filter(f=>f.endsWith('.js')).map(f=>[f,fs.readFileSync(new URL(f,root),'utf8')]));
function generate(region,seed){
 const c={Math,Float32Array,Float64Array,Uint8Array,Int32Array,performance};c.self=c;c.window=c;vm.createContext(c);
 c.importScripts=(...files)=>{for(const f of files)vm.runInContext(sources.get(f),c)};
 let data;c.postMessage=d=>{data=d};vm.runInContext(sources.get('terrain-worker.js'),c);vm.runInContext(sources.get('river-geometry.js'),c);
 c.onmessage({data:{id:1,region,seed}});assert.ok(!data.error,data.error);return {data,geometry:c.SH95RiverGeometry};
}
const runs=[],n=512;
for(const region of ['donja_bukovica','popovac','lipovac','mckhetovac'])for(const seed of [0,42,4294967295]){
 const {data:d,geometry}=generate(region,seed),r=d.receiver,q=d.accumulation,mask=d.waterMask;
 const seg=geometry.build(r,q,n),starts=new Uint8Array(n*n),ends=new Uint8Array(n*n);let riverEdges=0,dryUphill=0,waterUphill=0,crossings=0;
 // Every segment remains inside the convex hull of its neighbouring graph cells.
 for(const s of seg){
  const p=i=>[i%n,n-1-Math.floor(i/n)],c=p(s.cell);
  for(const t of [s.start,s.control,s.end]){assert.ok(Math.abs(t[0]-c[0])<=.5&&Math.abs(t[1]-c[1])<=.5);assert.ok(t.every(Number.isFinite))}
  assert.ok(s.width>=.8&&s.width<=3);
  if(s.from!==s.cell){assert.equal(r[s.from],s.cell);ends[s.from]=1}
  if(s.to!==s.cell&&s.to>=0){assert.equal(r[s.cell],s.to);starts[s.cell]=1}
 }
 for(let i=0;i<r.length;i++)if(q[i]>600&&r[i]>=0){
  const j=r[i];riverEdges++;assert.ok(starts[i]&&ends[i],`edge ${i} -> ${j} has a display gap`);
  if(d.heightMap[j]-d.heightMap[i]>.001){if(mask[i]||mask[j])waterUphill++;else dryUphill++}
 }
 for(let y=0;y<n-1;y++)for(let x=0;x<n-1;x++){
  const a=y*n+x,b=a+1,c=a+n,e=c+1,edge=(i,j)=>r[i]===j||r[j]===i;
  if(edge(a,e)&&edge(b,c))crossings++;
 }
 runs.push({region,seed,riverEdges,segments:seg.length,dryUphill,waterUphill,diagonalCrossings:crossings});console.log(JSON.stringify(runs.at(-1)));
}
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify({runs},null,2)+'\n');
