# Run Summary Schema (v1.0)

Location: `artifacts/<timestamp>/run-summary.json`

Top-level fields
- `schemaVersion` (string): Semantic schema version, e.g., `"1.0"`.
- `generatedAt` (string): ISO-8601 timestamp when the summary was written.
- `summary` (object): High-level run information.
- `metrics` (object): Aggregated and per-repo metrics.
- `synthesis` (object|null): Synthesis metadata (also present under `summary.synthesis`).

`summary`
- `status` ("success"|"failed")
- `repos` (number): Count of repositories configured.
- `filesDownloaded` (number, optional)
- `contextFiles` (number)
- `contextBytes` (number)
- `contextTokens` (number)
- `memoBytes` (number)
- `durationMs` (number)
- `errorCode` (string, optional): One of `E_CONFIG | E_GITHUB | E_AI | E_CONTEXT | E_UNKNOWN`.
- `synthesis` (object, optional):
  - `model` (string)
  - `temperature` (number)
  - `contextTokens` (number)
  - `maxContextTokens` (number)
  - `chunked` (boolean)
  - `chunks` (number)

`metrics`
- `totals` (object):
  - `mdFiles` (number, optional)
  - `downloadedCount` (number, optional)
  - `downloadedBytes` (number, optional)
  - `cacheHits` (number, optional)
  - `cacheMisses` (number, optional)
  - `warnCount` (number, optional)
  - `errorCount` (number, optional)
  - `durationMs` (number, optional)
- `perRepo[]` (array of objects):
  - `repo` (string): `owner/repo`
  - `ref` (string): git ref, e.g. `HEAD|main|tag`
  - `inboxPath` (string)
  - `mdFiles`, `downloadedCount`, `cacheHits`, `cacheMisses`, `downloadedBytes`, `warnCount`, `errorCount`, `durationMs` (numbers; optional)

Versioning
- Increment `schemaVersion` when field names or semantics change. Additive fields can ship under the same minor version.

