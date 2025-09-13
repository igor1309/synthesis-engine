#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { validateMemoFile } from '../src/ai/validateMemo.js';

function parseArgs(argv) {
  const out = { file: 'synthesis_memo.md', runSummary: null, minCitations: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file' && argv[i + 1]) { out.file = argv[++i]; continue; }
    if (a === '--run-summary' && argv[i + 1]) { out.runSummary = argv[++i]; continue; }
    if (a === '--min-citations' && argv[i + 1]) { out.minCitations = Number(argv[++i]); continue; }
  }
  return out;
}

async function findRunSummary() {
  const artDir = path.resolve(process.cwd(), 'artifacts');
  try {
    const entries = await fs.readdir(artDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort().reverse();
    for (const d of dirs) {
      const p = path.join(artDir, d, 'run-summary.json');
      try { await fs.access(p); return p; } catch { /* continue */ }
    }
  } catch { /* ignore */ }
  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  const runSummaryPath = args.runSummary || await findRunSummary();
  let requireItems = false;
  let allowPlaceholder = false;

  if (runSummaryPath) {
    try {
      const raw = await fs.readFile(runSummaryPath, 'utf-8');
      const rs = JSON.parse(raw);
      const contextBytes = Number(rs?.summary?.contextBytes || 0);
      const contextFiles = Number(rs?.summary?.contextFiles || 0);
      requireItems = (contextBytes > 0 || contextFiles > 0);
    } catch { /* ignore */ }
  }

  if (String(process.env.DRY_RUN || '').toLowerCase() === '1' || String(process.env.DRY_RUN || '').toLowerCase() === 'true') {
    allowPlaceholder = true;
  }

  const minCitations = (args.minCitations != null) ? args.minCitations : (Number(process.env.MEMO_MIN_CITATIONS || 1));
  const res = await validateMemoFile(args.file, { requireItems, allowPlaceholder, minCitations });
  if (!res.ok) {
    console.error('Memo validation failed:');
    for (const e of res.errors) console.error(' - ' + e);
    for (const w of res.warnings) console.error(' ! ' + w);
    process.exit(1);
  } else {
    if (res.warnings.length) {
      console.warn('Memo validation warnings:');
      for (const w of res.warnings) console.warn(' ! ' + w);
    }
    console.log('Memo validation passed');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
