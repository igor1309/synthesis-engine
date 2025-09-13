# Security and Configuration

- Validate required env vars at startup (e.g., `GH_PAT`, `OPENAI_API_KEY`); clear error messaging
- Avoid logging secrets; redact sensitive env/headers from logs
- Provide configuration precedence: CLI > env > package.json `config` > defaults
- Add `.env.example` for local dev with documented vars
- Support read-only mode (no git push) via flag/env for safe dry-runs
- Timeouts for network calls (GitHub/OpenAI) with retry/backoff strategy
- Optional proxy settings and enterprise GitHub base URL

