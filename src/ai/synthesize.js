import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { estimateTokensFromText, splitContextByHeadings } from './token.js';
import { withRetry } from '../utils/retry.js';
import { readJsonSafe, writeJson } from '../io/fs.js';

export async function loadMasterPrompt(projectRoot) {
  const fp = `${projectRoot}/prompts/master.md`;
  try {
    const data = await fs.readFile(fp, 'utf-8');
    if (!data.includes('--- CONTEXT ---')) return data.trim() + '\n\n--- CONTEXT ---\n\n';
    return data;
  } catch {
    // Minimal fallback prompt
    return [
      'You are an expert analyst. Generate a Synthesis Memo with two parts: Objective Synthesis and Critical Analysis.',
      'Follow headings exactly as specified. Cite source file paths.\n',
      '```\n# Synthesis Memo\n\n---\n\n## PART 1: OBJECTIVE SYNTHESIS\n\n### Emergent Themes\n\n### Surprising Connections\n\n---\n\n## PART 2: CRITICAL ANALYSIS\n\n### Conflicts & Counter-Arguments\n```\n',
      '--- CONTEXT ---\n\n'
    ].join('\n');
  }
}

export async function synthesizeMemo(openai, context, options = {}) {
  const model = options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const temperature = options.temperature ?? Number(process.env.OPENAI_TEMPERATURE ?? 0.2);
  const projectRoot = options.projectRoot || process.cwd();
  const prompt = options.prompt || await loadMasterPrompt(projectRoot);

  const contextTokens = estimateTokensFromText(context);
  const maxContextTokens = options.contextMaxTokens || Number(process.env.CONTEXT_MAX_TOKENS || 120000);

  const oaiStats = { retries: 0, waitMs: 0 };
  const cacheStats = { oneshotHits: 0, oneshotMisses: 0, mapHits: 0, mapMisses: 0, reduceHits: 0, reduceMisses: 0 };
  const cacheDir = path.resolve(projectRoot, 'artifacts/cache');
  const ttlMs = getCacheTtlMs();
  if (contextTokens <= maxContextTokens) {
    const messages = buildMessages(prompt, context);
    const promptHash = sha256(prompt);
    const ctxHash = sha256(context);
    const key = `oneshot_${model}_${temperature}_${promptHash}_${ctxHash}`;
    const cached = await readCache(cacheDir, key, ttlMs);
    if (cached) {
      cacheStats.oneshotHits++;
      return { content: validateMemo(cached.content), meta: synthMeta({ model, temperature, contextTokens, maxContextTokens, chunked: false, chunks: 1, oaiStats, cacheStats }) };
    }
    cacheStats.oneshotMisses++;
    const out = await callChat(openai, { model, temperature, messages }, oaiStats);
    const content = validateMemo(out);
    await writeCache(cacheDir, key, { content, createdAt: new Date().toISOString(), model, temperature, promptHash, inputHash: ctxHash });
    return { content, meta: synthMeta({ model, temperature, contextTokens, maxContextTokens, chunked: false, chunks: 1, oaiStats, cacheStats }) };
  }

  // Map-Reduce flow
  const approxChunk = Math.max(2000, Math.floor(maxContextTokens * 0.8));
  const chunks = splitContextByHeadings(context, approxChunk);
  const partials = [];
  const promptHash = sha256(prompt);
  for (const chunk of chunks) {
    const messages = buildMessages(prompt, chunk);
    const chunkHash = sha256(chunk);
    const key = `map_${model}_${temperature}_${promptHash}_${chunkHash}`;
    const cached = await readCache(cacheDir, key, ttlMs);
    if (cached) {
      cacheStats.mapHits++;
      partials.push(validatePartial(cached.content));
    } else {
      cacheStats.mapMisses++;
      const out = await callChat(openai, { model, temperature, messages }, oaiStats);
      const content = validatePartial(out);
      await writeCache(cacheDir, key, { content, createdAt: new Date().toISOString(), model, temperature, promptHash, inputHash: chunkHash });
      partials.push(content);
    }
  }
  const reduceKey = `reduce_${model}_${temperature}_${promptHash}_${sha256(JSON.stringify(partials))}`;
  const cachedReduce = await readCache(cacheDir, reduceKey, ttlMs);
  if (cachedReduce) {
    cacheStats.reduceHits++;
    return { content: validateMemo(cachedReduce.content), meta: synthMeta({ model, temperature, contextTokens, maxContextTokens, chunked: true, chunks: chunks.length, oaiStats, cacheStats }) };
  }
  cacheStats.reduceMisses++;
  const merged = mergePartials(partials);
  await writeCache(cacheDir, reduceKey, { content: merged, createdAt: new Date().toISOString(), model, temperature, promptHash, inputHash: sha256(JSON.stringify(partials)) });
  return { content: merged, meta: synthMeta({ model, temperature, contextTokens, maxContextTokens, chunked: true, chunks: chunks.length, oaiStats, cacheStats }) };
}

function buildMessages(masterPrompt, context) {
  const user = masterPrompt.endsWith('\n') ? masterPrompt + context : masterPrompt + '\n' + context;
  return [
    { role: 'user', content: user }
  ];
}

async function callChat(openai, { model, temperature, messages }, stats) {
  // Support both chat.completions and responses SDKs by feature-detecting
  const tries = Number(process.env.OPENAI_RETRIES || 4);
  const baseMs = Number(process.env.OPENAI_BASE_DELAY_MS || 400);
  if (openai?.chat?.completions?.create) {
    const res = await withRetry(() => openai.chat.completions.create({ model, temperature, messages }), { tries, baseMs, onRetry: (_e, _a, waitMs) => { if (stats) { stats.retries++; stats.waitMs += waitMs; } } });
    const text = res?.choices?.[0]?.message?.content || '';
    return text;
  }
  if (openai?.responses?.create) {
    const res = await withRetry(() => openai.responses.create({ model, temperature, input: messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') }), { tries, baseMs, onRetry: (_e, _a, waitMs) => { if (stats) { stats.retries++; stats.waitMs += waitMs; } } });
    const text = res?.output_text || '';
    return text;
  }
  throw new Error('OpenAI client does not support known chat interfaces');
}

function validateMemo(text) {
  const s = String(text || '').trim();
  if (!s) throw new Error('Synthesis memo is empty');
  if (!/^#\s*Synthesis Memo/m.test(s)) return s; // accept even if header missing
  return s;
}

function validatePartial(text) {
  const s = String(text || '').trim();
  if (!s) throw new Error('Partial synthesis memo is empty');
  return s;
}

function extractSection(md, heading) {
  const re = new RegExp(`^##\\s*${escapeReg(heading)}\\s*$`, 'mi');
  const m = re.exec(md);
  if (!m) return '';
  const start = m.index + m[0].length;
  const rest = md.slice(start);
  const nextRe = /^##\s+/m;
  const next = nextRe.exec(rest);
  return (next ? rest.slice(0, next.index) : rest).trim();
}

function mergePartials(partials) {
  const themes = [];
  const connections = [];
  const conflicts = [];

  for (const p of partials) {
    const part1 = extractSection(p, 'PART 1: OBJECTIVE SYNTHESIS');
    const part2 = extractSection(p, 'PART 2: CRITICAL ANALYSIS');
    const sectionThemes = extractSubsection(part1, '###\s*Emergent Themes');
    const sectionConnections = extractSubsection(part1, '###\s*Surprising Connections');
    const sectionConflicts = extractSubsection(part2, '###\s*Conflicts\s*&\s*Counter-Arguments');
    if (sectionThemes) themes.push(sectionThemes.trim());
    if (sectionConnections) connections.push(sectionConnections.trim());
    if (sectionConflicts) conflicts.push(sectionConflicts.trim());
  }

  const merged = [
    '# Synthesis Memo',
    '',
    '---',
    '',
    '## PART 1: OBJECTIVE SYNTHESIS',
    '',
    '### Emergent Themes',
    joinBlocks(themes),
    '',
    '### Surprising Connections',
    joinBlocks(connections),
    '',
    '---',
    '',
    '## PART 2: CRITICAL ANALYSIS',
    '',
    '### Conflicts & Counter-Arguments',
    joinBlocks(conflicts),
    ''
  ].join('\n');

  return validateMemo(merged);
}

function extractSubsection(md, headingPattern) {
  const re = new RegExp(`(${headingPattern})\s*\n`, 'mi');
  const m = re.exec(md);
  if (!m) return '';
  const start = m.index + m[0].length;
  const rest = md.slice(start);
  const nextHeading = /^###\s+|^##\s+/m;
  const next = nextHeading.exec(rest);
  return (next ? rest.slice(0, next.index) : rest).trim();
}

function joinBlocks(blocks) {
  const parts = blocks.filter(Boolean).map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  return parts.join('\n');
}

function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- Caching helpers ---
function sha256(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

function getCacheTtlMs() {
  const v = process.env.SYNTH_CACHE_TTL_MS;
  const n = v != null ? Number(v) : NaN;
  if (!Number.isNaN(n)) return Math.max(0, n);
  // default: 7 days
  return 7 * 24 * 60 * 60 * 1000;
}

async function readCache(cacheDir, key, ttlMs) {
  try {
    const file = cachePath(cacheDir, key);
    const data = await readJsonSafe(file, null);
    if (!data) return null;
    const createdAt = Date.parse(data.createdAt || 0);
    if (!Number.isFinite(createdAt)) return null;
    if (ttlMs === 0) return null;
    if (Date.now() - createdAt > ttlMs) return null;
    if (!data.content) return null;
    return data;
  } catch {
    return null;
  }
}

async function writeCache(cacheDir, key, value) {
  const file = cachePath(cacheDir, key);
  await writeJson(file, value);
}

function cachePath(cacheDir, key) {
  const [bucket] = key.split('_', 1);
  const rel = key + '.json';
  return path.resolve(cacheDir, bucket, rel);
}

function synthMeta({ model, temperature, contextTokens, maxContextTokens, chunked, chunks, oaiStats, cacheStats }) {
  return {
    model, temperature, contextTokens, maxContextTokens, chunked, chunks,
    openaiRetries: oaiStats.retries, openaiWaitMs: oaiStats.waitMs,
    cache: {
      oneshotHits: cacheStats.oneshotHits,
      oneshotMisses: cacheStats.oneshotMisses,
      mapHits: cacheStats.mapHits,
      mapMisses: cacheStats.mapMisses,
      reduceHits: cacheStats.reduceHits,
      reduceMisses: cacheStats.reduceMisses,
      ttlMs: getCacheTtlMs()
    }
  };
}
