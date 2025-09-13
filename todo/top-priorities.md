# Top Priorities (Detailed)

1) Cross-Run Synthesis Cache
- Why: Reduce cost/latency by reusing synthesis outputs when inputs are unchanged.
- Scope: Hash prompt/model/chunked inputs; cache OpenAI map (per-chunk), reduce, and one-shot outputs under `artifacts/cache/`; TTL + invalidation; metrics.
- Done when: Identical inputs skip API calls; cache hit/miss in step summary and `run-summary.json`; tests cover invalidation and TTL.

2) Multi-Provider LLM Abstraction & Failover
- Why: Reduce outages/vendor lock-in; enable cost/perf choices.
- Scope: Provider interface (OpenAI, Azure OpenAI, Anthropic) with prompt adapters, capability flags, and prioritized failover; config + CLI to choose/order.
- Done when: Fallback works in tests; per-provider metrics; docs updated.

3) Evidence Validator v2 (Groundedness & Coverage)
- Why: Improve memo trustworthiness and CI signal quality.
- Scope: Map claims→citations, verify each citation resolves to sources, compute coverage score; thresholds gate CI; per-section metrics.
- Done when: Validator catches missing/invalid citations; coverage score appears in `run-summary.json` and step summary; tests added.
