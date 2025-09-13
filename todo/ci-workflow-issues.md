# GitHub Workflow Issues

## 1. Hardcoded Filename
- **Location**: `.github/workflows/generate-memo.yml:36`
- **Issue**: `synthesis_memo.md` is hardcoded
- **Impact**: Less flexible, difficult to change output filename

## 2. No Output Validation
- **Issue**: No verification that collector.js produces expected output
- **Impact**: May commit empty or malformed files
