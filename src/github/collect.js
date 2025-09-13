import path from 'path';
import fs from 'fs/promises';
import { readJsonSafe, writeJson, ensureDir, writeFileAtomic } from '../io/fs.js';

const MARKDOWN_EXTS = new Set(['.md', '.markdown', '.mdx']);

export async function collectAll(octokit, config, options = {}) {
  const { tempDir, cacheFile, repos } = config;
  await ensureDir(tempDir);

  const cache = await readJsonSafe(cacheFile, {});
  const updatedCache = { ...cache };
  const savedFiles = [];

  for (const spec of repos) {
    const baseDir = repoBaseDir(tempDir, spec);
    await ensureDir(baseDir);
    const { saved, cacheUpdates } = await collectRepo(octokit, spec, baseDir, cache, options);
    for (const [k, v] of Object.entries(cacheUpdates)) updatedCache[k] = v;
    savedFiles.push(...saved);
  }

  await writeJson(cacheFile, updatedCache);
  return savedFiles;
}

async function collectRepo(octokit, spec, baseDir, cache, options) {
  const saved = [];
  const cacheUpdates = {};
  const ref = spec.ref || undefined;
  const inboxPath = spec.inboxPath || 'inbox';

  const entries = await listTreeRecursive(octokit, spec.owner, spec.repo, inboxPath, ref);
  const files = entries.filter((e) => e.type === 'file' && isMarkdown(e.path));

  const tasks = files.map((file) => async () => {
    const cacheKey = cacheKeyFor(spec, file.path, ref);
    const prevSha = cache[cacheKey]?.sha;
    if (prevSha && prevSha === file.sha) {
      // Cache hit; skip download.
      return;
    }
    const content = await getFileContent(octokit, spec.owner, spec.repo, file.path, ref);
    const targetPath = path.join(baseDir, file.path.slice(inboxPath.length + (inboxPath ? 1 : 0)));
    await ensureDir(path.dirname(targetPath));
    await writeFileAtomic(targetPath, content);
    saved.push(targetPath);
    cacheUpdates[cacheKey] = { sha: file.sha, size: file.size };
  });

  await runLimited(tasks, options.concurrency || 6);
  return { saved, cacheUpdates };
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

async function getFileContent(octokit, owner, repo, filePath, ref) {
  const res = await octokit.repos.getContent({ owner, repo, path: filePath, ref });
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

async function listTreeRecursive(octokit, owner, repo, basePath, ref) {
  // Use Contents API recursion via directories
  const out = [];
  async function walk(p) {
    try {
      const res = await octokit.repos.getContent({ owner, repo, path: p, ref });
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
      if (err && err.status === 404) return;
      throw err;
    }
  }
  await walk(basePath);
  return out;
}

async function runLimited(tasks, limit) {
  const queue = tasks.slice();
  const workers = new Array(Math.min(limit, tasks.length)).fill(null).map(async () => {
    while (queue.length) {
      const fn = queue.shift();
      await fn();
    }
  });
  await Promise.all(workers);
}

