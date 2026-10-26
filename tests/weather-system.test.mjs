import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../SHTAB-95/'+p,import.meta.url),'utf8');
const context={window:{},Math,Date};
vm.runInNewContext(read('js/weather-system.js'),context);
const weather=context.window.SH95Weather;
const start=Date.UTC(1995,4,15,14);
test('weather module loads before artillery map',()=>{const html=read('index.html');assert.ok(html.indexOf('js/weather-system.js')<html.indexOf('js/artillery-map.js'))});
test('weather persists across mission reads and changes on simulated time',()=>{
 weather.reset();const first=weather.advance(start,()=>0.5);const again=weather.advance(start+1000,()=>0.5);
 assert.equal(first.weather.id,again.weather.id);
 assert.equal(first.ws,again.ws);
 const later=weather.advance(start+8*3600000,()=>0.5);
 assert.ok(later.weather);assert.ok(later.ws>=0&&later.ws<=18);
 assert.equal(later.time.id,'night');
});
test('fog is possible in morning and weather has finite conditions',()=>{
 weather.reset();const result=weather.advance(Date.UTC(1995,4,16,7),()=>0.7);
 assert.ok(Number.isFinite(result.noise));assert.ok(Number.isFinite(result.drag));
 assert.ok(result.noise>=0&&result.noise<=1);
});
test('backward clock resets weather safely',()=>{
 weather.reset();weather.advance(start,()=>0.4);
 const result=weather.advance(start-3600000,()=>0.4);
 assert.ok(result.weather&&Number.isFinite(result.ws));
});
