# Collector.js Implementation Needed

## OpenAI Integration
- Complete actual API call to synthesize content
- Send context + master prompt to OpenAI
- Handle API response and error cases
 - Add token accounting; chunk/map-reduce synthesis when context exceeds cap
 - Support streaming and non-streaming modes; configurable model via env/CLI
 - Read master prompt from `prompts/master.md` with validation and fallbacks

## Validation & Error Handling
- Add environment variable validation for OpenAI settings
- Improve error messages with specific failure reasons
- Add logging levels for better debugging

## Architecture & Modules
- Add `src/ai/synthesize` — OpenAI call, retries, chunking
- Add `src/logger` — structured logs and step summaries (GH Actions)
- Add `src/pipeline/run` — glue/orchestration with clear steps

## Observability & Artifacts
- Emit summary: repos processed, files, sizes, token estimates, output path
- Persist artifacts under `artifacts/<timestamp>/` for debugging (context, logs)

## Phased Migration Plan
1) Implement OpenAI synthesis with chunking + model config
2) Add artifacts + summary and structured logs
3) Finalize CLI and docs
