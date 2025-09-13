#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import assert from 'assert';
import { collectAll } from '../src/github/collect.js';

function mkOctokitWithFetchError() {
  return {
    repos: {
      async getContent({ path: p }) {
        if (!p || p === '' || p === '/') p = 'inbox';
        if (p === 'inbox') {
          return { data: [
            { type: 'file', path: 'inbox/a.md', sha: 'sha-a-1', size: 2 },
            { type: 'file', path: 'inbox/b.md', sha: 'sha-b-1', size: 2 },
          ] };
        }
        if (p === 'inbox/a.md') {
          const e = new Error('server error'); e.status = 500; throw e;
        }
        if (p === 'inbox/b.md') {
          return { data: { type: 'file', path: p, sha: 'sha-b-1', size: 2, content: Buffer.from('#B','utf-8').toString('base64') } };
        }
        throw Object.assign(new Error('Not found'), { status: 404 });
      }
    }
  };
}

async function rimraf(p) { await fs.rm(p, { recursive: true, force: true }); }

async function run() {
  const root = process.cwd();
  const tmp = path.join(root, 'test/.tmp-errors');
  await rimraf(tmp);
  await fs.mkdir(tmp, { recursive: true });
  const cfg = {
    tempDir: path.join(tmp, 'temp_inbox_files'),
    cacheFile: path.join(tmp, 'cache.json'),
    repos: [{ owner: 'o', repo: 'r', ref: 'main', inboxPath: 'inbox' }],
  };
  const fake = mkOctokitWithFetchError();
  const res = await collectAll(fake, cfg, { concurrency: 2 });
  const repo = res.metrics.repos[0];
  assert(repo.errorCount >= 1, 'expected per-repo error count');
  assert(Array.isArray(repo.errors), 'expected errors array');
  assert(repo.errors.length >= 1, 'expected at least one sampled error');
  console.log('per-repo-errors.test.js: OK');
  await rimraf(tmp);
}

run().catch((e) => { console.error(e); process.exit(1); });

