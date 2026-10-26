import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../SHTAB-95/js/ballistics.js',import.meta.url),'utf8');
const context={window:{},Math};
vm.runInNewContext(source,context);
const {simulate}=context.window.SH95Ballistics;
const flat=()=>0;
const crew={g:{x:1000,y:2000}};
test('trajectory module loads before map and exposes simulation',()=>{
 const html=readFileSync(new URL('../SHTAB-95/index.html',import.meta.url),'utf8');
 assert.ok(html.indexOf('js/ballistics.js')<html.indexOf('js/artillery-map.js'));
 assert.equal(typeof simulate,'function');
});
test('zero-wind trajectory lands forward with finite time and sampled points',()=>{
 const result=simulate(0,Math.PI/4,250,crew,{weather:{ws:0,wd:0},ground:flat});
 assert.ok(result);
 assert.ok(Math.abs(result.x-1000)<0.01);
 assert.ok(result.y>2000);
 assert.ok(result.t>0);
 assert.ok(result.pts.length>2);
});
test('wind direction changes impact without modifying input state',()=>{
 const calm={ws:0,wd:0},east={ws:10,wd:270};
 const baseline=simulate(0,Math.PI/4,250,crew,{weather:calm,ground:flat});
 const windy=simulate(0,Math.PI/4,250,crew,{weather:east,ground:flat});
 assert.ok(Math.abs(windy.x-baseline.x)>1);
 assert.deepEqual(Object.keys(calm).sort(),['wd','ws']);
});
test('increased drag reduces forward reach on flat terrain',()=>{
 const options={weather:{ws:0,wd:0},ground:flat};
 const normal=simulate(0,Math.PI/4,250,crew,options);
 const heavy=simulate(0,Math.PI/4,250,crew,{...options,dragMultiplier:2});
 assert.ok(heavy.y<normal.y);
});
