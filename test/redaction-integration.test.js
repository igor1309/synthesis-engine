import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { logger } from '../src/logger/index.js';

const execFileAsync = promisify(execFile);

async function findLatestRunSummary(root = process.cwd()) {
  const artDir = path.join(root, 'artifacts');
  try {
    const entries = await fs.readdir(artDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort().reverse();
    for (const d of dirs) {
      const p = path.join(artDir, d, 'run-summary.json');
      try { await fs.access(p); return p; } catch {}
    }
  } catch {}
  return null;
}

async function run() {
  const root = process.cwd();
  const tmpSum = path.join(root, 'test/.tmp-summary-' + Date.now() + '.md');
  process.env.GH_PAT = 'ghp_TESTSECRET';
  process.env.OPENAI_API_KEY = 'sk-ANOTHERSECRET';
  process.env.GITHUB_STEP_SUMMARY = tmpSum;
  await logger.writeStepSummary('secrets: ' + process.env.GH_PAT + ' / ' + process.env.OPENAI_API_KEY);
  const written = await fs.readFile(tmpSum, 'utf-8');
  assert(!written.includes('ghp_TESTSECRET'));
  assert(!written.includes('sk-ANOTHERSECRET'));

  // Now run collector in DRY_RUN to produce an artifacts summary and ensure secrets are not present
  delete process.env.GITHUB_STEP_SUMMARY;
  process.env.DRY_RUN = '1';
  await execFileAsync('node', ['collector.js'], { cwd: root, env: process.env });
  const rsPath = await findLatestRunSummary(root);
  assert(rsPath, 'expected a run-summary.json');
  const rs = await fs.readFile(rsPath, 'utf-8');
  assert(!rs.includes('ghp_TESTSECRET'));
  assert(!rs.includes('sk-ANOTHERSECRET'));
  console.log('redaction-integration.test.js: OK');
}

run().catch((e) => { console.error(e); process.exit(1); });

