# Master Prompt TODO - Improvement Areas

## Critical Issues

### 1. Context Format Ambiguity
- **Problem**: Line 58 shows `--- CONTEXT ---` but the prompt doesn't specify how notes will be delimited or formatted in practice
- **Question**: Will each note actually have `### path/to/note.md` headers?
- **Action**: Define exact format specification for note delimitation

### 2. Scalability Concerns
- **Problem**: No guidance on handling large document collections
- **Question**: What if there are 100+ notes? Should the AI prioritize or sample?
- **Action**: Add instructions for handling large collections (sampling strategy, prioritization criteria)

### 3. Definition Gaps
- **Problem**: "Emergent themes" and "surprising connections" lack concrete criteria
- **Questions**:
  - What makes a theme "emergent" vs obvious?
  - How "surprising" must connections be?
- **Action**: Provide concrete definitions and examples

## Structural Weaknesses

### 4. Evidence Standards
- **Problem**: Requires quotes but doesn't specify length limits or quality criteria
- **Risk**: Could lead to cherry-picking
- **Action**: Define quote length limits and quality standards

### 5. Conflict Detection Bias
- **Problem**: Assumes conflicts exist without considering cases where ideas might be complementary
- **Action**: Add guidance for handling cases with no genuine conflicts

### 6. Missing Quality Controls
- **Problem**: No guidance on minimum number of themes/connections or what to do if analysis yields thin results
- **Action**: Set minimum thresholds and fallback strategies

## Suggested Enhancements

1. **Add concrete examples** of good vs poor themes/connections
2. **Specify handling for edge cases** (few notes, homogeneous content)
3. **Include confidence indicators** for claims
4. **Define minimum evidence thresholds**
5. **Add quality assessment criteria** for themes and connections
6. **Create fallback instructions** for sparse or low-quality input

## Implementation Priority

1. **High**: Context format specification (#1)
2. **High**: Definition gaps (#3)
3. **Medium**: Evidence standards (#4)
4. **Medium**: Quality controls (#6)
5. **Low**: Scalability concerns (#2)
6. **Low**: Conflict detection bias (#5)