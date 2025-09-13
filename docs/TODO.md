# TODO: Project Issues & Improvements

## Fix duplication issues

- `repo2md.sh` is used in `cortagora`
- `repos.txt` is used in `weekend-issues-digest`

## Collector.js Issues

### 1. Incomplete Implementation
- **Location**: `collector.js:34, 43`
- **Issue**: Core GitHub API and OpenAI logic are missing
- **Impact**: Script won't function - contains only placeholder code

### 2. Missing Dependencies
- **Location**: `collector.js:39`
- **Issue**: References `repo2md.sh` script that may not exist
- **Location**: `collector.js:29`
- **Issue**: Requires `repos.txt` file with no validation
- **Impact**: Runtime failures if files missing

### 3. Error Handling Gaps
- **Location**: `collector.js:11-12`
- **Issue**: No validation of required environment variables
- **Location**: `collector.js:39`
- **Issue**: Shell command execution without error checking
- **Location**: `collector.js:29`
- **Issue**: File read without existence check

## Collector.js Implementation Needed

### GitHub API Integration
- Implement logic to fetch files from repository 'inbox' directories
- Add iteration through repos list
- Download .md files from each repo's inbox folder

### OpenAI Integration
- Complete actual API call to synthesize content
- Send context + master prompt to OpenAI
- Handle API response and error cases

### Validation & Error Handling
- Add environment variable validation at startup
- Add file existence checks for dependencies (`repos.txt`, `repo2md.sh`)
- Improve error messages with specific failure reasons
- Add logging levels for better debugging

## GitHub Workflow Issues

### 1. Missing Error Handling
- **Location**: `.github/workflows/generate-memo.yml:27`
- **Issue**: No error handling in collector.js execution
- **Impact**: Workflow may fail silently or continue with errors

### 2. No Dependency Caching
- **Issue**: Dependencies are reinstalled on every run
- **Impact**: Slower build times and unnecessary resource usage

### 3. Hardcoded Filename
- **Location**: `.github/workflows/generate-memo.yml:36`
- **Issue**: `synthesis_memo.md` is hardcoded
- **Impact**: Less flexible, difficult to change output filename

### 4. No Output Validation
- **Issue**: No verification that collector.js produces expected output
- **Impact**: May commit empty or malformed files

## Suggested Improvements

### Error Handling
- Add `continue-on-error: false` to critical steps
- Add error checking after collector.js execution

### Performance
- Implement node_modules caching between runs
- Use `actions/cache@v3` for npm dependencies

### Flexibility
- Make output filename configurable via environment variable
- Consider parameterizing other hardcoded values

### Validation
- Add step to verify collector.js output exists and is valid
- Add file size/content checks before committing

### Attribution
- Consider using `github.actor` for more specific bot attribution
- Add workflow run URL to commit message for traceability