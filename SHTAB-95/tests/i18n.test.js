// Run: node --test SHTAB-95/tests/i18n.test.js
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const context={window:{}};
for(const language of ['en','ru'])vm.runInNewContext(fs.readFileSync(path.join(root,'locales',language+'.js'),'utf8'),context);
const {en,ru}=context.window.SHTAB_LOCALES;
const scripts=fs.readdirSync(path.join(root,'js')).filter(x=>x.endsWith('.js')).map(x=>[x,fs.readFileSync(path.join(root,'js',x),'utf8')]);
test('Both locales have exactly the same translation keys',()=>{
 assert.deepEqual(Object.keys(en).sort(),Object.keys(ru).sort());
 assert.ok(Object.keys(en).length>350,'the full interface catalog must be present');
});
test('Both locales have nonempty translations and English contains no Cyrillic',()=>{
 for(const [locale,dictionary] of Object.entries({en,ru}))
  for(const [key,value] of Object.entries(dictionary)){
   assert.equal(typeof value,'string',locale+': '+key);
   assert.ok(value.trim(),locale+': '+key);
   if(locale==='en')assert.doesNotMatch(value,/[А-Яа-яЁё]/,key);
  }
});
test('Translations preserve message placeholders',()=>{
 for(const key of Object.keys(en)){
  const slots=s=>[...s.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map(m=>m[1]).sort();
  assert.deepEqual(slots(en[key]),slots(ru[key]),key);
 }
});
test('All literal I18n keys in JavaScript exist in both locales',()=>{
 for(const [filename,code] of scripts){
  for(const match of code.matchAll(/I18n\.(?:t|format)\(['"]([^'"]+)['"]/g)){
   assert.ok(Object.hasOwn(en,match[1]),filename+': untranslated key '+match[1]);
  }
 }
});
test('Game modules do not contain hard-coded Cyrillic user messages',()=>{
 for(const [filename,code] of scripts){
  if(filename==='i18n.js')continue;
  const lines=code.split(/\r?\n/).filter(line=>!/^\s*(?:\/\/|\/\*|\*)/.test(line));
  // Bilingual keyword recognition for interface sounds is not displayed text.
  const readable=lines.join('\n').replace(/\/confirmed\|accepted[^/]*\//g,'');
  assert.doesNotMatch(readable,/[А-Яа-яЁё]/,filename+' still has untranslated user-facing text');
 }
});
