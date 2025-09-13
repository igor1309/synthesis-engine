import assert from 'assert';
import { synthesizeMemo } from '../src/ai/synthesize.js';

class FakeOpenAI {
  constructor(mode = 'chat') {
    if (mode === 'chat') {
      this.chat = { completions: { create: async ({ messages }) => ({
        choices: [{ message: { content: makeOutputFrom(messages[0].content) } }]
      }) } };
    } else {
      this.responses = { create: async ({ input }) => ({ output_text: makeOutputFrom(input) }) };
    }
  }
}

function makeOutputFrom(input) {
  // Return a minimal but valid memo referencing the presence of input size
  const size = Buffer.byteLength(String(input), 'utf-8');
  return `# Synthesis Memo\n\n---\n\n## PART 1: OBJECTIVE SYNTHESIS\n\n### Emergent Themes\n* **Theme A:** From input ${size} bytes.\n  * **Source:** \`a.md\`\n\n### Surprising Connections\n* **Connection:** a -> b\n  * **Reasoning:** demo\n\n---\n\n## PART 2: CRITICAL ANALYSIS\n\n### Conflicts & Counter-Arguments\n* **Conflict:** X vs Y\n  * **Argument A:** \"A\" (from \`a.md\`)\n  * **Argument B:** \"B\" (from \`b.md\`)\n  * **Analysis:** demo\n`;
}

async function run() {
  // One-shot path
  {
    const client = new FakeOpenAI('chat');
    const context = '# REPO CONTENT\n\n## Files\n\n### a.md\ncontent\n';
    const out = await synthesizeMemo(client, context, { contextMaxTokens: 999999, model: 'test' });
    assert(out && out.content, 'expected result with content');
    const memo = out.content;
    assert(memo.includes('# Synthesis Memo'));
    assert(memo.includes('PART 1'));
    assert(memo.includes('PART 2'));
  }

  // Chunked path (force very small limit)
  {
    const client = new FakeOpenAI('chat');
    const context = ['# REPO CONTENT', '## Files', '### a.md', 'A', '### b.md', 'B', '### c.md', 'C'].join('\n');
    const out2 = await synthesizeMemo(client, context, { contextMaxTokens: 50, model: 'test' });
    assert(out2 && out2.content);
    const memo2 = out2.content;
    assert(memo2.includes('# Synthesis Memo'));
    assert(memo2.includes('### Emergent Themes'));
    assert(memo2.includes('### Conflicts & Counter-Arguments'));
  }

  console.log('synthesize.test.js: OK');
}

run().catch((e) => { console.error(e); process.exit(1); });
