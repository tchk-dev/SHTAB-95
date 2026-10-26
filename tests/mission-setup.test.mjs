import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../SHTAB-95/'+p,import.meta.url),'utf8');
const context={window:{},Math};
vm.runInNewContext(read('js/mission-setup.js'),context);
const {pickFreqs}=context.window.SH95MissionSetup;
test('mission frequency allocator is loaded before artillery',()=>{
 const html=read('index.html');
 assert.ok(html.indexOf('js/mission-setup.js')>=0);
 assert.ok(html.indexOf('js/mission-setup.js')<html.indexOf('js/artillery-map.js'));
});
test('mission allocates three distinct channel frequencies',()=>{
 for(let seed=0;seed<30;seed++){
  let i=0;const values=[.1,.5,.9,.2,.7,.3];
  const freqs=pickFreqs(()=>values[(i++ + seed)%values.length]);
  assert.equal(freqs.length,3);
  assert.equal(new Set(freqs).size,3);
  for(const f of freqs){assert.ok(f>=555&&f<=1686);assert.equal(f%3,0)}
  for(let a=0;a<3;a++)for(let b=a+1;b<3;b++)assert.ok(Math.abs(freqs[a]-freqs[b])>=75);
 }
});
