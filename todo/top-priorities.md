# Top Priorities (Detailed)

1) Resilience polish
- Why
  - Finish resilience by adapting load to rate limits and surfacing retry info.
- Scope (remaining)
  - Emit retry counts/timings to step summary and run-summary.
  - Expose OPENAI/GITHUB retry settings in run-summary.synthesis and metrics.
- Deliverables
  - Counters for retries (GitHub list/fetch, OpenAI calls); summary fields for retry stats.
- Acceptance
  - Under simulated 429s, run succeeds and retry counters reflect attempts/delays.

2) Config polish and security
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

3) Docs & troubleshooting
- Why
  - Reduce friction for setup and common failures.
- Scope
  - Add docs/Troubleshooting.md (missing inbox, rate limits, invalid token, empty memo, CI failures).
  - Link from README and AGENTS.md; include env/CLI precedence matrix.
- Deliverables
  - New troubleshooting doc; README/AGENTS references.
- Acceptance
  - Clear guidance helps resolve common errors; CI links point to relevant sections.
