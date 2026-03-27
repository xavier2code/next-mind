# Phase 11: Docker Environment - Research

**Researched:** 2026-03-27
**Domain:** Docker containerization (Next.js 16 + PostgreSQL + Drizzle ORM)
**Confidence:** HIGH

## Summary

This phase containerizes the Next-Mind application using a multi-stage Docker build with `output: 'standalone'`, paired with PostgreSQL in Docker Compose. The primary technical challenges are: (1) regenerating stale Drizzle migration files to include all v1.0-v1.2 tables, (2) executing migrations at container startup via an entrypoint script since `drizzle-kit` is a devDependency and not included in the standalone output, and (3) ensuring Alpine Linux compatibility with the project's native dependencies.

Next.js 16.2.1 (the project's version) has over 200 Turbopack bug fixes as of March 18, 2026, significantly improving standalone output stability. The project should first attempt `next build` with the default Turbopack bundler; if standalone output fails, fall back to `next build --webpack`. The official Next.js `with-docker` example uses Node 24-slim, but the project decided on Node 22-alpine per CONTEXT.md (D-04). Alpine compatibility is fine for exceljs and mammoth (both pure JS), and for unpdf's core text extraction. Only unpdf's `renderPageAsImage` would need `@napi-rs/canvas` native binaries, which is not used by this project's PDF-to-markdown extraction pipeline.

**Primary recommendation:** Use a multi-stage Dockerfile (dependencies -> builder -> runner), a programmatic migration script using `drizzle-orm/postgres-js/migrator` instead of the CLI `drizzle-kit migrate`, and `depends_on: condition: service_healthy` in Docker Compose to ensure PostgreSQL readiness before the Next.js container starts.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Migration Strategy
- **D-01**: Migrate tool -- Dockerfile installs drizzle-kit as a separate migration tool layer, decoupled from standalone app. Entrypoint calls `drizzle-kit migrate`.
- **D-02**: Migration files -- Regenerate migration files (`drizzle-kit generate`), delete old 0000 migration, create all tables from empty database (v1.0-v1.2 complete schema).
- **D-03**: Migration timing -- Executed by entrypoint script at container startup, after waiting for PostgreSQL readiness.

#### Base Image
- **D-04**: Base image -- Node 22-alpine. Smaller (~50MB vs ~180MB). If unpdf/exceljs/mammoth hit Alpine compatibility issues, consider switching to Debian slim or installing extra system libraries.

#### Build & Optimization
- **D-05**: Build method -- Try `next build` (Turbopack default) + standalone first. If Turbopack standalone has issues, fall back to `next build --webpack`.
- **D-06**: Build cache -- Enable Docker BuildKit cache mounts (`--mount=type=cache`) for npm install and next build.
- **D-07**: next.config.ts -- Configure `output: 'standalone'` for Docker image size optimization (DOCK-08).

#### Environment Config
- **D-08**: Environment positioning -- Pure dev/test environment. No production-grade security hardening needed. Debug tools and verbose logging acceptable.
- **D-09**: .env.docker -- Complete env var template, required vars get default values, optional vars (LLM API keys, Google OAuth) get placeholders.
- **D-10**: Volume persistence -- Minimal persistence: PostgreSQL uses named volume (pgdata), uploads use bind mount (./data/uploads -> /app/data/uploads).
- **D-11**: AUTH_URL -- Docker environment needs explicit `AUTH_URL=http://localhost:3000` (Auth.js v5 requires it in non-localhost environments).

### Claude's Discretion
- Alpine system dependency installation specifics (build-base, python3, etc., added as needed)
- Dockerfile layer structure and cache mount details
- Entrypoint script retry logic and timeout values
- docker-compose.yml port mapping, healthcheck intervals
- .dockerignore exclusion list (node_modules, .git, .planning, .next, etc.)
- Docker Compose service names and network configuration

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOCK-01 | Multi-stage Dockerfile, Node 22-alpine, standalone output | See Standard Stack + Architecture Patterns |
| DOCK-02 | docker-compose.yml with PostgreSQL + Next.js, PostgreSQL healthcheck | See Architecture Pattern 2 |
| DOCK-03 | Entrypoint auto-executes Drizzle migrations | See Architecture Pattern 3 |
| DOCK-04 | .dockerignore excludes unnecessary files | See Code Examples |
| DOCK-05 | .env.docker with complete env var configuration | See Code Examples |
| DOCK-06 | unstorage uploads persisted via Docker volume | See Architecture Pattern 2 |
| DOCK-07 | `docker compose up` starts complete dev/test environment | See Architecture Pattern 2 |
| DOCK-08 | next.config.ts `output: 'standalone'` | See Standard Stack |
| TINF-06 | Drizzle migration files include v1.1 and v1.2 table changes | See Pitfall 1 |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.1 | App framework | Project dependency, supports standalone output |
| Node.js | 22-alpine | Docker base image | D-04 decision, smaller than slim (~50MB) |
| PostgreSQL | 16-alpine | Database service | Standard for Drizzle ORM, Alpine variant available |
| drizzle-kit | 0.31.10 | Migration generation | Project devDependency, needed in build stage |
| drizzle-orm | 0.45.1 | Database ORM + programmatic migrator | Production dependency, used for runtime migrations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| postgres (npm) | ^3.4.8 | PostgreSQL client | Connection from Next.js to PostgreSQL |
| BuildKit cache mounts | Docker builtin | Build caching | Speed up npm install and next build |
| pg_isready | PostgreSQL builtin | Health check | Docker Compose healthcheck for PostgreSQL |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node 22-alpine | Node 22-slim | Larger image (~180MB vs ~50MB) but no musl compatibility risk |
| drizzle-kit CLI migrate | drizzle-orm programmatic migrate() | D-01 locks CLI approach; programmatic is backup fallback |
| Turbopack (default build) | `next build --webpack` | D-05: try Turbopack first, fallback to webpack |
| Separate drizzle-kit install | drizzle-orm/migrator only | D-01 locks drizzle-kit in Dockerfile |

**Installation:**
```bash
# No new npm packages needed -- all dependencies already in package.json
# Docker and Docker Compose must be installed on the host
```

**Version verification:**
- Next.js 16.2.1: Verified via `npm view next@16 version` -- latest is 16.2.1 (matches project)
- drizzle-kit 0.31.10: Verified via `npm view drizzle-kit version` -- latest is 0.31.10 (matches project)
- drizzle-orm 0.45.1: Verified via `npm view drizzle-orm version` -- latest is 0.45.1 (matches project)

## Architecture Patterns

### Recommended Project Structure
```
project-root/
├── Dockerfile              # Multi-stage build (NEW)
├── docker-compose.yml      # PostgreSQL + Next.js services (NEW)
├── .dockerignore           # Build context exclusions (NEW)
├── .env.docker             # Container env var template (NEW)
├── docker-entrypoint.sh    # Wait for PG + run migrations (NEW)
├── scripts/
│   └── migrate.ts          # Programmatic migration script (NEW, backup)
├── drizzle/                # Migration SQL files (REGENERATE)
│   ├── 0000_initial.sql
│   └── meta/
├── next.config.ts          # Add output: 'standalone' (MODIFY)
└── src/                    # Unchanged
```

### Pattern 1: Multi-Stage Dockerfile with Standalone Output
**What:** Three-stage build: (1) install dependencies, (2) build Next.js with standalone output, (3) minimal runner with only required files. The official Next.js `with-docker` example uses this exact pattern.
**When to use:** All Next.js Docker deployments that want minimal image size (~200MB).
**Example:**
```dockerfile
# Source: https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile
# Adapted for Node 22-alpine and this project's needs

ARG NODE_VERSION=22-alpine
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
# Install drizzle-kit for migration generation (D-01)
RUN npm install drizzle-kit@0.31.10 --save-dev
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy migration files and drizzle config for entrypoint (D-01)
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Copy entrypoint
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Install drizzle-kit for runtime migration (D-01)
RUN npm install drizzle-kit@0.31.10

# Create uploads directory
RUN mkdir -p /app/data/uploads

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
```

### Pattern 2: Docker Compose with PostgreSQL Healthcheck
**What:** Two-service Compose file: PostgreSQL with healthcheck + Next.js that depends on healthy PostgreSQL. Uses named volume for PG data and bind mount for uploads.
**When to use:** All Next.js + PostgreSQL deployments.
**Example:**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: nextmind
      POSTGRES_PASSWORD: nextmind
      POSTGRES_DB: nextmind
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nextmind -d nextmind"]
      interval: 5s
      timeout: 5s
      retries: 10

  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - .env.docker
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./data/uploads:/app/data/uploads

volumes:
  pgdata:
```

### Pattern 3: Entrypoint Script with Migration Execution
**What:** Shell script that waits for PostgreSQL (via pg_isready or application-level retry), then runs drizzle-kit migrate before starting the Node.js server. Since drizzle-kit is a devDependency and not in standalone output, it must be installed separately in the runner stage.
**When to use:** When you need to run migrations at container startup (D-01, D-03).
**Example:**
```bash
#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
until pg_isready -h "${DB_HOST:-postgres}" -p "${DB_PORT:-5432}" -U "${POSTGRES_USER:-nextmind}" -q; do
  echo "PostgreSQL is not ready yet. Waiting..."
  sleep 2
done

echo "PostgreSQL is ready. Running migrations..."
npx drizzle-kit migrate

echo "Migrations complete. Starting Next.js..."
exec "$@"
```

**Important:** `pg_isready` reports ready when PostgreSQL accepts connections, which may be before init scripts complete. For a fresh database, this is usually fine since we have no init scripts. For extra safety, add a short sleep after pg_isready succeeds, or use `depends_on: condition: service_healthy` (which waits for the healthcheck to pass).

### Anti-Patterns to Avoid
- **Copying entire node_modules to runner stage:** The standalone output already includes a pruned node_modules. Copying the full one doubles image size.
- **Running as root in production:** The official Next.js Dockerfile uses `USER node`. However, for a dev/test environment (D-08), running as root is acceptable but not ideal.
- **Using `depends_on` without healthcheck:** The service may start before PostgreSQL is ready. Always use `condition: service_healthy`.
- **Hardcoding DATABASE_URL in Dockerfile:** Always use environment variables or env_file.
- **Installing drizzle-kit in the standalone output's node_modules:** Install it separately after copying standalone output, so it does not interfere with the traced dependencies.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wait-for-postgres script | Custom TCP port polling | `pg_isready` (from postgres-alpine) + `depends_on: condition: service_healthy` | Native Docker healthcheck, zero extra tools |
| Build caching | Custom volume mounts | BuildKit `--mount=type=cache` | Standard Docker feature, automatic cleanup |
| Standalone output tracing | Custom file listing | `output: 'standalone'` in next.config.ts | Next.js traces exact dependencies automatically |
| Migration execution | Custom SQL runner | `drizzle-kit migrate` (CLI) or `drizzle-orm/postgres-js/migrator` | Handles journal, ordering, idempotency |

**Key insight:** Docker containerization is a well-solved problem. Resist the urge to write custom healthcheck scripts, connection waiters, or build optimizers. Use the platform's built-in tools.

## Common Pitfalls

### Pitfall 1: Stale Drizzle Migration Files
**What goes wrong:** The current `drizzle/0000_breezy_rhino.sql` only contains 9 tables from v1.0. It is missing 3 tables added in v1.1-v1.2: `agent_message`, `file`, `conversation_file`. Running this migration in a fresh Docker database would create an incomplete schema, causing runtime errors.
**Why it happens:** Migrations were never regenerated after v1.1 and v1.2 schema additions. The project used `drizzle-kit push` (which applies schema directly) instead of `drizzle-kit generate` + `drizzle-kit migrate`.
**How to avoid:** Before any Docker work, delete the existing `drizzle/` directory contents and run `drizzle-kit generate` against the current `schema.ts` to produce a fresh initial migration with all 13 tables. Verify the generated SQL includes CREATE TABLE statements for `agent_message`, `file`, and `conversation_file`.
**Warning signs:** Migration SQL missing tables that exist in schema.ts; `drizzle-kit generate` shows "no changes" when tables clearly differ.

### Pitfall 2: drizzle-kit Not in Standalone Output
**What goes wrong:** The standalone output traces only production dependencies. Since `drizzle-kit` is a devDependency, it is not included in `.next/standalone/node_modules/`. Calling `npx drizzle-kit migrate` in the entrypoint will fail with "command not found."
**Why it happens:** Next.js standalone output uses `output-file-tracing` to determine which `node_modules` packages are needed at runtime. DevDependencies are excluded.
**How to avoid:** Install drizzle-kit separately in the runner stage of the Dockerfile: `RUN npm install drizzle-kit@0.31.10`. This adds it after the standalone output is copied. Alternatively, use `drizzle-orm/postgres-js/migrator` programmatically (which IS a production dependency) in a small migration script.
**Warning signs:** `npx drizzle-kit: command not found` in container logs.

### Pitfall 3: Turbopack Standalone Output Issues
**What goes wrong:** `next build` with Turbopack may produce incorrect standalone output, missing files, or build errors on certain platforms (Windows has a known EINVAL bug).
**Why it happens:** Turbopack is the default bundler in Next.js 16 but standalone output tracing was historically Webpack-only. Next.js 16.2.1 has over 200 bug fixes but edge cases may remain.
**How to avoid:** Try `next build` (Turbopack default) first. If it fails, add `--webpack` flag: `next build --webpack`. The Dockerfile should support both via an ARG or build-time detection.
**Warning signs:** Build succeeds but `server.js` fails at runtime with missing module errors; `.next/standalone/` directory is incomplete.

### Pitfall 4: pg_isready Reports Ready Before DB Is Fully Initialized
**What goes wrong:** `pg_isready` returns success immediately after PostgreSQL starts accepting connections, but the database may still be initializing (creating default databases, running init scripts). Migration commands may fail with "database does not exist."
**Why it happens:** PostgreSQL's Docker entrypoint creates the database defined by POSTGRES_DB. Until that completes, the database does not exist even though the port is open.
**How to avoid:** Combine `depends_on: condition: service_healthy` with retry logic in the entrypoint script. Add a sleep (1-2s) after pg_isready succeeds, or use a connection retry loop with backoff. For this project (no init scripts, fresh DB), `pg_isready` + healthcheck should be sufficient.
**Warning signs:** Migration fails with "database nextmind does not exist" on first startup.

### Pitfall 5: Alpine musl vs glibc Native Binary Incompatibility
**What goes wrong:** Native Node.js addons compiled for glibc (Debian/Ubuntu) fail on Alpine (musl libc) with errors like "Error: /lib/libc.musl-x86_64.so.1: not found."
**Why it happens:** Alpine uses musl libc instead of glibc. Prebuilt native binaries for `linux-x64-gnu` will not work on `linux-x64-musl`.
**How to avoid:** For this project, the risk is LOW. Analysis of dependencies:
- `unpdf` core: Pure JS (pdfjs-dist) -- safe on Alpine
- `unpdf` renderPageAsImage: Uses `@napi-rs/canvas` -- NOT safe on Alpine, but this project does NOT use this feature
- `exceljs`: Pure JS -- safe
- `mammoth`: Pure JS -- safe
- `bcryptjs`: Pure JS (not bcrypt native) -- safe
- `busboy`: Pure JS -- safe
- `file-type`: Pure JS -- safe

If issues arise, install `build-base python3` in Alpine and rebuild, or switch to `node:22-slim` (Debian-based).
**Warning signs:** npm install fails with node-gyp errors; runtime "wrong ELF class" or "not found" errors for shared libraries.

### Pitfall 6: File Permission Mismatch on Bind Mounts
**What goes wrong:** Uploads directory (`./data/uploads`) created by the container (running as root by default) has root ownership on the host. Host user cannot read/write uploaded files.
**Why it happens:** Docker containers run as root by default. Files created in bind mounts inherit the container's UID.
**How to avoid:** For dev/test (D-08), this is acceptable. If needed, add `USER node` in the Dockerfile and ensure the bind mount directory has correct ownership: `mkdir -p data/uploads && chown 1000:1000 data/uploads`.
**Warning signs:** "Permission denied" when accessing uploaded files from host.

## Code Examples

Verified patterns from official sources:

### next.config.ts with Standalone Output (DOCK-08)
```typescript
// Source: https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',  // <-- ADD THIS (DOCK-08)
  typedRoutes: true,
  serverActions: {
    bodySizeLimit: '10mb',
  },
};

export default nextConfig;
```

### .dockerignore
```dockerfile
# Dependencies
node_modules
.pnpm-store

# Build output
.next
out
dist

# Version control
.git
.gitignore

# Planning / docs (not needed in image)
.planning
docs
*.md
!README.md

# Environment files (injected via env_file)
.env
.env.local
.env.*.local

# IDE
.vscode
.idea

# Testing
tests
e2e
coverage

# Docker (prevent recursive copy)
Dockerfile
docker-compose*.yml
.dockerignore

# OS files
.DS_Store
Thumbs.db

# Data (persisted via volumes)
data
```

### .env.docker
```bash
# Database (Docker internal network)
DATABASE_URL=postgresql://nextmind:nextmind@postgres:5432/nextmind

# Authentication (D-11: AUTH_URL required in Docker)
AUTH_SECRET=dev-secret-key-change-in-production-minimum-32-characters
AUTH_URL=http://localhost:3000

# PostgreSQL (for docker-compose.yml reference)
POSTGRES_USER=nextmind
POSTGRES_PASSWORD=nextmind
POSTGRES_DB=nextmind

# LLM API Keys (placeholders - app works without them for auth/UI testing)
QWEN_API_KEY=
GLM_API_KEY=
MINIMAX_API_KEY=

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# MCP Tool Execution Security
MCP_UID=1000
MCP_GID=1000

# Storage (D-10: uploads persisted via volume)
STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=/app/data/uploads
```

### Entrypoint Script
```bash
#!/bin/sh
set -e

# Wait for PostgreSQL to be ready (D-03)
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${POSTGRES_USER:-nextmind}"
MAX_RETRIES=30
RETRY_INTERVAL=2

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
attempt=0
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -q; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $MAX_RETRIES ]; then
    echo "ERROR: PostgreSQL did not become ready after ${MAX_RETRIES} attempts"
    exit 1
  fi
  echo "  Attempt ${attempt}/${MAX_RETRIES} - PostgreSQL not ready, waiting..."
  sleep $RETRY_INTERVAL
done

echo "PostgreSQL is ready. Running Drizzle migrations..."
npx drizzle-kit migrate

echo "Starting Next.js application..."
exec "$@"
```

### Migration Regeneration Steps (TINF-06)
```bash
# Step 1: Delete existing stale migrations
rm -rf drizzle/0000_*.sql drizzle/meta/

# Step 2: Generate fresh migration from current schema
# (Requires DATABASE_URL pointing to a real or disposable database)
npm run db:generate

# Step 3: Verify generated SQL includes all 13 tables
grep "CREATE TABLE" drizzle/*.sql
# Expected tables: account, agent, agent_message, audit_log, conversation,
# conversation_file, file, message, session, task, user, verificationToken, workflow
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Docker Compose v1 (`docker-compose`) | Docker Compose v2 (`docker compose`) | Docker Desktop 4.x+ | Use `docker compose` (no hyphen) in docs |
| Webpack for builds | Turbopack default in Next.js 16 | Next.js 16.0 (Feb 2026) | Faster builds, standalone output now supported |
| Manual wait scripts | `depends_on: condition: service_healthy` | Docker Compose v2.1+ | Native YAML-only dependency management |
| `drizzle-kit push` for schema sync | `drizzle-kit generate` + `migrate` | N/A (best practice) | Proper migration tracking for Docker |
| Next.js with-docker uses Node 24-slim | Project uses Node 22-alpine (D-04) | Per CONTEXT.md decision | Smaller image, potential musl issues |

**Deprecated/outdated:**
- `docker-compose` (v1 hyphenated command): Use `docker compose` (v2 plugin syntax)
- `depends_on` without `condition`: Always use `condition: service_healthy` for database services

## Open Questions

1. **Turbopack standalone output reliability on Node 22-alpine**
   - What we know: Next.js 16.2.1 has 200+ Turbopack bug fixes. The known Windows EINVAL bug is platform-specific. Official Next.js Docker example still uses `slim` (Debian), not Alpine.
   - What's unclear: Whether Turbopack standalone output works reliably on Alpine. The official example does not test this combination.
   - Recommendation: Try Turbopack first (D-05). If it fails, add `--webpack` flag. This is a build-time test, not a runtime risk.

2. **drizzle-kit 0.31.0 hang bug impact**
   - What we know: There is a reported bug where `drizzle-kit migrate@0.31.0` hangs on macOS during config parsing.
   - What's unclear: Whether this affects Linux (Alpine container) and whether 0.31.10 patches it.
   - Recommendation: Test in container. If it hangs, use the `drizzle-orm/postgres-js/migrator` programmatic approach as fallback (which is a production dependency and does not have this issue).

3. **Docker not installed on development machine**
   - What we know: Docker is not installed on the current macOS development machine (verified by `command -v docker` returning 127).
   - What's unclear: Whether the planner should include a "install Docker" step or assume it will be available.
   - Recommendation: Flag in Environment Availability section. The planner should verify Docker availability before execution.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker Engine | Build and run containers | NO | -- | Must install Docker Desktop or OrbStack |
| Docker Compose v2 | `docker compose up` | NO | -- | Included with Docker Desktop |
| Node.js 22 | Docker base image (pulled automatically) | N/A (container) | v24.14.0 local | -- |
| npm 11 | Package management in container | YES (local) | 11.9.0 | -- |
| npm ci / package-lock.json | Reproducible Docker builds | YES (local) | -- | -- |

**Missing dependencies with no fallback:**
- Docker Engine -- BLOCKS entire phase. Must install Docker Desktop for Mac, Colima, or OrbStack before any implementation.

**Missing dependencies with fallback:**
- None -- Docker is the only external dependency and has no fallback.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 + jsdom |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DOCK-01 | Multi-stage Dockerfile produces working image | manual/smoke | `docker compose build` | N/A (new file) |
| DOCK-02 | docker-compose.yml defines PG + Next.js services | manual/smoke | `docker compose config` | N/A (new file) |
| DOCK-03 | Migrations run at container startup | manual/smoke | `docker compose logs app \| grep "Running Drizzle"` | N/A (new file) |
| DOCK-04 | .dockerignore excludes unnecessary files | manual | `docker build --no-cache . 2>&1 \| head -5` | N/A (new file) |
| DOCK-05 | .env.docker has all required variables | manual | `grep DATABASE_URL .env.docker` | N/A (new file) |
| DOCK-06 | Uploads survive container restart | manual | Upload file, `docker compose restart`, verify file exists | N/A |
| DOCK-07 | `docker compose up` starts everything | manual/smoke | `docker compose up -d && curl -f http://localhost:3000/login` | N/A |
| DOCK-08 | next.config.ts has `output: 'standalone'` | unit | `grep "standalone" next.config.ts` | N/A (file exists, modify) |
| TINF-06 | Migration SQL has all v1.0-v1.2 tables | unit | `grep -c "CREATE TABLE" drizzle/*.sql` should be >= 13 | N/A (regenerate) |

### Sampling Rate
- **Per task commit:** `npx vitest run` (ensure existing tests still pass)
- **Per wave merge:** `npm test` (full unit test suite)
- **Phase gate:** `docker compose up -d && curl -f http://localhost:3000/login` (smoke test)

### Wave 0 Gaps
- [ ] No Docker-specific test files needed -- this phase is primarily infrastructure (Dockerfiles, compose configs, scripts). Validation is manual smoke testing via `docker compose up`.
- [ ] Existing unit test infrastructure covers code changes (next.config.ts modification). Run `npm test` to ensure no regressions.

## Sources

### Primary (HIGH confidence)
- [Next.js Official Deployment Docs](https://nextjs.org/docs/app/getting-started/deploying) -- Docker standalone output documentation
- [Next.js Official with-docker Example (GitHub)](https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile) -- Canonical multi-stage Dockerfile pattern
- [Next.js 16.2 Turbopack Blog](https://nextjs.org/blog/next-16-2-turbopack) -- 200+ bug fixes, standalone output improvements (published 2026-03-18)
- [Drizzle ORM Official Migrations Docs](https://orm.drizzle.team/docs/migrations) -- drizzle-kit generate/migrate workflow
- Project source files: `next.config.ts`, `drizzle.config.ts`, `src/lib/db/schema.ts`, `src/lib/db/index.ts`, `src/lib/storage/provider.ts`, `package.json`, `.env.example`

### Secondary (MEDIUM confidence)
- [Drizzle Migrations to Postgres in Production (Budi Voogt)](https://budivoogt.com/blog/drizzle-migrations) -- Programmatic migration approach using drizzle-orm/migrator
- [Ultimate Next.js Standalone Dockerfile Guide (Mar 2026)](https://buildwithmatija.com/blog/nextjs-standalone-dockerfile-guide) -- Standalone output best practices
- [Stack Overflow: Docker wait for PostgreSQL](https://stackoverflow.com/questions/35069027/docker-wait-for-postgresql-to-be-running) -- pg_isready limitations

### Tertiary (LOW confidence)
- [drizzle-kit migrate 0.31.0 hang bug](https://github.com/drizzle-team/drizzle-orm/issues/4451) -- May affect 0.31.10, needs container testing
- [unpdf Alpine compatibility analysis](https://github.com/npm/rfcs/issues/438) -- @napi-rs/canvas musl issue, but not used by this project

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All versions verified against npm registry, all patterns from official docs
- Architecture: HIGH -- Based on official Next.js Docker example and Docker Compose best practices
- Pitfalls: HIGH -- Migration staleness confirmed by reading actual SQL vs schema.ts; drizzle-kit exclusion from standalone is documented Next.js behavior; Alpine compatibility verified per-package

**Research date:** 2026-03-27
**Valid until:** 30 days (stable domain -- Docker, Next.js, Drizzle patterns change slowly)
