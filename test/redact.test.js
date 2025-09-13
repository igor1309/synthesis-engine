import assert from 'assert';
import { redactMeta, redactText } from '../src/logger/redact.js';

async function run() {
  process.env.GH_PAT = 'ghp_ABCDEF123456';
  process.env.OPENAI_API_KEY = 'sk-XYZ789';
  const meta = { token: 'ghp_ABCDEF123456', nested: { key: 'sk-XYZ789', note: 'keep this' } };
  const red = redactMeta(meta);
  assert.notEqual(red.token, meta.token);
  assert(!String(red.token).includes('ABCDEF123456'));
  assert(!String(red.nested.key).includes('XYZ789'));
  const txt = redactText('header ghp_ABCDEF123456 footer');
  assert(!txt.includes('ABCDEF123456'));
  console.log('redact.test.js: OK');
}

run().catch((e) => { console.error(e); process.exit(1); });

