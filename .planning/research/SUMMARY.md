# Project Research Summary

**Project:** Next-Mind AI Agent Framework
**Domain:** Docker Containerization + Regression Testing for Next.js 16 AI Agent Platform
**Researched:** 2026-03-27
**Confidence:** HIGH

## Executive Summary

Next-Mind is a ~15,400 LOC AI Agent collaboration platform built on Next.js 16 App Router, already shipping v1.0-v1.2 features (chat, MCP protocol, skills system, multi-agent workflows, file processing). The v1.3 milestone adds Docker containerization and comprehensive regression testing. Research indicates this is a well-understood problem domain with established patterns from official Next.js Docker examples, Playwright best practices, and Drizzle ORM migration workflows.

The recommended approach is a multi-stage Dockerfile using `output: 'standalone'` (reducing image from 2GB+ to ~200MB), a docker-compose.yml orchestrating the Next.js app and PostgreSQL 17 with healthcheck-dependent startup, and an expansion of the existing test suite (79 unit test files, 2 E2E spec files) to cover all shipped features via Playwright E2E tests with mocked LLM responses. No new npm packages are needed -- Docker and Docker Compose are external tools, and the existing Vitest 4.1.x + Playwright 1.58.x stack is sufficient.

The key risk is a confirmed Next.js 16 bug where Turbopack's standalone output produces incorrect Docker images (GitHub issues #88844, #91654). The fix is simple: use `npx next build --webpack` in the Dockerfile. A secondary risk is that the existing Drizzle migration SQL is out of date -- it is missing v1.1 and v1.2 schema changes (file, conversation_file, agent_message tables and workflow.checkpoint column). A new migration must be generated before Docker setup. Additionally, three integration pitfalls require attention: database migration race conditions (solved via healthcheck), unstorage file persistence (solved via Docker volume mount), and Auth.js OAuth redirect URL in containers (solved via `AUTH_URL` env var).

## Key Findings

### Recommended Stack

All existing stack decisions (Next.js 16.2.1, TypeScript 5.8, PostgreSQL + Drizzle ORM 0.45.x, Vitest 4.1.x, Playwright 1.58.x) remain unchanged. The v1.3 milestone adds only external tools and configuration, no new npm dependencies.

**Core additions:**
- **Docker Engine 27+ / Docker Compose v2.27+:** Container runtime and multi-service orchestration -- industry standard for reproducible environments
- **Node.js 22-alpine (Docker base):** Runtime inside container -- maximum stability, Alpine reduces image ~40MB vs slim, Node 22 battle-tested longer than Node 24
- **PostgreSQL 17-alpine (Docker image):** Database service -- latest major version, Alpine variant for minimal footprint, `pg_isready` for healthchecks
- **`output: 'standalone'` (next.config.ts flag):** Optimized self-contained build -- reduces Docker image from 2GB+ to ~200MB by tracing and copying only runtime dependencies
- **Multi-stage Dockerfile (deps/builder/runner):** Standard Next.js Docker pattern from official Vercel example -- non-root user, minimal attack surface

### Expected Features

**Must have (table stakes for v1.3):**
- Dockerfile with standalone output -- any Dockerized Next.js app must use this
- docker-compose.yml (app + PostgreSQL) -- two-service orchestration with healthchecks
- .dockerignore -- prevents bloated build context
- Health check endpoint (`/api/health`) -- required for `depends_on: condition: service_healthy`
- Database auto-migration on container startup -- fresh containers start with empty DB
- Seed data script -- test user and sample data for E2E testing
- Extended auth E2E tests -- successful login, register, session persistence
- Chat E2E tests -- conversation creation, message send (mocked LLM), streaming response
- File processing E2E tests -- upload, extraction, preview, chat integration
- Regression verification report -- PASS/FAIL for every v1.0-v1.2 feature
- All 79 existing unit tests passing in Docker

**Should have (competitive, defer to v1.3.x):**
- Agent workflow E2E tests -- multi-agent task decomposition end-to-end
- Conversation CRUD E2E tests -- create, list, rename, delete
- Skills panel E2E tests -- browse, invoke, verify results
- Workflow controls E2E tests -- pause, resume, cancel
- CI pipeline integration -- GitHub Actions for automated Docker build + test
- Test coverage thresholds (60%) -- enforce minimum coverage in CI
- Docker Compose watch mode -- development hot-reload inside Docker

**Defer (v2+):**
- Kubernetes manifests / Helm charts -- massive scope increase beyond verification milestone
- Multi-architecture Docker builds -- not needed for host-architecture testing
- Visual regression testing -- too fragile for actively developed UI
- Mutation testing -- overkill for verification milestone
- Performance testing in Docker -- load testing is a separate concern

### Architecture Approach

Docker containerization integrates as a thin infrastructure layer on top of the existing architecture. The application code requires zero structural changes -- only `next.config.ts` gets one line added (`output: 'standalone'`). The Docker topology is two services (Next.js app + PostgreSQL) connected via Docker Compose networking, with the app exposed on port 3000 to the host.

The critical architectural finding is that Docker exposes three latent issues: (1) the Drizzle migration SQL is out of date and must be regenerated, (2) `next.config.ts` lacks `output: 'standalone'`, and (3) Auth.js v5 requires an explicit `AUTH_URL` environment variable in container environments. Beyond these prerequisites, the Docker integration is straightforward. The testing architecture has two tiers: Vitest unit tests run inside the app container (mocking DB), while Playwright E2E tests run on the host targeting the Docker-exposed app at localhost:3000.

**Major components (new/modified):**
1. **Dockerfile (NEW):** Multi-stage build producing ~200MB image with non-root user
2. **docker-compose.yml (NEW):** App + PostgreSQL orchestration with healthchecks, named volumes, env var passthrough
3. **docker-entrypoint.sh (NEW):** Database wait loop + Drizzle migration + server start
4. **next.config.ts (MODIFIED):** Add `output: 'standalone'` (1 line change)
5. **drizzle/0001_*.sql (NEW, generated):** Migration for missing v1.1/v1.2 schema changes
6. **playwright.config.ts (MODIFIED):** CI-aware `webServer` configuration for Docker vs local dev
7. **E2E test suite (EXPANDED):** From 2 spec files to 8+ covering all v1.0-v1.2 features

### Critical Pitfalls

1. **Turbopack standalone output broken in Docker** -- Next.js 16 defaults to Turbopack which produces incorrect standalone output. Fix: use `npx next build --webpack` in the Dockerfile. Verified via GitHub issues #88844 and #91654.
2. **Database migration race condition on startup** -- App starts before PostgreSQL is ready. Fix: `pg_isready` healthcheck + `depends_on: condition: service_healthy` + entrypoint wait loop.
3. **Missing Drizzle migration SQL** -- Only migration file covers v1.0 schema; v1.1 and v1.2 tables are missing. Fix: run `npm run db:generate` before Docker setup to create `0001_*.sql`.
4. **unstorage file uploads lost on container restart** -- Container filesystem is ephemeral. Fix: Docker named volume or bind mount at `/app/data/uploads`.
5. **Auth.js OAuth redirect fails in Docker** -- Without `AUTH_URL`, redirects go to container internal IP. Fix: set `AUTH_URL=http://localhost:3000` in docker-compose environment.
6. **Playwright cannot reach app inside Docker network** -- Hardcoded `localhost:3000` baseURL fails when tests run in-container. Fix: env var `PLAYWRIGHT_BASE_URL` + disable `webServer` in CI mode.

## Implications for Roadmap

Based on research, suggested phase structure for v1.3:

### Phase 1: Docker Environment Prerequisites
**Rationale:** Two independent prerequisite tasks that must complete before Docker work can begin: (a) generating the missing Drizzle migration SQL, and (b) adding `output: 'standalone'` to next.config.ts and verifying it works. These have zero dependencies on each other and can be done in parallel.
**Delivers:** Updated `next.config.ts` with standalone output; new `drizzle/0001_*.sql` migration file
**Addresses:** Prerequisite fixes from ARCHITECTURE.md (missing migration, missing standalone config)
**Avoids:** Pitfall 2 (missing standalone output), migration schema mismatch

### Phase 2: Docker Build + Compose Setup
**Rationale:** Once standalone output works and migrations are current, create the Dockerfile, .dockerignore, docker-compose.yml, entrypoint script, and .env.docker. This phase produces a working `docker compose up` experience. The Turbopack bug (Pitfall 1) must be explicitly addressed here by using `--webpack` in the build command.
**Delivers:** Multi-stage Dockerfile (~200MB image), docker-compose.yml (app + PostgreSQL), entrypoint script with auto-migration, .dockerignore, .env.docker
**Uses:** Stack elements: Node 22-alpine, PostgreSQL 17-alpine, Docker Compose v2.27+
**Implements:** Architecture patterns 1-4 (multi-stage build, healthcheck startup, volume persistence)
**Avoids:** Pitfall 1 (Turbopack standalone), Pitfall 3 (migration race condition), Pitfall 4 (unstorage persistence), Pitfall 5 (AUTH_SECRET regeneration)

### Phase 3: Test Infrastructure + Existing Tests Verification
**Rationale:** With Docker running, verify the existing 79 unit tests pass in the container and set up Playwright to target the Docker-deployed app. This includes creating the seed data script, updating playwright.config.ts for CI/Docker mode, and creating auth.setup.ts for session reuse. The health check endpoint `/api/health` must be created here to support docker-compose healthchecks.
**Delivers:** Seed data script, CI-aware playwright.config.ts, auth.setup.ts, /api/health endpoint, verified passing unit + existing E2E tests in Docker
**Uses:** Stack elements: Vitest 4.1.x (existing), Playwright 1.58.x (existing)
**Implements:** Architecture pattern 5 (Playwright against containerized app)
**Avoids:** Pitfall 6 (MCP DNS rebinding), Pitfall 7 (Playwright cannot reach app)

### Phase 4: E2E Regression Tests -- v1.0 Features
**Rationale:** Write E2E tests for the foundational v1.0 features (auth, chat, MCP tools, skills, approval flow). These are the highest-value tests because they cover the core user interaction path. LLM responses must be mocked using Playwright route interception.
**Delivers:** e2e/auth.spec.ts (expanded), e2e/chat.spec.ts (new), e2e/mcp.spec.ts (new), e2e/skills.spec.ts (new), e2e/approval.spec.ts (new)
**Addresses:** Features from FEATURES.md: auth E2E tests, chat E2E tests

### Phase 5: E2E Regression Tests -- v1.1 + v1.2 Features
**Rationale:** Extend E2E coverage to the agent workflow system (v1.1) and file processing pipeline (v1.2). Agent workflow tests are the most complex but highest-value; file processing tests verify the full upload-extract-preview-chat chain.
**Delivers:** e2e/workflow.spec.ts (new), e2e/file-upload.spec.ts (new), e2e/file-management.spec.ts (new), e2e/file-chat.spec.ts (new)
**Addresses:** Features from FEATURES.md: agent workflow E2E tests, file processing E2E tests

### Phase 6: Regression Verification Report + Polish
**Rationale:** The milestone deliverable is a structured PASS/FAIL report for every feature across v1.0-v1.2. This phase also covers coverage thresholds, any discovered bug fixes, and Docker Compose watch mode as a differentiator.
**Delivers:** Regression verification report (markdown), coverage thresholds in vitest.config.ts, `test:regression` npm script, bug fixes from regression findings
**Addresses:** Features from FEATURES.md: regression verification report, test coverage reporting

### Phase Ordering Rationale

- **Phases 1 and 2 are sequential prerequisites** -- Docker cannot work without standalone output and current migrations
- **Phase 3 bridges Docker and testing** -- existing tests must pass in Docker before writing new ones
- **Phases 4 and 5 are parallel-eligible** -- v1.0 and v1.1/v1.2 E2E tests are independent feature domains
- **Phase 6 is the convergence point** -- all tests feed into the regression report
- **This ordering follows the ARCHITECTURE.md build dependency graph** exactly (Steps 1-2 in parallel, then 3-4-5-6-7 sequential)

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Turbopack standalone bug status may have changed -- verify with exact Next.js 16.2.1 build before committing to `--webpack`. Also, `drizzle-kit migrate` availability in standalone output needs validation (it is a devDependency).
- **Phase 4:** LLM mocking strategy for chat E2E tests needs design decisions -- Playwright route interception vs mock server, and how to handle streaming response assertions.
- **Phase 5:** Agent workflow E2E tests are the highest-complexity item -- may need decomposition into sub-tasks depending on LLM mocking complexity.

Phases with standard patterns (skip research-phase):
- **Phase 1:** `db:generate` and `output: 'standalone'` are well-documented, low-risk changes
- **Phase 3:** Seed scripts, playwright.config.ts adjustments, and health check endpoints are boilerplate
- **Phase 6:** Coverage thresholds and verification reports require no research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Docker + Compose patterns from official Next.js docs; no new npm packages needed; all versions verified against existing codebase |
| Features | HIGH | Docker features are table-stakes with established patterns; testing features informed by 79 existing test files analysis; LLM mocking has community consensus |
| Architecture | HIGH | All patterns from official Vercel Docker example; integration points verified by reading source code; build order validated against dependency graph |
| Pitfalls | HIGH | Turbopack bug confirmed via GitHub issues; migration staleness confirmed by reading drizzle/0000 SQL vs schema.ts; all other pitfalls from official docs or code inspection |

**Overall confidence:** HIGH

### Gaps to Address

- **Turbopack standalone fix status in 16.2.1:** GitHub issues #88844 and #91654 are confirmed for 16.1.x-16.2.0. The 16.2.1 patch may have partially fixed this. Validate by testing `npx next build` (without `--webpack`) and inspecting `.next/standalone/` before committing to the `--webpack` workaround.
- **`drizzle-kit` in standalone output:** `drizzle-kit` is a devDependency and will NOT be included in the standalone build. The entrypoint script needs either (a) a separate install step in the Dockerfile, (b) using the `postgres` driver to run migration SQL directly, or (c) copying migration SQL and using a lightweight runner. All three approaches are viable but the specific choice needs implementation validation.
- **Alpine compatibility with `unpdf` and `exceljs`:** These v1.2 dependencies may need additional system libraries on Alpine. STACK.md notes `bcryptjs` (pure JS) is safe, but `unpdf` (pdf.js wrapper) and `exceljs` have not been verified on Alpine. Test during Phase 2 build.
- **PostgreSQL version discrepancy:** STACK.md recommends PostgreSQL 17-alpine; ARCHITECTURE.md references PostgreSQL 16-alpine. Both are compatible with Drizzle ORM. Recommend PostgreSQL 17 for consistency with STACK.md's more recent analysis.

## Sources

### Primary (HIGH confidence)
- Next.js Official Docker Example (vercel/next.js/examples/with-docker) -- canonical multi-stage Dockerfile pattern
- Next.js Deployment Documentation -- `output: 'standalone'` requirement and configuration
- Next.js 16 Blog Post -- Node.js 20.9+ requirement
- Docker Compose Healthcheck Documentation -- `depends_on: condition: service_healthy`
- Docker Hub: postgres -- `pg_isready` healthcheck pattern
- Playwright Docker Documentation -- `mcr.microsoft.com/playwright` images
- Playwright CI Documentation -- `webServer` configuration
- Drizzle Kit Migration Commands -- `generate` and `migrate` usage
- Auth.js v5 Docker URL Issue (GitHub Discussion #9511) -- `AUTH_URL` requirement for containers
- Next.js GitHub Issues #88844, #91654, #88174 -- Turbopack standalone and performance bugs
- Existing codebase analysis -- direct inspection of next.config.ts, schema.ts, drizzle/0000 SQL, playwright.config.ts, vitest.config.ts, package.json, auth.ts, middleware.ts, storage/provider.ts, bash.ts

### Secondary (MEDIUM confidence)
- Docker Compose version obsolete (adamj.eu, May 2025) -- `version:` field removal
- Docker Postgres Best Practices (Docker Blog) -- healthcheck patterns
- Next.js + PostgreSQL + Redis Docker Compose (OneUptime, Feb 2026) -- comprehensive setup guide
- Dockerize Next.js with Drizzle ORM (Dev.to) -- directly relevant pattern
- LLM Regression Testing Tutorial (Evidently AI) -- mocking patterns for LLM-dependent tests
- Testing LLM Applications (Langfuse, Oct 2025) -- practical testing strategies
- Drizzle Migrations in Docker (budivoogt.com) -- migration patterns for containers
- Next.js 16 Turbopack Dev Container Issues (Qiita) -- `--webpack` recommendation

### Tertiary (LOW confidence -- needs validation)
- `unpdf` Alpine compatibility -- may need additional system libraries
- `exceljs` Alpine compatibility -- may have ZIP-related issues
- Turbopack standalone fix in Next.js 16.2.1 -- may have been partially fixed since 16.2.0

---
*Research completed: 2026-03-27*
*Ready for roadmap: yes*
