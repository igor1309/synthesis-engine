# Top Priorities (Detailed)

1) Observability enrichment
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

2) Resilience: rate limiting and retries
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

3) Config polish and security
- Why
  - Finalize configuration surfaces and security posture for varied environments.
- Scope
  - Add optional GitHub Enterprise base URL and HTTP(S) proxy support (env/CLI).
  - Redaction utilities to scrub sensitive values from logs and summaries.
  - Document precedence and troubleshooting; refine errors with remediation tips.
- Deliverables
  - Config parsing for base URL/proxy; redaction helper; docs.
- Acceptance
  - Runs succeed behind proxies/enterprise; logs never contain secrets; docs cover common failures.
