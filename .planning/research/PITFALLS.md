# Pitfalls Research: Docker Containerization & Regression Testing

**Domain:** Adding Docker containerized environment and full regression testing to an existing Next.js 16 AI Agent platform
**Researched:** 2026-03-27
**Confidence:** HIGH

---

## Critical Pitfalls

### Pitfall 1: Turbopack Standalone Output Broken in Docker

**What goes wrong:**
Next.js 16 defaults to Turbopack as its bundler. The project's `npm run build` (which uses `next build`) now uses Turbopack by default. When building a Docker image with `output: 'standalone'` in `next.config.ts`, Turbopack's standalone trace produces incorrect output -- it omits required files, generates an extra `node_modules` directory that doesn't work, and fails to properly externalize native modules. The resulting Docker container crashes at runtime with "module not found" errors.

This project's `next.config.ts` does **not** currently set `output: 'standalone'`, which means the first Docker attempt will either (a) copy the entire `.next` directory (bloated, includes build artifacts), or (b) add `output: 'standalone'` and hit this exact bug.

**Why it happens:**
Turbopack is a Rust-based bundler that uses different dependency tracing than Webpack. Its standalone output mode (which traces required files and copies them into `.next/standalone`) has known regressions tracked in GitHub issues [#88844](https://github.com/vercel/next.js/issues/88844) and [#91654](https://github.com/vercel/next.js/issues/91654). The Webpack bundler's standalone mode is more mature. Teams migrating existing projects to Docker discover this because their local dev workflow works fine (dev mode doesn't use standalone) but the Docker production build fails.

**How to avoid:**
- **Primary strategy:** Force Webpack for production builds in the Dockerfile by running `npx next build --webpack` instead of `npm run build` (which uses Turbopack by default in Next.js 16). This is the safest approach.
- **Alternative:** If Turbopack builds are required, test with the exact Next.js version (16.2.1) and verify standalone output manually before relying on it. Check the GitHub issues linked above for fix status.
- Add `output: 'standalone'` to `next.config.ts` -- this is required for efficient Docker images regardless of bundler.
- After building, manually inspect `.next/standalone/` to verify all dependencies are present before creating the production image.
- **Do not** use `--turbopack` in the build stage of the Dockerfile, even if `npm run dev` uses it.

**Warning signs:**
- `node server.js` in the Docker container crashes with `Cannot find module` for a dependency that is in `package.json`
- `.next/standalone/node_modules/` is missing packages or contains an extra directory structure not expected
- Build succeeds locally but fails at runtime in Docker
- Copying `.next/standalone` and `.next/static` into the runner stage still results in missing modules

**Phase to address:** Phase 1 (Docker Environment Setup) -- must be resolved before any Docker-based testing is possible

---

### Pitfall 2: Missing `output: 'standalone'` Configuration

**What goes wrong:**
The project's current `next.config.ts` does not include `output: 'standalone'`. Without this setting, `next build` produces a full `.next` directory that includes all source files, intermediate build artifacts, and development metadata. Copying this into a Docker image means the production image is 500+ MB instead of ~150 MB, includes unnecessary build artifacts, and requires the full `node_modules` (including devDependencies) to run.

**Why it happens:**
`output: 'standalone'` is an opt-in feature. Many Next.js projects that were never designed for Docker don't include it. The existing project has always run locally with `npm run dev` and `npm run build` + `npm run start`, where standalone output is not required.

**How to avoid:**
- Add `output: 'standalone'` to `next.config.ts` before creating the Dockerfile
- Verify that the standalone output is generated correctly: `ls .next/standalone/` should contain `server.js` and a traced `node_modules/`
- Copy only `.next/standalone`, `.next/static`, and `public/` into the production Docker image stage
- Never copy the entire `.next` directory or `node_modules` into the runner stage

**Warning signs:**
- Docker image is > 500 MB for a Next.js app
- Build stage takes a long time but runner stage still copies `node_modules`
- `npm run start` works locally but fails in Docker with module resolution errors

**Phase to address:** Phase 1 (Docker Environment Setup)

---

### Pitfall 3: Database Migration Race Condition on Container Startup

**What goes wrong:**
Docker Compose starts PostgreSQL and the Next.js app as separate services. The app attempts to connect to PostgreSQL and run Drizzle migrations (`drizzle-kit migrate`) on startup, but PostgreSQL is not yet ready to accept connections. The app crashes with `ECONNREFUSED` or `connection authentication failed`, and Docker Compose does not automatically restart it.

The project uses `drizzle-kit migrate` as a manual CLI command. When containerized, migrations must run automatically before the Next.js server starts. This is a startup ordering problem, not a build problem.

**Why it happens:**
Docker Compose `depends_on` only waits for the container to start, not for the service inside to be ready. PostgreSQL container reports "healthy" once the process starts, but the database may still be initializing (running init scripts, creating default databases, accepting first connections). A healthcheck is required to ensure PostgreSQL is actually accepting connections.

**How to avoid:**
- Add a PostgreSQL healthcheck to the docker-compose.yml:
  ```yaml
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U nextmind -d nextmind"]
    interval: 5s
    timeout: 5s
    retries: 5
  ```
- Use `depends_on: { condition: service_healthy }` for the Next.js app service
- Create an entrypoint script that runs migrations before starting the server:
  ```bash
  #!/bin/sh
  npx drizzle-kit migrate
  node server.js
  ```
- **Critical:** `drizzle-kit` is a devDependency. In a standalone build, it is NOT included. Either (a) install it separately in the production image, (b) use `drizzle-kit push` during build time instead, or (c) copy the migration files and use the `postgres` library directly to run SQL.
- Alternatively, run migrations as a separate init container or docker-compose service that runs once and exits.

**Warning signs:**
- App container exits immediately with `ECONNREFUSED` error
- `drizzle-kit migrate` not found in production image
- Migrations work locally but fail in Docker with connection errors
- Database schema is empty after containers start (migrations never ran)

**Phase to address:** Phase 1 (Docker Environment Setup) -- database must be ready before any feature regression testing

---

### Pitfall 4: unstorage Local Driver Path Not Mounted as Docker Volume

**What goes wrong:**
The project uses `unstorage` with the `fs` (filesystem) driver, defaulting to `./data/uploads` (from `STORAGE_LOCAL_PATH` in `.env.example`). Inside a Docker container, this path is inside the container's writable layer. When the container is removed and recreated (e.g., `docker-compose down && docker-compose up`), all uploaded files are permanently lost. Users who uploaded files during regression testing will find them gone after a container restart.

**Why it happens:**
The local filesystem driver writes to a relative path inside the container. Docker containers are ephemeral -- their writable layer is destroyed when the container is removed. Without a Docker volume mount, any data written to the container's filesystem is lost. The relative path `./data/uploads` resolves to `/app/data/uploads` inside the container, which is not persisted.

**How to avoid:**
- Mount a named Docker volume at the storage path in docker-compose.yml:
  ```yaml
  volumes:
    - uploads:/app/data/uploads
  ```
- Or use a bind mount for development: `./data/uploads:/app/data/uploads`
- Set `STORAGE_LOCAL_PATH=/app/data/uploads` in the container environment (absolute path inside the container)
- Verify the upload directory exists and has correct permissions in the Dockerfile:
  ```dockerfile
  RUN mkdir -p /app/data/uploads && chown nextjs:nodejs /app/data/uploads
  ```
- If the app runs as a non-root user (recommended), ensure that user has write permissions to the mounted volume

**Warning signs:**
- Files uploaded during testing disappear after `docker-compose down`
- File upload API returns 500 errors with "ENOENT: no such file or directory"
- Permission denied errors when writing to the upload directory in the container
- `ls /app/data/uploads/` is empty inside the container after uploading files

**Phase to address:** Phase 1 (Docker Environment Setup) -- file storage must persist for regression testing of v1.2 features

---

### Pitfall 5: Auth.js v5 AUTH_SECRET Regeneration Across Container Restarts

**What goes wrong:**
Auth.js v5 uses `AUTH_SECRET` to sign and encrypt JWT tokens. If `AUTH_SECRET` is not set explicitly (or is set to a different value each time the container starts), all existing sessions become invalid after a container restart. Users who were logged in will be forcibly logged out. During regression testing, this manifests as authentication tests passing on first run but failing after a container restart.

**Why it happens:**
Auth.js v5 requires a minimum 32-character `AUTH_SECRET` for JWT signing. If the environment variable is missing, Auth.js may generate a random secret at startup (behavior varies by version). If different values are used across restarts, previously issued tokens cannot be verified. The project's `.env.example` shows a placeholder value, but in Docker, environment variables must be explicitly passed through `docker-compose.yml` or an env file.

**How to avoid:**
- Generate a stable `AUTH_SECRET` once and store it in a `.env` file or Docker secrets
- Pass `AUTH_SECRET` explicitly in docker-compose.yml:
  ```yaml
  environment:
    - AUTH_SECRET=${AUTH_SECRET}
  ```
- Use a `.env` file alongside `docker-compose.yml` (Docker Compose automatically reads `.env` in the same directory)
- **Never** generate AUTH_SECRET dynamically in the Dockerfile or entrypoint script
- Verify the secret is at least 32 characters long (Auth.js v5 requirement)
- For production, use Docker secrets or a secrets manager; for regression testing, a `.env` file is sufficient

**Warning signs:**
- Users are logged out after container restart
- JWT verification errors in server logs
- `AUTH_SECRET` environment variable not found warnings
- Regression tests for authentication pass on first run but fail after restart

**Phase to address:** Phase 1 (Docker Environment Setup) -- auth must work consistently for regression testing

---

### Pitfall 6: MCP DNS Rebinding Protection Blocks Docker Network Access

**What goes wrong:**
The project's MCP route (`/api/mcp/route.ts`) implements DNS rebinding protection by validating the `Origin` header. It only allows requests from `localhost`, `127.0.0.1`, and `::1`. When running in Docker, the Next.js app is accessed through the container's hostname (e.g., `http://web:3000` or `http://next-mind-app:3000` in Docker Compose network) or through the host machine's port mapping (e.g., `http://localhost:3000`). Requests from another container or from the host machine will have an Origin header that does not match the allowlist.

**Why it happens:**
The MCP endpoint was designed for localhost-only access as a security measure (documented in `src/middleware.ts`). In a Docker Compose network, containers communicate via service names, not `localhost`. A Playwright test container trying to reach `http://next-mind-app:3000/api/mcp` will have Origin `http://next-mind-app:3000`, which is not in the allowlist. Even host-machine access through `http://localhost:3000` may fail depending on how the Origin header is set.

**How to avoid:**
- For regression testing: add the Docker Compose service name to the allowlist in `isValidOrigin()`:
  ```typescript
  const allowedHosts = ['localhost', '127.0.0.1', '::1'];
  // Add Docker Compose service names
  if (process.env.DOCKER_NETWORK === 'true') {
    allowedHosts.push(process.env.APP_HOST || 'next-mind-app');
  }
  ```
- Or, make the allowlist configurable via environment variable: `MCP_ALLOWED_ORIGINS=localhost,127.0.0.1,next-mind-app`
- For production, restrict back to localhost only
- Document this as a known difference between local and Docker environments

**Warning signs:**
- MCP API calls return 403 "Forbidden - Invalid Origin" from Docker containers
- Playwright tests for MCP features fail with 403 status codes
- API calls from host machine to Docker-mapped port work but calls between containers fail

**Phase to address:** Phase 2 (Regression Testing Setup) -- MCP features must be testable in Docker environment

---

### Pitfall 7: Playwright Cannot Reach Next.js App Inside Docker Network

**What goes wrong:**
The project's `playwright.config.ts` sets `baseURL: 'http://localhost:3000'` and `webServer.command: 'npm run dev'`. When running Playwright tests inside a Docker container (e.g., as a docker-compose service), `localhost` refers to the Playwright container itself, not the Next.js container. All tests fail with `ECONNREFUSED` because the Next.js app is running on a different container.

**Why it happens:**
Each Docker container has its own network namespace. `localhost` inside one container is not the same as `localhost` inside another container. In a Docker Compose network, containers communicate via service names. The Playwright config was written for local development where everything runs on the same machine.

**How to avoid:**
- Set `baseURL` via environment variable in playwright.config.ts:
  ```typescript
  baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  ```
- In docker-compose.yml, set `PLAYWRIGHT_BASE_URL=http://next-mind-app:3000` (using the Next.js service name)
- Disable the `webServer` config when running in Docker (the app is already running as a separate service):
  ```typescript
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  ```
- Use `depends_on` with healthcheck to ensure the Next.js app is ready before Playwright starts
- For local development, keep the existing config as-is

**Warning signs:**
- All Playwright tests fail with `ECONNREFUSED` when run in Docker
- `webServer` tries to start `npm run dev` inside the Playwright container (which doesn't have the app source)
- Tests timeout waiting for `http://localhost:3000` to respond

**Phase to address:** Phase 2 (Regression Testing Setup) -- E2E tests must run against the Docker-deployed app

---

### Pitfall 8: Bash Tool Commands Missing in Alpine-Based Docker Image

**What goes wrong:**
The project's MCP bash tool (`src/lib/mcp/tools/bash.ts`) allows 27 commands including `tree`, `stat`, `file`, `id`, `whoami`, `df`, `du`. Some of these commands are not pre-installed in Alpine-based Docker images. For example, `tree` requires `apk add tree`, and `file` requires `apk add file`. When regression tests exercise the bash tool in Docker, commands that work locally fail with "command not found."

**Why it happens:**
Alpine Linux uses a minimal package set. Commands like `tree`, `file`, and `stat` (GNU coreutils version) are not included by default. The local macOS development environment has all these commands via Homebrew or the system. The Docker image needs explicit installation of these packages.

**How to avoid:**
- Audit the `ALLOWED_COMMANDS` list in `bash.ts` and check which commands are missing in Alpine:
  - `tree` -- needs `apk add tree`
  - `file` -- needs `apk add file`
- Add required packages in the Dockerfile:
  ```dockerfile
  RUN apk add --no-cache tree file
  ```
- Alternatively, if minimizing dependencies is preferred, remove Alpine-unavailable commands from the allowlist in Docker environments
- Test each allowed command in the Docker container during the build verification phase

**Warning signs:**
- Bash tool regression tests fail with "command not found" in Docker
- `tree` command works locally but fails in container
- Different command availability between macOS (local) and Alpine (Docker)

**Phase to address:** Phase 2 (Regression Testing Setup) -- all MCP tools must work in the Docker environment

---

## Technical Debt Patterns

Shortcuts that seem reasonable when adding Docker to an existing project but create long-term problems:

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Copy entire `.next` into Docker image | No config changes needed | Image 3-5x larger, includes dev artifacts | Never -- use `standalone` output |
| Run as root in Docker container | No permission issues | Security risk, conflicts with MCP_UID/GID bash tool security | Never -- use non-root user |
| Embed secrets in Dockerfile via `ENV` | Simpler docker-compose | Secrets in image history, can't rotate without rebuild | Never -- use `.env` file or Docker secrets |
| Skip healthchecks on PostgreSQL | Simpler compose file | Race conditions, migration failures on startup | Never -- use healthcheck with `service_healthy` |
| Use `npm install` instead of `npm ci` in Docker | Works with lockfile issues | Non-reproducible builds, potential version drift | Never in Dockerfile -- always `npm ci` |
| Run `drizzle-kit migrate` in entrypoint | Automatic migrations | `drizzle-kit` not in standalone output, must install separately | Acceptable if documented; prefer separate init container |
| Use Alpine base image | Smaller image | Missing system packages, musl/glibc compatibility issues with native modules | Acceptable if system deps are audited; use `slim` if issues arise |
| Hardcode `localhost` in Playwright config | Works for local dev | Tests fail in Docker, CI environments | Never -- use environment variable for baseURL |
| Ignore `.dockerignore` | Simpler initial setup | Slower builds, larger context transfer, may include `.env` files | Never -- always create `.dockerignore` |

---

## Integration Gotchas

Common mistakes when connecting the existing Next-Mind system components in a Docker environment:

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| PostgreSQL connection string | Keep `localhost:5432` in `DATABASE_URL` | Change to `postgres:5432` (Docker service name) in docker-compose environment |
| Auth.js `AUTH_SECRET` | Not passed to container, or set per-container | Set once in `.env` file, reference via `${AUTH_SECRET}` in docker-compose |
| unstorage local driver | Path not mounted as volume | Mount Docker named volume at `/app/data/uploads` |
| MCP Origin validation | Hardcoded `localhost` allowlist | Make allowlist configurable via env var for Docker network hostnames |
| Playwright `baseURL` | Hardcoded `http://localhost:3000` | Use env var `PLAYWRIGHT_BASE_URL` for Docker service name |
| Playwright `webServer` | Tries to start dev server inside test container | Disable `webServer` in CI/Docker; rely on `depends_on` with healthcheck |
| LLM API keys | Not passed to container | Pass all `*_API_KEY` env vars through docker-compose environment section |
| MCP bash tool | Commands not available in Alpine | Audit ALLOWED_COMMANDS and install missing packages in Dockerfile |
| `MCP_UID`/`MCP_GID` env vars | Not set in Docker, defaults to 1000:1000 | Explicitly set in docker-compose; ensure user matches the non-root user in Dockerfile |
| `process.env.DATABASE_URL` in drizzle.config.ts | Reads from host environment during build, not runtime | drizzle.config.ts is only used at build time for `generate`; `migrate` uses runtime env vars from container |

---

## Performance Traps

Patterns that work locally but fail in Docker:

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Turbopack build in Docker | Build takes 6.8x longer than local (GitHub Issue #88174) | Use `--webpack` for Docker builds; keep Turbopack for local dev only | Always in Docker -- Turbopack has no file system caching benefits in containers |
| No `.dockerignore` | Docker build context is 200+ MB, takes minutes to transfer | Create `.dockerignore` excluding `node_modules`, `.next`, `.git`, `data/` | First Docker build without `.dockerignore` |
| Bind mounts for `node_modules` | macOS volume performance is 10-100x slower than native | On macOS Docker Desktop, use named volumes for `node_modules`; avoid bind mounts for hot paths | macOS Docker Desktop with bind mounts |
| Single-stage Dockerfile | Image includes build tools, 500+ MB | Use multi-stage build: deps -> builder -> runner | Production deployment |
| Running unit tests inside app container | Slow test runs, blocks app startup | Run unit tests in a separate Docker service or on host | Any test execution in Docker |
| No layer caching | Every `docker-compose build` reinstalls all dependencies | Order Dockerfile commands: copy `package*.json` first, `npm ci`, then copy source | Any rebuild after dependency changes |

---

## Security Mistakes

Domain-specific security issues when containerizing the existing system:

| Mistake | Risk | Prevention |
|---------|------|------------|
| `.env` file included in Docker build context | Secrets (API keys, DATABASE_URL, AUTH_SECRET) baked into image layers | Add `.env` to `.dockerignore`; pass secrets via docker-compose environment |
| Running as root in container | If container is compromised, attacker has root access | Create non-root user in Dockerfile; use `USER nextjs` before `CMD` |
| MCP bash tool runs as root | All 27 allowed commands execute with root privileges | `bash.ts` already checks `process.getuid() === 0` -- but ensure the Docker non-root user is not UID 0 |
| Docker socket mounted | Full host access from container | Never mount `/var/run/docker.sock` in the app container |
| DATABASE_URL in image layers | Database credentials visible in `docker history` | Use multi-stage builds (secrets only in final stage via env); use Docker secrets for production |
| Google OAuth redirect URI | OAuth redirect to `localhost` doesn't work from Docker | Update Google OAuth console to include Docker-accessible URLs; use `NEXTAUTH_URL` env var |

---

## Regression Testing Pitfalls

Mistakes specific to running regression tests against a Docker-deployed application:

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Testing only the happy path | Bugs found by users that were missed in regression | Test error paths, edge cases, and failure recovery for each v1.0-v1.2 feature |
| No test data seeding | Tests depend on manual user registration before each run | Create a seed script that populates test users, conversations, and files |
| Tests depend on execution order | Test A creates data that Test B needs, but B runs first | Make each test independent; use `beforeEach` to set up preconditions |
| E2E tests hit real LLM APIs | Tests are slow, flaky, and cost money | Mock LLM responses for regression tests; only test real APIs in dedicated integration tests |
| No cleanup between test runs | Stale data from previous runs causes false positives/negatives | Reset database between test runs; use transaction rollbacks or database snapshots |
| Ignoring v1.0 features during regression | Focus only on v1.2 (latest) features, missing regressions in older code | Systematically test all features from v1.0, v1.1, and v1.2 per the PROJECT.md requirements |
| Playwright tests assume desktop viewport | Layout issues on different screen sizes go undetected | Test at multiple viewports; the project targets teams, likely on desktop, but verify |
| No test isolation for file uploads | Upload tests leave files that affect subsequent tests | Clean up uploaded files after each test; use a dedicated test storage prefix |

---

## "Looks Done But Isn't" Checklist

Things that appear complete when adding Docker and regression testing but are missing critical pieces:

- [ ] **Docker image actually runs:** Often the build succeeds but the container crashes at runtime -- verify `docker-compose up` starts the app and it responds on port 3000
- [ ] **Database migrations ran:** Often the app starts but the schema is empty -- verify tables exist with `docker exec -it <db> psql -c '\dt'`
- [ ] **File uploads persist across restarts:** Often uploads work until container restart -- verify files exist after `docker-compose down && docker-compose up`
- [ ] **Auth sessions survive container restart:** Often AUTH_SECRET changes between restarts -- verify login persists after restart
- [ ] **Playwright tests run against Docker app:** Often tests run against local dev server instead of Docker -- verify `PLAYWRIGHT_BASE_URL` points to container
- [ ] **All env vars are passed through:** Often some env vars are forgotten in docker-compose -- verify DATABASE_URL, AUTH_SECRET, and all API keys are set
- [ ] **Non-root user has correct permissions:** Often file uploads fail with EACCES -- verify the nextjs user owns the upload directory
- [ ] **Bash tool commands are available:** Often commands work locally but not in Alpine -- verify each ALLOWED_COMMAND runs inside the container
- [ ] **`standalone` output is correct:** Often the build produces output but modules are missing -- verify `node server.js` starts without errors in the runner stage
- [ ] **Healthcheck actually detects readiness:** Often healthcheck passes before the app is ready -- verify it checks a real endpoint, not just that the process is running
- [ ] **Regression test coverage spans all milestones:** Often only the latest features are tested -- verify test plan covers v1.0 (auth, LLM, MCP, skills, approval), v1.1 (agents, scheduling, workflows), and v1.2 (storage, upload, extraction, management)
- [ ] **E2E tests clean up after themselves:** Often test data accumulates -- verify test teardown removes created users, conversations, and files

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover:

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Turbopack standalone broken in Docker | LOW | Add `--webpack` flag to build command in Dockerfile; rebuild image |
| Missing `output: 'standalone'` | LOW | Add to `next.config.ts`, rebuild Docker image |
| Database migration race condition | MEDIUM | Add healthcheck to PostgreSQL, add `service_healthy` condition, create entrypoint script |
| File uploads lost after restart | LOW | Add Docker volume mount for upload directory; restore files from backup if available |
| AUTH_SECRET changed between restarts | LOW | Set stable AUTH_SECRET in `.env` file; users must re-login once |
| MCP Origin validation blocking Docker | LOW | Add Docker service name to allowlist or make configurable via env var |
| Playwright can't reach app in Docker | LOW | Set `PLAYWRIGHT_BASE_URL` env var to Docker service URL; disable `webServer` in CI |
| Bash tool commands missing in Alpine | LOW | Add missing packages to Dockerfile; rebuild image |
| Secrets leaked in Docker image | HIGH | Rebuild image without secrets in layers; rotate all leaked credentials; use multi-stage builds |
| Tests only cover happy path | MEDIUM | Expand test plan to include error paths; prioritize based on PROJECT.md known gaps |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls for the v1.3 containerization and regression testing milestone:

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Turbopack standalone broken (Pitfall 1) | Phase 1 (Docker Setup) | `docker-compose build && docker-compose up` -- app starts and responds |
| Missing standalone output (Pitfall 2) | Phase 1 (Docker Setup) | `ls .next/standalone/server.js` exists; image size < 300 MB |
| DB migration race condition (Pitfall 3) | Phase 1 (Docker Setup) | `docker-compose up` -- app starts, `\dt` shows all tables |
| unstorage path not mounted (Pitfall 4) | Phase 1 (Docker Setup) | Upload file, `docker-compose restart`, file still accessible |
| AUTH_SECRET regeneration (Pitfall 5) | Phase 1 (Docker Setup) | Login, `docker-compose restart`, session still valid |
| MCP DNS rebinding block (Pitfall 6) | Phase 2 (Regression Testing) | MCP API call from test container returns 200 |
| Playwright can't reach app (Pitfall 7) | Phase 2 (Regression Testing) | `npx playwright test` in Docker passes auth.spec.ts |
| Bash tool commands missing (Pitfall 8) | Phase 2 (Regression Testing) | Each ALLOWED_COMMAND executes successfully in container |

---

## Sources

### HIGH Confidence (Official Documentation / Verified GitHub Issues)

- [Next.js 16.2.0 Standalone output not working in Docker (GitHub Issue #91654)](https://github.com/vercel/next.js/issues/91654) -- Confirmed Turbopack standalone output regression in 16.2.0
- [Turbopack standalone build in 16.1.x omits serverExternalPackages (GitHub Issue #88844)](https://github.com/vercel/next.js/issues/88844) -- Confirmed native module externalization bug in Turbopack standalone
- [Turbopack Docker Build ~6.8x Slower than Webpack (GitHub Issue #88174)](https://github.com/vercel/next.js/issues/88174) -- Benchmarked performance degradation in Docker containers
- [Playwright Docker Documentation](https://playwright.dev/docs/docker) -- Official Playwright Docker guidance, including `mcr.microsoft.com/playwright` image
- [Playwright CI Documentation](https://playwright.dev/docs/ci) -- Official CI setup guide with webServer configuration
- [Drizzle ORM Migrations Documentation](https://orm.drizzle.team/docs/migrations) -- Official migration patterns and approaches
- [Next.js Output File Tracing (standalone)](https://nextjs.org/docs/app/api-reference/next-config-js/output) -- Official standalone output documentation

### MEDIUM Confidence (Industry Research / Multiple Credible Sources)

- [Dockerizing a Next.js Application in 2025 (Medium)](https://medium.com/front-end-world/dockerizing-a-next-js-application-in-2025-bacdca4810fe) -- Comprehensive Docker setup guide with multi-stage builds
- [Playwright tests fail to detect Next.js local server (GitHub Issue #29682)](https://github.com/microsoft/playwright/issues/29682) -- Confirmed webServer detection issues with Next.js
- [Running Playwright in NextJS Docker (GitHub Issue #31746)](https://github.com/microsoft/playwright/issues/31746) -- Root cause: browser installed as root, tests run as different user
- [Run Playwright Integration Test in Docker Container](https://www.summerbud.org/dev-notes/run-playwright-integration-test-in-docker-container) -- baseURL configuration for Docker networks
- [Drizzle ORM Migrate on Standalone Build (Reddit)](https://www.reddit.com/r/nextjs/comments/1l4ns8k/drizzle_orm_mirgate_on_standalon_build/) -- Community discussion of drizzle-kit in standalone builds
- [Next.js 16 Turbopack Dev Container Issues (Qiita)](https://qiita.com/tksugimoto/items/7a3a1821022cb28cbadc) -- Recommendation to use `--webpack` in Docker dev containers
- [Docker Storage Drivers (Official Docker Docs)](https://docs.docker.com/engine/storage/drivers/) -- Volume vs. bind mount guidance
- [Docker Volumes for Persistent Data (OneUptime)](https://oneuptime.com/blog/post/2026-02-02-docker-volumes-persistent-data/view) -- Best practices for data persistence

### LOW Confidence (Single Source / Unverified -- Flagged for Validation)

- `bcryptjs` compatibility with Alpine -- HIGH confidence it works (pure JS), but verify with exact version used (3.0.3)
- `unpdf` (pdf.js wrapper) compatibility with Alpine -- may need additional system libraries; verify in actual Docker build
- `exceljs` compatibility with Alpine -- may have ZIP-related issues; verify in actual Docker build
- Turbopack standalone fix status for Next.js 16.2.1 -- may have been partially fixed; verify by testing the actual build

### Codebase-Specific Notes (Verified by Reading Source)

- `next.config.ts` does NOT set `output: 'standalone'` -- must be added for Docker
- `package.json` uses `next: 16.2.1` with Turbopack default for dev, Webpack for build (no `--turbopack` in build script -- verify this is still the case)
- `drizzle.config.ts` reads `DATABASE_URL` from `process.env` at config-evaluation time (build time for `generate`, runtime for `migrate`)
- `src/lib/storage/provider.ts` defaults to `./data/uploads` relative path -- needs Docker volume mount
- `src/app/api/mcp/route.ts` hardcodes `localhost`, `127.0.0.1`, `::1` as allowed hosts -- needs Docker network hostname
- `src/lib/mcp/tools/bash.ts` checks `process.getuid() === 0` for root detection -- must ensure Docker non-root user is not UID 0
- `src/auth.ts` uses JWT session strategy with 30-day maxAge -- AUTH_SECRET must be stable across restarts
- `playwright.config.ts` hardcodes `baseURL: 'http://localhost:3000'` and `webServer.command: 'npm run dev'` -- needs env var overrides for Docker
- No `.dockerignore` file exists -- must be created
- No `Dockerfile` or `docker-compose.yml` exists -- must be created from scratch

---

*Pitfalls research for: Next-Mind v1.3 Docker Containerization & Regression Testing*
*Context: Adding Docker environment and full regression verification to existing Next.js 16 AI Agent collaboration platform*
*Researched: 2026-03-27*
