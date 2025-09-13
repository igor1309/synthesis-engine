# Top Priorities (Detailed)

1) Observability enrichment
- Why
  - Make runs easy to debug and review by surfacing richer, consistent metrics and summaries.
- Scope (remaining)
  - Add error/warn counters and brief remediation tips in logs and step summary.
  - Include per-repo error/warn counts in run-summary; keep schema versioned.
  - Add a tiny schema doc file (docs/run-summary-schema.md) referenced from README.
- Deliverables
  - Logger helpers to aggregate counters; summary template updates; schema doc.
  - Tests for summary writer and schema shape.
- Acceptance
  - CI shows enriched summary with counters and tips; artifacts include updated schema with counters.

2) Resilience polish
- Why
  - Finish resilience by adapting load to rate limits and surfacing retry info.
- Scope (remaining)
  - Adaptive concurrency: temporarily reduce GitHub fetch concurrency on repeated 403/429.
  - Emit retry counts/timings to summary; expose OPENAI/GITHUB retry settings in run-summary.
- Deliverables
  - Concurrency governor for collector; summary fields for retry stats.
- Acceptance
  - Under simulated 429s, concurrency decreases and run succeeds within retry budget.

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
