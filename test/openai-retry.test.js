import assert from 'assert';
import { synthesizeMemo } from '../src/ai/synthesize.js';

class FlakyOpenAI {
  constructor(fails, mode = 'chat') {
    this._fails = fails;
    if (mode === 'chat') {
      this.chat = { completions: { create: async ({ messages }) => {
        if (this._fails > 0) { this._fails--; const e = new Error('rate limited'); e.status = 429; throw e; }
        return { choices: [{ message: { content: '# Synthesis Memo\n\n---\n\n## PART 1: OBJECTIVE SYNTHESIS\n\n### Emergent Themes\n* ok\n\n### Surprising Connections\n* ok\n\n---\n\n## PART 2: CRITICAL ANALYSIS\n\n### Conflicts & Counter-Arguments\n* ok\n' } }] };
      } } };
    }
  }
}

async function run() {
  const ctx = '# REPO CONTENT\n\n## Files\n\n### a.md\ncontent\n';
  const client = new FlakyOpenAI(2);
  process.env.OPENAI_RETRIES = '5';
  const out = await synthesizeMemo(client, ctx, { contextMaxTokens: 999999, model: 'test' });
  assert(out && out.content && out.content.includes('# Synthesis Memo'));
  assert(out.meta && out.meta.openaiRetries >= 2, 'expected openai retry count');
  console.log('openai-retry.test.js: OK');
}

run().catch((e) => { console.error(e); process.exit(1); });
