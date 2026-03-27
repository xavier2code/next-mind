---
phase: 11-docker-environment
plan: 01
subsystem: infra
tags: [docker, nextjs, drizzle, standalone, postgresql, migration]

# Dependency graph
requires:
  - phase: 10-chat-integration
    provides: "v1.2 complete schema with 13 tables including file, conversation_file, agent_message"
provides:
  - "next.config.ts with output: 'standalone' for Docker minimal image (~200MB)"
  - "Fresh Drizzle migration SQL with all 13 tables from v1.0-v1.2 schema"
  - "drizzle/ directory tracked in git (removed from .gitignore)"
affects: [11-docker-environment, 12-test-infrastructure]

# Tech tracking
tech-stack:
  added: [pglite-driver for drizzle-kit generate]
  patterns:
    - "Standalone output mode for Docker containerization"
    - "Migration generation via pglite driver (no live DB required)"

key-files:
  created:
    - "drizzle/0000_flaky_arachne.sql"
    - "drizzle/meta/0000_snapshot.json"
    - "drizzle/meta/_journal.json"
  modified:
    - "next.config.ts"
    - ".gitignore"

key-decisions:
  - "Used pglite driver for drizzle-kit generate to avoid requiring a live PostgreSQL during migration generation"
  - "Removed drizzle/ from .gitignore so migration SQL is tracked in git for Docker entrypoint deployment"

patterns-established:
  - "Migration generation uses pglite driver (drizzle-kit generate --driver pglite) when no live DB is available"

requirements-completed: [DOCK-08, TINF-06]

# Metrics
duration: 3min
completed: 2026-03-27
---

# Phase 11 Plan 01: Standalone Output & Migration Regeneration Summary

**Next.js standalone output config and fresh Drizzle migration SQL with all 13 tables for Docker containerization**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-27T07:58:16Z
- **Completed:** 2026-03-27T08:01:28Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Added `output: 'standalone'` to next.config.ts for Docker minimal image support
- Regenerated Drizzle migration with all 13 tables (was stale with only 10, missing agent_message, file, conversation_file)
- Verified workflow.checkpoint jsonb column and all required indexes present in migration
- Confirmed existing unit tests unaffected by config changes (2 pre-existing failures unrelated)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add standalone output to next.config.ts** - `69a05b0` (feat)
2. **Task 2: Regenerate Drizzle migration files with complete schema** - `f4c8e87` (feat)

**Plan metadata:** (docs: complete plan)

## Files Created/Modified
- `next.config.ts` - Added `output: 'standalone'` for Docker minimal image
- `.gitignore` - Removed `drizzle/` entry so migration files are tracked
- `drizzle/0000_flaky_arachne.sql` - Fresh initial migration with all 13 tables, foreign keys, indexes
- `drizzle/meta/0000_snapshot.json` - Drizzle schema snapshot for migration tracking
- `drizzle/meta/_journal.json` - Migration journal

## Decisions Made
- Used `--driver pglite` flag with `drizzle-kit generate` to avoid requiring a live PostgreSQL connection during migration generation. This works because `generate` only reads the TypeScript schema and produces SQL -- it does not need a real database.
- Removed `drizzle/` from `.gitignore` because migration files must be tracked in git for the Docker entrypoint to apply them during container startup.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Removed drizzle/ from .gitignore**
- **Found during:** Task 2 (Regenerate Drizzle migration files)
- **Issue:** The `drizzle/` directory was listed in `.gitignore`, preventing migration SQL files from being committed. Docker containers need these files in the image to run migrations on startup.
- **Fix:** Removed the `drizzle/` line from `.gitignore`, replaced with a comment noting migrations are tracked for Docker deployment.
- **Files modified:** `.gitignore`
- **Verification:** `git add drizzle/` succeeds after the change.
- **Committed in:** `f4c8e87` (part of Task 2 commit)

**2. [Rule 3 - Blocking] Used pglite driver for migration generation**
- **Found during:** Task 2 (Regenerate Drizzle migration files)
- **Issue:** No `DATABASE_URL` environment variable was configured (no `.env` or `.env.local` files), and Docker was not running to spin up a temporary PostgreSQL. The plan expected `npm run db:generate` which requires a live database via `process.env.DATABASE_URL!`.
- **Fix:** Used `drizzle-kit generate --driver pglite` which generates migrations purely from the TypeScript schema without needing a database connection.
- **Files modified:** `drizzle/0000_flaky_arachne.sql`, `drizzle/meta/` (generated output)
- **Verification:** All 13 CREATE TABLE statements, checkpoint column, and required indexes verified via grep.
- **Committed in:** `f4c8e87` (part of Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both auto-fixes necessary for Docker deployment correctness. The pglite driver approach is actually better than the plan's approach since it removes the database dependency for migration generation.

## Issues Encountered
- `drizzle/` was in `.gitignore` (auto-fixed by removing the entry)
- No DATABASE_URL available for `npm run db:generate` (auto-fixed by using `--driver pglite`)

## Pre-existing Test Failures (Out of Scope)
2 tests in `tests/components/skills-panel.test.tsx` fail on the clean main branch (verified before any Phase 11 changes). These are unrelated to our modifications. Logged in `deferred-items.md` for Phase 14 resolution.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Standalone output config ready for Dockerfile (Plan 11-02)
- Fresh migration SQL ready for Docker entrypoint integration (Plan 11-02)
- No blockers for proceeding to Plan 11-02 (Dockerfile + docker-compose)

## Self-Check: PASSED

- FOUND: next.config.ts
- FOUND: drizzle/0000_flaky_arachne.sql
- FOUND: drizzle/meta/0000_snapshot.json
- FOUND: drizzle/meta/_journal.json
- FOUND: 11-01-SUMMARY.md
- FOUND: 69a05b0 (Task 1 commit)
- FOUND: f4c8e87 (Task 2 commit)

---
*Phase: 11-docker-environment*
*Completed: 2026-03-27*
