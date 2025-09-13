#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { collectAll } from '../src/github/collect.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function mkFakeOctokit(initial) {
  // initial: { files: { 'inbox/a.md': { sha, content }, 'inbox/sub/c.md': { sha, content }, ... } }
  const state = { files: { ...initial.files } };
  return {
    // mimic octokit.repos.getContent
    repos: {
      async getContent({ path: p }) {
        if (!p || p === '' || p === '/') p = 'inbox';
        if (p.endsWith('/')) p = p.slice(0, -1);
        // Directory listing
        const isDir = Object.keys(state.files).some((k) => k === p || k.startsWith(p + '/')) && !state.files[p];
        if (isDir) {
          const children = new Set();
          const items = [];
          for (const k of Object.keys(state.files)) {
            if (k === p) continue;
            if (k.startsWith(p + '/')) {
              const rest = k.slice(p.length + 1);
              const seg = rest.split('/')[0];
              const childPath = p + '/' + seg;
              if (children.has(childPath)) continue;
              children.add(childPath);
              if (state.files[childPath]) {
                const file = state.files[childPath];
                items.push({ type: 'file', path: childPath, sha: file.sha, size: Buffer.byteLength(file.content) });
              } else {
                items.push({ type: 'dir', path: childPath });
              }
            }
          }
          return { data: items };
        }
        // File fetch
        const file = state.files[p];
        if (!file) throw Object.assign(new Error('Not found'), { status: 404 });
        return { data: { type: 'file', path: p, sha: file.sha, size: Buffer.byteLength(file.content), content: Buffer.from(file.content, 'utf-8').toString('base64') } };
      }
    },
    _state: state,
  };
}

async function rimraf(p) { await fs.rm(p, { recursive: true, force: true }); }

async function main() {
  const projectRoot = path.resolve(path.join(__dirname, '..'));
  const tmpRoot = path.join(projectRoot, 'test/.tmp-collector');
  await rimraf(tmpRoot);
  await fs.mkdir(tmpRoot, { recursive: true });

  const cfg = {
    tempDir: path.join(tmpRoot, 'temp_inbox_files'),
    cacheFile: path.join(tmpRoot, 'cache.json'),
    repos: [{ owner: 'o', repo: 'r', ref: 'main', inboxPath: 'inbox' }],
  };

  const fake = mkFakeOctokit({
    files: {
      'inbox/a.md': { sha: 'sha-a-1', content: '# A' },
      'inbox/sub/c.md': { sha: 'sha-c-1', content: '# C' },
      'inbox/b.txt': { sha: 'sha-b-1', content: 'note' },
    }
  });

  // First run: should download two markdown files
  const saved1 = await collectAll(fake, cfg, { concurrency: 2 });
  assert.equal(saved1.length, 2, 'first run should save 2 markdown files');
  const baseDir = path.join(cfg.tempDir, 'o__r__main');
  const aPath = path.join(baseDir, 'a.md');
  const cPath = path.join(baseDir, 'sub', 'c.md');
  assert.equal((await fs.readFile(aPath, 'utf-8')).trim(), '# A');
  assert.equal((await fs.readFile(cPath, 'utf-8')).trim(), '# C');

  // Second run: no changes -> should skip downloads (cache hit)
  const saved2 = await collectAll(fake, cfg, { concurrency: 2 });
  assert.equal(saved2.length, 0, 'second run should skip all via cache');

  // Change one file's sha/content; expect one new save
  fake._state.files['inbox/a.md'] = { sha: 'sha-a-2', content: '# A updated' };
  const saved3 = await collectAll(fake, cfg, { concurrency: 2 });
  assert.equal(saved3.length, 1, 'third run should update 1 file');
  assert.equal((await fs.readFile(aPath, 'utf-8')).trim(), '# A updated');

  // Cleanup
  await rimraf(tmpRoot);
  console.log('Collector cache tests: OK');
}

main().catch((err) => { console.error(err); process.exit(1); });

