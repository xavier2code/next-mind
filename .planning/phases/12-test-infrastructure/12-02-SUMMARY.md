---
phase: 12-test-infrastructure
plan: 02
subsystem: testing
tags: [playwright, auth, fixtures, seed, storage-state, e2e]

# Dependency graph
requires:
  - phase: 12-test-infrastructure/12-01
    provides: Docker-aware Playwright config with PLAYWRIGHT_BASE_URL and shared fixtures extension point
provides:
  - Idempotent seed script (db:seed) creating test user test@nextmind.dev
  - Auth setup test that logs in and saves storageState for session reuse
  - Playwright setup project with storageState dependency chain
  - db:seed npm script for test user provisioning
affects: [12-03, 12-04, 13-e2e-regression]

# Tech tracking
tech-stack:
  added: [tsx (via npx)]
  patterns: [playwright-storage-state-reuse, idempotent-seed, setup-project-dependency-chain]

key-files:
  created:
    - scripts/seed.ts
    - e2e/auth.setup.ts
  modified:
    - playwright.config.ts
    - package.json
    - .gitignore

key-decisions:
  - "Seed uses relative imports (not @/ alias) because tsx does not resolve path aliases from scripts/"
  - "Playwright setup project uses testMatch to isolate auth.setup.ts from test projects"
  - "storageState saved to .auth/user.json (gitignored) for authenticated session reuse"

patterns-established:
  - "Idempotent seed pattern: query-first then insert-if-missing, safe to re-run"
  - "Playwright setup project dependency chain: setup -> chromium ensures auth before tests"
  - "Relative imports for standalone scripts outside src/ (tsx constraint)"

requirements-completed: [TINF-02, TINF-04]

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 12 Plan 02: Auth Fixture and Seed Script Summary

**Auth setup test with storageState session reuse, idempotent seed script for test user creation, and Playwright setup project dependency chain**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-27T16:23:10Z
- **Completed:** 2026-03-27T16:25:10Z
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments
- Seed script creates test user (test@nextmind.dev) idempotently via Drizzle ORM with bcrypt password hashing
- Auth setup test logs in via credentials provider and saves storageState for session reuse across all E2E tests
- Playwright config updated with setup project and storageState dependency chain (setup -> chromium)
- db:seed npm script registered consistent with existing db:* naming convention
- .auth/ directory gitignored to prevent storage state from being tracked

## Task Commits

Each task was committed atomically:

1. **Task 1: Create seed script and auth setup test with custom fixtures** - `5d7f19b` (feat)

## Files Created/Modified
- `scripts/seed.ts` - Idempotent test user seed script using Drizzle ORM and bcrypt
- `e2e/auth.setup.ts` - Playwright setup test that authenticates and saves storageState
- `playwright.config.ts` - Added setup project and storageState dependency chain
- `package.json` - Added db:seed npm script
- `.gitignore` - Added .auth/ directory

## Decisions Made
- **Relative imports in seed script** -- tsx does not resolve path aliases (@/), so scripts/seed.ts uses relative imports to ../src/lib/db, ../src/lib/password
- **testMatch pattern for setup project** -- Uses `/auth\.setup\.ts/` regex to isolate the setup file from the main test projects
- **.auth/ gitignored** -- Storage state files contain session cookies and should not be committed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Seed script ready for `npm run db:seed` execution once database is available
- Auth setup test ready for Playwright E2E test runs (requires running app + seeded user)
- Fixtures file (e2e/fixtures.ts) ready for LLM mock extension in plan 12-03
- Playwright setup project dependency chain verified (10 tests listed correctly)

## Self-Check: PASSED

All files and commits verified:
- scripts/seed.ts: FOUND
- e2e/auth.setup.ts: FOUND
- e2e/fixtures.ts: FOUND
- package.json (db:seed): FOUND
- playwright.config.ts (setup project): FOUND
- .gitignore (.auth/): FOUND
- Commit 5d7f19b (Task 1): FOUND

---
*Phase: 12-test-infrastructure*
*Completed: 2026-03-28*
