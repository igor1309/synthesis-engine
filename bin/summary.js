#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

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

function human(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1048576).toFixed(1)} MB`;
}

async function main() {
  const argPath = process.argv[2];
  const fp = argPath || await findLatestRunSummary();
  if (!fp) { console.error('No run-summary.json found'); process.exit(1); }
  const raw = await fs.readFile(fp, 'utf-8');
  const rs = JSON.parse(raw);
  const s = rs.summary || {};
  const t = rs.metrics?.totals || {};
  console.log(`Run Summary: ${s.status || 'unknown'} · ${rs.generatedAt || ''}`);
  console.log(`Repos ${s.repos ?? '-'} · Context ${s.contextFiles ?? 0} files · ${human(s.contextBytes || 0)} · ~${s.contextTokens || 0} tokens`);
  if (s.memoBytes != null) console.log(`Memo ${human(s.memoBytes)}`);
  console.log(`Cache: ${t.cacheHits || 0} hits / ${t.cacheMisses || 0} misses · DL ${t.downloadedCount || 0} · ${human(t.downloadedBytes || 0)}`);
  const gh = rs.retries?.github || {}; const oa = rs.retries?.openai || {};
  if (gh.list || gh.fetch) console.log(`Retries (GitHub): list ${gh.list || 0} · fetch ${gh.fetch || 0} · wait ~${((gh.waitMs||0)/1000).toFixed(1)}s`);
  if (oa.retries) console.log(`Retries (OpenAI): calls ${oa.retries || 0} · wait ~${((oa.waitMs||0)/1000).toFixed(1)}s`);
  if (rs.synthesis) console.log(`Synthesis: ${rs.synthesis.model} · chunked ${rs.synthesis.chunked ? 'yes' : 'no'} · chunks ${rs.synthesis.chunks}`);
  const settings = rs.settings || {};
  if (settings.logLevel || settings.concurrency) console.log(`Settings: log ${settings.logLevel || 'info'} · conc ${settings.concurrency || 6}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

