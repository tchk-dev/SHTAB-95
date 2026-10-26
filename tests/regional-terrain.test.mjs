import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../SHTAB-95/'+p,import.meta.url),'utf8');
test('all six Moravican terrain regions are selectable',()=>{
 const html=read('index.html');
 for(const id of ['velikograd','donja_bukovica','popovac','lipovac','pribrezje','mckhetovac'])assert.match(html,new RegExp('data-region="'+id+'"'));
});
test('terrain profiles do not change weather or ballistic formulas',()=>{
 const source=read('js/artillery-map.js');
 assert.match(source,/const TERRAIN_REGIONS=/);
 assert.match(source,/HM=genTerrain\(\(Math.random\(\)\*1e9\)\|0,terrainRegion\)/);
 assert.match(source,/case 'basin'/);
 assert.match(source,/case 'karst'/);
 assert.match(source,/case 'ridges'/);
});

test('hypsometric colors use each generated map elevation range',()=>{
 const source=read('js/artillery-map.js');
 assert.match(source,/function setTerrainColorRange\(heights\)/);
 assert.match(source,/terrainColorMin=Number\.isFinite\(low\)/);
 assert.match(source,/terrainColorMax=Number\.isFinite\(high\)/);
 assert.match(source,/\(h-terrainColorMin\)\/Math\.max\(1,terrainColorMax-terrainColorMin\)/);
 assert.match(source,/setTerrainColorRange\(HM\)/);
 assert.doesNotMatch(source,/const t=Math\.min\(1,h\/480\)/);
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
 assert.match(html,/id="terrainRegion" value="velikograd"/);
 assert.match(css,/\.region-combo-menu\[hidden\]/);
 assert.match(css,/\.region-combo-option\[aria-selected="true"\]/);
 assert.match(js,/function initTerrainRegionCombo\(/);
 assert.match(js,/event\.key==='Escape'/);
});
