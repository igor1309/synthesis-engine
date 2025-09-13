import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { loadDotEnv } from '../src/config/dotenv.js';

async function run() {
  const root = process.cwd();
  const envPath = path.join(root, '.env');
  const prev = { FOO: process.env.FOO, BAR: process.env.BAR };
  try {
    await fs.writeFile(envPath, "# test env\nexport FOO='alpha'\nBAR=beta\n", 'utf-8');
    delete process.env.FOO;
    delete process.env.BAR;
    await loadDotEnv(root);
    assert.strictEqual(process.env.FOO, 'alpha');
    assert.strictEqual(process.env.BAR, 'beta');
    console.log('dotenv.test.js: OK');
  } finally {
    if (prev.FOO !== undefined) process.env.FOO = prev.FOO; else delete process.env.FOO;
    if (prev.BAR !== undefined) process.env.BAR = prev.BAR; else delete process.env.BAR;
    try { await fs.unlink(envPath); } catch {}
  }
}

run().catch((e) => { console.error(e); process.exit(1); });

