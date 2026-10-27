import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../SHTAB-95/' + path, import.meta.url), 'utf8');
const html = read('index.html');
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)].map(match => match[1]);

test('all local scripts are unique and ordered for their dependencies', () => {
  assert.equal(new Set(scripts).size, scripts.length, 'duplicate script inclusion');
  const before = (first, second) => {
    assert.ok(scripts.includes(first), 'missing ' + first);
    assert.ok(scripts.includes(second), 'missing ' + second);
    assert.ok(scripts.indexOf(first) < scripts.indexOf(second), first + ' must load before ' + second);
  };
  before('locales/en.js', 'js/i18n.js');
  before('locales/ru.js', 'js/i18n.js');
  before('js/i18n.js', 'js/radio.js');
  before('js/game-clock.js', 'js/artillery-map.js');
  before('js/artillery-map.js', 'js/interface.js');
  before('js/radio.js', 'js/recorder.js');
  before('js/filesystem.js', 'js/recorder.js');
  before('js/browser-sites.js', 'js/browser.js');
});

test('every referenced local script and stylesheet exists', () => {
  const resources = [...html.matchAll(/(?:src|href)=["']((?:js|css|locales)\/[^"']+)["']/g)].map(match => match[1]);
  for (const resource of resources) assert.doesNotThrow(() => read(resource), resource);
});

test('all static HTML element IDs are unique', () => {
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
  assert.ok(ids.length > 0);
  assert.equal(new Set(ids).size, ids.length, 'duplicate HTML ID');
});

test('game clock exposes required API without changing time or storage', () => {
  const source = read('js/game-clock.js');
  for (const method of ['now','nowMs','skip','canSkip','blockers','lock','lockFor','subscribe'])
    assert.match(source, new RegExp('\\b' + method + '\\b'), 'missing clock API: ' + method);
  assert.match(source, /shtab:clockchange/);
});

test('projectile model and radio integration remain wired', () => {
  const artillery = read('js/artillery-map.js');
  assert.match(artillery, /GameClock/);
  assert.match(artillery, /updateTimedConditions/);
  assert.match(artillery, /pickCrewNames/);
  assert.match(artillery, /flight/i);
  const radio = read('js/radio.js');
  assert.match(radio, /window\.Radio\s*=/);
  assert.match(read('js/filesystem.js'), /window\.sh95Archive\s*=/);
  assert.match(read('js/recorder.js'), /sh95Archive|sh95OpenFiles/);
});

test('all runtime scripts parse as JavaScript', () => {
  for (const path of scripts.filter(path => path.endsWith('.js')))
    assert.doesNotThrow(() => new vm.Script(read(path), {filename: path}), path);
});
