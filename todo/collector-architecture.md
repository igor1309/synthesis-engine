# Collector Architecture Refactor Plan

## Target Structure
- `src/config` — env + CLI parsing; defaults and validation
- `src/logger` — leveled logs; GitHub Actions summary integration
- `src/github/client` — Octokit wrapper with retries/backoff and rate-limit handling
- `src/github/collect` — repo discovery, inbox listing, file fetch with ETag cache
- `src/context` — builders (shell/node) + strategy (already added)
- `src/ai/synthesize` — OpenAI call, token accounting, chunking/map-reduce
- `src/io/fs` — temp management, cache persistence, artifacts output
- `src/pipeline/run` — orchestrates discover → collect → build → synthesize → write
- `src/index` — CLI entry (keep `collector.js` as thin shim)

## Design Principles
- Separation of concerns; DI for external clients (Octokit/OpenAI)
- Robust error handling with clear messages and exit codes
- Deterministic behavior in CI; portable across environments
- Observability: structured logs + concise run summary

## Key Tasks
- Extract config and logger modules
- Implement GitHub collector with concurrency + ETag cache
- Implement AI synthesis with model selection, retries, chunked flow
- Add artifacts and step summary
- Replace `collector.js` body with pipeline call

## Cross-Refs
- See `collector-implementation.md` for step-by-step plan
- See `build-context.md` for context builder parity and tests
- See `ci-workflow-issues.md` for CI-related changes

