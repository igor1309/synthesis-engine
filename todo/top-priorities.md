# Top Priorities (Detailed)

1) Multi-Provider LLM Abstraction & Failover
- Why: Reduce outages/vendor lock-in; enable cost/perf choices.
- Scope: Provider interface (OpenAI, Azure OpenAI, Anthropic) with prompt adapters, capability flags, and prioritized failover; config + CLI to choose/order.
- Done when: Fallback works in tests; per-provider metrics; docs updated.

2) Evidence Validator v2 (Groundedness & Coverage)
- Why: Improve memo trustworthiness and CI signal quality.
- Scope: Map claims→citations, verify each citation resolves to sources, compute coverage score; thresholds gate CI; per-section metrics.
- Done when: Validator catches missing/invalid citations; coverage score appears in `run-summary.json` and step summary; tests added.

3) Incremental Context & De-duplication
- Why: Cut tokens and improve memo signal by removing duplicate and near-duplicate content across repos and runs.
- Scope: Stable file hashing; skip unchanged files across runs; detect duplicates (exact + simple similarity) and collapse; emit duplicate metrics; optional fuzzy off by default.
- Done when: Token count decreases on reruns with unchanged inputs; duplicate/unique counts in metrics and step summary; tests cover hashing and de-duplication.
