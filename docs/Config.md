# Configuration

Precedence
- CLI flags > environment variables > defaults.

Matrix (examples)
- log level: `--log-level debug` > `LOG_LEVEL=info` > default `info`
- dry-run: `--dry-run` > `DRY_RUN=0` > default off
- model: `--openai-model gpt-4o-mini` > `OPENAI_MODEL` > default `gpt-4o-mini`
- GitHub base URL: `--github-base-url https://ghe.example` > `GITHUB_BASE_URL` > undefined
- OpenAI base URL: `--openai-base-url https://oai.example` > `OPENAI_BASE_URL` > undefined
- concurrency: `--github-concurrency 4` > `GITHUB_CONCURRENCY` > `6`

Examples
- Prefer CLI for ad-hoc runs:
  - `node collector.js --dry-run --log-level debug --github-concurrency 4`
- Prefer `.env`/secrets in CI:
  - `LOG_LEVEL=info`, `OPENAI_MODEL=gpt-4o-mini`, `GITHUB_CONCURRENCY=6`
  - Override with workflow inputs if needed.

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
  - `MEMO_MIN_CITATIONS` — minimum required `Source:` citations when context is non-empty (default `1`)
  - `SYNTH_CACHE_TTL_MS` — synthesis cache TTL in milliseconds (default 7 days; `0` disables cache reads)
- Logging/behavior
  - `LOG_LEVEL` — `info|debug|warn|error`
  - `DRY_RUN` — `1|true` to skip network calls
  - `FAIL_ON_ERROR` — `1|true` to exit non-zero if any per-repo errors occurred

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
 - `--min-citations <num>`
 - `--fail-on-error`

Troubleshooting
- See `docs/Troubleshooting.md` for common issues.
