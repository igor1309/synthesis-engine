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
