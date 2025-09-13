# Top Priorities (Detailed)

1) Config polish and security
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

2) Per-repo error details
- Why
  - Speed up debugging by surfacing concrete failures.
- Scope
  - Capture non-404 fetch errors with codes and sample messages; include counts per repo.
  - Add optional `--fail-on-error` to exit non-zero if any per-repo errors occurred.
- Deliverables
  - Error aggregation in collector metrics; validator/tests.
- Acceptance
  - CI can fail on real errors when enabled; run-summary lists per-repo error counts.

3) (free)
  - Reserved for next discovered need after per-repo errors.
