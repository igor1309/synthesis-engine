# Troubleshooting

- No context files built
  - Symptom: summary shows `contextFiles: 0`.
  - Fix: Ensure your repo specs point to existing inbox folders with markdown. Example: `owner/repo@main:inbox`.

- Inbox not found
  - Symptom: Warnings mention `INBOX_NOT_FOUND`.
  - Fix: Verify the `:path` segment in `config/repos.txt`. Use the default `inbox` or correct subfolder.

- Rate limited (GitHub 403/429)
  - Symptom: Slow runs; logs show retries. Step summary may show high cache hits and low downloads.
  - Fix: Reduce concurrency via env/CLI, or let the collector adapt. Consider running at off-peak times.

- Invalid or missing tokens
  - Symptom: GitHub or OpenAI calls fail or are skipped (dry-run).
  - Fix: Set `GH_PAT` and `OPENAI_API_KEY` in `.env` (never commit). Use `GITHUB_BASE_URL` for Enterprise, `OPENAI_BASE_URL` for compatible endpoints.

- Proxy / Enterprise network
  - Symptom: Network calls fail behind corporate proxy.
  - Fix: Set `HTTP_PROXY/HTTPS_PROXY`. For GitHub Enterprise, set `GITHUB_BASE_URL`.

- Empty or malformed memo
  - Symptom: Memo validator fails in CI.
  - Fix: Check context size and prompt. Ensure `prompts/master.md` is valid; adjust `CONTEXT_MAX_TOKENS` or use chunking.

- CI validation fails
  - Symptom: `generate-memo` workflow fails at memo validation.
  - Fix: Check step summary, `artifacts/<timestamp>/run-summary.json`, and `context.md` for details.

