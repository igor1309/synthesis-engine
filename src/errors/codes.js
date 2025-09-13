export const ErrorCodes = {
  CONFIG: 'E_CONFIG',
  GITHUB: 'E_GITHUB',
  AI: 'E_AI',
  CONTEXT: 'E_CONTEXT',
  UNKNOWN: 'E_UNKNOWN',
};

export function classifyError(err) {
  if (!err) return ErrorCodes.UNKNOWN;
  const msg = String(err.message || err || '').toLowerCase();
  if (err.reasons || /config|missing gh_pat|repos\.txt/.test(msg)) return ErrorCodes.CONFIG;
  if (typeof err.status === 'number') return ErrorCodes.GITHUB;
  if (/openai|synthes/i.test(msg)) return ErrorCodes.AI;
  if (/buildcontext|repo2md|no valid files/.test(msg)) return ErrorCodes.CONTEXT;
  return ErrorCodes.UNKNOWN;
}

