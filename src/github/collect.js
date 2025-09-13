import path from 'path';
import fs from 'fs/promises';
import { readJsonSafe, writeJson, ensureDir, writeFileAtomic } from '../io/fs.js';
import { withRetry } from '../utils/retry.js';

const MARKDOWN_EXTS = new Set(['.md', '.markdown', '.mdx']);

export async function collectAll(octokit, config, options = {}) {
  const { tempDir, cacheFile, repos } = config;
  await ensureDir(tempDir);

  const cache = await readJsonSafe(cacheFile, {});
  const updatedCache = { ...cache };
  const savedFiles = [];
  const perRepo = [];

  for (const spec of repos) {
    const baseDir = repoBaseDir(tempDir, spec);
    await ensureDir(baseDir);
    const t0 = Date.now();
    const { saved, cacheUpdates, metrics } = await collectRepo(octokit, spec, baseDir, cache, options);
    for (const [k, v] of Object.entries(cacheUpdates)) updatedCache[k] = v;
    savedFiles.push(...saved);
    perRepo.push({
      repo: `${spec.owner}/${spec.repo}`,
      ref: spec.ref || 'HEAD',
      inboxPath: spec.inboxPath || 'inbox',
      ...metrics,
      durationMs: Date.now() - t0,
    });
  }

  await writeJson(cacheFile, updatedCache);
  const totals = aggregateTotals(perRepo);
  return { savedFiles, metrics: { repos: perRepo, totals } };
}

async function collectRepo(octokit, spec, baseDir, cache, options) {
  const saved = [];
  const cacheUpdates = {};
  const ref = spec.ref || undefined;
  const inboxPath = spec.inboxPath || 'inbox';

  const ctl = { limit: options.concurrency || 6, rateLimited: false, lastWaitMs: 0 };
  const { entries, warnings } = await listTreeRecursive(octokit, spec.owner, spec.repo, inboxPath, ref, ctl);
  const files = entries.filter((e) => e.type === 'file' && isMarkdown(e.path));

  let cacheHits = 0;
  let cacheMisses = 0;
  let downloadedBytes = 0;
  let warnCount = Array.isArray(warnings) ? warnings.length : 0;
  let errorCount = 0;

  const tasks = files.map((file) => async () => {
    const cacheKey = cacheKeyFor(spec, file.path, ref);
    const prevSha = cache[cacheKey]?.sha;
    const targetPath = path.join(baseDir, file.path.slice(inboxPath.length + (inboxPath ? 1 : 0)));

    // If we have a cache hit but the local file does not exist (e.g., cleaned temp dir), download it.
    if (prevSha && prevSha === file.sha) {
      try {
        const st = await fs.stat(targetPath);
        if (st.isFile()) {
          cacheHits++;
          return;
        }
      } catch {
        // fall through to download
      }
    }

    const content = await getFileContent(octokit, spec.owner, spec.repo, file.path, ref, ctl);
    await ensureDir(path.dirname(targetPath));
    await writeFileAtomic(targetPath, content);
    saved.push(targetPath);
    if (prevSha && prevSha === file.sha) {
      // Cache said unchanged but local missing -> treat as hit for metrics? We count as miss to reflect download.
      cacheMisses++;
    } else {
      cacheMisses++;
    }
    downloadedBytes += Buffer.byteLength(content, 'utf-8');
    cacheUpdates[cacheKey] = { sha: file.sha, size: file.size };
  });

  await runAdaptive(tasks, ctl);
  return {
    saved,
    cacheUpdates,
    metrics: {
      filesConsidered: entries.length,
      mdFiles: files.length,
      cacheHits,
      cacheMisses,
      downloadedBytes,
      downloadedCount: saved.length,
      warnCount,
      errorCount,
    }
  };
}

function repoBaseDir(tempDir, spec) {
  const refPart = spec.ref ? spec.ref : 'HEAD';
  const folder = `${spec.owner}__${spec.repo}__${sanitize(refPart)}`;
  return path.join(tempDir, folder);
}

function sanitize(s) { return String(s).replace(/[^a-zA-Z0-9._-]+/g, '_'); }

function cacheKeyFor(spec, filePath, ref) {
  return `${spec.owner}/${spec.repo}@${ref || 'HEAD'}:${filePath}`;
}

function isMarkdown(p) {
  const ext = path.extname(p).toLowerCase();
  return MARKDOWN_EXTS.has(ext);
}

async function getFileContent(octokit, owner, repo, filePath, ref, ctl) {
  const res = await withRetry(
    () => octokit.repos.getContent({ owner, repo, path: filePath, ref }),
    {
      tries: Number(process.env.GITHUB_RETRIES || 4),
      onRetry: (err, attempt, waitMs) => {
        const status = err?.status || err?.response?.status;
        if (status === 403 || status === 429) { ctl.rateLimited = true; ctl.lastWaitMs = Math.max(ctl.lastWaitMs, waitMs); }
      }
    }
  );
  if (!Array.isArray(res.data) && res.data && res.data.type === 'file' && res.data.content) {
    const buff = Buffer.from(res.data.content, 'base64');
    return buff.toString('utf-8');
  }
  // Fallback: try raw download URL if present (should not happen for file fetch)
  if (!Array.isArray(res.data) && res.data && res.data.download_url) {
    const raw = await fetch(res.data.download_url, { headers: { Authorization: `token ${octokit.auth}` } }).then(r => r.text());
    return raw;
  }
  throw new Error(`Unexpected content response for ${owner}/${repo}:${filePath}`);
}

async function listTreeRecursive(octokit, owner, repo, basePath, ref, ctl) {
  // Use Contents API recursion via directories
  const out = [];
  let warnings = [];
  async function walk(p) {
    try {
      const res = await withRetry(
        () => octokit.repos.getContent({ owner, repo, path: p, ref }),
        {
          tries: Number(process.env.GITHUB_RETRIES || 4),
          onRetry: (err, attempt, waitMs) => {
            const status = err?.status || err?.response?.status;
            if (status === 403 || status === 429) { ctl.rateLimited = true; ctl.lastWaitMs = Math.max(ctl.lastWaitMs, waitMs); }
          }
        }
      );
      if (Array.isArray(res.data)) {
        for (const item of res.data) {
          if (item.type === 'dir') {
            await walk(item.path);
          } else if (item.type === 'file') {
            out.push({ path: item.path, sha: item.sha, size: item.size, type: 'file' });
          }
        }
      } else if (res.data && res.data.type === 'file') {
        out.push({ path: res.data.path, sha: res.data.sha, size: res.data.size, type: 'file' });
      }
    } catch (err) {
      // If inbox path does not exist, skip silently
      if (err && err.status === 404) {
        if (p === basePath) warnings.push({ code: 'INBOX_NOT_FOUND', path: basePath });
        return;
      }
      throw err;
    }
  }
  await walk(basePath);
  return { entries: out, warnings };
}

async function runAdaptive(tasks, ctl) {
  const queue = tasks.slice();
  let running = 0;
  const minLimit = 1;
  async function maybeSpawn() {
    while (running < Math.max(ctl.limit || 1, minLimit) && queue.length) {
      const fn = queue.shift();
      running++;
      fn().catch(() => { /* errors bubble via upstream retry or throw */ }).finally(async () => {
        running--;
      });
    }
  }
  while (queue.length || running > 0) {
    if (ctl.rateLimited) {
      ctl.limit = Math.max(minLimit, Math.floor((ctl.limit || 1) / 2));
      const wait = Math.min(ctl.lastWaitMs || 1000, 10000);
      ctl.rateLimited = false; ctl.lastWaitMs = 0;
      await sleep(wait);
    }
    await maybeSpawn();
    // Small tick
    await sleep(25);
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function aggregateTotals(perRepo) {
  const t = { filesConsidered: 0, mdFiles: 0, cacheHits: 0, cacheMisses: 0, downloadedBytes: 0, downloadedCount: 0, durationMs: 0, warnCount: 0, errorCount: 0 };
  for (const r of perRepo) {
    t.filesConsidered += r.filesConsidered || 0;
    t.mdFiles += r.mdFiles || 0;
    t.cacheHits += r.cacheHits || 0;
    t.cacheMisses += r.cacheMisses || 0;
    t.downloadedBytes += r.downloadedBytes || 0;
    t.downloadedCount += r.downloadedCount || 0;
    t.durationMs += r.durationMs || 0;
    t.warnCount += r.warnCount || 0;
    t.errorCount += r.errorCount || 0;
  }
  return t;
}
