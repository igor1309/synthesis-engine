# Synthesis Engine

**Synthesis Engine** collects markdown from each repo’s inbox, compiles a single context.md, and uses the OpenAI API to produce a verifiable synthesis_memo.md. The memo contains **Part 1: Objective Synthesis** (sourced themes & links) and **Part 2: Critical Analysis** (conflicts, counter-arguments and weaknesses) for easy review and follow-up.

synthesis-engine/
├── .github/
│   └── workflows/
│       └── generate-memo.yml   # The GitHub Action workflow
├── .gitignore
├── collector.js                # The core Node.js script
├── package.json                # Project dependencies and scripts
├── scripts/
│   └── repo2md.sh              # Repo → Markdown bundler (shell)
├── config/
│   └── repos.txt               # List of repositories to analyze
└── prompts/
    └── master.md               # Master prompt used for synthesis

**Local Run**
- Requirements: Node.js 20+, bash. For full runs, install deps with `npm install`.
- Dotenv: Supports `.env` and `.env.local` in repo root (never committed).
- Outputs: writes `synthesis_memo.md` and `artifacts/<timestamp>/{context.md,run-summary.json}`.

**Quick Dry‑Run (no GitHub, no OpenAI)**
- `DRY_RUN=1 node collector.js`
- Produces a valid memo skeleton and placeholder context.

**Collector Only (skip OpenAI)**
- Set `GH_PAT` (or add to `.env`). Leave `OPENAI_API_KEY` unset. Then run:
- `node collector.js`
- Collects inbox markdown, builds context, and writes a placeholder memo.

**Full Run (GitHub + OpenAI)**
- `.env` example:
  - `GH_PAT=ghp_your_token`
  - `OPENAI_API_KEY=sk_your_key`
  - `OPENAI_MODEL=gpt-4o-mini` (optional)
  - `OPENAI_TEMPERATURE=0.2` (optional)
  - `CONTEXT_MAX_TOKENS=120000` (optional)
- Install deps and run:
- `npm install && node collector.js`

**Notes**
- Optional context tuning: `LINES_HEAD`, `LINES_TAIL` to truncate large files.
- Set `DRY_RUN=1` to bypass both GitHub and OpenAI regardless of secrets.
