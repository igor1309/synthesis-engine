import fs from 'fs/promises';
import path from 'path';

// Lightweight Node-native builder with near-parity to repo2md.sh
// Options: { linesHead?: number, linesTail?: number, cwd?: string, ignore?: string[] }
export async function nodeBuildContext(files, options = {}) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('nodeBuildContext: files array is empty');
  }

  const cwd = options.cwd || process.cwd();
  const linesHead = Number.isInteger(options.linesHead) ? options.linesHead : 0;
  const linesTail = Number.isInteger(options.linesTail) ? options.linesTail : 0;
  const ignore = Array.isArray(options.ignore) ? options.ignore : defaultIgnorePatterns();

  const rel = (p) => {
    try {
      const abs = path.resolve(p);
      const base = path.resolve(cwd);
      return abs.startsWith(base + path.sep) ? abs.slice(base.length + 1) : p;
    } catch {
      return p;
    }
  };

  const kept = [];
  for (const p of files) {
    const rp = rel(p);
    if (isIgnored(rp, ignore)) continue;
    try {
      const st = await fs.stat(p);
      if (!st.isFile()) continue;
      kept.push({ p, rp, size: st.size });
    } catch { /* skip */ }
  }
  if (kept.length === 0) throw new Error('nodeBuildContext: no valid files to process');

  // Read metadata
  const meta = await Promise.all(kept.map(async (it) => {
    const { p, rp, size } = it;
    const base = path.basename(p);
    const lines = await countLines(p);
    return { p, rp, base, size, lines };
  }));

  const totalBytes = meta.reduce((a, b) => a + b.size, 0);
  const estTokens = Math.floor((totalBytes + 3) / 4);

  let out = '';
  out += '# REPO CONTENT\n\n';
  out += '## List\n';
  out += `Files: ${meta.length} · Total: ${humanSize(totalBytes)} · Est. tokens: ~${estTokens}\n\n`;
  out += '| # | File | Size | Lines |\n';
  out += '|---:|:-----|----:|-----:|\n';
  meta.forEach((m, i) => {
    out += `| ${i + 1} | [\`${m.base}\`](#${slugify(m.rp)}) | ${humanSize(m.size)} | ${m.lines} |\n`;
  });
  out += '\n';
  out += '## Files\n\n';

  for (const m of meta) {
    const { p, rp, base, lines } = m;
    out += `<a id="${slugify(rp)}"></a>\n`;
    out += `### ${codeSpan(base)}\n\n`;
    out += `_Path: ${rp}_\n\n`;

    const isBin = await isBinaryFile(p);
    if (isBin) {
      out += `... [binary file skipped: ${humanSize(m.size)}]\\n\\n`;
      continue;
    }

    const lang = langOfExt(extOf(base));
    const fence = await safeFenceForFile(p);
    out += lang ? `${fence}${lang}\n` : `${fence}\n`;

    const content = await fs.readFile(p, 'utf-8');
    if ((linesHead > 0 || linesTail > 0) && lines > (linesHead + linesTail)) {
      const parts = content.split(/\r?\n/);
      const head = parts.slice(0, Math.min(linesHead, parts.length));
      const tail = parts.slice(Math.max(parts.length - linesTail, 0));
      out += head.join('\n') + `\n\n... [truncated ${parts.length - head.length - tail.length} lines]\n\n` + tail.join('\n') + '\n';
    } else {
      out += content.replace(/\r?\n/g, '\n') + '\n';
    }

    out += `${fence}\n\n`;
  }

  out += '<!-- END OF SNAPSHOT -->\n';
  return out;
}

// Helpers mirroring repo2md.sh behavior
function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
}

async function countLines(p) {
  const data = await fs.readFile(p, 'utf-8');
  if (data.length === 0) return 0;
  return data.replace(/\r?\n$/,'').split(/\r?\n/).length;
}

function extOf(base) {
  const low = base.toLowerCase();
  if (low === 'makefile') return 'makefile';
  if (low === 'dockerfile') return 'dockerfile';
  const idx = base.lastIndexOf('.');
  return idx >= 0 ? base.slice(idx + 1).toLowerCase() : '';
}

function langOfExt(ext) {
  const map = {
    js: 'javascript', ts: 'typescript', jsx: 'jsx', tsx: 'tsx', sh: 'bash', bash: 'bash', zsh: 'zsh',
    py: 'python', rb: 'ruby', php: 'php', java: 'java', c: 'c', h: 'c', cc: 'cpp', cxx: 'cpp', cpp: 'cpp', hpp: 'cpp', hh: 'cpp', hxx: 'cpp',
    m: 'objectivec', mm: 'objectivecpp', swift: 'swift', kt: 'kotlin', kts: 'kotlin', go: 'go', rs: 'rust', cs: 'csharp', scala: 'scala',
    sql: 'sql', yaml: 'yaml', yml: 'yaml', json: 'json', html: 'html', htm: 'html', css: 'css', md: 'markdown', markdown: 'markdown',
    toml: 'toml', makefile: 'makefile', dockerfile: 'dockerfile', txt: ''
  };
  return map[ext] ?? ext ?? '';
}

async function safeFenceForFile(p) {
  const data = await fs.readFile(p, 'utf-8');
  let max = 0; let cur = 0;
  for (let i = 0; i < data.length; i++) {
    const ch = data[i];
    if (ch === '`') { cur++; if (cur > max) max = cur; } else { cur = 0; }
  }
  const n = Math.max(max + 1, 3);
  return '`'.repeat(n);
}

function defaultIgnorePatterns() {
  return [
    '.git/*', '*/.git/*', 'node_modules/*', '*/node_modules/*', 'dist/*', '*/dist/*', 'build/*', '*/build/*',
    'coverage/*', '*/coverage/*', 'target/*', '*/target/*', '.next/*', '*/.next/*', '.DS_Store', '*.map', '*.min.js'
  ];
}

function isIgnored(relPath, patterns) {
  return patterns.some((pat) => globLikeMatch(relPath, pat));
}

// Minimal glob matcher supporting "*" and simple "*/" cases.
function globLikeMatch(text, pattern) {
  // Escape regex special chars except * and /
  const re = '^' + pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*') + '$';
  return new RegExp(re).test(text);
}

async function isBinaryFile(p) {
  const buf = await fs.readFile(p);
  const len = Math.min(buf.length, 4096);
  for (let i = 0; i < len; i++) {
    if (buf[i] === 0) return true;
  }
  // Heuristic: allow text/* encodings; no MIME probe here.
  return false;
}

function codeSpan(s) {
  // Inline code span with safe backticks
  let max = 0; let cur = 0; const str = String(s);
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '`') { cur++; if (cur > max) max = cur; } else { cur = 0; }
  }
  const ticks = '`'.repeat(Math.max(max + 1, 1));
  return `${ticks}${s}${ticks}`;
}

