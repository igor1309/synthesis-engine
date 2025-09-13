# Collector.js Issues

## 1. Incomplete Implementation
- **Location**: `collector.js:34, 43`
- **Issue**: Core GitHub API and OpenAI logic are missing
- **Impact**: Script won't function - contains only placeholder code

## 2. Missing Dependencies
- **Location**: `collector.js`
- **Issue**: References `scripts/repo2md.sh` script that may not exist
- **Location**: `collector.js`
- **Issue**: Requires `config/repos.txt` file with no validation
- **Impact**: Runtime failures if files missing

## 3. Error Handling Gaps
- **Location**: `collector.js:11-12`
- **Issue**: No validation of required environment variables
- **Location**: `collector.js:39`
- **Issue**: Shell command execution without error checking
- **Location**: `collector.js:29`
- **Issue**: File read without existence check

## 4. Test Script Side Effects
- **Location**: `package.json:scripts.test`
- **Issue**: `npm test` runs the app (`node collector.js`), causing side effects in CI
- **Action**: Replace with unit tests (e.g., jest/vitest) and/or a no-op placeholder until tests exist
