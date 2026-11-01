import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../SHTAB-95/'+p,import.meta.url),'utf8');
test('all four Moravican terrain regions are selectable',()=>{
 const html=read('index.html');
 for(const id of ['donja_bukovica','popovac','lipovac','mckhetovac'])assert.match(html,new RegExp('data-region="'+id+'"'));
});
test('mission toolbar places region after No Wind and removes Reset View',()=>{
 const html=read('index.html'),map=read('js/artillery-map.js');
 const toolbar=html.split('<div class="tool">')[1].split('<div class="mission-conditions"')[0];
 assert.ok(toolbar.indexOf('id="terrainRegion"')>toolbar.indexOf('id="nowind"'));
 assert.ok(toolbar.indexOf('id="terrainRegion"')<toolbar.indexOf('class="tool-secondary"'));
 assert.ok(toolbar.indexOf('id="newt"')<toolbar.indexOf('class="tool-secondary"'));
 assert.doesNotMatch(toolbar,/id="fit"/);
 assert.doesNotMatch(map,/\$\('fit'\)\.onclick/);
});

test('region menu uses custom square Win95 popup with keyboard controls',()=>{
 const html=read('index.html'),css=read('css/main.css'),js=read('js/artillery-map.js');
 assert.match(html,/id="terrainRegionTrigger"/);
 assert.match(html,/id="terrainRegionMenu" role="listbox"/);
 assert.match(html,/id="terrainRegion" value="donja_bukovica"/);
 assert.match(css,/\.region-combo-menu\[hidden\]/);
 assert.match(css,/\.region-combo-option\[aria-selected="true"\]/);
 assert.match(js,/function initTerrainRegionCombo\(/);
 assert.match(js,/event\.key==='Escape'/);
});
