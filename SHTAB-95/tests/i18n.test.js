// Run: node --test SHTAB-95/tests/i18n.test.js
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const context={window:{}};
for(const locale of ['en','ru'])vm.runInNewContext(fs.readFileSync(path.join(root,'locales',locale+'.js'),'utf8'),context);
const {en,ru}=context.window.SHTAB_LOCALES;
test('English and Russian catalogs contain identical keys',()=>{
 const a=Object.keys(en).sort(),b=Object.keys(ru).sort();
 assert.deepEqual(a,b);
});
test('every locale entry has a nonempty string',()=>{
 for(const [lang,entries] of Object.entries({en,ru}))for(const [key,value] of Object.entries(entries)){
  assert.equal(typeof value,'string',lang+': '+key);
  assert.ok(value.trim(),lang+': '+key);
 }
});
test('English source catalog is English-first',()=>{
 for(const [key,value] of Object.entries(en)){
  assert.equal(value,key);
  assert.doesNotMatch(key,/[А-Яа-яЁё]/,'English key contains Cyrillic: '+key);
 }
});
