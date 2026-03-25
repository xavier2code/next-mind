---
phase: 03-foundation-task-decomposition
plan: 01
subsystem: agents
tags: [agent-types, registry, agent-cards, tdd, zod]

# Dependency graph
requires:
  - phase: 02-tool-integration
    provides: SkillRegistry with file-read, file-list, web-search skills
provides:
  - AgentType type definition with four types (file, search, code, custom)
  - AgentCard interface with reference-based skillIds design
  - AgentRegistry class for registration and lookup
  - Four predefined Agent Cards (file, search, code, custom)
affects: [task-decomposition, agent-orchestration, workflow-engine]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Reference-based Agent Cards (skillIds resolve at runtime)
    - Registry pattern matching SkillRegistry design
    - TDD with Zod schema validation

key-files:
  created:
    - src/lib/agents/types.ts
    - src/lib/agents/registry.ts
    - src/agents/file-agent.ts
    - src/agents/search-agent.ts
    - src/agents/code-agent.ts
    - src/agents/custom-agent.ts
    - src/agents/index.ts
    - tests/lib/agents/types.test.ts
    - tests/lib/agents/registry.test.ts
    - tests/lib/agents/predefined.test.ts
  modified: []

key-decisions:
  - "AgentType as string union for flexibility (file, search, code, custom)"
  - "AgentCard uses reference-based skillIds array instead of embedding skill definitions"
  - "AgentRegistry validates skillIds at registration time against SkillRegistry"
  - "RegisteredAgent stores resolved skills to avoid repeated lookups"

patterns-established:
  - "Reference-based design: Agent Cards reference existing skills by ID, resolved at registration"
  - "Registry pattern: AgentRegistry mirrors SkillRegistry with register, get, getByType, getAll methods"
  - "TDD with Zod: All schemas use Zod for type-safe validation"

requirements-completed: [ATYPE-01, ATYPE-02, ATYPE-03, ATYPE-04, ATYPE-05, ATYPE-06, ATYPE-07, DELEG-03]

# Metrics
duration: 13 min
completed: 2026-03-25
---

# Phase 3 Plan 1: Agent Type System Summary

**Agent type definitions, Agent Registry with skill validation, and four predefined Agent Cards using reference-based design**

## Performance

- **Duration:** 13 min
- **Started:** 2026-03-25T09:25:49Z
- **Completed:** 2026-03-25T09:39:31Z
- **Tasks:** 3
- **Files modified:** 10 (7 source, 3 test)

## Accomplishments
- Defined AgentType as union of 'file', 'search', 'code', 'custom' with full type safety
- Created AgentCard interface with reference-based skillIds that resolve at registration time
- Implemented AgentRegistry with validation against SkillRegistry, throwing descriptive errors for unknown skills
- Built four predefined Agent Cards (file, search, code, custom) each with inputSchema, outputSchema, and systemPrompt
- All 33 tests passing across types, registry, and predefined cards

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Agent type definitions** - `b8f01dd` (test)
2. **Task 2: Create Agent Registry** - `90c3184` (feat)
3. **Task 3: Create predefined Agent Cards** - `84a57d2` (feat)

**Plan metadata:** (pending final commit)

_Note: TDD tasks may have multiple commits (test, feat, refactor)_

## Files Created/Modified
- `src/lib/agents/types.ts` - Core type definitions (AgentType, AgentCard, RegisteredAgent, Subtask, DecompositionResult)
- `src/lib/agents/registry.ts` - AgentRegistry class with validation and lookup methods
- `src/agents/file-agent.ts` - File Processing Agent Card with file-read, file-list skills
- `src/agents/search-agent.ts` - Search Agent Card with web-search skill
- `src/agents/code-agent.ts` - Code Agent Card (empty skillIds for future expansion)
- `src/agents/custom-agent.ts` - Custom Agent Card (empty skillIds for user configuration)
- `src/agents/index.ts` - Export all predefined agent cards
- `tests/lib/agents/types.test.ts` - 8 tests for type definitions
- `tests/lib/agents/registry.test.ts` - 11 tests for registry functionality
- `tests/lib/agents/predefined.test.ts` - 14 tests for predefined agent cards

## Decisions Made
- AgentType uses string union instead of enum for simpler serialization and extension
- AgentCard.skillIds references existing skills by ID to avoid duplication
- AgentRegistry.register() validates skills immediately to catch configuration errors early
- code-agent and custom-agent have empty skillIds arrays for future expansion

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Agent type system complete, ready for task decomposition engine
- Registry pattern established for agent lookup
- Predefined agents can be registered with AgentRegistry when skills are initialized

---
*Phase: 03-foundation-task-decomposition*
*Completed: 2026-03-25*

## Self-Check: PASSED

All files verified:
- src/lib/agents/types.ts - FOUND
- src/lib/agents/registry.ts - FOUND
- src/agents/file-agent.ts - FOUND
- src/agents/search-agent.ts - FOUND
- src/agents/code-agent.ts - FOUND
- src/agents/custom-agent.ts - FOUND
- src/agents/index.ts - FOUND

Commits verified:
- b8f01dd: test(03-01): add Agent type definitions with tests
- 90c3184: feat(03-01): implement AgentRegistry with skill validation
- 84a57d2: feat(03-01): create predefined Agent Cards
