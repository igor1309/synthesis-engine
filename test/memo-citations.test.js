import assert from 'assert';
import { validateMemoContent } from '../src/ai/validateMemo.js';

async function run() {
  const memoNoCite = `# Synthesis Memo\n\n---\n\n## PART 1: OBJECTIVE SYNTHESIS\n\n### Emergent Themes\n* **Theme:** One\n\n### Surprising Connections\n* **Connection:** A -> B\n\n---\n\n## PART 2: CRITICAL ANALYSIS\n\n### Conflicts & Counter-Arguments\n* **Conflict:** X vs Y\n`;
  const res1 = validateMemoContent(memoNoCite, { requireItems: true, minCitations: 1 });
  assert(!res1.ok, 'expected validation to fail without citations');
  assert(res1.errors.some(e => String(e).toLowerCase().includes('citations')));

  const memoWithCite = `# Synthesis Memo\n\n---\n\n## PART 1: OBJECTIVE SYNTHESIS\n\n### Emergent Themes\n* **Theme:** One\n  * **Source:** \`a.md\`\n\n### Surprising Connections\n* **Connection:** A -> B\n\n---\n\n## PART 2: CRITICAL ANALYSIS\n\n### Conflicts & Counter-Arguments\n* **Conflict:** X vs Y\n`;
  const res2 = validateMemoContent(memoWithCite, { requireItems: true, minCitations: 1 });
  assert(res2.ok, 'expected validation to pass with at least one citation');

  console.log('memo-citations.test.js: OK');
}

run().catch((e) => { console.error(e); process.exit(1); });

