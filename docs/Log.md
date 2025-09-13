# Log

## 2025-09-13

- Repo reorg and builder parity: moved directories; snapshot parity between shell and Node builders.
- CI split: fast lint/test on push/PR; scheduled/manual memo generation; memo validation and artifacts on failure.
- GitHub collector: config loader, repo spec parsing (`owner/repo@ref:path`), recursive listing, Markdown filter, SHA cache with re-download, concurrency.
- Observability: structured logs; per-repo metrics; step summary and artifacts snapshot (`artifacts/<timestamp>/`).
- OpenAI synthesis: token estimation, chunking/map-reduce, prompt loading with fallback; integrated and tested.
- Dotenv + dry-run: load `.env`/`.env.local`; DRY_RUN path; lazy imports.
- Resilience: retries/backoff for GitHub/OpenAI; adaptive concurrency on 403/429; retry counters and wait times tracked; tests.
- Config/security: GHE and OpenAI base URLs; proxy envs; secret redaction; docs/Config.md; Troubleshooting guide; README links.
- Summary UX: versioned schema; settings recorded; `npm run summary` CLI; per-repo table; artifact links; compact Errors section.
- Per-repo errors: capture non-404 list/fetch errors with samples; `--fail-on-error` option; tests and docs.

## 2025-09-12

- Gemini 2.5 Pro came up with a `Synthesis Engine` and other.
	- `Project Blueprint The Synthesis Engine.md`
- ChatGPT-5 Thinking mini and Claude Opus 4.1 generated a gazillion of ideas none of which I found appealing.
