# GitHub Workflow Issues

## 1. Hardcoded Filename
- **Location**: `.github/workflows/generate-memo.yml:36`
- **Issue**: `synthesis_memo.md` is hardcoded
- **Impact**: Less flexible, difficult to change output filename

## 2. Output Validation — addressed
- Validation step added to ensure `synthesis_memo.md` exists and is non-empty; memo validator runs in both workflows.
