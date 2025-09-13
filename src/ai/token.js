export function estimateTokensFromText(text) {
  if (!text) return 0;
  // Simple heuristic: ~4 chars per token
  const bytes = Buffer.byteLength(String(text), 'utf-8');
  return Math.floor((bytes + 3) / 4);
}

export function splitContextByHeadings(context, approxTokensPerChunk) {
  const lines = String(context).split(/\r?\n/);
  const chunks = [];
  let current = [];
  let currentTokens = 0;

  const pushCurrent = () => {
    if (current.length) {
      const text = current.join('\n');
      chunks.push(text);
      current = [];
      currentTokens = 0;
    }
  };

  for (const line of lines) {
    const lineTokens = estimateTokensFromText(line + '\n');
    const isMajorHeading = line.startsWith('### ') || line.startsWith('## Files') || line.startsWith('## PART');
    if (isMajorHeading && currentTokens > 0 && (currentTokens + lineTokens) > approxTokensPerChunk) {
      pushCurrent();
    }
    current.push(line);
    currentTokens += lineTokens;
    if (currentTokens >= approxTokensPerChunk * 1.2) {
      // Hard split if we far exceed target
      pushCurrent();
    }
  }
  pushCurrent();
  return chunks.filter(Boolean);
}

