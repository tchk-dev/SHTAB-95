import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const c={window:{},Math,Int32Array,Uint8Array};vm.createContext(c);
vm.runInContext(fs.readFileSync(new URL('../SHTAB-95/js/terrain/river-geometry.js',import.meta.url),'utf8'),c);
const build=c.window.SH95RiverGeometry.build;
test('curves stay in adjacent drainage cells and preserve inputs',()=>{
 const n=5,receiver=new Int32Array(n*n).fill(-1),flow=new Float32Array(n*n);
 receiver[1]=7;receiver[7]=8;receiver[8]=14;flow[1]=700;flow[7]=800;flow[8]=1200;flow[14]=1400;
 const before=Array.from(receiver),beforeFlow=Array.from(flow),segments=build(receiver,flow,n);
 assert.deepEqual(Array.from(receiver),before);assert.deepEqual(Array.from(flow),beforeFlow);
 const bend=segments.find(s=>s.cell===7);assert.ok(bend);assert.deepEqual(Array.from(bend.control),[2,3]);
 assert.deepEqual(Array.from(bend.start),[1.5,3.5]);assert.deepEqual(Array.from(bend.end),[2.5,3]);
 assert.ok(segments.find(s=>s.cell===8).width>bend.width);
});
test('tributaries meet at confluence and edge outlet is connected',()=>{
 const n=5,r=new Int32Array(n*n).fill(-1),q=new Float32Array(n*n);
 r[6]=12;r[8]=12;r[12]=17;r[17]=22;q[6]=700;q[8]=700;q[12]=1400;q[17]=1400;q[22]=1400;
 const s=build(r,q,n),junction=s.filter(x=>x.cell===12);
 assert.equal(junction.length,3);for(const x of junction)assert.ok((x.start[0]===2&&x.start[1]===2)||(x.end[0]===2&&x.end[1]===2));
 assert.ok(s.some(x=>x.cell===22&&x.end[0]===2&&x.end[1]===0));
});
