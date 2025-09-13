import fs from 'fs/promises';

export function validateMemoContent(md, options = {}) {
  const text = String(md || '');
  const errors = [];
  const warnings = [];

  const requireSections = options.requireSections !== false;
  const requireItems = options.requireItems ?? false;
  const allowPlaceholder = options.allowPlaceholder ?? false;

  const hasHeader = /(^|\n)#\s*Synthesis Memo\s*(\n|$)/m.test(text);
  if (!hasHeader) errors.push('Missing "# Synthesis Memo" header');

  const part1Idx = indexOfHeading(text, /^##\s*PART\s*1:\s*OBJECTIVE\s*SYNTHESIS\s*$/mi);
  const part2Idx = indexOfHeading(text, /^##\s*PART\s*2:\s*CRITICAL\s*ANALYSIS\s*$/mi);
  if (requireSections && part1Idx < 0) errors.push('Missing "## PART 1: OBJECTIVE SYNTHESIS" section');
  if (requireSections && part2Idx < 0) errors.push('Missing "## PART 2: CRITICAL ANALYSIS" section');

  const themes = extractSubsection(text, /^###\s*Emergent\s*Themes\s*$/mi);
  const connections = extractSubsection(text, /^###\s*Surprising\s*Connections\s*$/mi);
  const conflicts = extractSubsection(text, /^###\s*Conflicts\s*&\s*Counter-Arguments\s*$/mi);

  if (requireSections && !themes) errors.push('Missing "### Emergent Themes" subsection');
  if (requireSections && !connections) errors.push('Missing "### Surprising Connections" subsection');
  if (requireSections && !conflicts) errors.push('Missing "### Conflicts & Counter-Arguments" subsection');

  if (requireItems) {
    if (!hasBullet(themes, allowPlaceholder)) errors.push('No bullet items under Emergent Themes');
    if (!hasBullet(connections, allowPlaceholder)) errors.push('No bullet items under Surprising Connections');
    if (!hasBullet(conflicts, allowPlaceholder)) errors.push('No bullet items under Conflicts & Counter-Arguments');
  }

  // Basic markdown sanity: code fences balanced
  const fenceCount = (text.match(/^`{3,}/gm) || []).length;
  if (fenceCount % 2 !== 0) warnings.push('Unbalanced code fences detected');

  // Separator presence
  if (!/^---\s*$/m.test(text)) warnings.push('Missing horizontal separator (---) between parts');

  // Citations basic check when content is expected
  if (requireItems) {
    const hasSource = /\*\*Source:\*\*|\*\*Source:\s*`[^`]+`/i.test(themes + '\n' + connections);
    if (!hasSource) warnings.push('No "Source:" citations found in PART 1');
  }

  return { ok: errors.length === 0, errors, warnings };
}

export async function validateMemoFile(memoPath, options = {}) {
  const raw = await fs.readFile(memoPath, 'utf-8');
  return validateMemoContent(raw, options);
}

function indexOfHeading(text, re) {
  const m = re.exec(text);
  return m ? m.index : -1;
}

function extractSubsection(text, headingRe) {
  const m = headingRe.exec(text);
  if (!m) return '';
  const start = m.index + m[0].length;
  const body = text.slice(start);
  const next = /^###\s+|^##\s+/m.exec(body);
  return (next ? body.slice(0, next.index) : body).trim();
}

function hasBullet(section, allowPlaceholder) {
  if (!section) return false;
  const has = /^\s*[-*]\s+/m.test(section);
  if (!has) return false;
  if (!allowPlaceholder) return true;
  // Allow placeholder bullets (dry-run)
  return true;
}

