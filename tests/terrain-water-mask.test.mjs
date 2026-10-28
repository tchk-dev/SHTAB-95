import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const c={window:{},Math};vm.createContext(c);
vm.runInContext(fs.readFileSync(new URL('../SHTAB-95/js/terrain/water-mask.js',import.meta.url),'utf8'),c);
const build=c.window.SH95WaterMask.build;
function pool(n=9){
 const h=new Float32Array(n*n).fill(12),f=h.slice();
 for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){h[y*n+x]=8;f[y*n+x]=10}
 return {n,h,f};
}
test('shallow shelves and near-surface strips stay connected to a lake',()=>{
 const {n,h,f}=pool();
 for(let y=1;y<n-1;y++)h[y*n+4]=9.8;
 const mask=build(h,f,n);
 for(let y=1;y<n-1;y++)assert.equal(mask[y*n+4],1);
 assert.equal(mask[0],0);
});
test('zero-depth routing seams at spill level no longer split lake water',()=>{
 const {n,h,f}=pool();
 for(let y=1;y<n-1;y++)h[y*n+4]=10;
 const before=h.slice(),surface=f.slice(),a=build(h,f,n),b=build(h,f,n);
 for(let y=1;y<n-1;y++)assert.equal(a[y*n+4],1);
 assert.deepEqual(a,b);assert.deepEqual(h,before);assert.deepEqual(f,surface);
});
test('raised one-cell islands and dams remain dry',()=>{
 const {n,h,f}=pool();
 for(let y=1;y<n-1;y++){h[y*n+4]=10.5;f[y*n+4]=10.5}
 const mask=build(h,f,n);
 for(let y=1;y<n-1;y++)assert.equal(mask[y*n+4],0);
});
test('water bodies at different levels are not bridged',()=>{
 const {n,h,f}=pool();
 for(let y=1;y<n-1;y++)for(let x=4;x<n-1;x++){h[y*n+x]=x===4?10:8;f[y*n+x]=x===4?10:9}
 const mask=build(h,f,n);
 for(let y=1;y<n-1;y++)assert.equal(mask[y*n+4],0);
});
test('flat dry ground and isolated sub-threshold puddles are not flooded',()=>{
 const h=new Float32Array(81).fill(10),f=h.slice();h[40]=9.8;
 assert.ok(build(h,f,9).every(v=>v===0));
});
test('water mask is reflection-symmetric and rejects invalid inputs',()=>{
 const {n,h,f}=pool();h[3*n+4]=10;h[4*n+4]=10;h[4*n+5]=10.2;f[4*n+5]=10.2;
 const reflect=a=>Float32Array.from({length:n*n},(_,i)=>a[Math.floor(i/n)*n+n-1-i%n]);
 const mask=build(h,f,n),mirror=build(reflect(h),reflect(f),n);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)assert.equal(mask[y*n+x],mirror[y*n+n-1-x]);
 assert.throws(()=>build(h,f,8));h[0]=NaN;assert.throws(()=>build(h,f,n));
});

test('low narrow silt bars are generalized without climbing above a fixed lake level',()=>{
 const {n,h,f}=pool();
 for(let y=1;y<n-1;y++){h[y*n+4]=10.2;f[y*n+4]=10.2}
 const mask=build(h,f,n);
 for(let y=1;y<n-1;y++)assert.equal(mask[y*n+4],1);
 const before=h.slice();assert.deepEqual(h,before);
 // A broader emergent island retains its centre even if its corners smooth.
 const p=pool(15);for(let y=4;y<=10;y++)for(let x=4;x<=10;x++){p.h[y*15+x]=10.2;p.f[y*15+x]=10.2}
 assert.equal(build(p.h,p.f,15)[7*15+7],0);
});
