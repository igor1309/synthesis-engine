export function loadCliOverrides(argv = process.argv) {
  const m = parseArgs(argv);
  // Apply precedence: CLI > env
  if (m['log-level']) process.env.LOG_LEVEL = m['log-level'];
  if (m['dry-run'] !== undefined) process.env.DRY_RUN = truthy(m['dry-run']) ? '1' : '';
  if (m['openai-model']) process.env.OPENAI_MODEL = m['openai-model'];
  if (m['openai-temperature'] != null) process.env.OPENAI_TEMPERATURE = String(m['openai-temperature']);
  if (m['context-max-tokens'] != null) process.env.CONTEXT_MAX_TOKENS = String(m['context-max-tokens']);
  if (m['lines-head'] != null) process.env.LINES_HEAD = String(m['lines-head']);
  if (m['lines-tail'] != null) process.env.LINES_TAIL = String(m['lines-tail']);
  if (m['github-base-url']) process.env.GITHUB_BASE_URL = m['github-base-url'];
  if (m['openai-base-url']) process.env.OPENAI_BASE_URL = m['openai-base-url'];
  if (m['github-concurrency'] != null) process.env.GITHUB_CONCURRENCY = String(m['github-concurrency']);
  if (m['fail-on-error'] !== undefined) process.env.FAIL_ON_ERROR = truthy(m['fail-on-error']) ? '1' : '';
}

export function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    switch (key) {
      case 'log-level': case 'openai-model': case 'run-summary': case 'github-base-url': case 'openai-base-url':
        if (next && !next.startsWith('--')) { out[key] = next; i++; }
        break;
      case 'openai-temperature': case 'context-max-tokens': case 'lines-head': case 'lines-tail': case 'github-concurrency':
        if (next && !next.startsWith('--')) { out[key] = Number(next); i++; }
        break;
      case 'dry-run':
        out[key] = true;
        break;
      case 'fail-on-error':
        out[key] = true;
        break;
      default:
        // ignore unknown flags
        break;
    }
  }
  return out;
}

function truthy(v) {
  if (v === true) return true;
  const s = String(v).toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'y';
}
