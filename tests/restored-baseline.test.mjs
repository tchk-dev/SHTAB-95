import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('runtime includes unified simulation clock before artillery',()=>{
 const html=read('SHTAB-95/index.html');
 const clock=html.indexOf('src="js/game-clock.js"');
 const artillery=html.indexOf('src="js/artillery-map.js"');
 assert.ok(clock>=0,'game clock must be loaded');
 assert.ok(artillery>clock,'clock must load before artillery');
 assert.ok(existsSync(new URL('../SHTAB-95/js/game-clock.js',import.meta.url)));
 assert.match(read('SHTAB-95/js/game-clock.js'),/window\.GameClock\s*=/);
});
test('notifications and flight simulation are included',()=>{
 const html=read('SHTAB-95/index.html');
 assert.match(html,/src="js\/notifications\.js"/);
 assert.ok(existsSync(new URL('../SHTAB-95/js/notifications.js',import.meta.url)));
 const artillery=read('SHTAB-95/js/artillery-map.js');
 assert.match(artillery,/GameClock/);
 assert.match(artillery,/flight/i);
 assert.match(artillery,/updateTimedConditions/);
});
test('radio and mission controls remain present',()=>{
 const html=read('SHTAB-95/index.html');
 for(const id of ['map','radioSection','fire','ch','clock','start95'])assert.ok(html.includes('id="'+id+'"'),id+' missing');
 assert.match(html,/src="js\/radio\.js"/);
 assert.match(html,/src="js\/recorder\.js"/);
});
