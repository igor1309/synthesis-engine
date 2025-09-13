# Top Priorities (Detailed)

1) Synthesis quality: citations and prompt
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
