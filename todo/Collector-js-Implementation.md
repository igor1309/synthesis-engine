# Collector.js Implementation Needed

## GitHub API Integration
- Implement logic to fetch files from repository 'inbox' directories
- Add iteration through repos list
- Download .md files from each repo's inbox folder

## OpenAI Integration
- Complete actual API call to synthesize content
- Send context + master prompt to OpenAI
- Handle API response and error cases

## Validation & Error Handling
- Add environment variable validation at startup
- Add file existence checks for dependencies (`repos.txt`, `repo2md.sh`)
- Improve error messages with specific failure reasons
- Add logging levels for better debugging

