import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { collectAll } from '../src/github/collect.js';

async function run() {
  const root = process.cwd();
  const tempDir = path.join(root, 'test/.tmp-download-url');
  const cacheFile = path.join(root, 'test/.tmp-download-url-cache.json');
  const config = {
    tempDir,
    cacheFile,
    repos: [{ owner: 'o', repo: 'r', ref: 'HEAD', inboxPath: 'inbox' }]
  };

  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.rm(cacheFile, { force: true });

  let fetchHeaders = null;
  const originalFetch = global.fetch;
  global.fetch = async (_url, options = {}) => {
    fetchHeaders = options.headers || {};
    return { text: async () => 'downloaded' };
  };

  const fakeOctokit = {
    auth: async () => ({ token: 'ghp_TOKEN123' }),
    repos: {
      getContent: async ({ path: p }) => {
        if (p === 'inbox') {
          return { data: [{ type: 'file', path: 'inbox/a.md', sha: 'sha1', size: 10 }] };
        }
        if (p === 'inbox/a.md') {
          return { data: { type: 'file', download_url: 'https://example.com/raw', sha: 'sha1', size: 10 } };
        }
        const err = new Error('not found');
        err.status = 404;
        throw err;
      }
    }
  };

  try {
    const result = await collectAll(fakeOctokit, config, { concurrency: 1 });
    assert.equal(result.savedFiles.length, 1);
    const content = await fs.readFile(result.savedFiles[0], 'utf-8');
    assert.equal(content, 'downloaded');
    assert.equal(fetchHeaders?.Authorization, 'token ghp_TOKEN123');
    console.log('download-url-fallback.test.js: OK');
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.rm(cacheFile, { force: true });
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
