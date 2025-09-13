# Log

## 2025-09-13

- Repo reorg: moved `scripts/`, `config/`, `prompts/`; updated references and kept bundler stdout-only with temp cleanup.
- BuildContext parity: added fixtures + snapshot test; aligned Node builder with shell output (truncation, fences).
- CI split: fast lint-and-test on push/PR; memo generation only schedule/manual; conditional lint; memo output validation; upload artifacts on failure.
- GitHub collector: added config loader, repo spec parsing (`owner/repo@ref:path`), recursive inbox listing, Markdown filter, SHA cache, concurrency; writes to `temp_inbox_files/`.
- Observability: structured JSON logging, step summary with context stats; per-repo metrics and artifacts snapshot (`artifacts/<timestamp>/`).
- Tests: added config-parse and collector cache tests; all tests pass.
- OpenAI synthesis: implemented token estimation, chunking/map-reduce, prompt loading with fallback; wired into collector; added synth tests.
- Dotenv + dry-run: load .env/.env.local; support DRY_RUN to skip network; lazy import OpenAI/Octokit.
- Caching fix: re-download files on cache hit when local copy missing; ensures context builds after temp cleanup.
- Reusable workflow: added `.github/workflows/agent-synthesis.yml` with inputs/secrets/outputs; README usage snippet.
- Safety rules: AGENTS.md updated to never touch .env/.env.local and prefer explicit staging; dotenv test now uses a temp dir.
- Memo validation: added structural validator and CLI; integrated into CI (generate-memo.yml, agent-synthesis.yml); tests added.
- Hardening: CLI overrides for env, error codes in logs/summary, GitHub request timeouts, retry/backoff utility (used for GitHub listing/content), .env.example, README flags.
- Observability enrichment: versioned run-summary with synthesis metadata; enriched step summary totals/ratios; documented schema in README.
 - Observability enrichment: added warn/error counters, remediation tips; versioned schema docs.
 - Resilience: OpenAI retries/backoff + GitHub retries; adaptive concurrency on 403/429; tracked retry counters/wait and surfaced in summaries; tests added.
 - Config/security: GHE base URL and OpenAI base URL support; proxy envs; secret redaction in logs/summary; Troubleshooting doc; README links.

## 2025-09-12

- Gemini 2.5 Pro came up with a `Synthesis Engine` and other.
	- `Project Blueprint The Synthesis Engine.md`
- ChatGPT-5 Thinking mini and Claude Opus 4.1 generated a gazillion of ideas none of which I found appealing.
