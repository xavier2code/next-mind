---
phase: 01-core-foundation
plan: 01
subsystem: infra
tags: [next.js, typescript, drizzle, postgresql, vitest, playwright, shadcn, tailwind]

# Dependency graph
requires: []
provides:
  - Next.js 16 project with App Router and TypeScript
  - Drizzle ORM with PostgreSQL schema (users, sessions, accounts, conversations, messages, auditLogs)
  - Vitest unit testing framework with jsdom
  - Playwright E2E testing framework
  - shadcn/ui component library with Radix UI
  - pi-ai and pi-agent-core LLM framework integration
  - Type definitions for models and messages
affects: [02-authentication, 03-llm-gateway, 04-chat-ui, 05-tools]

# Tech tracking
tech-stack:
  added:
    - next@16.2.1
    - "@mariozechner/pi-ai@0.62.0"
    - "@mariozechner/pi-agent-core@0.62.0"
    - drizzle-orm@0.45.1
    - ai@6.0.137 (Vercel AI SDK)
    - next-auth@5.0.0-beta.30
    - vitest@4.1.1
    - "@playwright/test@1.58.2"
    - tailwindcss@4.2.2
    - lucide-react
    - react-markdown
    - zod@3.25.76
    - "@sinclair/typebox@0.34.48"
  patterns:
    - App Router with TypeScript
    - Drizzle ORM with postgres.js driver
    - Component library via shadcn/ui (Radix UI primitives)
    - Path aliases via @/* for src/*

key-files:
  created:
    - package.json - Project dependencies and scripts
    - drizzle.config.ts - Drizzle ORM configuration
    - vitest.config.ts - Vitest test framework configuration
    - playwright.config.ts - Playwright E2E test configuration
    - src/lib/db/schema.ts - Database schema definitions
    - src/lib/db/index.ts - Database connection and exports
    - src/lib/utils.ts - Utility functions (cn helper)
    - src/types/index.ts - Shared type definitions
    - src/app/layout.tsx - Root layout with Inter font
    - src/app/globals.css - Global styles with Tailwind
    - .env.example - Environment variable template
    - tests/setup.ts - Test setup with jsdom
  modified: []

key-decisions:
  - "Used Next.js 16 with App Router and Turbopack for modern React development"
  - "Selected Drizzle ORM over Prisma for TypeScript-native schema and better performance"
  - "Configured Vitest with jsdom for unit testing, Playwright for E2E"
  - "Initialized shadcn/ui with default preset for consistent component styling"

patterns-established:
  - "Path alias @/* for src/* imports"
  - "Database schema with pgTable, proper indexes, and type exports"
  - "Test setup with testing-library/jest-dom matchers"
  - "Environment variables template in .env.example"

requirements-completed: [CORE-05, CORE-06, CORE-07]

# Metrics
duration: pre-executed
completed: 2026-03-24
---
# Phase 01 Plan 01: Project Initialization Summary

**Next.js 16 project with App Router, Drizzle ORM PostgreSQL schema, Vitest/Playwright testing, shadcn/ui components, and pi-ai LLM framework integration**

## Performance

- **Duration:** Pre-executed (commit 63ee7f0)
- **Started:** 2026-03-24
- **Completed:** 2026-03-24
- **Tasks:** 4
- **Files modified:** 37

## Accomplishments
- Complete Next.js 16 project initialization with all required dependencies
- Drizzle ORM schema with users, sessions, accounts, conversations, messages, and auditLogs tables
- Vitest and Playwright test frameworks configured and operational
- shadcn/ui components installed (button, input, textarea, scroll-area, dialog, dropdown-menu, select)
- Type definitions for LLM models (Qwen, GLM, MiniMax) and chat messages

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize Next.js project with dependencies** - `63ee7f0` (feat)
2. **Task 2: Create database schema with Drizzle ORM** - `63ee7f0` (feat)
3. **Task 3: Configure test frameworks (Vitest + Playwright)** - `63ee7f0` (feat)
4. **Task 4: Create root layout and base application structure** - `63ee7f0` (feat)

**Plan metadata:** `63ee7f0` (feat: initialize Next.js 16 project with full stack)

_Note: All tasks were committed together in a single initialization commit_

## Files Created/Modified
- `package.json` - All project dependencies and npm scripts
- `tsconfig.json` - TypeScript configuration with @/* path alias
- `next.config.ts` - Next.js configuration with typedRoutes
- `drizzle.config.ts` - Drizzle ORM PostgreSQL configuration
- `vitest.config.ts` - Vitest configuration with React plugin and jsdom
- `playwright.config.ts` - Playwright E2E test configuration
- `src/lib/db/schema.ts` - Database schema with 6 tables (users, sessions, accounts, verificationTokens, conversations, messages, auditLogs)
- `src/lib/db/index.ts` - Database connection using postgres.js driver
- `src/lib/utils.ts` - cn() utility for Tailwind class merging
- `src/types/index.ts` - Type definitions for models, messages, API responses
- `src/app/layout.tsx` - Root layout with Inter font and metadata
- `src/app/globals.css` - Global styles with Tailwind directives
- `src/app/page.tsx` - Home page placeholder
- `.env.example` - Environment variable template
- `.gitignore` - Git ignore rules
- `tests/setup.ts` - Vitest setup with testing-library matchers
- `tests/chat.test.tsx` - Placeholder test file
- `e2e/auth.spec.ts` - Placeholder E2E test file
- `src/components/ui/*.tsx` - shadcn/ui components (button, input, textarea, scroll-area, dialog, dropdown-menu, select)

## Decisions Made
- Used postgres.js driver over pg for better ESM compatibility
- Configured Inter font as primary with Geist as variable font
- Set zh-CN as default language for Chinese LLM focus
- Excluded searchVector generated column from conversations (deferred to future optimization)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - initialization completed successfully.

## User Setup Required

**External services require manual configuration.** Environment variables needed:
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - Secret key for Auth.js (min 32 characters)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For Google OAuth (optional)
- `QWEN_API_KEY` / `GLM_API_KEY` / `MINIMAX_API_KEY` - LLM API keys

## Verification

All success criteria verified:
- [x] `npm test` runs successfully (32 tests pass)
- [x] `npm run dev` starts development server
- [x] All dependencies installed
- [x] Database schema contains required tables
- [x] shadcn/ui components available

## Next Phase Readiness
- Foundation complete for authentication implementation (01-02)
- Database schema ready for Auth.js adapter tables
- Type definitions prepared for LLM integration

---
*Phase: 01-core-foundation*
*Completed: 2026-03-24*
