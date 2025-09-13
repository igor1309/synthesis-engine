# BuildContext TODOs
- Feature-flag to set default strategy
- Control truncation via env vars LINES_HEAD and LINES_TAIL

- Add size/token cap guard with map-reduce synthesis when exceeded
- Persist artifacts for debugging under `artifacts/<timestamp>/` (inputs, context, logs)
- Add CLI flags to choose builder and truncation; allow env var overrides
- Add ETag-based cache for GitHub file fetches to skip unchanged content
- Add structured logs and an Actions step summary (counts, sizes, timing)
- Add JSDoc types or migrate context modules to TypeScript for safer refactors
