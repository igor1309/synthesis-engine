# Log

## 2025-09-13

- Repo reorg: moved `scripts/`, `config/`, `prompts/`; updated references and kept bundler stdout-only with temp cleanup.
- BuildContext parity: added fixtures + snapshot test; aligned Node builder with shell output (truncation, fences).
- CI split: fast lint-and-test on push/PR; memo generation only schedule/manual; conditional lint; memo output validation; upload artifacts on failure.
- GitHub collector: added config loader, repo spec parsing (`owner/repo@ref:path`), recursive inbox listing, Markdown filter, SHA cache, concurrency; writes to `temp_inbox_files/`.
- Observability: structured JSON logging, step summary with context stats; per-repo metrics and artifacts snapshot (`artifacts/<timestamp>/`).
- Tests: added config-parse and collector cache tests; all tests pass.

## 2025-09-12

- Gemini 2.5 Pro came up with a `Synthesis Engine` and other.
	- `Project Blueprint The Synthesis Engine.md`
- ChatGPT-5 Thinking mini and Claude Opus 4.1 generated a gazillion of ideas none of which I found appealing.