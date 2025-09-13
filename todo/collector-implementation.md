# Collector.js Implementation Needed

## GitHub API Integration
- Implement logic to fetch files from repository 'inbox' directories
- Add iteration through repos list
- Download .md files from each repo's inbox folder
 - Add concurrency limiting (e.g., 4–8) and rate-limit handling with retries/backoff
 - Persist lightweight ETag cache (e.g., `.cache/github-files.json`) to skip unchanged files
 - Support repo spec extensions: `owner/repo@ref`, optional custom inbox path, include/exclude globs

## OpenAI Integration
- Complete actual API call to synthesize content
- Send context + master prompt to OpenAI
- Handle API response and error cases
 - Add token accounting; chunk/map-reduce synthesis when context exceeds cap
 - Support streaming and non-streaming modes; configurable model via env/CLI
 - Read master prompt from `master-prompt.md` with validation and fallbacks

## Validation & Error Handling
- Add environment variable validation at startup
- Add file existence checks for dependencies (`repos.txt`, `repo2md.sh`)
- Improve error messages with specific failure reasons
- Add logging levels for better debugging

## Architecture & Modules
- Create `src` modules and move orchestration out of `collector.js`:
  - `src/config` — env + CLI parsing, defaults
  - `src/logger` — structured logs and step summaries (GH Actions)
  - `src/github/{client,collect}` — Octokit wrapper + collectors
  - `src/context` — existing builders (shell/node/strategy)
  - `src/ai/synthesize` — OpenAI call, retries, chunking
  - `src/io/fs` — temp, artifacts, cache utils
  - `src/pipeline/run` — glue/orchestration with clear steps
- Keep `collector.js` as thin CLI entry that calls pipeline

## Observability & Artifacts
- Emit summary: repos processed, files, sizes, token estimates, output path
- Persist artifacts under `artifacts/<timestamp>/` for debugging (context, logs)

## Phased Migration Plan
1) Extract config/logger shells; wire current logic
2) Implement GitHub collect with concurrency + ETag cache
3) Integrate `buildContext` (done) plus feature flag to choose builder
4) Implement OpenAI synthesis with chunking + model config
5) Add artifacts + summary; finalize CLI and docs
