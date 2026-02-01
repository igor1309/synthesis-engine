---
date: 2026-02-01
model: gpt-5
description: "Repository review findings and risks."
---

# Repo Review - Synthesis Engine

## Scope

- Reviewed: collector, synthesis, context builders, logger/redaction, GitHub collector, workflows, tests, docs.
- Out of scope: external services, runtime behavior outside this repo, CI secrets.

## Impact of commit d85b347bb9a3700b1794c9b483c4af027f6cd623

- Only docs/memo/todo changed; no code paths touched. Findings and questions below remain unchanged.

## Findings

- CRITICAL: Chunked (map-reduce) synthesis drops subsection content because `mergePartials` passes regex-like strings and `extractSubsection` builds a RegExp with `\s` unescaped, so headings are never matched; large contexts will produce empty sections and fail memo validation. `src/ai/synthesize.js:144` `src/ai/synthesize.js:177`
- HIGH: Secrets in arrays are not redacted because `deepMap` uses an identity function for arrays, so tokens in meta arrays can leak to logs/step summaries. `src/logger/redact.js:27`
- HIGH: `process.exit(1)` in the main collector error path prevents `finally` from running, skipping step-summary writes and temp cleanup on failures. `collector.js:228`
- MEDIUM (CI): The commit job never receives the generated memo from the reusable workflow (no artifact download and the reusable workflow only uploads on failure), so commits are likely no-ops. `.github/workflows/generate-memo.yml:21` `.github/workflows/agent-synthesis.yml:61`
- MEDIUM: `download_url` fallback uses `Authorization: token ${octokit.auth}` (function, not token), so private repos or large files that require the fallback can fail to download. `src/github/collect.js:143`
- LOW: Binary file handling writes literal `\\n\\n`, producing backslash characters in output instead of newlines, breaking context formatting/parity. `src/context/nodeBuildContext.js:67`

## Questions / Assumptions

- Do you expect contexts to exceed `CONTEXT_MAX_TOKENS` in normal runs? If yes, the map-reduce bug is a release-blocking issue.
- Should the workflow commit job pull a memo artifact, or should the reusable workflow perform the commit directly?
- Are any repos private or likely to include large files where the `download_url` fallback is exercised?

## Testing Gaps

- No test asserts that chunked synthesis preserves bullets/sections after merge (map-reduce path). `test/synthesize.test.js`
- No test covers redaction of secrets inside arrays. `test/redact.test.js`
- No test for `download_url` fallback behavior (private/large file path). `src/github/collect.js:143`
