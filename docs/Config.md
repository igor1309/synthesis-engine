# Configuration

Precedence
- CLI flags > environment variables > defaults.

Secrets
- Never commit `.env` files. The agent must never modify `.env` or `.env.local`.

Environment variables
- GitHub
  - `GH_PAT` — Personal Access Token (required for collection)
  - `GITHUB_BASE_URL` — Enterprise base URL (optional)
  - `GITHUB_TIMEOUT` — ms (default 10000)
  - `GITHUB_RETRIES` — attempts for transient errors (default 4)
  - `GITHUB_CONCURRENCY` — max concurrent fetches (default 6)
- OpenAI
  - `OPENAI_API_KEY` — API key (optional for dry-run)
  - `OPENAI_MODEL` — default `gpt-4o-mini`
  - `OPENAI_TEMPERATURE` — default `0.2`
  - `OPENAI_RETRIES` — default `4`
  - `OPENAI_BASE_DELAY_MS` — base backoff delay (ms), default `400`
  - `OPENAI_BASE_URL` — compatible base URL (optional)
- Logging/behavior
  - `LOG_LEVEL` — `info|debug|warn|error`
  - `DRY_RUN` — `1|true` to skip network calls

CLI flags
- `--log-level info|debug|warn|error`
- `--dry-run`
- `--openai-model <name>`
- `--openai-temperature <num>`
- `--context-max-tokens <num>`
- `--lines-head <num>` `--lines-tail <num>`
- `--github-base-url <url>`
- `--openai-base-url <url>`
- `--github-concurrency <num>`

Troubleshooting
- See `docs/Troubleshooting.md` for common issues.

