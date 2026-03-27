# Feature Research

**Domain:** Docker Containerization + Regression Testing for Next.js 16 AI Agent Platform
**Researched:** 2026-03-27
**Confidence:** HIGH (Docker patterns well-established from official Next.js docs; testing patterns from official Vitest/Playwright docs; LLM mocking patterns from current best practices)

---

## v1.3 Containerization + Regression Testing Features

This section covers features for the v1.3 milestone: Docker containerized environment and comprehensive regression testing across all v1.0-v1.2 features of the existing Next.js 16 AI Agent collaboration platform.

### Executive Summary

Key findings from research:

- **Next.js standalone output is the single most impactful Docker configuration.** Setting `output: 'standalone'` in `next.config.ts` produces a minimal self-contained build that reduces Docker images from ~2GB to under 200MB. The official Vercel example uses a 3-stage multi-stage build (deps, builder, runner) with `node:24-slim` as the base. This is the established best practice for Next.js 15+ Docker deployment.
- **docker-compose with PostgreSQL is a well-documented pattern.** The project already uses Drizzle ORM + PostgreSQL. A compose file with two services (app + db) plus a health check endpoint is the standard setup. The project's `.env.example` already defines all required environment variables, making the compose configuration straightforward.
- **Existing test coverage is strong for unit tests (79 test files) but E2E is minimal (2 spec files, 6 tests).** The regression testing effort should focus on adding E2E tests for critical user paths (auth, chat, file upload, workflow) and filling unit test gaps in areas identified in the known gaps from v1.2.
- **LLM-dependent tests must mock external API calls.** The project uses `@mariozechner/pi-ai` for LLM gateway calls. Testing should mock at the `streamChat()` level rather than hitting real API endpoints. For E2E tests, a mock LLM server or recorded responses pattern is the standard approach.
- **No existing Docker files found.** The project has no Dockerfile, docker-compose.yml, or .dockerignore. The `next.config.ts` also lacks `output: 'standalone'`. All Docker infrastructure must be created from scratch.

---

## Feature Landscape

### Table Stakes (Users Expect These)

For a containerization and regression testing milestone, "users" are the development team and CI/CD pipeline. Missing these = the environment is not usable for verification.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Dockerfile with standalone output** | Any Dockerized Next.js app must use `output: 'standalone'` to avoid shipping the entire node_modules. Without it, images are 2GB+ and slow to build. | LOW | Add `output: 'standalone'` to `next.config.ts`. Follow the official Vercel example: 3-stage build (deps, builder, runner). Copy `.next/standalone/`, `.next/static/`, and `public/` into the runner stage. |
| **docker-compose.yml (app + PostgreSQL)** | The app depends on PostgreSQL. Docker Compose is the standard way to orchestrate both services for development/testing. Without it, developers must set up PostgreSQL separately. | LOW | Two services: `app` (Next.js) and `db` (postgres:16-alpine). Shared network. Persistent volume for PostgreSQL data. Environment variables from `.env.example`. Health checks on both services. |
| **.dockerignore** | Prevents copying node_modules, .next, .git, and other unnecessary files into the Docker build context. Without it, builds are slow and images are bloated. | LOW | Standard Next.js .dockerignore: `node_modules`, `.next`, `.git`, `*.md`, `Dockerfile*`, `.dockerignore`, `.env*`, `e2e/`, `tests/`. |
| **Health check endpoint (`/api/health`)** | Docker Compose `depends_on` with `condition: service_healthy` requires a health endpoint. Without it, the app may receive requests before it is ready. Also needed for orchestrators (K8s, Cloud Run). | LOW | Simple GET endpoint returning `{ status: 'ok', timestamp: ... }`. Optionally check database connectivity. The current project has no `/api/health` route. |
| **Database auto-migration on startup** | In a fresh Docker container, the PostgreSQL database starts empty. Drizzle migrations must run before the app starts. Without this, every fresh container fails with missing tables. | MEDIUM | Use an init script or entrypoint wrapper that runs `drizzle-kit migrate` before `next start`. Alternatively, use a separate migration service in docker-compose. |
| **Unit test suite passing in CI** | The project has 79 unit test files covering v1.0-v1.2 features. These must all pass in the Docker environment (same Node version, same dependencies). | LOW | Run `npm test` in the Docker container. May need minor adjustments for environment variables or timing. The existing `tests/setup.ts` already mocks `DATABASE_URL` and `AUTH_SECRET`. |
| **E2E test suite for auth flows** | Authentication is the gatekeeper for all other features. E2E tests must verify login, register, session persistence, and protected route behavior. The existing `e2e/auth.spec.ts` covers basic auth UI but not full login/register flows with real form submission. | MEDIUM | Extend existing `e2e/auth.spec.ts`. Add tests for: successful registration, successful login, logout, session persistence across refresh, redirect behavior. Use Playwright's `storageState` for session reuse across test files. |
| **E2E test suite for chat flows** | Chat is the core user interaction. E2E tests must verify: sending a message, receiving a streamed response, creating a new conversation, conversation list display. | MEDIUM | Requires a running app with mocked or real LLM backend. For CI, use a mock LLM server or intercept API calls with Playwright's `route.fulfill()`. Test streaming response rendering. |
| **Regression verification report** | The milestone's deliverable is a PASS/FAIL report for every feature across v1.0, v1.1, and v1.2. This is a structured checklist, not automated tests for everything. | LOW | Markdown or JSON document with one row per feature. Each row has: feature name, milestone, verification method (manual/automated), status (PASS/FAIL), notes. Generated during the verification phase. |

### Differentiators (Competitive Advantage)

These are not typical for a testing milestone, but add significant value for a team-oriented AI platform.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Docker Compose watch mode for development** | Developers get hot-reload inside Docker, matching the local `npm run dev` experience. Eliminates "works on my machine" issues. | MEDIUM | Use `docker compose watch` (Docker Compose v2.22+) with bind mounts for source code. Sync node_modules to avoid host/container conflicts. The official Next.js Docker example demonstrates this pattern. |
| **One-command environment setup** | New team members run `docker compose up` and get a fully working environment (app + database + seed data) with zero manual steps. | MEDIUM | Add a seed script that creates a test user and sample conversations. Combine with `docker compose up --build` as the single command. Document in README. |
| **E2E tests for multi-agent workflows** | Testing the full agent workflow system (decomposition, scheduling, execution) end-to-end is the highest-value automated test. It verifies the most complex feature chain. | HIGH | Requires mocking LLM responses at the decomposition level. Test: user sends a multi-step request, verify subtasks are created, scheduler executes in waves, results are aggregated. This is the most complex E2E test to write but catches the most impactful regressions. |
| **E2E tests for file processing pipeline** | Full file upload, extraction, preview, and chat integration test. Verifies the entire v1.2 feature chain. | MEDIUM | Upload a test file (e.g., a small PDF), wait for extraction to complete, verify content appears in preview, attach to chat message, verify AI receives file context. |
| **Parallel test execution in CI** | Run unit tests and E2E tests in parallel across multiple containers to keep CI fast as the test suite grows. | LOW | Docker Compose supports `--scale` for parallel workers. Playwright supports `workers` config. The existing `playwright.config.ts` already has `fullyParallel: true` and `workers` config for CI. |
| **Test coverage reporting** | Track code coverage over time. Identify untested modules and prioritize test additions. | LOW | The project already has `vitest run --coverage` configured with v8 provider and HTML reporter. Just needs to be run in CI and artifacts saved. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Kubernetes manifests / Helm charts** | "Production-ready" often implies K8s. | Massive scope increase beyond what v1.3 needs. K8s adds complexity (secrets, ingress, HPA, PVCs) that is premature for a verification milestone. The goal is a reproducible test environment, not a production deployment target. | Docker Compose is sufficient for development, testing, and verification. K8s manifests are a future milestone when the team actually deploys to Kubernetes. |
| **Multi-architecture Docker builds (ARM + AMD)** | Team members may use different CPU architectures (M-series Macs vs cloud AMD). | Adds build complexity (`docker buildx`) and longer build times. For a verification environment, building only for the host architecture is fine. | Build for host architecture only. If cross-platform images are needed later, add `docker buildx` with QEMU emulation. |
| **Docker-based integration tests with real LLM APIs** | "Real" tests against actual Qwen/GLM/MiniMax endpoints. | External API calls in CI are flaky (rate limits, latency, cost). Tests become non-deterministic. LLM responses vary, making assertions fragile. | Mock LLM responses at the `streamChat()` boundary. Use recorded real responses as fixtures. Run real API tests manually or in a separate "smoke test" pipeline. |
| **End-to-end browser testing on multiple browsers** | Playwright supports Chromium, Firefox, and WebKit. | The project targets a team internal tool, likely used on Chrome/Edge only. Cross-browser testing triples E2E test time for minimal value. | Chromium only (already configured in `playwright.config.ts`). Add Firefox only if the team actually needs it. |
| **Mutation testing** | Automatically verify that tests actually catch bugs by mutating source code. | Expensive to run (10-50x slower than normal tests). Requires additional tooling (stryker-mutator). Overkill for a verification milestone. | Focus on coverage reporting and targeted test additions. Mutation testing can be added later if test quality is a concern. |
| **Visual regression testing (screenshot comparison)** | Catch unintended UI changes automatically. | Highly fragile for an actively developed UI. Every intentional design change creates false positives. Requires significant maintenance of baseline images. | Rely on component-level assertions (text content, element visibility, aria roles) in Playwright. Add visual regression only for stable, finalized UI sections. |

---

## Feature Dependencies

```
[Dockerfile (standalone output)]
    └──requires──> [next.config.ts: output: 'standalone']
    └──requires──> [.dockerignore]
    └──requires──> [Health check endpoint /api/health]

[docker-compose.yml]
    └──requires──> [Dockerfile]
    └──requires──> [Health check endpoint] (for depends_on condition)
    └──requires──> [Database auto-migration]
    └──requires──> [.env file with DATABASE_URL pointing to compose service]

[Database auto-migration]
    └──requires──> [Drizzle migration files]
    └──requires──> [DATABASE_URL environment variable]

[Health check endpoint]
    └──requires──> [API route: /api/health/route.ts]
    └──enhances──> [docker-compose.yml] (service health conditions)
    └──enhances──> [Dockerfile HEALTHCHECK instruction]

[E2E test suite]
    └──requires──> [Docker environment running] (app + db)
    └──requires──> [Seed data] (test user, sample data)
    └──requires──> [Playwright configured for container URL]
    └──enhances──> [Auth E2E tests]
    └──enhances──> [Chat E2E tests]
    └──enhances──> [File processing E2E tests]

[Regression verification report]
    └──requires──> [Docker environment] (for manual verification)
    └──requires──> [E2E test results] (for automated verification)
    └──requires──> [Unit test results] (for coverage data)
```

### Dependency Notes

- **Dockerfile is the foundation** -- everything else depends on a working Docker image. It must be built and tested first.
- **Health check endpoint enables reliable compose orchestration** -- without it, `depends_on` only checks that the container started, not that the app is ready. This causes race conditions where the app receives requests before Next.js finishes compiling.
- **Database auto-migration is critical for fresh containers** -- every `docker compose up` with a new volume starts with an empty database. The migration step must complete before the app starts serving requests.
- **E2E tests depend on a running Docker environment** -- Playwright's `webServer` config currently starts `npm run dev` locally. For containerized testing, either run Playwright inside the Docker network (pointing to the compose service) or run it on the host pointing to `localhost:3000` where the compose app is exposed.
- **Seed data is needed for realistic E2E tests** -- auth tests need a pre-existing user, chat tests need conversations, file tests need uploaded files. A seed script that populates the database with test fixtures is essential.

---

## Existing Test Coverage Analysis

### Current Unit Test Files (79 files)

The project has extensive unit test coverage organized by feature area:

| Area | Test Files | Coverage Assessment |
|------|-----------|-------------------|
| **Auth** | `auth.test.ts`, `e2e/auth.spec.ts` | Core auth logic covered. E2E only tests UI visibility, not full login flow. |
| **LLM Gateway** | `llm-unified.test.ts`, `retry.test.ts` | Unified model selection and retry logic covered. |
| **MCP Protocol** | `types.test.ts`, `server.test.ts`, `resources.test.ts`, `validation.test.ts`, `prompts.test.ts`, `registry.test.ts`, `tools/bash.test.ts`, `integration/mcp-resources.test.ts`, `integration/mcp-auth.test.ts` | Well-covered. MCP is the most thoroughly tested subsystem. |
| **Skills System** | `decorator.test.ts`, `executor.test.ts`, `discovery.test.ts`, `predefined.test.ts`, `integration/skill-approval.test.ts`, `skills-panel.test.tsx`, `file-processing.test.ts` | Well-covered including integration. |
| **Approval Flow** | `state.test.ts`, `components/approval-prompt.test.tsx` | State machine and UI component covered. |
| **Agent System** | `types.test.ts`, `registry.test.ts`, `predefined.test.ts`, `decomposition.test.ts`, `executor.test.ts`, `message-bus.test.ts`, `scheduler.test.ts`, `decomposition-deps.test.ts`, `scheduler-pause.test.ts`, `timeout-handling.test.ts` | Thoroughly covered. |
| **Workflow** | `api/workflow-control.test.ts`, `api/workflow-status.test.ts`, `components/workflow-controls.test.tsx`, `components/workflow-progress.test.tsx`, `components/agent-status-list.test.tsx`, `components/collapsible-log-section.test.tsx`, `components/workflow-panel.test.tsx` | API endpoints and UI components covered. |
| **Database** | `schema-agents.test.ts`, `schema-files.test.ts`, `schema-pause.test.ts`, `queries.test.ts`, `queries-messages.test.ts`, `queries-logs.test.ts`, `queries-files.test.ts`, `migration-agents.test.ts` | Schema and queries covered. |
| **File Processing (v1.2)** | `storage/provider.test.ts`, `api/files/upload.test.ts`, `validation/file-validation.test.ts`, `components/files/*` (10 files), `extraction/*` (7 files), `api/files/extract.test.ts`, `api/files/status.test.ts`, `api/files/delete.test.ts`, `api/files/detail.test.ts`, `api/files/list.test.ts`, `hooks/use-file-*.test.ts`, `chat/inject-file-content.test.ts`, `app/files/page.test.tsx` | Extensively covered. The v1.2 milestone has the most test files. |
| **Chat** | `chat.test.tsx`, `content-filter.test.ts` | Chat UI component and content filter covered. Chat API route is NOT tested. |
| **API Routes** | `api.test.ts` | Only a general API test. Most specific API routes lack unit tests. |

### Current E2E Test Files (2 files, ~6 tests)

| File | Tests | Status |
|------|-------|--------|
| `e2e/auth.spec.ts` | 5 tests: redirect to login, show login form, show register form, invalid credentials error, navigate login to register | Basic UI visibility only. No successful login/register flow. No session persistence test. |
| `e2e/session.spec.ts` | 2 tests: session persists (placeholder), protected route redirects | One test is a placeholder (`expect(true).toBe(true)`). The redirect test duplicates auth.spec.ts. |

### Coverage Gaps Identified

1. **Chat API route** (`src/app/api/chat/route.ts`) -- No unit test. This is the most critical API endpoint.
2. **Full auth E2E flow** -- No test for successful registration, successful login with redirect, or logout.
3. **Multi-agent workflow E2E** -- No E2E test for the agent system end-to-end.
4. **File upload E2E** -- No E2E test for the full file upload, extraction, preview, and chat integration pipeline.
5. **Conversation CRUD E2E** -- No E2E test for creating, listing, and switching conversations.
6. **Skills panel E2E** -- No E2E test for the sidebar skills browsing and invocation.
7. **Workflow controls E2E** -- No E2E test for pause/resume/cancel controls.

---

## MVP Definition

### Launch With (v1.3 Core)

Minimum viable containerization and testing -- what is needed to verify all v1.0-v1.2 features work.

- [ ] **Dockerfile with standalone output** -- Multi-stage build, non-root user, health check instruction. ~200MB image.
- [ ] **.dockerignore** -- Exclude unnecessary files from build context.
- [ ] **docker-compose.yml (app + PostgreSQL)** -- Two services with health checks, persistent DB volume, environment variables.
- [ ] **Health check endpoint** (`/api/health`) -- Simple liveness check. Optionally include DB connectivity check.
- [ ] **Database auto-migration** -- Entrypoint script or compose init that runs Drizzle migrations before app start.
- [ ] **Seed data script** -- Create test user and sample data for E2E testing.
- [ ] **Extended auth E2E tests** -- Successful registration, successful login, session persistence, logout, protected routes.
- [ ] **Chat E2E tests** -- Create conversation, send message (mocked LLM), verify streamed response, conversation list.
- [ ] **File processing E2E tests** -- Upload file, wait for extraction, verify preview, attach to chat.
- [ ] **Regression verification report** -- PASS/FAIL checklist for every v1.0-v1.2 feature.
- [ ] **All existing unit tests passing in Docker** -- Verify the 79 test files pass in the containerized environment.

### Add After Validation (v1.3.x)

Features to add once core containerization and regression tests are working.

- [ ] **Agent workflow E2E tests** -- End-to-end test of multi-agent task decomposition, scheduling, and execution.
- [ ] **Conversation CRUD E2E tests** -- Create, list, rename, delete conversations.
- [ ] **Skills panel E2E tests** -- Browse skills, invoke skill, verify skill result.
- [ ] **Workflow controls E2E tests** -- Pause, resume, cancel running workflows.
- [ ] **CI pipeline integration** -- GitHub Actions workflow that builds Docker image, runs unit tests, runs E2E tests, publishes coverage report.
- [ ] **Test coverage enforcement** -- Minimum coverage threshold (e.g., 70%) that blocks merge if not met.
- [ ] **Docker Compose watch mode** -- Development hot-reload inside Docker for team onboarding.

### Future Consideration (v2+)

Features to defer until the platform is stable and the team needs them.

- [ ] **Kubernetes deployment manifests** -- When the team deploys to K8s.
- [ ] **Multi-architecture Docker builds** -- When cross-platform images are needed.
- [ ] **Visual regression testing** -- When the UI stabilizes and visual consistency matters.
- [ ] **Mutation testing** -- When test quality needs systematic verification.
- [ ] **Performance testing in Docker** -- Load testing with k6 or Artillery to benchmark under container constraints.
- [ ] **Staging environment compose file** -- Separate compose configuration for staging with different env vars, resource limits, and logging.

---

## Feature Prioritization Matrix

| Feature | Team Value | Implementation Cost | Priority |
|---------|-----------|---------------------|----------|
| Dockerfile (standalone) | HIGH | LOW | P1 |
| .dockerignore | HIGH | LOW | P1 |
| docker-compose.yml (app + db) | HIGH | LOW | P1 |
| Health check endpoint | HIGH | LOW | P1 |
| Database auto-migration | HIGH | MEDIUM | P1 |
| Seed data script | HIGH | LOW | P1 |
| Auth E2E tests (extended) | HIGH | MEDIUM | P1 |
| Chat E2E tests | HIGH | MEDIUM | P1 |
| File processing E2E tests | HIGH | MEDIUM | P1 |
| Regression verification report | HIGH | LOW | P1 |
| Unit tests passing in Docker | HIGH | LOW | P1 |
| Agent workflow E2E tests | MEDIUM | HIGH | P2 |
| Conversation CRUD E2E tests | MEDIUM | MEDIUM | P2 |
| Skills panel E2E tests | MEDIUM | MEDIUM | P2 |
| Workflow controls E2E tests | MEDIUM | MEDIUM | P2 |
| CI pipeline integration | MEDIUM | MEDIUM | P2 |
| Test coverage enforcement | MEDIUM | LOW | P2 |
| Docker Compose watch mode | MEDIUM | MEDIUM | P2 |
| K8s manifests | LOW | HIGH | P3 |
| Multi-arch builds | LOW | MEDIUM | P3 |
| Visual regression testing | LOW | HIGH | P3 |
| Mutation testing | LOW | HIGH | P3 |
| Performance testing | LOW | HIGH | P3 |
| Staging compose file | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v1.3 verification milestone
- P2: Should have, add once core verification is complete (v1.3.x)
- P3: Nice to have, future consideration (v2+)

---

## Docker-Specific Technical Notes

### Recommended Dockerfile Structure (3-stage build)

Based on the official Vercel `with-docker` example (verified March 2026):

```
Stage 1 (deps):   Install production dependencies only
Stage 2 (builder): Install all dependencies, run next build
Stage 3 (runner):  Copy standalone output, static assets, public/
                   Run as non-root user, expose 3000
```

Key details:
- Base image: `node:24-slim` (slim preferred over alpine for glibc compatibility with native deps like `bcryptjs`, `busboy`)
- `NODE_VERSION` as ARG for easy upgrades
- BuildKit cache mounts for `~/.npm` to speed up rebuilds
- Non-root user (`node`) for security
- Writable `.next` directory for runtime cache/prerender
- `HEALTHCHECK` instruction pointing to `/api/health`

### Required next.config.ts Change

Current config:
```typescript
const nextConfig: NextConfig = {
  typedRoutes: true,
  serverActions: { bodySizeLimit: '10mb' },
};
```

Must add:
```typescript
const nextConfig: NextConfig = {
  output: 'standalone',  // Required for Docker
  typedRoutes: true,
  serverActions: { bodySizeLimit: '10mb' },
};
```

### docker-compose.yml Service Architecture

```
Services:
  db:
    image: postgres:16-alpine
    environment: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
    volumes: pgdata (persistent), ./drizzle (migration files)
    healthcheck: pg_isready
    ports: 5432 (internal only, not exposed to host)

  app:
    build: .
    environment: DATABASE_URL (pointing to db service), AUTH_SECRET, LLM API keys, etc.
    ports: 3000:3000
    depends_on: db (condition: service_healthy)
    volumes: uploads (for STORAGE_LOCAL_PATH)
    healthcheck: curl /api/health
```

### Environment Variable Mapping for Docker

The `.env.example` variables map to docker-compose as follows:

| Variable | Docker Source | Notes |
|----------|--------------|-------|
| `DATABASE_URL` | Compose interpolation: `postgresql://user:pass@db:5432/nextmind` | Must use service name `db` not `localhost` |
| `AUTH_SECRET` | `.env` file or compose environment | Must be 32+ characters |
| `GOOGLE_CLIENT_ID` / `_SECRET` | `.env` file (optional) | Can be empty for credentials-only auth |
| `QWEN_API_KEY` / `GLM_API_KEY` / `MINIMAX_API_KEY` | `.env` file | At least one required for LLM features |
| `MCP_UID` / `MCP_GID` | Compose environment | May need adjustment for container user |
| `STORAGE_DRIVER` | Compose environment | `local` for Docker (volume mount) |
| `STORAGE_LOCAL_PATH` | Compose volume mount | Map to container path, e.g., `/app/data/uploads` |

---

## Testing-Specific Technical Notes

### LLM Mocking Strategy

The project's LLM gateway (`src/lib/llm/index.ts`) uses `streamChat()` as the unified entry point. For testing:

- **Unit tests**: Mock `streamChat()` at the module level with `vi.mock()`. Return a canned stream of text chunks. This is already the pattern used in existing tests.
- **E2E tests**: Two options:
  1. **Playwright route interception**: Use `page.route('**/api/chat', route => route.fulfill(...))` to intercept chat API calls and return canned responses. Simpler, no additional infrastructure.
  2. **Mock LLM server**: A lightweight Express/Fastify server that mimics the `/api/chat` response format. More realistic but more infrastructure.

**Recommendation**: Use Playwright route interception for E2E tests. It is simpler, requires no additional services, and is the standard Playwright pattern for API mocking.

### E2E Test Organization

Recommended E2E test structure:

```
e2e/
  auth.spec.ts          (exists, extend)
  session.spec.ts       (exists, extend)
  chat.spec.ts          (new)
  files.spec.ts         (new)
  workflows.spec.ts     (new, P2)
  conversations.spec.ts (new, P2)
  skills.spec.ts        (new, P2)
  fixtures/
    test-data.ts        (shared test data, credentials)
    mock-responses.ts   (mock LLM responses, API fixtures)
```

### Playwright Configuration for Docker

Current config uses `baseURL: 'http://localhost:3000'` and starts `npm run dev`. For Docker-based testing:

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  },
  webServer: process.env.CI
    ? undefined  // In CI, assume Docker compose is already running
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120 * 1000,
      },
});
```

### Session Reuse Pattern for E2E Tests

Avoid logging in before every test. Use Playwright's `storageState`:

1. Global setup authenticates once and saves `storageState` to a file.
2. Each test file loads the saved state.
3. Only auth tests bypass this and test login/register flows directly.

```typescript
// e2e/fixtures/test-data.ts
export const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
  name: 'Test User',
};
```

### Database Seeding for E2E

A seed script (`scripts/seed.ts`) that:
1. Connects to the database using `DATABASE_URL`
2. Creates a test user with known credentials (bcrypt hash)
3. Optionally creates sample conversations, files, and agents
4. Is idempotent (safe to run multiple times)

This script runs as part of the Docker entrypoint or as a separate compose service.

---

## Sources

- [Next.js Official Docs - Deploying (Docker)](https://nextjs.org/docs/app/getting-started/deploying) -- HIGH confidence, official docs, last updated March 2026
- [Next.js Official Docker Example (with-docker)](https://github.com/vercel/next.js/tree/canary/examples/with-docker) -- HIGH confidence, official Vercel repository
- [Next.js output: standalone config](https://nextjs.org/docs/pages/api-reference/config/next-config-js/output) -- HIGH confidence, official docs
- [Docker Health Check Best Practices - OneUptime (Jan 2026)](https://oneuptime.com/blog/post/2026-01-30-docker-health-check-best-practices/view) -- MEDIUM confidence, recent article
- [Dockerize Next.js with Drizzle ORM + PostgreSQL - Dev.to](https://dev.to/nsrez/dockerize-nextjs-and-setup-drizzle-orm-with-postgresql-locally-with-docker-in-nextjs-4oli) -- MEDIUM confidence, directly relevant (Drizzle + Next.js + Docker)
- [Next.js + PostgreSQL + Redis Docker Compose - OneUptime (Feb 2026)](https://oneuptime.com/blog/post/2026-02-08-how-to-set-up-a-nextjs-postgresql-redis-stack-with-docker-compose/view) -- MEDIUM confidence, recent and comprehensive
- [Next.js Docker Production Kit - GitHub](https://github.com/maxproske/nextjs-docker-production-kit) -- MEDIUM confidence, community starter kit
- [Next.js Testing Docs - Official](https://nextjs.org/docs/app/guides/testing) -- HIGH confidence, official docs
- [Playwright Best Practices - Official](https://playwright.dev/docs/best-practices) -- HIGH confidence, official docs
- [Test Next.js Apps with Playwright - 5 Best Practices - JSMastery](https://jsmastery.com/blogs/test-next-js-apps-with-playwright-5-best-practices) -- MEDIUM confidence, practical guide
- [LLM Regression Testing Tutorial - Evidently AI](https://www.evidentlyai.com/blog/llm-regression-testing-tutorial) -- MEDIUM confidence, LLM-specific testing patterns
- [Testing LLM Applications - Langfuse (Oct 2025)](https://langfuse.com/blog/2025-10-21-testing-llm-applications) -- MEDIUM confidence, practical LLM testing guide
- [Mocking LLM Responses in SDLC - Medium](https://medium.com/@vuongngo/effective-practices-for-mocking-llm-responses-during-the-software-development-lifecycle-73f726c3f994) -- LOW confidence, single source
- Existing codebase analysis -- HIGH confidence, direct inspection of all 79 test files, playwright.config.ts, vitest.config.ts, next.config.ts, package.json, .env.example, and API route structure

---
*Feature research for: Next-Mind v1.3 Containerization + Regression Testing*
*Researched: 2026-03-27*
