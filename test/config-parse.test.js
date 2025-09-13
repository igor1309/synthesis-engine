#!/usr/bin/env node
import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseRepoSpec, parseReposList } from '../src/config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function testParseRepoSpec() {
  const cases = [
    ['owner/repo', { owner: 'owner', repo: 'repo', ref: undefined, inboxPath: 'inbox' }],
    ['owner/repo@main', { owner: 'owner', repo: 'repo', ref: 'main', inboxPath: 'inbox' }],
    ['owner/repo:path/box', { owner: 'owner', repo: 'repo', ref: undefined, inboxPath: 'path/box' }],
    ['owner/repo@dev:path/box', { owner: 'owner', repo: 'repo', ref: 'dev', inboxPath: 'path/box' }],
    ['bad', null],
  ];
  for (const [spec, expected] of cases) {
    const parsed = parseRepoSpec(spec);
    if (expected === null) assert.equal(parsed, null, `expected null for ${spec}`);
    else assert.deepStrictEqual(parsed, expected, `mismatch for ${spec}`);
  }
}

function testParseReposList() {
  const txt = `\n# comment\nowner/a\nowner/b@dev\nowner/c:path\nowner/d@r:in\n`;
  const arr = parseReposList(txt);
  assert.equal(arr.length, 4);
  assert.equal(arr[0].repo, 'a');
  assert.equal(arr[1].ref, 'dev');
  assert.equal(arr[2].inboxPath, 'path');
  assert.equal(arr[3].inboxPath, 'in');
}

try {
  testParseRepoSpec();
  testParseReposList();
  console.log('Config parse tests: OK');
} catch (err) {
  console.error(err.stack || String(err));
  process.exit(1);
}

