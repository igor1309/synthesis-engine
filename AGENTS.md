# Agent Workflow (Codex CLI)

This repository expects AI coding agents (OpenAI Codex/Codex CLI) to follow the workflow below for reliable, auditable changes.

## Review & Context
- Scan repo structure, docs, scripts, workflows, and TODOs.
- Note sandbox/approval constraints and these AGENTS.md rules.
- Identify key entry points, configs, and side effects.

## Surface Issues
- List concrete, file‑referenced issues with location and impact.
- Separate: implementation gaps, config/validation gaps, missing tests, CI problems.

## Prioritize & TODO
- Propose 3–5 most impactful next steps with Why/Scope/Deliverables/Acceptance.
- Write them to a dedicated TODO file; keep items actionable and testable.

## Plan
- Use the plan tool to keep a short, ordered plan (4–7 words per step).
- Exactly one step in_progress at a time; update as you go.

## Implement Iteratively
- Send a one‑line preamble before tool calls (what/why).
- Make surgical changes with apply_patch; avoid unrelated edits.
- Fit the existing code style; add only minimal modules.
- Update .gitignore for any new temp/artifact paths.

## Tests First (or Alongside)
- Add focused tests under `test/` mirroring new behavior.
- Prefer small unit tests + narrow integration tests.
- Ensure `npm test` runs all tests deterministically.

## CI & Observability
- Split fast lint‑and‑test vs. scheduled/manual heavy jobs.
- Validate outputs in CI (e.g., non‑empty memo) and fail fast.
- Emit structured JSON logs and a GitHub Actions step summary with key metrics.
- Persist artifacts on failure (`artifacts/<timestamp>/` context/run summary).

## Validate
- Run tests locally; fix failures before moving on.
- If relevant, smoke‑run critical scripts in sandbox (no secrets).

## Clean Up Plan & TODOs
- Mark completed plan steps; set next step to in_progress.
- After implementing a task, clean TODOs immediately:
  - Remove completed items; do not leave "done" markers or placeholders.
  - Keep `todo/top-priorities.md` focused on active, actionable work only.
  - Archive obsolete plan docs or reword them to reflect current status.

## Document Log
- Add a concise entry to `docs/Log.md`: what changed, why, and where.
- Update the log regularly (same PR/session) so it reflects the latest state.
- Group related bullets; avoid duplication.

## Document Log
- Add a concise entry to `docs/Log.md`: what changed, why, and where.
- Reference commit topics (reorg, tests, CI, features, observability).

## Commit Discipline
- Stage only relevant files; use clear, conventional commits:
  - feat(scope): short description
  - fix(scope): …
  - test: …
  - docs: …
  - ci: …
  - chore: …
- Keep commits scoped; avoid mixed concerns.
- Prefer explicit staging over bulk adds: stage specific files with `git add <path>` instead of `git add -A` to avoid accidentally committing local files (e.g., artifacts, .env, node_modules).

## Conventions
- Structure: code in `src/`, tests in `test/`, scripts in `scripts/`, config in `config/`, prompts in `prompts/`, artifacts in `artifacts/`.
- Avoid writing outside project root; use `cwd`/`projectRoot` correctly.
- Validate required envs; never log secrets; config precedence (CLI > env > package.json > defaults).
- Maintain builder parity (shell/Node) with snapshot tests; normalize newlines; treat shell output as snapshot truth when helpful.
- Use lightweight caches (e.g., ETag/SHA) with clear keys and safe fallbacks.
- Never touch local env files: do not create, modify, or delete `.env` or `.env.local`. Tests must use temporary directories for dotenv scenarios.
