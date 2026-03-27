# Architecture Research: Docker Containerization and Regression Testing for v1.3

**Domain:** Docker deployment infrastructure and comprehensive regression testing for an existing Next.js 16 AI Agent platform
**Researched:** 2026-03-27
**Confidence:** HIGH

---

## Executive Summary

This document describes how Docker containerization (Dockerfile + docker-compose with PostgreSQL) and full regression testing (Vitest unit tests + Playwright E2E) integrate with the existing Next-Mind architecture. The codebase is a ~15,400 LOC TypeScript application built on Next.js 16 App Router, Drizzle ORM with PostgreSQL, Auth.js v5, unstorage abstract file storage, MCP protocol, a decorator-based Skills system, and an A2A multi-agent workflow engine.

The critical finding is that Docker containerization is not a pure addition -- it exposes three latent issues that must be resolved first: (1) the Drizzle migration SQL is out of date (missing v1.2 `file` and `conversation_file` tables and the `workflow.checkpoint` column), (2) `next.config.ts` lacks `output: 'standalone'` which is required for Docker-optimized builds, and (3) Auth.js v5 in a container environment requires an explicit `AUTH_URL` environment variable to prevent OAuth redirects to the container's internal IP. Beyond these prerequisites, the Docker integration is straightforward: a multi-stage Dockerfile, a docker-compose with PostgreSQL healthcheck, and volume mounts for unstorage persistence and Drizzle migration data.

The testing architecture has two tiers. Vitest unit tests (66+ existing files) run inside the app container using jsdom and can continue to mock database connections. Playwright E2E tests require the app to be running against a real PostgreSQL database -- in Docker context this means either running Playwright inside a dedicated test container that targets the app container, or running Playwright on the host with `baseURL` pointed to the Docker-exposed port. The recommended approach is the latter (host-executed Playwright targeting Docker), because Playwright's browser dependencies are heavy and the existing `webServer` config can be repurposed.

---

## System Overview

### Docker Container Topology

```
+-------------------------------------------------------------------+
|                         docker-compose                             |
+-------------------------------------------------------------------+
|                                                                    |
|  +---------------------------+  +-------------------------------+  |
|  |     next-mind-app         |  |     next-mind-db              |  |
|  |     (Next.js 16)          |  |     (PostgreSQL 16)           |  |
|  |                           |  |                               |  |
|  |  Port 3000 (exposed)      |  |  Port 5432 (internal)        |  |
|  |                           |  |                               |  |
|  |  - Standalone build       |  |  - App database               |  |
|  |  - Auth.js v5             |  |  - Drizzle migrations         |  |
|  |  - MCP server             |  |  - Healthcheck: pg_isready    |  |
|  |  - Skills system          |  |                               |  |
|  |  - A2A workflow engine    |  |  Volume: pgdata               |  |
|  |  - File upload/extract    |  |  (named volume, persisted)    |  |
|  |                           |  |                               |  |
|  |  Volumes:                 |  +-------------------------------+  |
|  |    uploads -> ./data/     |              ^                     |
|  |    (host bind mount)      |              |                     |
|  |                           |              | TCP 5432             |
|  |  Env: DATABASE_URL        |              |                     |
|  |       = postgres://...    |              |                     |
|  |       /db:5432/nextmind   |              |                     |
|  +---------------------------+              |                     |
|              ^                              |                     |
|              |                              |                     |
|              +------------------------------+                     |
|                                                                    |
+-------------------------------------------------------------------+
         |  Port 3000 exposed to host
         v
+-------------------------------------------------------------------+
|                      Host / CI Environment                         |
|                                                                    |
|  +---------------------------+  +-------------------------------+  |
|  |  Vitest (unit tests)      |  |  Playwright (E2E tests)       |  |
|  |                           |  |                               |  |
|  |  - Runs inside app        |  |  - Runs on host or in         |  |
|  |    container OR on host    |  |    dedicated test container   |  |
|  |  - jsdom environment      |  |  - Targets localhost:3000     |  |
|  |  - Mock DB connections     |  |  - Real DB via app container  |  |
|  |  - 66+ existing test files|  |  - 2 existing spec files      |  |
|  +---------------------------+  +-------------------------------+  |
|                                                                    |
+-------------------------------------------------------------------+
```

### Component Responsibility Table

| Component | Responsibility | Location | Type |
|-----------|---------------|----------|------|
| `Dockerfile` | Multi-stage build: deps, builder, runner | Project root | NEW |
| `docker-compose.yml` | Orchestrate app + PostgreSQL with healthcheck | Project root | NEW |
| `.dockerignore` | Exclude unnecessary files from Docker context | Project root | NEW |
| `docker-entrypoint.sh` | Wait for DB healthcheck, run Drizzle migrations, start app | Project root | NEW |
| `next.config.ts` | Add `output: 'standalone'` for Docker-optimized builds | `src/` root | MODIFIED |
| `drizzle/0001_*.sql` | New migration for missing v1.2 tables + checkpoint column | `drizzle/` | NEW (generated) |
| `tests/setup.ts` | Mock `DATABASE_URL` for container-aware unit testing | `tests/` | MODIFIED |
| `playwright.config.ts` | Add `storageState` for auth session caching in Docker context | Project root | MODIFIED |
| `e2e/auth.setup.ts` | Playwright global setup: authenticate and save storage state | `e2e/` | NEW |
| `e2e/*.spec.ts` | Expanded E2E test suites for v1.0-v1.2 regression | `e2e/` | NEW (expanded) |
| `.env.docker` | Docker-specific environment variables | Project root | NEW |

---

## Recommended Project Structure

```
next-mind/
  Dockerfile                          # NEW - Multi-stage Docker build
  docker-compose.yml                  # NEW - App + PostgreSQL orchestration
  docker-compose.test.yml             # NEW - Optional: test-specific compose override
  .dockerignore                       # NEW - Docker build exclusions
  docker-entrypoint.sh                # NEW - DB wait + migration + start
  .env.docker                         # NEW - Docker environment template
  .env.example                        # EXISTING - Updated with Docker vars
  next.config.ts                      # MODIFIED - Add output: 'standalone'
  drizzle.config.ts                   # EXISTING - No changes needed
  drizzle/
    0000_breezy_rhino.sql             # EXISTING - v1.0/v1.1 schema
    0001_*.sql                        # NEW - v1.2 missing tables + checkpoint
    meta/                             # EXISTING - Drizzle migration metadata
  tests/
    setup.ts                          # MODIFIED - Docker-aware DB URL
    ...existing test files...         # EXISTING - No changes
  e2e/
    auth.setup.ts                     # NEW - Global Playwright auth setup
    auth.spec.ts                      # EXISTING - Expanded for regression
    session.spec.ts                   # EXISTING - Expanded for regression
    chat.spec.ts                      # NEW - v1.0 chat regression
    mcp.spec.ts                       # NEW - v1.0 MCP tools regression
    skills.spec.ts                    # NEW - v1.0 skills system regression
    approval.spec.ts                  # NEW - v1.0 approval flow regression
    workflow.spec.ts                  # NEW - v1.1 agent workflow regression
    file-upload.spec.ts               # NEW - v1.2 file upload regression
    file-management.spec.ts           # NEW - v1.2 file management regression
    file-chat.spec.ts                 # NEW - v1.2 file-chat integration regression
  src/
    ...existing source code...        # EXISTING - No architectural changes
```

### Structure Rationale

- **Root-level Docker files** follow the convention used by Next.js official Docker example (`vercel/next.js/examples/with-docker`). Dockerfiles and compose files belong at the project root because Docker build context starts from there.
- **`docker-entrypoint.sh`** is separate from the Dockerfile because shell scripts in COPY/ADD can have line ending issues on Windows. A separate script file is cleaner and easier to maintain.
- **`docker-compose.test.yml`** is an optional override file that extends the base compose with test-specific configuration (e.g., a `test-runner` service using `mcr.microsoft.com/playwright` image). Keeping it separate avoids polluting the production compose file.
- **`e2e/*.spec.ts` expansion** follows Playwright's convention of one spec file per feature domain. The existing two files (`auth.spec.ts`, `session.spec.ts`) cover only authentication. v1.3 regression requires specs for all shipped features.

---

## Architectural Patterns

### Pattern 1: Multi-Stage Dockerfile for Next.js Standalone

**What:** Use Docker multi-stage builds with three stages -- `deps` (install dependencies), `builder` (build the Next.js app with `output: 'standalone'`), and `runner` (copy only the standalone output and production dependencies). This reduces the final image by 80-90% compared to copying the entire `node_modules`.

**When to use:** All Next.js applications deployed in Docker. The standalone output mode is officially recommended by Vercel.

**Trade-offs:** Adds ~20 lines of Dockerfile complexity. Requires `output: 'standalone'` in `next.config.ts`. The standalone output does not include `public/` directory contents -- those must be copied separately. Some Next.js features (e.g., `@next/font` local font optimization) may behave differently in standalone mode.

**Example:**

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Drizzle migrations for entrypoint
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma 2>/dev/null || true

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["docker-entrypoint.sh"]
```

**Why this matters for the codebase:** The current `next.config.ts` does NOT have `output: 'standalone'`. This is the single most important prerequisite. Without it, the Docker image would include the full `node_modules` (~500MB+) instead of the standalone output (~100MB).

### Pattern 2: Healthcheck-Dependent Startup with Migration

**What:** The Next.js app container depends on PostgreSQL being healthy before starting. A docker-entrypoint script waits for the DB to accept connections (using `pg_isready`), then runs Drizzle migrations, then starts the Next.js server.

**When to use:** Any Dockerized application with a database dependency that needs migrations applied before the app starts.

**Trade-offs:** Adds startup latency (migration time, typically 1-5 seconds). If migrations fail, the container exits -- this is intentional (fail-fast). Requires the Drizzle migration SQL files to be available inside the container.

**Example:**

```bash
#!/bin/sh
set -e

echo "Waiting for PostgreSQL at $DATABASE_HOST:$DATABASE_PORT..."
until pg_isready -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER"; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "PostgreSQL is ready. Running migrations..."
npx drizzle-kit migrate

echo "Starting Next.js application..."
exec node server.js
```

**Why this matters:** The Drizzle migration in `drizzle/0000_breezy_rhino.sql` is the ONLY migration and it is OUT OF DATE. It is missing:
1. `file` table (v1.2)
2. `conversation_file` table (v1.2)
3. `agent_message` table (v1.1)
4. `checkpoint` column on `workflow` table (v1.1)

A new migration (`0001_*.sql`) must be generated via `npm run db:generate` BEFORE Docker setup, or the entrypoint migration step will fail.

### Pattern 3: Docker Compose Service Dependencies with Healthcheck

**What:** Use docker-compose `depends_on` with `condition: service_healthy` to ensure the app container only starts after PostgreSQL passes its healthcheck. This is more reliable than `condition: service_started` because the DB may be running but not yet accepting connections.

**When to use:** All docker-compose setups with database dependencies.

**Trade-offs:** Requires defining a `healthcheck` stanza on the PostgreSQL service. Adds ~10 seconds to startup while healthcheck probes run. Not supported by `docker-compose v1` (requires v2+).

**Example:**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: nextmind
      POSTGRES_PASSWORD: nextmind_secret
      POSTGRES_DB: nextmind
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nextmind"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://nextmind:nextmind_secret@db:5432/nextmind
      AUTH_URL: http://localhost:3000
      AUTH_SECRET: ${AUTH_SECRET}
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./data/uploads:/app/data/uploads

volumes:
  pgdata:
```

### Pattern 4: Volume-Mounted Persistent Storage for unstorage

**What:** The unstorage local fs driver writes to `STORAGE_LOCAL_PATH` (default `./data/uploads`). In Docker, this directory must be a bind mount to the host or a named volume. Otherwise, uploaded files are lost when the container restarts.

**When to use:** Any Docker deployment using the local storage driver.

**Trade-offs:** Bind mounts require the host directory to exist with correct permissions. Named volumes are managed by Docker but harder to inspect from the host. The unstorage singleton (`getStorage()`) caches the driver -- if the mount path changes between container restarts, the singleton may reference a stale path (mitigated by the singleton being per-process, so container restart = fresh singleton).

**Example:**

```yaml
# docker-compose.yml
services:
  app:
    volumes:
      - ./data/uploads:/app/data/uploads  # Bind mount
      # OR
      # - uploads:/app/data/uploads        # Named volume

# volumes:
#   uploads:
```

**Why this matters:** The `getStorage()` function in `src/lib/storage/provider.ts` reads `process.env.STORAGE_LOCAL_PATH` at first call and caches the result. In Docker, the default path `./data/uploads` resolves to `/app/data/uploads` inside the container. The bind mount `./data/uploads:/app/data/uploads` ensures this path persists to the host.

### Pattern 5: Playwright E2E Against Containerized App

**What:** Run Playwright tests on the host machine (or CI runner) targeting the Docker-exposed app at `localhost:3000`. The existing `playwright.config.ts` `webServer` config can be repurposed: instead of `npm run dev`, it waits for `docker compose up` to be ready.

**When to use:** E2E testing in a Docker deployment context.

**Trade-offs:** Requires the host to have Playwright browsers installed. The `webServer` config needs modification to detect Docker readiness instead of dev server readiness. Network is slower (host -> Docker bridge) but negligible for E2E.

**Example:**

```yaml
# docker-compose.test.yml (override for testing)
services:
  app:
    build: .
    environment:
      - DATABASE_URL=postgres://nextmind:nextmind_secret@db:5432/nextmind
      - AUTH_URL=http://localhost:3000
      - AUTH_SECRET=test-secret-key-min-32-characters-long
      - QWEN_API_KEY=${QWEN_API_KEY:-}
    command: ["node", "server.js"]
```

```typescript
// playwright.config.ts (CI-aware modification)
export default defineConfig({
  // ...existing config...
  webServer: process.env.CI
    ? {
        command: 'docker compose -f docker-compose.yml -f docker-compose.test.yml up --wait',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 180 * 1000,  // 3 minutes for Docker build + startup
      }
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
```

---

## Data Flow

### Flow 1: Docker Startup Sequence

```
docker compose up
    |
    v
PostgreSQL container starts
    |
    v
PostgreSQL healthcheck: pg_isready (every 5s, up to 5 retries)
    |  FAIL -> sleep 1s, retry
    |  PASS
    v
App container starts (depends_on: condition: service_healthy)
    |
    v
docker-entrypoint.sh:
  1. Wait for pg_isready (defense in depth, even though depends_on handles it)
  2. npx drizzle-kit migrate (apply 0000 + 0001 migrations)
  3. exec node server.js (Next.js standalone server)
    |
    v
Next.js app listening on 0.0.0.0:3000
    |
    v
Port 3000 exposed to host via docker-compose ports mapping
```

### Flow 2: File Upload Persistence in Docker

```
User uploads file via browser
    |
    v
POST /api/files -> Next.js route handler (inside container)
    |
    v
getStorage().setItem(key, data)  (unstorage singleton)
    |
    v
fsDriver writes to /app/data/uploads/{userId}/{fileId}/{filename}
    |
    v
Docker bind mount: /app/data/uploads <-> ./data/uploads (host)
    |
    v
File persisted on host filesystem
    |
    v
Container restart -> bind mount reconnects -> file still accessible
```

### Flow 3: Database Migration in Docker

```
docker-entrypoint.sh calls: npx drizzle-kit migrate
    |
    v
drizzle-kit reads drizzle/meta/_journal.json
    |  Contains: [{ idx: 0, when: ..., tag: "0000_breezy_rhino" }]
    |  MISSING:  [{ idx: 1, when: ..., tag: "0001_*" }]  <-- MUST BE ADDED
    v
drizzle-kit reads drizzle/0000_breezy_rhino.sql
    |  Creates v1.0/v1.1 tables (conversation, message, agent, workflow, task, etc.)
    |  MISSING: file, conversation_file, agent_message tables
    |  MISSING: workflow.checkpoint column
    v
If migration SQL is current: tables created successfully -> app starts
If migration SQL is stale: missing tables -> runtime errors when accessing file features
```

### Flow 4: Auth.js v5 OAuth in Docker

```
User clicks "Sign in with Google"
    |
    v
Auth.js generates OAuth callback URL
    |  Uses req.url or process.env.AUTH_URL as base
    |  WITHOUT AUTH_URL: req.url = http://172.18.0.3:3000 (container internal IP)
    |  WITH AUTH_URL: req.url = http://localhost:3000 (correct, external-facing)
    v
Google redirects back to callback URL
    |  If AUTH_URL was wrong: redirect goes to container IP -> fails
    |  If AUTH_URL was correct: redirect goes to localhost:3000 -> works
    v
Auth.js processes callback -> session established
```

### Flow 5: Regression Test Execution

```
Phase A: Unit Tests (Vitest)
    |
    v
Run inside app container OR on host:
  npm test
    |
    v
tests/setup.ts sets:
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/nextmind_test'
  (or override via env var for Docker context)
    |
    v
Test files mock DB connections (jsdom, no real DB needed for most tests)
    |
    v
Results: 66+ test files, coverage report

Phase B: E2E Tests (Playwright)
    |
    v
Prerequisite: Docker containers running (app + db)
    |
    v
e2e/auth.setup.ts (globalSetup):
  1. Navigate to /register
  2. Create test user
  3. Save storageState (cookies, localStorage) to .auth/user.json
    |
    v
e2e/*.spec.ts (each test):
  1. Load storageState from .auth/user.json (skip login)
  2. Execute feature-specific assertions
  3. Verify v1.0 features: auth, chat, MCP tools, skills, approval
  4. Verify v1.1 features: agent workflow, task decomposition, controls
  5. Verify v1.2 features: file upload, management, chat integration
    |
    v
Results: HTML report, trace files on failure
```

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| PostgreSQL (Docker) | `DATABASE_URL` env var, `pg_isready` healthcheck, Drizzle migration on startup | Must use container hostname `db` (not `localhost`) in the app's `DATABASE_URL`. The existing `src/lib/db/index.ts` reads `process.env.DATABASE_URL!` -- no code change needed, just the env var value. |
| Auth.js OAuth (Google) | `AUTH_URL` env var + `GOOGLE_CLIENT_ID/SECRET` | **CRITICAL:** Without `AUTH_URL`, OAuth redirects to container internal IP. The existing `src/auth.ts` does NOT set a `basePath` or custom callback URL -- it relies on `NEXTAUTH_URL` / `AUTH_URL` env var (Auth.js v5 convention). |
| LLM APIs (Qwen, GLM, MiniMax) | API keys via env vars, outbound HTTPS from container | No special Docker handling needed. Outbound HTTPS works by default. API keys are passed as env vars. |
| unstorage (local fs) | `STORAGE_LOCAL_PATH` env var + Docker bind mount | Default `./data/uploads` maps to `/app/data/uploads` in container. Bind mount `./data/uploads:/app/data/uploads` for persistence. |

### Internal Boundaries

| Boundary | Communication | Docker Impact |
|----------|---------------|---------------|
| Next.js App <-> PostgreSQL | TCP 5432 via `postgres` driver | `DATABASE_URL` must use hostname `db` (docker-compose service name) instead of `localhost`. Connection string: `postgres://nextmind:nextmind_secret@db:5432/nextmind` |
| Next.js App <-> unstorage | Local filesystem I/O | `STORAGE_LOCAL_PATH` path must be inside a Docker bind mount or named volume. The singleton `getStorage()` caches the driver on first call -- container restart = fresh process = fresh singleton, so this is safe. |
| Playwright (host) <-> Next.js App (container) | HTTP via exposed port 3000 | `playwright.config.ts` `baseURL: 'http://localhost:3000'` works because docker-compose maps `3000:3000`. Latency is negligible (Docker bridge network on same host). |
| Vitest (container) <-> PostgreSQL | TCP 5432 | If running Vitest inside the app container, the test `DATABASE_URL` in `tests/setup.ts` must also use hostname `db`. If running on host, `localhost:5432` works if the DB port is also exposed to host. |
| Drizzle Kit <-> PostgreSQL | TCP 5432 for migration | `drizzle.config.ts` reads `process.env.DATABASE_URL` -- same pattern as the app. The entrypoint runs migrations before starting the server. |
| Auth.js middleware <-> Route handlers | In-process function calls | No Docker impact. Middleware runs in the same Node.js process. |

### New vs Modified Components

| Component | Status | Change Description |
|-----------|--------|-------------------|
| `Dockerfile` | NEW | Multi-stage build (deps, builder, runner) |
| `docker-compose.yml` | NEW | App + PostgreSQL orchestration |
| `.dockerignore` | NEW | Exclude `.git`, `node_modules`, `.next`, `data`, `coverage`, etc. |
| `docker-entrypoint.sh` | NEW | DB wait + migration + start |
| `.env.docker` | NEW | Docker-specific env template |
| `next.config.ts` | MODIFIED | Add `output: 'standalone'` (1 line) |
| `drizzle/0001_*.sql` | NEW (generated) | Migration for missing v1.1/v1.2 schema changes |
| `tests/setup.ts` | MODIFIED | Make `DATABASE_URL` configurable for Docker vs local |
| `playwright.config.ts` | MODIFIED | CI-aware `webServer` (Docker vs dev server) |
| `e2e/auth.setup.ts` | NEW | Global setup for authenticated test state |
| `e2e/*.spec.ts` | NEW (expanded) | Regression test suites for v1.0-v1.2 features |
| `src/lib/db/index.ts` | UNCHANGED | Reads `DATABASE_URL` from env, works as-is |
| `src/lib/db/schema.ts` | UNCHANGED | Already has correct schema (migration SQL is what is stale) |
| `src/auth.ts` | UNCHANGED | Auth.js reads `AUTH_URL` from env automatically |
| `src/lib/storage/provider.ts` | UNCHANGED | Reads `STORAGE_LOCAL_PATH` from env, works as-is |
| `src/middleware.ts` | UNCHANGED | In-process auth, no Docker impact |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Development / 1-5 users (current) | Single docker-compose up. Local filesystem storage. PostgreSQL on same machine. No CDN. Playwright runs on host. |
| Team deployment / 10-50 users | Docker Compose on a VPS. PostgreSQL with regular backups. S3/R2 for file storage (switch `STORAGE_DRIVER=s3`). Optional: Nginx reverse proxy for TLS termination. |
| Production / 50-1000 users | Docker Compose or Kubernetes. PostgreSQL with connection pooling (PgBouncer). Redis for singleton state (WaveScheduler, WorkflowController, ApprovalStateMachine -- already noted as TODO in codebase). Separate Playwright test pipeline in CI. |
| High availability / 1000+ users | Kubernetes with horizontal pod autoscaling. Managed PostgreSQL (RDS/Cloud SQL). Redis cluster. CDN for static assets. Object storage (S3/R2) mandatory. Separate test environment from production. |

### Scaling Priorities

1. **First bottleneck:** Database connections. The `postgres` driver creates a connection pool, but the default pool size may be too small for concurrent users. Drizzle ORM does not add connection pooling -- use PgBouncer if needed.
2. **Second bottleneck:** In-memory singletons. `WaveScheduler`, `WorkflowController`, `ApprovalStateMachine`, and the unstorage `getStorage()` singleton are all in-process. Multiple app containers = multiple independent instances. This is already documented as a known limitation in the codebase (see `src/lib/agents/workflow-controller.ts` comments about Redis).
3. **Third bottleneck:** File storage disk space. Local filesystem is fine for development but not production. The `STORAGE_DRIVER=s3` option exists but is untested in Docker context.

---

## Anti-Patterns

### Anti-Pattern 1: Skipping the Missing Migration

**What people do:** Set up Docker and run `drizzle-kit push` (which syncs schema directly to DB) instead of generating a proper migration. The app works, but there is no reproducible migration file.

**Why it's wrong:** `drizzle-kit push` is a development tool, not a deployment tool. It does not create migration files, so the schema change is not version-controlled or reproducible. In Docker, the entrypoint needs a migration file to apply. Without it, every fresh container start requires manual `push`.

**Do this instead:** Run `npm run db:generate` to create `0001_*.sql` migration file. Check it into version control. The Docker entrypoint runs `drizzle-kit migrate` which applies all migration files in order.

### Anti-Pattern 2: Forgetting AUTH_URL in Docker

**What people do:** Deploy the app in Docker without setting `AUTH_URL`. OAuth callbacks work in development because `localhost` resolves correctly, but fail in Docker because the container's internal IP is used.

**Why it's wrong:** Auth.js v5 uses the request URL to construct OAuth callback URLs. In Docker, `req.url` is the container's internal IP (e.g., `http://172.18.0.3:3000`). Google's OAuth redirect goes to this internal IP, which is unreachable from the user's browser.

**Do this instead:** Set `AUTH_URL=http://localhost:3000` (or the external URL) in the docker-compose environment. Auth.js v5 reads this automatically. The existing `src/auth.ts` does not need code changes.

### Anti-Pattern 3: Running E2E Tests Without a Real Database

**What people do:** Point Playwright at a dev server that uses mocked database connections, then claim "E2E tests pass."

**Why it's wrong:** E2E tests should exercise the full stack, including real database operations. If the DB is mocked at the ORM layer, you are not testing schema constraints, migration correctness, or actual query behavior.

**Do this instead:** Run Playwright against the Docker-deployed app (which uses the real PostgreSQL container). The existing E2E tests already hit `http://localhost:3000` -- they just need a real app behind that URL.

### Anti-Pattern 4: No Healthcheck on PostgreSQL

**What people do:** Use `depends_on: db` without `condition: service_healthy`. The app starts immediately after the DB container starts, but the DB process may not be ready to accept connections yet.

**Why it's wrong:** The app container crashes with a connection refused error, restarts, and may enter a crash loop. Docker Compose will restart it, but this adds unpredictable startup latency and can cause migration failures.

**Do this instead:** Add a `healthcheck` stanza to the PostgreSQL service and use `depends_on: db: condition: service_healthy`.

### Anti-Pattern 5: Copying node_modules Instead of Using Standalone

**What people do:** Build a simple Dockerfile that does `COPY . . && npm install && npm run build && npm start`, resulting in a 1GB+ image.

**Why it's wrong:** The full `node_modules` includes devDependencies (~300MB), test files, and build tools that are never needed at runtime. Next.js `output: 'standalone'` produces a self-contained server bundle that is 80-90% smaller.

**Do this instead:** Use the multi-stage Dockerfile pattern with `output: 'standalone'` as described in Pattern 1.

### Anti-Pattern 6: Not Persisting Upload Volume

**What people do:** Get the app running in Docker, upload files, then restart the container and find all files gone.

**Why it's wrong:** Container filesystem is ephemeral. Files written to `/app/data/uploads` inside the container are lost on restart unless that path is a Docker volume.

**Do this instead:** Add a bind mount `./data/uploads:/app/data/uploads` or a named volume in docker-compose.

---

## Build Order (Dependency-Based)

The following order minimizes rework and ensures each step has a testable output:

### Step 1: Generate Missing Drizzle Migration
**Prerequisites:** None
**Build:**
1. Verify `drizzle/0000_breezy_rhino.sql` against current `src/lib/db/schema.ts`
2. Run `npm run db:generate` to create `0001_*.sql` with missing tables/columns:
   - `file` table
   - `conversation_file` table
   - `agent_message` table
   - `workflow.checkpoint` JSONB column
3. Verify the generated SQL is correct
4. Test locally: `npm run db:migrate` against a local PostgreSQL
**Deliverable:** All schema changes are captured in migration files.
**Risk:** LOW -- `db:generate` is a well-established Drizzle Kit command.

### Step 2: Add `output: 'standalone'` to next.config.ts
**Prerequisites:** None (independent of Step 1)
**Build:**
1. Add `output: 'standalone'` to `next.config.ts`
2. Run `npm run build` and verify `.next/standalone/` is generated
3. Test: `node .next/standalone/server.js` starts the server
**Deliverable:** Next.js builds in standalone mode.
**Risk:** LOW -- this is an officially supported Next.js feature. The `typedRoutes: true` option may need verification with standalone mode (it should work fine).

### Step 3: Create Dockerfile
**Prerequisites:** Step 2 (standalone build must work)
**Build:**
1. Create multi-stage Dockerfile (deps -> builder -> runner)
2. Create `.dockerignore` (exclude `.git`, `node_modules`, `.next`, `data`, `coverage`, `test-results`, `playwright-report`, `drizzle/meta`, `.env*`)
3. Build: `docker build -t next-mind .`
4. Test: `docker run --rm next-mind` (will fail without DB, but should start the Node process)
**Deliverable:** Docker image builds successfully.
**Risk:** LOW -- follows the official Next.js Docker pattern.

### Step 4: Create docker-compose.yml
**Prerequisites:** Step 1 (migrations), Step 3 (Docker image)
**Build:**
1. Create `docker-compose.yml` with PostgreSQL + app services
2. Add PostgreSQL healthcheck
3. Add environment variables (DATABASE_URL, AUTH_URL, AUTH_SECRET)
4. Add volume mounts (pgdata, uploads)
5. Create `docker-entrypoint.sh` (wait for DB, run migrations, start server)
6. Test: `docker compose up` -- app starts and responds on localhost:3000
**Deliverable:** Full stack runs in Docker with one command.
**Risk:** MEDIUM -- the main risk is the migration step. If `drizzle-kit migrate` fails, the container exits. The `pg_isready` wait loop must be robust.

### Step 5: Create .env.docker
**Prerequisites:** Step 4
**Build:**
1. Create `.env.docker` with all required env vars documented
2. Add `AUTH_URL=http://localhost:3000`
3. Add `STORAGE_DRIVER=local` and `STORAGE_LOCAL_PATH=/app/data/uploads`
4. Update `.env.example` to include Docker-specific vars
**Deliverable:** Clear environment configuration for Docker deployment.
**Risk:** LOW.

### Step 6: Update Test Infrastructure
**Prerequisites:** Step 4 (Docker running)
**Build:**
1. Update `tests/setup.ts` to support Docker-aware `DATABASE_URL` override
2. Create `e2e/auth.setup.ts` for Playwright global authentication setup
3. Update `playwright.config.ts` with CI-aware `webServer` configuration
4. Create `docker-compose.test.yml` override for test-specific env vars
5. Verify existing unit tests pass: `npm test`
6. Verify existing E2E tests pass against Docker: `npm run test:e2e`
**Deliverable:** Test suite runs successfully against Docker-deployed app.
**Risk:** MEDIUM -- Playwright may need `storageState` configuration for auth. The `webServer` timeout may need increase for Docker startup.

### Step 7: Write Regression Test Suites
**Prerequisites:** Step 6 (test infrastructure working)
**Build:**
1. Write E2E tests for v1.0 features: chat, MCP tools, skills, approval
2. Write E2E tests for v1.1 features: agent workflow, task decomposition, controls
3. Write E2E tests for v1.2 features: file upload, management, chat integration
4. Expand existing auth E2E tests
5. Add unit tests for any gaps discovered during v1.3 validation
**Deliverable:** Comprehensive regression test coverage for all shipped features.
**Risk:** MEDIUM -- E2E tests for LLM-dependent features (chat, skills) require real API keys or mocking. MCP tool tests require the MCP server to be running.

### Step Dependencies Graph

```
Step 1 (Drizzle Migration) -----> Step 4 (docker-compose)
                                    |
Step 2 (standalone output) -----> Step 3 (Dockerfile) ---+
                                                              |
                                                              v
                                                    Step 4 (docker-compose)
                                                              |
                                                              v
                                                    Step 5 (.env.docker)
                                                              |
                                                              v
                                                    Step 6 (Test Infra)
                                                              |
                                                              v
                                                    Step 7 (Regression Tests)
```

Steps 1 and 2 are independent and can be done in parallel. Step 3 depends on Step 2. Step 4 depends on both Steps 1 and 3. Steps 5-7 are sequential after Step 4.

---

## Sources

- [Next.js Official Docker Example (vercel/next.js)](https://github.com/vercel/next.js/tree/canary/examples/with-docker) -- HIGH confidence, official Vercel repository, provides the canonical multi-stage Dockerfile pattern with `output: 'standalone'`
- [Next.js Deployment Documentation: Docker](https://nextjs.org/docs/app/building-your-application/deploying#docker-image) -- HIGH confidence, official Next.js docs, confirms `output: 'standalone'` requirement
- [Playwright Docker Documentation](https://playwright.dev/docs/docker) -- HIGH confidence, official Playwright docs, covers `mcr.microsoft.com/playwright` images and `--ipc=host` requirement
- [Auth.js v5 Docker URL Issue](https://github.com/nextauthjs/next-auth/discussions/9511) -- HIGH confidence, official GitHub discussion, confirms `AUTH_URL` / `NEXTAUTH_URL` env var requirement for container deployments
- [Drizzle Kit Migration Commands](https://orm.drizzle.team/docs/kit-overview) -- HIGH confidence, official Drizzle documentation, documents `generate` and `migrate` commands
- [Docker Compose Healthcheck Documentation](https://docs.docker.com/compose/compose-file/05-services/#healthcheck) -- HIGH confidence, official Docker documentation
- [PostgreSQL Docker Image Healthcheck](https://hub.docker.com/_/postgres) -- HIGH confidence, official Docker Hub page, documents `pg_isready` usage
- [unstorage Documentation](https://unstorage.unjs.io/) -- HIGH confidence, official documentation for the storage abstraction layer used in the codebase
- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/next-config-js/output) -- HIGH confidence, official docs for the `output` configuration option
- [Playwright webServer Configuration](https://playwright.dev/docs/test-configuration#global-setup-and-teardown) -- HIGH confidence, official docs for `webServer` and `globalSetup`
- [Existing codebase analysis](https://github.com/xavier/next-mind) -- HIGH confidence, direct code inspection of all relevant files

---

*Architecture research for: v1.3 Docker Containerization and Regression Testing*
*Researched: 2026-03-27*
*Focus: Integration with existing Next.js 16 + Drizzle ORM + Auth.js v5 + unstorage architecture*
