// Run: node --test SHTAB-95/tests/i18n.test.js
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const context={window:{}};
const runtimeFiles=fs.readdirSync(path.join(root,'js')).filter(f=>f.endsWith('.js'));
for(const locale of ['en','ru'])vm.runInNewContext(fs.readFileSync(path.join(root,'locales',locale+'.js'),'utf8'),context);
const {en,ru}=context.window.SHTAB_LOCALES;
const placeholders=text=>[...text.matchAll(/\{([a-zA-Z][\w]*)\}/g)].map(match=>match[1]).sort();

test('English and Russian catalogs contain identical keys',()=>{
 assert.deepEqual(Object.keys(en).sort(),Object.keys(ru).sort());
});
test('catalog entries are nonempty, English is Cyrillic-free, and parameters match',()=>{
 for(const key of Object.keys(en)){
  assert.ok(typeof en[key]==='string'&&en[key].trim(),'English: '+key);
  assert.ok(typeof ru[key]==='string'&&ru[key].trim(),'Russian: '+key);
  assert.doesNotMatch(en[key],/[А-Яа-яЁё]/,'Cyrillic in English value: '+key);
  assert.deepEqual(placeholders(en[key]),placeholders(ru[key]),'Format parameters: '+key);
 }
});
test('every I18n.t and I18n.format literal key exists in both catalogs',()=>{
 for(const file of runtimeFiles){
  const code=fs.readFileSync(path.join(root,'js',file),'utf8');
  for(const match of code.matchAll(/I18n\.(?:t|format)\(\s*['"]([^'"]+)['"]/g)){
   assert.ok(Object.hasOwn(en,match[1]),file+': missing '+match[1]);
   assert.ok(Object.hasOwn(ru,match[1]),file+': missing '+match[1]);
  }
 }
});
test('game scripts and HTML parse and retain an English-first interface',()=>{
 for(const file of runtimeFiles){
  const source=fs.readFileSync(path.join(root,'js',file),'utf8');
  assert.doesNotThrow(()=>new vm.Script(source,{filename:file}),file+' syntax');
 }
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/<html lang="en">/);
 assert.match(html,/id="languageToggle"/);
 assert.match(html,/src="locales\/en\.js"/);
 assert.match(html,/src="locales\/ru\.js"/);
 assert.doesNotMatch(html,/[А-Яа-яЁё]/,'Source HTML must be English-first');
});
test('important dynamic mission and instrument strings have both translations',()=>{
 for(const key of ['Morning','Night','Fog','Thunderstorm','mission.fireReport','mission.defeat','map.grid','profile.status','archive.info','manual.operator']){
  assert.ok(en[key]&&ru[key],key);
  assert.notEqual(en[key],ru[key],'expected a Russian translation for '+key);
 }
});

test('all currently generated crew callsigns are represented in both catalogs',()=>{
 const artillery=fs.readFileSync(path.join(root,'js','artillery-map.js'),'utf8');
 const match=artillery.match(/const CALL_NAMES=\[([^\]]+)\]/);
 assert.ok(match,'CALL_NAMES must exist');
 const names=[...match[1].matchAll(/"([^"]+)"/g)].map(m=>m[1]);
 assert.ok(names.length>=3,'at least three crew callsigns required');
 for(const name of names){
  assert.ok(Object.hasOwn(en,name),'English crew callsign: '+name);
  assert.ok(Object.hasOwn(ru,name),'Russian crew callsign: '+name);
 }
});

test('runtime JavaScript contains no hardcoded Cyrillic text',()=>{
 for(const file of runtimeFiles){const code=fs.readFileSync(path.join(root,'js',file),'utf8');assert.doesNotMatch(code,/[А-Яа-яЁё]/,'Cyrillic must live in locales/ru.js, not js/'+file)}
});

test('terrain diagnostics remain localized after switching language',()=>{
 const artillery=fs.readFileSync(path.join(root,'js','artillery-map.js'),'utf8');
 const required=['TERRAIN:','Terrain layer','Topographic','Biomes','Seed','Random',
  'GENERATING TERRAIN...','PLEASE WAIT','Height','D8 receiver bearing · map-edge outlets'];
 for(const key of required){
  assert.ok(Object.hasOwn(en,key),'missing EN terrain key: '+key);
  assert.ok(Object.hasOwn(ru,key),'missing RU terrain key: '+key);
  assert.notEqual(en[key],ru[key],'untranslated terrain key: '+key);
 }
 assert.match(artillery,/addEventListener\\('shtab:languagechange'/);
 assert.match(artillery,/if\\(HM\\)renderTerrain\\(\\)/);
});
