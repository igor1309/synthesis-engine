import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { buildContext } from './src/context/index.js';
import { loadConfig } from './src/config/index.js';
import { createGitHubClient } from './src/github/client.js';
import { collectAll } from './src/github/collect.js';
import { logger } from './src/logger/index.js';
import { loadDotEnv } from './src/config/dotenv.js';
import { synthesizeMemo } from './src/ai/synthesize.js';
import { loadCliOverrides } from './src/config/cli.js';
import { classifyError, ErrorCodes } from './src/errors/codes.js';

// Placeholder util to keep API symmetry if needed later
const noop = promisify((cb) => cb(null));

// --- CONFIGURATION ---
const OUTPUT_FILE = 'synthesis_memo.md';


// --- MAIN LOGIC ---
async function main() {
  const t0 = Date.now();
  let summary = { status: 'failed' };
  let cfg;
  try {
    // Load .env first so loaders can see env vars
    await loadDotEnv(process.cwd());
    // Apply CLI overrides (highest precedence)
    loadCliOverrides(process.argv);
    const dryRun = String(process.env.DRY_RUN || '').toLowerCase() === '1' || String(process.env.DRY_RUN || '').toLowerCase() === 'true' || !process.env.GH_PAT;

    let context = '';
    let metrics = { repos: [], totals: { cacheHits: 0, cacheMisses: 0, downloadedBytes: 0 } };

    if (dryRun) {
      summary.repos = 0;
      logger.warn('collector: dry-run mode or GH_PAT missing; skipping GitHub collection');
      context = '# REPO CONTENT\n\n_No files collected (dry-run)._\n';
      summary.contextFiles = 0;
      const contextBytes = Buffer.byteLength(context, 'utf-8');
      summary.contextBytes = contextBytes;
      summary.contextTokens = Math.floor((contextBytes + 3) / 4);
    } else {
      // Load and validate configuration
      cfg = await loadConfig(process.cwd());
      summary.repos = cfg.repos.length;

      // 1. Collect Files
      logger.info('collector: start file collection', { repos: cfg.repos.length });
      const gh = await createGitHubClient(cfg.ghPat, cfg.baseUrl);
      const collected = await collectAll(gh, cfg, { concurrency: 6 });
      const savedFiles = collected.savedFiles;
      metrics = collected.metrics;
      logger.info('collector: file collection complete', { downloaded: savedFiles.length, cacheHits: metrics.totals.cacheHits, cacheMisses: metrics.totals.cacheMisses, bytes: metrics.totals.downloadedBytes });

      // 2. Prepare Context
      logger.info('collector: build context start');
      const files = savedFiles.length ? savedFiles : await listFilesRecursive(cfg.tempDir);
      summary.contextFiles = files.length;
      if (files.length === 0) {
        logger.warn('collector: no files collected; context will be empty');
      }
      context = await buildContext(files, {
        cwd: cfg.tempDir,
        projectRoot: process.cwd(),
        linesHead: Number(process.env.LINES_HEAD) || 0,
        linesTail: Number(process.env.LINES_TAIL) || 0,
      });
      const contextBytes = Buffer.byteLength(context, 'utf-8');
      summary.contextBytes = contextBytes;
      summary.contextTokens = Math.floor((contextBytes + 3) / 4);
      summary.filesDownloaded = savedFiles.length;
    }

    // 3. Synthesis
    let memoContent = '';
    if (dryRun || !process.env.OPENAI_API_KEY) {
      logger.warn('collector: synthesis skipped', { reason: dryRun ? 'DRY_RUN' : 'missing OPENAI_API_KEY' });
      memoContent = [
        '# Synthesis Memo',
        '',
        '---',
        '',
        '## PART 1: OBJECTIVE SYNTHESIS',
        '',
        '### Emergent Themes',
        '* Skipped (dry-run or no key).',
        '',
        '### Surprising Connections',
        '* Skipped (dry-run or no key).',
        '',
        '---',
        '',
        '## PART 2: CRITICAL ANALYSIS',
        '',
        '### Conflicts & Counter-Arguments',
        '* Skipped (dry-run or no key).',
        ''
      ].join('\n');
    } else {
      logger.info('collector: synthesis start', { model: process.env.OPENAI_MODEL || 'gpt-4o-mini' });
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL || undefined });
      const result = await synthesizeMemo(openai, context, {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: Number(process.env.OPENAI_TEMPERATURE || 0.2),
        projectRoot: process.cwd(),
        contextMaxTokens: Number(process.env.CONTEXT_MAX_TOKENS || 120000)
      });
      memoContent = result.content;
      summary.synthesis = result.meta;
    }

    // 4. Save Output
    await fs.writeFile(OUTPUT_FILE, memoContent);
    const st = await fs.stat(OUTPUT_FILE);
    summary.memoBytes = st.size;
    logger.info('collector: memo saved', { output: OUTPUT_FILE, bytes: st.size });

    summary.status = 'success';

    // Persist artifacts snapshot
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const runDir = path.join('artifacts', ts);
    await fs.mkdir(runDir, { recursive: true });
    await fs.writeFile(path.join(runDir, 'context.md'), context);
    const runSummary = {
      schemaVersion: '1.0',
      generatedAt: new Date().toISOString(),
      summary,
      metrics: { totals: metrics.totals || {}, perRepo: metrics.repos || [] },
      synthesis: summary.synthesis || null,
      retries: {
        github: summarizeGithubRetries(metrics),
        openai: summary.synthesis ? { retries: summary.synthesis.openaiRetries || 0, waitMs: summary.synthesis.openaiWaitMs || 0 } : null
      }
    };
    await fs.writeFile(path.join(runDir, 'run-summary.json'), JSON.stringify(runSummary, null, 2));

    // Enrich step summary with per-repo stats
    const lines = [];
    lines.push('## Per-repo stats');
    for (const r of metrics.repos || []) {
      lines.push(`- ${r.repo}@${r.ref}:${r.inboxPath} — md: ${r.mdFiles}, dl: ${r.downloadedCount}, cache hits: ${r.cacheHits}, bytes: ${r.downloadedBytes}, time: ${(r.durationMs/1000).toFixed(2)}s`);
    }
    const t = metrics.totals || {};
    if (t.mdFiles !== undefined) {
      const ratio = (t.cacheHits + t.cacheMisses) > 0 ? (t.cacheHits / (t.cacheHits + t.cacheMisses)) : 0;
      lines.push('');
      lines.push('## Totals');
      lines.push(`- md files: ${t.mdFiles} · downloaded: ${t.downloadedCount} · bytes: ${human(t.downloadedBytes || 0)}`);
      lines.push(`- cache: hits ${t.cacheHits} / misses ${t.cacheMisses} (hit rate ${(ratio*100).toFixed(1)}%)`);
      lines.push(`- issues: warnings ${t.warnCount || 0} · errors ${t.errorCount || 0}`);
      const ghRetry = summarizeGithubRetries(metrics);
      if (ghRetry.list || ghRetry.fetch) {
        const wsec = (ghRetry.waitMs/1000).toFixed(1);
        lines.push(`- retries (GitHub): list ${ghRetry.list} · fetch ${ghRetry.fetch} · wait ~${wsec}s`);
      }
      if (summary.synthesis && (summary.synthesis.openaiRetries || 0) > 0) {
        lines.push(`- retries (OpenAI): calls ${summary.synthesis.openaiRetries} · wait ~${(summary.synthesis.openaiWaitMs/1000).toFixed(1)}s`);
      }
      if (summary.contextBytes !== undefined) lines.push(`- context: files ${summary.contextFiles || 0} · size ${human(summary.contextBytes)} · est tokens ~${summary.contextTokens || 0}`);
      if (summary.synthesis) lines.push(`- synthesis: model ${summary.synthesis.model} · chunked ${summary.synthesis.chunked ? 'yes' : 'no'} · chunks ${summary.synthesis.chunks}`);
      if (summary.durationMs !== undefined) lines.push(`- duration: ${(summary.durationMs/1000).toFixed(1)}s`);
    }
    // Remediation tips
    const tips = remediationTips(metrics, summary);
    if (tips.length) {
      lines.push('');
      lines.push('## Tips');
      for (const tip of tips) lines.push(`- ${tip}`);
    }
    await logger.writeStepSummary(lines.join('\n') + '\n');
  } catch (error) {
    const code = classifyError(error);
    logger.error('collector: error', { error: String(error?.message || error), code });
    summary.errorCode = code;
    process.exit(1);
  } finally {
    summary.durationMs = Date.now() - t0;
    await logger.writeStepSummary(summary);
    // Cleanup temp
    if (cfg?.tempDir) await fs.rm(cfg.tempDir, { recursive: true, force: true });
  }
}

async function listFilesRecursive(dir) {
  const out = [];
  async function walk(d) {
    let entries = [];
    try { entries = await fs.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) {
        await walk(p);
      } else if (ent.isFile()) {
        out.push(p);
      }
    }
  }
  await walk(dir);
  return out;
}

main();

function remediationTips(metrics, summary) {
  const tips = [];
  const totals = metrics?.totals || {};
  const perRepo = metrics?.repos || [];
  // No context produced
  if ((summary.contextFiles || 0) === 0) {
    tips.push('No context files were built. Ensure inbox paths contain markdown or adjust config.');
  }
  // Inbox missing warnings
  const missing = perRepo.filter(r => (r.warnCount || 0) > 0);
  if (missing.length) {
    tips.push('Some inbox paths were not found. Verify repo specs and paths (owner/repo@ref:path).');
  }
  // Cache always hits (but no local files)? handled by re-download fix; still add generic tip
  if ((totals.mdFiles || 0) > 0 && (totals.downloadedCount || 0) === 0) {
    tips.push('All files were cache hits. If context seems stale, delete temp_inbox_files/ to force refresh.');
  }
  // Missing API keys
  if (!process.env.OPENAI_API_KEY) tips.push('OPENAI_API_KEY not set; memo uses placeholder. Add key for full synthesis.');
  if (!process.env.GH_PAT) tips.push('GH_PAT not set; collection skipped (dry-run). Add token to collect inbox files.');
  return tips;
}

function summarizeGithubRetries(metrics) {
  const m = metrics || {};
  const per = m.repos || [];
  let list = 0, fetch = 0, waitMs = 0;
  for (const r of per) {
    list += r.retryList || 0;
    fetch += r.retryFetch || 0;
    waitMs += r.retryWaitMs || 0;
  }
  return { list, fetch, waitMs };
}
