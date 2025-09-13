import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { synthesizeMemo } from '../src/ai/synthesize.js';

class CountingOpenAI {
  constructor() { this.calls = 0; this.chat = { completions: { create: async ({ messages }) => { this.calls++; return { choices: [{ message: { content: makeOutputFrom(messages[0].content) } }] }; } } }; }
}

class ThrowingOpenAI {
  constructor() { this.chat = { completions: { create: async () => { throw new Error('should not be called'); } } }; }
}

function makeOutputFrom(input) {
  const size = Buffer.byteLength(String(input), 'utf-8');
  return `# Synthesis Memo\n\n---\n\n## PART 1: OBJECTIVE SYNTHESIS\n\n### Emergent Themes\n* size ${size}\n\n### Surprising Connections\n* ok\n\n---\n\n## PART 2: CRITICAL ANALYSIS\n\n### Conflicts & Counter-Arguments\n* ok\n`;
}

async function rmrf(p) { try { await fs.rm(p, { recursive: true, force: true }); } catch {} }

async function run() {
  const projectRoot = process.cwd();
  const cacheDir = path.join(projectRoot, 'artifacts', 'cache');
  await rmrf(cacheDir);

  // One-shot cache hit on second run
  {
    delete process.env.SYNTH_CACHE_TTL_MS; // default
    const ctx = '# REPO CONTENT\n\n## Files\n\n### a.md\ncontent A\n';
    const client1 = new CountingOpenAI();
    const out1 = await synthesizeMemo(client1, ctx, { contextMaxTokens: 999999, projectRoot, model: 'test' });
    assert(out1 && out1.content.includes('# Synthesis Memo'));
    assert.strictEqual(client1.calls, 1, 'expected one OpenAI call');

    const client2 = new ThrowingOpenAI();
    const out2 = await synthesizeMemo(client2, ctx, { contextMaxTokens: 999999, projectRoot, model: 'test' });
    assert(out2 && out2.content.includes('# Synthesis Memo'));
    // cache stats should report a oneshot hit
    assert(out2.meta && out2.meta.cache && out2.meta.cache.oneshotHits >= 1);
  }

  // TTL=0 forces miss
  {
    process.env.SYNTH_CACHE_TTL_MS = '0';
    const ctx = '# REPO CONTENT\n\n## Files\n\n### b.md\ncontent B\n';
    const client = new CountingOpenAI();
    const out = await synthesizeMemo(client, ctx, { contextMaxTokens: 999999, projectRoot, model: 'test' });
    assert(out && out.content.includes('# Synthesis Memo'));
    assert(client.calls >= 1, 'expected OpenAI call due to TTL=0');
    delete process.env.SYNTH_CACHE_TTL_MS;
  }

  // Chunked flow caches map and reduce
  {
    await rmrf(cacheDir);
    const ctx = ['# REPO CONTENT', '## Files', '### a.md', 'A', '### b.md', 'B', '### c.md', 'C'].join('\n');
    const client = new CountingOpenAI();
    const out1 = await synthesizeMemo(client, ctx, { contextMaxTokens: 10, projectRoot, model: 'test' });
    assert(out1 && out1.content.includes('# Synthesis Memo'));
    assert(client.calls >= 1, 'expected some OpenAI calls');

    const clientNoCall = new ThrowingOpenAI();
    const out2 = await synthesizeMemo(clientNoCall, ctx, { contextMaxTokens: 10, projectRoot, model: 'test' });
    assert(out2 && out2.content.includes('# Synthesis Memo'));
    assert(out2.meta && out2.meta.cache && (out2.meta.cache.mapHits >= 1 || out2.meta.cache.reduceHits >= 1), 'expected map/reduce cache hits');
  }

  console.log('synthesis-cache.test.js: OK');
}

run().catch((e) => { console.error(e); process.exit(1); });
