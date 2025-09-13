# Top Priorities (Detailed)

1) Config polish and security (remaining)
- Why
  - Close the loop on docs and safety for varied environments.
- Scope
  - Add a precedence matrix to docs/Config.md (CLI > env > defaults) with examples.
  - Expand redaction tests to cover run-summary.settings and step summary content.
  - Add proxy/GHE troubleshooting notes with examples.
- Deliverables
  - Config.md updates and a small redaction test addition.
- Acceptance
  - Docs clearly show precedence and proxy/GHE setup; redaction test covers settings.

2) Summary UX: error samples
- Why
  - Make errors visible at a glance during CI review.
- Scope
  - Add a compact “Errors” section to the step summary when errors exist, showing up to a few samples with repo/path/status.
- Deliverables
  - Step summary template update.
- Acceptance
  - CI step summary displays a concise errors list when applicable.

3) (free)
  - Reserved for the next discovered need.
