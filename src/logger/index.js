function nowIso() {
  return new Date().toISOString();
}

function levelPriority(level) {
  return { error: 0, warn: 1, info: 2, debug: 3 }[level] ?? 2;
}

import { redactMeta, redactText } from './redact.js';

export function createLogger(options = {}) {
  const envLevel = (process.env.LOG_LEVEL || '').toLowerCase();
  let currentLevel = options.level || (envLevel || 'info');

  const log = (level, msg, meta) => {
    if (levelPriority(level) > levelPriority(currentLevel)) return;
    const rec = { ts: nowIso(), level, msg };
    if (meta && typeof meta === 'object' && Object.keys(meta).length) rec.meta = redactMeta(meta);
    // Structured JSON line
    process.stdout.write(JSON.stringify(rec) + '\n');
  };

  const api = {
    setLevel(lvl) { currentLevel = String(lvl).toLowerCase(); },
    debug: (m, meta) => log('debug', m, meta),
    info: (m, meta) => log('info', m, meta),
    warn: (m, meta) => log('warn', m, meta),
    error: (m, meta) => log('error', m, meta),
    async writeStepSummary(summary) {
      try {
        const fp = process.env.GITHUB_STEP_SUMMARY;
        if (!fp) return;
        const md = typeof summary === 'string' ? redactText(summary) : renderSummaryMarkdown(summary);
        await (await import('fs/promises')).writeFile(fp, md + '\n', { flag: 'a' });
      } catch {
        // ignore summary errors
      }
    }
  };
  return api;
}

export const logger = createLogger();

function renderSummaryMarkdown(m) {
  const lines = [];
  lines.push('## Synthesis Engine Summary');
  if (m.status) lines.push(`Status: ${m.status}`);
  if (m.repos !== undefined) lines.push(`Repos: ${m.repos}`);
  if (m.filesDownloaded !== undefined) lines.push(`Files downloaded: ${m.filesDownloaded}`);
  if (m.contextFiles !== undefined) lines.push(`Context files: ${m.contextFiles}`);
  if (m.contextBytes !== undefined) lines.push(`Context size: ${human(m.contextBytes)}`);
  if (m.contextTokens !== undefined) lines.push(`Est. tokens: ~${m.contextTokens}`);
  if (m.memoBytes !== undefined) lines.push(`Memo size: ${human(m.memoBytes)}`);
  if (m.durationMs !== undefined) lines.push(`Duration: ${(m.durationMs/1000).toFixed(1)}s`);
  return lines.join('\n') + '\n';
}

function human(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1048576).toFixed(1)} MB`;
}
