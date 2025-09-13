# Top Priorities (Detailed)

1) Dogfood reusable workflow + fail-on-error
- Why
  - Remove duplication between workflows, ensure consistent validation, and allow CI to fail on real per-repo errors when desired.
- Scope
  - Update `.github/workflows/generate-memo.yml` to call `agent-synthesis.yml` via `uses:`.
  - Add an input to the reusable workflow for `fail-on-error` and pass `FAIL_ON_ERROR` env through.
  - Keep artifacts upload and step summary; verify memo validation still runs.
- Deliverables
  - Updated workflows and README snippet alignment.
- Acceptance
  - Scheduled/manual run succeeds; when `fail-on-error: true` and errors exist, job exits non‑zero and artifacts are present.

2) Config/docs precedence + redaction tests
- Why
  - Clarify configuration behavior and strengthen safety around secret logging.
- Scope
  - Add a precedence matrix (CLI > env > defaults) with concrete examples to `docs/Config.md`.
  - Extend redaction tests to include `run-summary.settings` and step summary strings (no raw secrets).
  - Expand Troubleshooting with proxy/GHE examples (base URLs, proxies).
- Deliverables
  - Config.md updates; extended redaction test.
- Acceptance
  - Tests pass; docs clearly show precedence and proxy/GHE setup with examples.

3) Synthesis quality: citations and prompt
- Why
  - Increase memo usefulness by enforcing citations and tightening prompting.
- Scope
  - Enhance validator to require at least one "Source:" citation when context is non‑empty (tunable threshold).
  - Refine `prompts/master.md` wording to emphasize evidence and sourcing.
  - Add tests for validator citation rule; document guidance in README.
- Deliverables
  - Updated validator, prompt, and tests.
- Acceptance
  - Memos lacking citations fail validation; valid memos pass; docs explain expectations.
