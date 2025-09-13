# Top Priorities (Detailed)

1) Config, security, and observability hardening
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

2) Observability enrichment
- Why
  - Make runs easy to debug and review by surfacing richer, consistent metrics and summaries.
- Scope
  - Expand step summary: per-repo details, totals, cache hit/miss ratios, durations, error/warn counters.
  - Formalize `artifacts/*/run-summary.json` schema (versioned) and include synthesis metadata (model, token estimates).
  - Add standardized error codes and brief remediation tips in logs.
- Deliverables
  - Logger helpers to aggregate and emit metrics; schema doc for run-summary; summary templates.
  - Tests for summary writer and schema shape.
- Acceptance
  - CI shows enriched summary; artifacts include a valid, versioned summary; errors include codes.

3) Resilience: rate limiting and retries
- Why
  - Improves reliability under GitHub 403/429 and OpenAI transient errors; avoids flakiness.
- Scope
  - Implement exponential backoff with jitter and respect `Retry-After` for GitHub; cap concurrency on 403/429.
  - Add retry policy for OpenAI calls (timeouts, 429, 5xx) with max attempts; surface concise error summaries.
  - Add tests with fake clients simulating rate limits/timeouts.
- Deliverables
  - Retry/backoff utilities and integration in GitHub client and synthesis module.
  - Configurable limits via env/CLI; minimal logs showing retries.
- Acceptance
  - Simulated 429/5xx recover after retries; severe cases fail fast with clear messages and codes.
