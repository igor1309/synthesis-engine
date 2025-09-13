#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import assert from 'assert';
import { collectAll } from '../src/github/collect.js';

function mkFlakyOctokit() {
  const attempts = new Map();
  const fileData = {
    'inbox/a.md': '# A',
    'inbox/b.md': '# B',
  };
  return {
    repos: {
      async getContent({ path: p }) {
        if (!p || p === '' || p === '/') p = 'inbox';
        if (p === 'inbox') {
          return { data: [
            { type: 'file', path: 'inbox/a.md', sha: 'sha-a-1', size: 3 },
            { type: 'file', path: 'inbox/b.md', sha: 'sha-b-1', size: 3 },
          ] };
        }
        const key = String(p);
        const n = (attempts.get(key) || 0) + 1;
        attempts.set(key, n);
        if (key === 'inbox/a.md' && n === 1) {
          const e = new Error('rate limited');
          e.status = 429;
          throw e;
        }
        const content = fileData[key];
        if (!content) throw Object.assign(new Error('Not found'), { status: 404 });
        return { data: { type: 'file', path: key, sha: key.includes('a.md') ? 'sha-a-1' : 'sha-b-1', size: Buffer.byteLength(content), content: Buffer.from(content, 'utf-8').toString('base64') } };
      }
    }
  };
}

async function rimraf(p) { await fs.rm(p, { recursive: true, force: true }); }

async function run() {
  const projectRoot = path.resolve(path.join(process.cwd()))
  const tmpRoot = path.join(projectRoot, 'test/.tmp-adaptive');
  await rimraf(tmpRoot);
  await fs.mkdir(tmpRoot, { recursive: true });

  const cfg = {
    tempDir: path.join(tmpRoot, 'temp_inbox_files'),
    cacheFile: path.join(tmpRoot, 'cache.json'),
    repos: [{ owner: 'o', repo: 'r', ref: 'main', inboxPath: 'inbox' }],
  };

  const fake = mkFlakyOctokit();
  const t0 = Date.now();
  const res = await collectAll(fake, cfg, { concurrency: 4 });
  const elapsed = Date.now() - t0;
  assert.equal(res.savedFiles.length, 2, 'should save both files');
  assert.equal(res.metrics.totals.downloadedCount, 2, 'downloaded count should be 2');
  // Expect at least one retry backoff (~400ms default); allow margin
  assert(elapsed >= 200, 'expected elapsed time to include retry backoff');

  await rimraf(tmpRoot);
  console.log('adaptive-concurrency.test.js: OK');
}

run().catch((e) => { console.error(e); process.exit(1); });

