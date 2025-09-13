import assert from 'assert';
import { validateMemoContent } from '../src/ai/validateMemo.js';

async function run() {
  const good = `# Synthesis Memo\n\n---\n\n## PART 1: OBJECTIVE SYNTHESIS\n\n### Emergent Themes\n* **Theme:** One\n  * **Source:** \`a.md\`\n\n### Surprising Connections\n* **Connection:** A -> B\n  * **Reasoning:** example\n\n---\n\n## PART 2: CRITICAL ANALYSIS\n\n### Conflicts & Counter-Arguments\n* **Conflict:** X vs Y\n  * **Argument A:** \"A\" (from \`a.md\`)\n  * **Argument B:** \"B\" (from \`b.md\`)\n  * **Analysis:** ok\n`;
  const ok = validateMemoContent(good, { requireItems: true });
  assert(ok.ok, 'expected good memo to validate');

  const bad = `# Synthesis Memo\n\n## PART 1: OBJECTIVE SYNTHESIS\n\n### Emergent Themes\n\n## PART 2: CRITICAL ANALYSIS\n`; // missing subsections and items
  const res = validateMemoContent(bad, { requireItems: true });
  assert(!res.ok, 'expected validation to fail');
  assert(res.errors.length >= 1, 'should report errors');

  console.log('memo-validate.test.js: OK');
}

run().catch((e) => { console.error(e); process.exit(1); });

