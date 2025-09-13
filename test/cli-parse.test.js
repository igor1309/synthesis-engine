import assert from 'assert';
import { loadCliOverrides } from '../src/config/cli.js';

async function run() {
  const prev = { ...process.env };
  try {
    delete process.env.LOG_LEVEL;
    delete process.env.DRY_RUN;
    delete process.env.OPENAI_MODEL;
    delete process.env.GITHUB_BASE_URL;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.GITHUB_CONCURRENCY;
    loadCliOverrides(['node','script','--log-level','debug','--dry-run','--openai-model','x','--github-base-url','https://ghe.example','--openai-base-url','https://oai.example','--github-concurrency','9']);
    assert.equal(process.env.LOG_LEVEL, 'debug');
    assert.equal(process.env.DRY_RUN, '1');
    assert.equal(process.env.OPENAI_MODEL, 'x');
    assert.equal(process.env.GITHUB_BASE_URL, 'https://ghe.example');
    assert.equal(process.env.OPENAI_BASE_URL, 'https://oai.example');
    assert.equal(process.env.GITHUB_CONCURRENCY, '9');
    console.log('cli-parse.test.js: OK');
  } finally {
    // restore
    for (const k of Object.keys(process.env)) delete process.env[k];
    Object.assign(process.env, prev);
  }
}

run().catch((e) => { console.error(e); process.exit(1); });

