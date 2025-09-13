# Top Priorities (Detailed)

1) Implement GitHub collector with caching and validation
- Why
  - Unblocks end-to-end functionality by replacing placeholders in `collector.js`.
  - Reduces API usage via ETag caching; improves reliability with retries/backoff.
  - Provides clear validation and errors for missing/invalid config and secrets.
- Scope
  - Repo parsing from `config/repos.txt` with support for:
    - `owner/repo`, `owner/repo@ref`, `owner/repo:path`, `owner/repo@ref:path` (default inbox path: `inbox/`).
  - Collection flow per repo:
    - List Markdown files under the inbox path (respect ref if provided), download raw contents.
    - Concurrency 4–8 with exponential backoff; handle `403/429` rate limits via `retry-after` and backoff.
    - Lightweight ETag cache at `.cache/github-files.json` to skip unchanged files.
    - Save fetched files into `temp_inbox_files/<owner>__<repo>__<ref_or_default>/<relative_path>`.
  - Validation
    - Fail fast if `GH_PAT` missing, `config/repos.txt` missing/empty, or repo specs are invalid.
    - Clear, actionable messages; do not leak secrets in logs.
- Deliverables
  - `src/github/client` (Octokit wrapper with retries/backoff and base URL override if needed).
  - `src/github/collect` (repo spec parsing plumbing, list+fetch with ETag cache, concurrency control).
  - `src/config` (centralized env + file validation) and a thin `src/pipeline/run` to orchestrate.
  - Wire `collector.js` to call the pipeline; leave synthesis as a placeholder return until step 2.
- Acceptance
  - Given valid repos and PAT, downloads inbox Markdown files into `temp_inbox_files` and logs counts/bytes.
  - Subsequent run with no changes performs only metadata checks (ETag hits) and skips downloads.
  - Meaningful non-zero exit codes on missing config or fatal GitHub errors; no secret values in logs.

2) Implement OpenAI synthesis with chunking and prompt handling
- Why
  - Produces the actual `synthesis_memo.md` from the consolidated context.
  - Handles large contexts safely with chunking and deterministic merging.
- Scope
  - Prompt handling
    - Load `prompts/master.md` with existence validation and a minimal fallback; allow CLI/env overrides.
    - Model and params via CLI/env (e.g., `OPENAI_MODEL`, temperature, max tokens).
  - Synthesis
    - Token accounting and guard rails; chunk/map-reduce when context exceeds the cap.
    - Retries with backoff on transient errors; optional streaming path for future use.
    - Deterministic merge of partials with section headers (e.g., Objective Synthesis / Critical Analysis).
  - Output
    - Validate non-empty, non-placeholder output; write to `synthesis_memo.md`.
    - Return non-zero exit on failure; clear errors for quota/timeouts.
- Deliverables
  - `src/ai/synthesize` (single-shot and chunked flows, token estimator helper).
  - Integrated call in `src/pipeline/run` after context build; modest logs of token/size summary.
  - Minimal README note for required env and usage.
- Acceptance
  - For small contexts, one-shot synthesis writes a non-empty memo and exits 0.
  - For large contexts, chunked synthesis completes with a coherent merged memo.
  - On API failures, exits non-zero with actionable error messages and no secret leaks.

3) Add configuration, security, and observability layer
- Why
  - Prevents fragile runs in CI and local; improves debuggability and trustworthiness.
- Scope
  - Configuration
    - Precedence: CLI > env > `package.json` `config` > defaults; add `.env.example` documenting vars.
    - Support read-only (no push) dry-run mode via flag/env; optional enterprise GitHub base URL.
  - Security
    - Validate `GH_PAT`, `OPENAI_API_KEY` up front; redact sensitive fields in logs.
    - Set network timeouts and retry strategy for GitHub/OpenAI calls; optional proxy settings.
  - Observability
    - Structured logs (levels) and GitHub Actions step summary: repos/files processed, bytes, est. tokens, timings.
    - Persist artifacts under `artifacts/<timestamp>/` (context snapshot, logs) for debugging.
    - CI validation: ensure `synthesis_memo.md` exists and is non-empty before commit.
- Deliverables
  - `src/logger` (leveled logs + step summary helper) and `src/io/fs` (artifacts utilities).
  - Update workflows to upload artifacts on failure; keep dependency caching.
  - Documentation updates for configuration and troubleshooting.
- Acceptance
  - CI shows a concise step summary with key metrics; artifacts are attached on failure.
  - Misconfiguration fails fast with clear messages; secrets are never written to logs.

