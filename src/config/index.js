import fs from 'fs/promises';
import path from 'path';

export async function loadConfig(projectRoot = process.cwd()) {
  const env = process.env;

  const ghPat = env.GH_PAT && String(env.GH_PAT).trim();
  const reposFile = path.resolve(projectRoot, 'config/repos.txt');
  const tempDir = path.resolve(projectRoot, 'temp_inbox_files');
  const cacheFile = path.resolve(projectRoot, '.cache/github-files.json');

  const errors = [];
  if (!ghPat) errors.push('Missing GH_PAT env var');

  try { await fs.access(reposFile); } catch {
    errors.push(`Missing repos file at ${path.relative(projectRoot, reposFile)}`);
  }

  if (errors.length) {
    const e = new Error('Configuration validation failed: ' + errors.join('; '));
    e.reasons = errors;
    throw e;
  }

  const reposText = await fs.readFile(reposFile, 'utf-8');
  const repos = parseReposList(reposText);
  if (repos.length === 0) {
    throw new Error('No repositories specified in config/repos.txt');
  }

  return { ghPat, projectRoot, tempDir, cacheFile, repos };
}

export function parseReposList(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map(parseRepoSpec)
    .filter(Boolean);
}

// Supported:
// - owner/repo
// - owner/repo@ref
// - owner/repo:path/to/inbox
// - owner/repo@ref:path/to/inbox
// inbox path defaults to 'inbox'
export function parseRepoSpec(spec) {
  const atIdx = spec.indexOf('@');
  const colonIdx = spec.indexOf(':');

  const full = spec.slice(0, Math.min(
    atIdx > -1 ? atIdx : spec.length,
    colonIdx > -1 ? colonIdx : spec.length
  ));

  const [owner, repo] = full.split('/');
  if (!owner || !repo) return null;

  let ref = undefined;
  if (atIdx > -1) {
    const afterAt = colonIdx > -1 ? spec.slice(atIdx + 1, colonIdx) : spec.slice(atIdx + 1);
    ref = afterAt || undefined;
  }

  let inboxPath = 'inbox';
  if (colonIdx > -1) {
    const afterColon = spec.slice(colonIdx + 1);
    inboxPath = afterColon || 'inbox';
  }

  return { owner, repo, ref, inboxPath: trimSlashes(inboxPath) };
}

function trimSlashes(p) {
  return String(p).replace(/^\/+|\/+$/g, '') || '';
}

