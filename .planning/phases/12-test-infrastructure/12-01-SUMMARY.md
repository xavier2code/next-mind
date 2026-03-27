---
phase: 12-test-infrastructure
plan: 01
subsystem: testing
tags: [playwright, e2e, docker, fixtures]

# Dependency graph
requires:
  - phase: 11-docker-environment
    provides: Docker container environment for E2E test targets
provides:
  - Docker-aware Playwright config with PLAYWRIGHT_BASE_URL env var
  - Shared E2E fixtures file (extension point for auth and LLM mocks)
affects: [12-02, 12-03, 12-04, 13-e2e-regression]

# Tech tracking
tech-stack:
  added: []
  patterns: [env-var-driven-test-target, playwright-fixture-extend]

key-files:
  created:
    - e2e/fixtures.ts
  modified:
    - playwright.config.ts

key-decisions:
  - "PLAYWRIGHT_BASE_URL env var controls both baseURL and webServer launch decision"
  - "webServer undefined when env var set (Docker mode) rather than empty object"

patterns-established:
  - "Env-var-driven test target: PLAYWRIGHT_BASE_URL switches between local dev and Docker"
  - "Shared fixtures via base.extend({}) pattern in e2e/fixtures.ts"

requirements-completed: [TINF-01]

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 12 Plan 01: Playwright Config and Docker-Aware E2E Summary

**Docker-aware Playwright config using PLAYWRIGHT_BASE_URL env var with conditional webServer and shared fixtures extension point**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-27T16:00:53Z
- **Completed:** 2026-03-27T16:04:50Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Playwright config reads PLAYWRIGHT_BASE_URL env var for baseURL, falling back to http://localhost:3000
- webServer conditionally skipped when PLAYWRIGHT_BASE_URL is set (Docker test target)
- Shared e2e/fixtures.ts created with base.extend({}) pattern for future auth and LLM mock fixtures
- All 9 existing E2E tests verified compatible in both local and Docker modes

## Task Commits

Each task was committed atomically:

1. **Task 1: Update Playwright config with Docker-aware baseURL and webServer** - `0a5f3a0` (feat)
2. **Task 2: Create shared E2E fixtures file** - `a804ca9` (feat)
3. **Task 3: Verify existing E2E tests work with updated config** - verified (no files changed)

**Plan metadata:** `609584c` (docs: create plan)

## Files Created/Modified
- `playwright.config.ts` - Docker-aware config with PLAYWRIGHT_BASE_URL env var
- `e2e/fixtures.ts` - Shared test fixtures with extend pattern

## Decisions Made
- **PLAYWRIGHT_BASE_URL controls both baseURL and webServer** -- A single env var drives both the target URL and whether to launch a dev server, keeping the config simple and Docker-friendly
- **webServer set to undefined (not empty object) when Docker mode active** -- Playwright treats undefined webServer as "no server to manage", which is the correct semantic

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Playwright config ready for Docker-based E2E execution
- e2e/fixtures.ts ready for auth fixture extension in plan 12-02
- e2e/fixtures.ts ready for LLM mock extension in plan 12-03
- All existing E2E tests confirmed compatible

## Self-Check: PASSED

All files and commits verified:
- playwright.config.ts: FOUND
- e2e/fixtures.ts: FOUND
- 12-01-SUMMARY.md: FOUND
- Commit 0a5f3a0 (Task 1): FOUND
- Commit a804ca9 (Task 2): FOUND
- Commit 609584c (Plan docs): FOUND

---
*Phase: 12-test-infrastructure*
*Completed: 2026-03-28*
