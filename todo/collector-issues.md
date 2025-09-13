# Collector.js Issues

## 1. OpenAI Synthesis Not Implemented
- **Location**: `collector.js`
- **Issue**: AI synthesis remains a placeholder; no API call/logic yet
- **Impact**: End-to-end memo generation is incomplete

## 2. Observability (enhance)
- **Location**: pipeline/logging
- **Issue**: Structured logs and a step summary now exist, but do not yet include per-repo stats and error codes
- **Impact**: Harder to pinpoint slow or failing repos at a glance
