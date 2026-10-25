import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../SHTAB-95/', import.meta.url);
const file = path => readFileSync(new URL(path, root), 'utf8');

test('all JavaScript files are present and nonempty', () => {
  const folder = new URL('js/', root);
  const names = readdirSync(folder).filter(name => name.endsWith('.js'));
  assert.ok(names.length >= 9, 'Expected the existing game scripts');
  for (const name of names) assert.ok(file('js/' + name).trim().length > 0, name);
});

test('every local script and stylesheet referenced in HTML exists', () => {
  const html = file('index.html');
  const resources = [
    ...html.matchAll(/<script\\b[^>]*\\bsrc=["']([^"']+)["']/gi),
    ...html.matchAll(/<link\\b[^>]*\\bhref=["']([^"']+)["']/gi),
  ].map(match => match[1]).filter(path => !/^(https?:|data:|\/\/)/i.test(path));
  assert.ok(resources.length >= 10, 'Expected local JS/CSS assets');
  for (const resource of resources) {
    const path = resource.split(/[?#]/)[0];
    assert.ok(existsSync(new URL(path, root)), 'Missing asset: ' + resource);
  }
});

test('task identifier is created and checked before coordinates are accepted', () => {
  const code = file('js/artillery-map.js');
  assert.match(code, /window\\.sh95CurrentTaskId\\s*=/);
  assert.match(code, /recordTaskId\\s*!==\\s*window\\.sh95CurrentTaskId/);
});

test('recording keeps its task identifier through archive save and load', () => {
  const code = file('js/recorder.js');
  assert.match(code, /taskId:\s*recordTaskId/);
  assert.match(code, /recordTaskId\s*=\s*entry\.taskId\s*\|\|\s*null/);
  assert.match(code, /sh95AcceptDecodedCoordinates\?\.\([^;]*recordTaskId\)/s);
});

test('decode uncertainty uses a seeded generator, not Math.random', () => {
  const code = file('js/recorder.js');
  assert.match(code, /seededRandom\(\)\s*<\s*penalty/);
  assert.match(code, /decodeAudio\(recordedPCM,\s*sampleRate,\s*recordedQuality,\s*currentEntryId\)/);
});

test('archive reports failed deletes to the caller', () => {
  const code = file('js/filesystem.js');
  assert.match(code, /tx\.oncomplete\s*=\s*\(\)\s*=>\s*resolve\(true\)/);
  assert.match(code, /tx\.onerror\s*=\s*\(\)\s*=>\s*resolve\(false\)/);
  assert.match(code, /ОШИБКА УДАЛЕНИЯ ФАЙЛА/);
});
