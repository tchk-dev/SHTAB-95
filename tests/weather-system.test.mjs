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

test('season boundaries follow simulated UTC calendar',()=>{
 assert.equal(weather.seasonAt(Date.UTC(1995,0,15)),'winter');
 assert.equal(weather.seasonAt(Date.UTC(1995,3,15)),'spring');
 assert.equal(weather.seasonAt(Date.UTC(1995,6,15)),'summer');
 assert.equal(weather.seasonAt(Date.UTC(1995,9,15)),'autumn');
});
test('winter and autumn weather stays finite after multi-day skip',()=>{
 for(const month of [0,9]){
  weather.reset();const at=Date.UTC(1995,month,15,3);
  weather.advance(at,()=>0.45);
  const later=weather.advance(at+5*86400000,()=>0.45);
  assert.ok(later.ws>=0&&later.ws<=24);
  assert.ok(later.wd>=0&&later.wd<360);
  assert.ok(later.weather&&Number.isFinite(later.drag));
 }
});

test('wind regime is returned and affects ballistic wind input',()=>{
 weather.reset();const result=weather.advance(start,()=>0.95);
 assert.ok(['continental','calm','bora','jugo'].includes(result.regime));
 assert.ok(Number.isFinite(result.ws)&&Number.isFinite(result.wd));
 const map=read('js/artillery-map.js');
 assert.match(map,/missionConditions\.wind/);
 assert.match(map,/next\.regime/);
 assert.match(map,/weather:S/);
 assert.match(map,/windChanged/);
});

test('new mission resamples weather and wind without changing the clock',()=>{
 weather.reset();const first=weather.newMission(start,()=>0.25);
 const second=weather.newMission(start,()=>0.75);
 assert.notEqual(second.weather.id,first.weather.id);
 assert.ok(Number.isFinite(second.ws)&&Number.isFinite(second.wd));
 assert.equal(second.time.id,first.time.id);
 assert.equal(weather.advance(start+1000,()=>0.5).weather.id,second.weather.id);
 const map=read('js/artillery-map.js');
 assert.match(map,/SH95Weather\.newMission\(date\.getTime\(\)\)/);
 assert.match(map,/updateTimedConditions\(window\.GameClock\?\.now\(\)\|\|new Date\(\),true\)/);
});
