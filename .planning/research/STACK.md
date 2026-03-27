# Stack Research: v1.3 Docker Containerization + Regression Testing

**Domain:** Next.js 16 App Containerization and Test Infrastructure
**Researched:** 2026-03-27
**Confidence:** HIGH

## Context

This document covers stack additions needed exclusively for the v1.3 milestone: Docker containerized environment and comprehensive regression testing. All existing stack decisions from v1.0/v1.1/v1.2 remain unchanged -- this document specifies only what to ADD or MODIFY.

Existing stack: Next.js 16.2.1, TypeScript 5.8, PostgreSQL + Drizzle ORM 0.45.x, shadcn/ui, Vitest 4.1.x, Playwright 1.58.x, Auth.js v5, unstorage 1.17.4.

Existing test infrastructure: 62 unit test files in `tests/`, 2 E2E specs in `e2e/`, v8 coverage provider, jsdom environment, path aliases configured.

---

## Recommended Stack Additions

### Core Containerization

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Docker Engine** | 27+ | Container runtime | Industry standard. Docker Compose v2.27+ drops the obsolete `version:` field. Compose v1 fully deprecated (June 2023). |
| **Docker Compose** | v2.27+ | Multi-service orchestration | Orchestrates Next.js app + PostgreSQL. No `version:` field needed (obsolete since Compose v2). Supports `depends_on: condition: service_healthy` for startup ordering. |
| **Node.js (Docker base)** | 22-alpine | Runtime inside container | Next.js 16 requires minimum 20.9+ (Node 18 dropped). Node 22 LTS is in Maintenance LTS until April 2026. Alpine variant reduces image ~40MB vs slim. Project uses Node 24.14.0 locally for development but 22-alpine is the right choice for the Docker image -- maximum stability, battle-tested with Next.js 16. |
| **PostgreSQL (Docker image)** | 17-alpine | Database service | Latest PostgreSQL major version. Alpine variant for minimal footprint. Official `postgres` image includes `pg_isready` for healthchecks. |
| **`output: 'standalone'`** | next.config.ts flag | Optimized self-contained build | Next.js standalone mode traces server dependencies and produces a minimal output. Without it, the full `node_modules` (~300-500MB) must be copied into the Docker image. Reduces image from 2GB+ to ~200MB. |

### Regression Testing Infrastructure

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Vitest** | 4.1.x (already installed) | Unit + integration tests | Already configured with jsdom, path aliases, v8 coverage. 62 test files exist across lib, app/api, hooks, and chat directories. No changes to the framework needed. |
| **@testing-library/react** | 16.3.x (already installed) | Component testing | Already installed and configured via `tests/setup.ts` with cleanup. |
| **Playwright** | 1.58.x (already installed) | E2E regression tests | Already configured for Chromium with CI mode (retries: 2, single worker). 2 spec files exist. Needs expansion for full v1.0-v1.2 regression coverage. |
| **@playwright/test** | 1.58.x (already installed) | E2E test runner | Part of existing stack. webServer config starts `npm run dev` on localhost:3000. |

**No new npm packages are needed for this milestone.** Docker and Docker Compose are external tools. The existing Vitest + Playwright stack is sufficient.

---

## Docker Configuration

### Dockerfile (Multi-Stage Build)

Based on the official `vercel/next.js/examples/with-docker` pattern, adapted for next-mind:

```dockerfile
# syntax=docker/dockerfile:1

ARG NODE_VERSION=22-alpine

# --- Stage 1: Base ---
FROM node:${NODE_VERSION} AS base

# --- Stage 2: Dependencies ---
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# --- Stage 3: Builder ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time env vars (needed for next build)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx next build

# --- Stage 4: Runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy migration files for entrypoint
COPY --from=builder /app/drizzle ./drizzle
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
```

**Key adaptations for next-mind:**
- **Node 22-alpine** (not 24) for stability. The official example defaults to Node 24.13.0-slim but Node 24 LTS only entered Active LTS in October 2025. Node 22 has been battle-tested longer.
- **Copy `drizzle/` migration files** into the runner stage so the entrypoint can run migrations.
- **Include `entrypoint.sh`** that runs `drizzle-kit migrate` before starting the server.
- **`libc6-compat`** installed in deps stage for Node.js compatibility on Alpine (musl vs glibc).
- **Non-root user** (`nextjs:nodejs`, UID 1001) for security best practice.

### next.config.ts Modification Required

Add `output: 'standalone'` to the existing config:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',  // <-- ADD THIS for Docker
  typedRoutes: true,
  serverActions: {
    bodySizeLimit: '10mb',
  },
};

export default nextConfig;
```

### entrypoint.sh

```bash
#!/bin/sh
set -e

echo "Running database migrations..."
npx drizzle-kit migrate

echo "Starting Next.js server..."
exec "$@"
```

Uses `exec "$@"` to replace the shell process with the Node.js server (proper signal handling for graceful shutdown).

### docker-compose.yml

```yaml
services:
  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: nextmind
      POSTGRES_PASSWORD: nextmind
      POSTGRES_DB: nextmind
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nextmind -d nextmind"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://nextmind:nextmind@db:5432/nextmind
      AUTH_SECRET: ${AUTH_SECRET:-dev-secret-key-min-32-characters-long-xxxxxxxx}
      QWEN_API_KEY: ${QWEN_API_KEY:-}
      GLM_API_KEY: ${GLM_API_KEY:-}
      MINIMAX_API_KEY: ${MINIMAX_API_KEY:-}
      MCP_UID: "1001"
      MCP_GID: "1001"
      STORAGE_DRIVER: local
      STORAGE_LOCAL_PATH: /app/data/uploads
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - uploads:/app/data/uploads

volumes:
  pgdata:
  uploads:
```

**Key design decisions:**
- **No `version:` field** -- obsolete in Docker Compose v2.27+. Including it causes warnings/errors.
- **`depends_on: condition: service_healthy`** -- app waits for PostgreSQL to actually accept connections, not just for the container to start. Requires the healthcheck definition on the db service.
- **`start_period: 30s`** on the healthcheck -- gives PostgreSQL time to initialize before health check failures start counting.
- **Named volumes** (`pgdata`, `uploads`) -- data persists across `docker compose down` (but not `docker compose down -v`).
- **`MCP_UID`/`MCP_GID` set to 1001** -- matches the non-root user in the Dockerfile, so bash tool execution runs with the correct permissions.
- **LLM API keys from host environment** -- Docker Compose reads from the host's `.env` file automatically. Empty defaults mean the app starts but LLM features fail gracefully.

### .dockerignore

```
node_modules
.next
.git
.gitignore
README.md
CLAUDE.md
.env
.env.local
.env*.local
drizzle/
coverage/
test-results/
playwright-report/
*.md
.vscode/
.idea/
.claude/
e2e/
tests/
```

**Critical: `drizzle/` is excluded from build context** (it's large) but **copied explicitly in the Dockerfile** from the builder stage. This is intentional -- the build context exclude prevents Docker from sending migration snapshots to the daemon, while the Dockerfile COPY instruction pulls them from the builder's output.

### docker-compose.dev.yml (Optional Override)

For development with hot-reload:

```yaml
services:
  app:
    build:
      target: deps
    command: npx next dev --turbopack
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
```

Usage: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`

---

## Regression Testing Strategy

### What Exists Already

| Metric | Count | Status |
|--------|-------|--------|
| Unit test files | ~62 files in `tests/` | Well-organized by module |
| Test directories | `tests/lib/`, `tests/app/api/`, `tests/hooks/`, `tests/chat/`, `tests/skills/`, `tests/integration/` | Comprehensive structure |
| E2E spec files | 2 files in `e2e/` (`auth.spec.ts`, `session.spec.ts`) | Needs expansion |
| Coverage provider | v8, reporters: text/json/html | Configured, no thresholds |
| CI configuration | retries: 2, 1 worker on CI | Already CI-ready |
| Path aliases | `@/*` mapped to `./src/*` | Works in both Vitest and Next.js |
| Test timeout | 10,000ms | Reasonable for unit tests |

### What to Add (No New Dependencies)

**1. Expand E2E test coverage** from 2 specs to cover v1.0-v1.2 features:

| Feature Area | Existing E2E | Needed E2E |
|-------------|-------------|-----------|
| Authentication | auth.spec.ts | Already covered |
| Session management | session.spec.ts | Already covered |
| Chat interface | Missing | New: send message, receive response, streaming |
| MCP tools | Missing | New: tool invocation, bash tool, resource access |
| Skills panel | Missing | New: skill list, skill execution, approval flow |
| Agent workflow | Missing | New: task decomposition, workflow status, pause/resume |
| File upload | Missing | New: upload file, file list, file preview, extract content |
| File management | Missing | New: delete file, file status tracking |

**2. Add coverage thresholds** to `vitest.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: ['node_modules/', 'tests/', '*.config.ts'],
  thresholds: {
    branches: 60,
    functions: 60,
    lines: 60,
    statements: 60,
  },
},
```

Set thresholds at 60% initially (not 80%+) to avoid blocking development. The existing 62 test files likely already exceed this. Raise thresholds incrementally in future milestones.

**3. Add a `test:regression` npm script:**

```json
{
  "test:regression": "vitest run && playwright test"
}
```

Runs unit tests first (fast), then E2E tests (slow). Fails fast if unit tests fail.

**4. Manual walkthrough checklist** (not code, but documentation):

A structured checklist for each milestone (v1.0, v1.1, v1.2) with PASS/FAIL per feature. This is the "manual walkthrough" component of regression testing. Format:

```
## v1.0 Regression Checklist
- [ ] Auth: Login with credentials
- [ ] Auth: Google OAuth login
- [ ] LLM: Send chat message, receive streaming response
- [ ] MCP: Tool invocation via chat
- [ ] MCP: Bash tool execution
- [ ] Skills: View skill panel
- [ ] Skills: Execute skill
- [ ] Approval: Approval request flow
- [ ] Audit: Audit log entries created
...
```

---

## Installation

No new npm packages required. Docker and Docker Compose are external tools.

```bash
# Docker installation (macOS)
brew install --cask docker

# Or download Docker Desktop from https://www.docker.com/products/docker-desktop/

# Verify
docker --version           # Should be 27+
docker compose version     # Should be v2.27+

# One-command full stack startup
docker compose up --build

# Run tests against Docker environment
docker compose exec app npx vitest run          # Unit tests
npx playwright test                              # E2E tests (from host, targeting localhost:3000)
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Node 22-alpine | Node 24-slim | If you encounter C/C++ native module issues on Alpine (e.g., if adding sharp for image optimization later). Node 24 entered LTS in October 2025 and is supported, but 22 is more battle-tested. |
| Node 22-alpine | Node 22-slim | If you need glibc compatibility for native modules. Slim is Debian-based (~100MB larger than Alpine). Not needed for this project -- all dependencies are pure JS or have Alpine-compatible builds. |
| Multi-stage Dockerfile | Single-stage Dockerfile | Only for throwaway prototypes. Multi-stage reduces image from 2GB+ to ~200MB. Never acceptable for production. |
| Docker Compose | Kubernetes / Helm | Massive overkill for a single-app team deployment. Only consider for multi-region scaling, auto-scaling, or enterprise orchestration. |
| `output: 'standalone'` | Copy entire `.next` + `node_modules` | Never. Without standalone, Docker image includes 300-500MB of unnecessary dev dependencies. |
| Entrypoint script for migrations | Separate init container | Not applicable -- Docker Compose has no init containers. The entrypoint script is the standard pattern for Compose-based deployments. |
| `pg_isready` healthcheck | TCP socket check | `pg_isready` verifies the database actually accepts connections, not just that the port is open. Superior for real readiness. |
| Vitest (existing) | Jest | No reason to switch. Vitest is faster, has native ESM support, and is already configured with 62 test files. |
| Playwright (existing) | Cypress, Selenium | Playwright already configured, better multi-browser support than Cypress, lighter than Selenium. |
| Coverage thresholds at 60% | 80%+ thresholds | 80% would likely fail immediately and block the regression milestone. Start at 60%, raise incrementally. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `version:` field in docker-compose.yml | Obsolete since Docker Compose v2 (GA 2022). Causes warnings in v2.25+, errors in newer versions. | Omit entirely. |
| Node 18 in Dockerfile | Next.js 16 dropped Node 18 support. Build will fail. | Node 22-alpine (minimum 20.9+). |
| Docker Compose v1 (`docker-compose`) | Fully deprecated (June 2023). No updates. | Docker Compose v2 (`docker compose` -- no hyphen). |
| `node:XX-alpine` with glibc-dependent native modules | Alpine uses musl libc. Some native modules (sharp, certain bcrypt builds) fail. | `node:XX-slim` (Debian-based). For this project, bcryptjs (pure JS) is used, so Alpine is safe. |
| Hardcoded credentials in docker-compose.yml | Security risk if committed to VCS. | `${VAR:-default}` substitution or Docker secrets. |
| Playwright browsers in production image | Adds ~400MB of browser binaries to the production Docker image. | Run Playwright from the host against `localhost:3000`, or use a separate test stage/service. |
| `drizzle-kit push` in containers | Pushes schema directly without migration history. No rollback. Dangerous with ephemeral containers. | `drizzle-kit migrate` with versioned migration files. |
| New test frameworks (Jest, Mocha, etc.) | Unnecessary migration cost. Existing Vitest + Playwright covers all testing needs. | Keep Vitest 4.1 + Playwright 1.58. |
| Redis for this milestone | Single-instance state is noted as a limitation, but Redis migration is explicitly deferred. | In-memory singletons are fine for Docker single-instance. |
| nginx reverse proxy for this milestone | Adds complexity. The project is building a regression testing environment, not a production deployment. | Direct container port mapping (`ports: "3000:3000"`). Add nginx in a future deployment milestone. |
| Separate test database container | Over-engineering for regression testing. The PostgreSQL container can be used directly. | Single `db` service, fresh data on `docker compose down -v && docker compose up`. |

---

## Stack Patterns by Variant

**If running E2E tests against Docker environment:**
- Start services: `docker compose up --build -d`
- Wait for healthchecks: `docker compose ps` (app shows "healthy")
- Run Playwright from the host: `npx playwright test` (targets `localhost:3000`)
- Because Playwright browsers should NOT be in the production image

**If running unit tests inside the container:**
- `docker compose exec app npx vitest run`
- Because tests need the same Node.js version and dependencies as production

**If adding Drizzle Studio for database inspection:**
- `docker compose exec app npx drizzle-kit studio --host 0.0.0.0`
- Or run from host if `drizzle-kit` is installed locally
- Because Studio is a development-only tool

**If resetting the database for a clean regression run:**
- `docker compose down -v` (removes volumes)
- `docker compose up --build -d` (fresh database, migrations run via entrypoint)
- Because regression tests need a clean state

**If deploying beyond v1.3 (future, not this milestone):**
- Add nginx reverse proxy in front of Next.js
- Set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` for multi-instance support
- Use Docker secrets instead of environment variables for sensitive values
- Because production deployment has different security requirements

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 16.2.1 | Node.js 20.9+, 22.x, 24.x | Node 18 dropped. Project uses 24.14.0 locally, Docker uses 22-alpine. |
| Drizzle ORM 0.45.x | PostgreSQL 14, 15, 16, 17 | No issues with PostgreSQL 17. |
| Drizzle Kit 0.31.x | Drizzle ORM 0.45.x | Same version lineage. Migration files in `drizzle/` are portable. |
| Vitest 4.1.x | Node.js 18+, Vite 6.x | Compatible with Node 22-alpine. |
| Playwright 1.58.x | Node.js 18+ | Compatible. Browser binaries separate from Node.js version. |
| Auth.js v5 beta.30 | Next.js 15+, Node.js 18+ | Compatible with Next.js 16. |
| `postgres` driver 3.4.x | PostgreSQL 10+ | No compatibility issues. |
| `output: 'standalone'` | Next.js 12+ | Fully supported in Next.js 16. Required for Docker. |
| Docker Compose v2.27+ | Docker Engine 23+ | `depends_on: condition: service_healthy` requires Compose v2.1+. |
| PostgreSQL 17 | Drizzle ORM, `postgres` driver | Fully compatible. No known issues. |
| Node 22 EOL | April 30, 2026 | Well within project timeframe. Can upgrade to Node 24-alpine before EOL. |

---

## Integration Points with Existing Code

### next.config.ts Change
Add `output: 'standalone'`. This is a one-line change that enables Docker optimization. No other config changes needed.

### Database Migrations in Docker
The existing `drizzle/` directory has one migration file (`0000_breezy_rhino.sql`). The entrypoint script runs `drizzle-kit migrate` on container startup, which applies any pending migrations. New migrations from v1.2 (files, conversationFiles tables) should already be generated before the Docker setup is created.

### File Storage Volumes
The `.env.example` shows `STORAGE_LOCAL_PATH=./data/uploads`. In Docker, this maps to the `uploads` named volume at `/app/data/uploads`. The `STORAGE_DRIVER=local` environment variable ensures the storage layer uses the filesystem driver inside the container.

### MCP Tool Execution
The bash tool runs commands as the user specified by `MCP_UID`/`MCP_GID` environment variables. In the Docker container, the `nextjs` user has UID 1001, so these must match. The docker-compose.yml sets both to 1001.

### E2E Test Configuration
The existing `playwright.config.ts` uses `baseURL: 'http://localhost:3000'` and `webServer.command: 'npm run dev'`. For Docker-based E2E testing, this works if Playwright runs from the host while the app runs in the container. No Playwright config changes needed.

---

## Sources

- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16) -- Node.js 20.9+ requirement (HIGH confidence, official)
- [Next.js Self-Hosting Guide](https://nextjs.org/docs/app/guides/self-hosting) -- Docker deployment, streaming, multi-instance (HIGH confidence, official, updated March 25, 2026)
- [Official with-docker Example](https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile) -- Canonical Dockerfile pattern (HIGH confidence, official)
- [Official with-docker README](https://github.com/vercel/next.js/blob/canary/examples/with-docker/README.md) -- Alpine variant instructions (HIGH confidence, official)
- [Next.js Deployment Docs](https://nextjs.org/docs/app/getting-started/deploying) -- Standalone output documentation (HIGH confidence, official)
- [Docker Compose version obsolete](https://adamj.eu/tech/2025/05/05/docker-remove-obsolete-compose-version/) -- `version:` field removal (HIGH confidence, verified May 2025)
- [Docker Hub: postgres](https://hub.docker.com/_/postgres) -- Official PostgreSQL Docker image (HIGH confidence, official)
- [Docker Postgres Best Practices](https://www.docker.com/blog/how-to-use-the-postgres-docker-official-image/) -- Healthcheck patterns (HIGH confidence, official Docker blog)
- [Node.js Release Schedule](https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule) -- Node 22 EOL April 2026 (HIGH confidence, official)
- [Drizzle ORM Best Practices](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717) -- `generate` for production, `push` for dev (MEDIUM confidence, community)
- [Drizzle Migrations in Docker](https://budivoogt.com/blog/drizzle-migrations) -- Docker migration patterns (MEDIUM confidence, blog)
- [Playwright + Docker](https://www.digitalocean.com/community/tutorials/how-to-run-end-to-end-tests-using-playwright-and-docker) -- E2E testing against containers (MEDIUM confidence, tutorial)
- [Next.js 15/16 Docker Optimization](https://javascript.plainenglish.io/next-js-15-self-hosting-with-docker-complete-guide-0826e15236da) -- 80% image size reduction (MEDIUM confidence, community)
- [Docker for E2E Test Environments](https://oneuptime.com/blog/post/2026-02-08-how-to-use-docker-for-end-to-end-testing-environments/view) -- Feb 2026 guide (MEDIUM confidence)
- [Existing package.json](package.json) -- Verified all installed versions (HIGH confidence, direct inspection)
- [Existing vitest.config.ts](vitest.config.ts) -- Verified test configuration (HIGH confidence, direct inspection)
- [Existing playwright.config.ts](playwright.config.ts) -- Verified E2E configuration (HIGH confidence, direct inspection)
- [Existing drizzle.config.ts](drizzle.config.ts) -- Verified migration configuration (HIGH confidence, direct inspection)

---
*Stack research for: v1.3 Docker Containerization + Regression Testing (Next-Mind)*
*Researched: 2026-03-27*
