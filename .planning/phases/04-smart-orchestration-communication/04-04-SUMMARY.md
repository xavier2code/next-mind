---
phase: 04-smart-orchestration-communication
plan: 04: Task Decomposition Dependencies
---

## Summary

Extended task decomposition to generate dependency information. LLM outputs task IDs and dependency mappings during decomposition, enabling WaveScheduler to determine parallel vs sequential execution.

- **Completed:** 2026-03-26T03:15:00Z
- **Tasks:** 2
- **Tests:** 19 passed

## Files Modified
- `src/lib/agents/types.ts` - Added SubtaskWithDeps, DecompositionResultWithDeps
- `src/lib/agents/decomposition.ts` - Added decomposeTaskWithDeps, validateDependencies
- `tests/lib/agents/decomposition-deps.test.ts` - Dependency tests

## Key Features
- SubtaskWithDeps: id, dependencies fields
- DecompositionResultWithDeps: dependencies map
- DECOMPOSITION_SYSTEM_PROMPT_WITH_DEPS: LLM prompt for dependency generation
- validateDependencies: Missing ref detection, circular dependency detection
