# Top Priorities (Detailed)

1) Implement OpenAI synthesis with chunking and prompt handling
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

2) Reusable Agent Workflow (GitHub Actions)
- Why
  - Enables other repos to invoke the Synthesis Engine consistently via `workflow_call`.
  - Centralizes inputs, secrets, validation, and artifact handling.
- Scope
  - Create `.github/workflows/agent-synthesis.yml` as a reusable workflow with `on: workflow_call`.
  - Inputs: `node-version` (default 20), `memo-path` (default `synthesis_memo.md`), `dry-run` (bool), `log-level`.
  - Secrets: `GH_PAT` (required), `OPENAI_API_KEY` (optional until synthesis is live).
  - Steps: checkout, setup node + cache, install, run `node collector.js`, run synthesis step (placeholder until #1 done), validate memo, write step summary, upload artifacts on failure.
  - Outputs: memo bytes, context bytes, files count, duration.
- Deliverables
  - New reusable workflow file with documentation snippet in `README.md` showing how to call it.
  - Example consumer snippet using `uses: <owner>/<repo>/.github/workflows/agent-synthesis.yml@trunk`.
- Acceptance
  - A sample `workflow_dispatch` job in this repo can call the reusable workflow successfully.
  - Step summary shows key metrics; artifacts uploaded on failure; respects `dry-run`.

3) Config, security, and observability hardening
- Why
  - Prevents fragile runs in CI and local; improves debuggability and trustworthiness.
- Scope
  - Configuration
    - Precedence: CLI > env > `package.json` `config` > defaults; add `.env.example` documenting vars.
    - Add CLI flags (e.g., `--log-level`, `--dry-run`, `--openai-model`, `--context-max-tokens`).
    - Support enterprise GitHub base URL and proxy; dry-run mode for local tests.
  - Security
    - Validate `GH_PAT`, `OPENAI_API_KEY` up front; redact sensitive fields in logs.
    - Set network timeouts and retry strategy for GitHub/OpenAI calls; optional proxy settings.
  - Observability
    - Enrich step summary: totals per-repo, cache hits/misses, error counts, durations.
    - Persist artifacts under `artifacts/<timestamp>/` (context snapshot, run-summary.json, logs).
    - Add error/warn counters and standardized error codes; token estimation for context and memo.
- Deliverables
  - CLI/flag parsing and config merge; `.env.example` and README sections.
  - Step summary enhancements; run-summary artifact writer; redaction utilities.
  - Workflow updates to pass inputs/env and upload artifacts robustly.
- Acceptance
  - CI shows enriched step summary with metrics and error counts; artifacts attached on failure.
  - Misconfiguration fails fast with clear messages; secrets are never written to logs.
