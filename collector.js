import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { Octokit } from '@octokit/rest';
import OpenAI from 'openai';
import { buildContext } from './src/context/index.js';
import { loadConfig } from './src/config/index.js';
import { createGitHubClient } from './src/github/client.js';
import { collectAll } from './src/github/collect.js';
import { logger } from './src/logger/index.js';
import { synthesizeMemo } from './src/ai/synthesize.js';

// Placeholder util to keep API symmetry if needed later
const noop = promisify((cb) => cb(null));

// --- CONFIGURATION ---
const GH_PAT = process.env.GH_PAT;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TEMP_DIR = './temp_inbox_files';
const REPOS_FILE = 'config/repos.txt';
const OUTPUT_FILE = 'synthesis_memo.md';
const MASTER_PROMPT_FILE = 'prompts/master.md';

// --- INITIALIZE CLIENTS ---
const octokit = new Octokit({ auth: GH_PAT });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });


// --- MAIN LOGIC ---
async function main() {
  const t0 = Date.now();
  let summary = { status: 'failed' };
  try {
    // Load and validate configuration
    const cfg = await loadConfig(process.cwd());
    summary.repos = cfg.repos.length;

    // 1. Collect Files
    logger.info('collector: start file collection', { repos: cfg.repos.length });
    const gh = createGitHubClient(cfg.ghPat);
    const { savedFiles, metrics } = await collectAll(gh, cfg, { concurrency: 6 });
    logger.info('collector: file collection complete', { downloaded: savedFiles.length, cacheHits: metrics.totals.cacheHits, cacheMisses: metrics.totals.cacheMisses, bytes: metrics.totals.downloadedBytes });

    // 2. Prepare Context
    logger.info('collector: build context start');
    const files = savedFiles.length ? savedFiles : await listFilesRecursive(cfg.tempDir);
    summary.contextFiles = files.length;
    if (files.length === 0) {
      logger.warn('collector: no files collected; context will be empty');
    }
    const context = await buildContext(files, {
      cwd: cfg.tempDir,
      projectRoot: process.cwd(),
      linesHead: Number(process.env.LINES_HEAD) || 0,
      linesTail: Number(process.env.LINES_TAIL) || 0,
    });
    const contextBytes = Buffer.byteLength(context, 'utf-8');
    summary.contextBytes = contextBytes;
    summary.contextTokens = Math.floor((contextBytes + 3) / 4);

    // 3. Synthesis
    logger.info('collector: synthesis start', { model: process.env.OPENAI_MODEL || 'gpt-4o-mini' });
    const memoContent = await synthesizeMemo(openai, context, {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: Number(process.env.OPENAI_TEMPERATURE || 0.2),
      projectRoot: process.cwd(),
      contextMaxTokens: Number(process.env.CONTEXT_MAX_TOKENS || 120000)
    });

    // 4. Save Output
    await fs.writeFile(OUTPUT_FILE, memoContent);
    const st = await fs.stat(OUTPUT_FILE);
    summary.memoBytes = st.size;
    logger.info('collector: memo saved', { output: OUTPUT_FILE, bytes: st.size });

    summary.filesDownloaded = savedFiles.length;
    summary.status = 'success';

    // Persist artifacts snapshot
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const runDir = path.join('artifacts', ts);
    await fs.mkdir(runDir, { recursive: true });
    await fs.writeFile(path.join(runDir, 'context.md'), context);
    const runSummary = { summary, collect: metrics };
    await fs.writeFile(path.join(runDir, 'run-summary.json'), JSON.stringify(runSummary, null, 2));

    // Enrich step summary with per-repo stats
    const lines = [];
    lines.push('## Per-repo stats');
    for (const r of metrics.repos) {
      lines.push(`- ${r.repo}@${r.ref}:${r.inboxPath} — md: ${r.mdFiles}, dl: ${r.downloadedCount}, cache hits: ${r.cacheHits}, bytes: ${r.downloadedBytes}, time: ${(r.durationMs/1000).toFixed(2)}s`);
    }
    await logger.writeStepSummary(lines.join('\n') + '\n');
  } catch (error) {
    logger.error('collector: error', { error: String(error?.message || error) });
    process.exit(1);
  } finally {
    summary.durationMs = Date.now() - t0;
    await logger.writeStepSummary(summary);
    // Cleanup temp
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
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
