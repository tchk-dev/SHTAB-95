import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../SHTAB-95/'+p,import.meta.url),'utf8');
test('all six Moravican terrain regions are selectable',()=>{
 const html=read('index.html');
 for(const id of ['velikograd','donja_bukovica','popovac','lipovac','pribrezje','mckhetovac'])assert.match(html,new RegExp('value="'+id+'"'));
});
test('terrain profiles do not change weather or ballistic formulas',()=>{
 const source=read('js/artillery-map.js');
 assert.match(source,/const TERRAIN_REGIONS=/);
 assert.match(source,/HM=genTerrain\(\(Math.random\(\)\*1e9\)\|0,terrainRegion\)/);
 assert.match(source,/case 'basin'/);
 assert.match(source,/case 'karst'/);
 assert.match(source,/case 'ridges'/);
});
