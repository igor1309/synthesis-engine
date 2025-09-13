function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

export async function withRetry(fn, { tries = 4, baseMs = 400, classify = defaultClassify } = {}) {
  let attempt = 0; let lastErr;
  while (attempt < tries) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const { retry, waitMs } = classify(err, attempt, { baseMs });
      attempt++;
      if (!retry || attempt >= tries) break;
      await sleep(waitMs);
    }
  }
  throw lastErr;
}

function defaultClassify(err, attempt, { baseMs }) {
  const status = err?.status || err?.response?.status;
  const retryable = [429, 403, 408, 500, 502, 503, 504];
  let retry = false;
  let waitMs = Math.floor((Math.pow(2, attempt) * baseMs) + (Math.random() * 150));
  if (retryable.includes(status)) retry = true;
  const ra = Number(err?.response?.headers?.['retry-after']);
  if (!isNaN(ra) && ra > 0) waitMs = Math.max(waitMs, ra * 1000);
  return { retry, waitMs };
}

