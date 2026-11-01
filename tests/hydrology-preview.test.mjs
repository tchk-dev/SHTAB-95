import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../SHTAB-95/js/terrain/',import.meta.url);
const c={window:{},Math,Float64Array,Int32Array,Uint32Array,Uint8Array};vm.createContext(c);
for(const name of ['surface-flow.js','catchments.js','reservoir.js','reservoir-network.js','lake-routing.js','hydrology-scenario.js','hydrology-preview.js'])
 vm.runInContext(fs.readFileSync(new URL(name,root),'utf8'),c);
const preview=c.window.SH95HydrologyPreview.analyze;
test('opt-in hydrology preview conserves water without mutating terrain',()=>{
 const size=32,heights=Float32Array.from({length:size*size},(_,i)=>15+Math.sin(i%size)*2+Math.cos(Math.floor(i/size))*3);
 const before=heights.slice(),result=preview(heights,size,{gridSize:16,runoffMetres:.1});
 assert.deepEqual(heights,before);
 assert.equal(result.gridSize,16);
 assert.equal(result.uphill,0);
 assert.ok(Math.abs(result.input-result.retained-result.exported)<result.input*1e-7);
 assert.ok(result.wetFraction>=0&&result.wetFraction<=1);
});
test('hydrology preview validates its resolution and scenario assumptions',()=>{
 const heights=new Float32Array(32*32).fill(12);
 assert.throws(()=>preview(heights,32,{gridSize:33}));
 assert.throws(()=>preview(heights,32,{gridSize:7}));
 assert.throws(()=>preview(heights,32,{runoffMetres:-1}));
 assert.throws(()=>preview(heights,32,{worldMetres:0}));
});
test('terrain worker keeps preview disabled by default',()=>{
 const worker=fs.readFileSync(new URL('terrain-worker.js',root),'utf8');
 assert.match(worker,/hydrologyPreview=false/);
 assert.match(worker,/hydrologyPreview\?self\.SH95HydrologyPreview\.analyze/);
 assert.match(worker,/hydrologyPreview:preview/);
});
