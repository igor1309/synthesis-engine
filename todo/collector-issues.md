# Collector.js Issues

## 1. OpenAI Synthesis Not Implemented
- **Location**: `collector.js`
- **Issue**: AI synthesis remains a placeholder; no API call/logic yet
- **Impact**: End-to-end memo generation is incomplete

## 2. Output Validation Missing
- **Location**: `.github/workflows/generate-memo.yml`
- **Issue**: No verification of non-empty `synthesis_memo.md` prior to commit
- **Impact**: CI could commit empty/placeholder output if synthesis fails

## 3. Observability
- **Location**: pipeline/logging
- **Issue**: No structured logs or step summary (counts, sizes, timings)
- **Impact**: Harder to debug and track performance in CI
