# Phase 12: Test Infrastructure - Research

**Researched:** 2026-03-27
**Domain:** Playwright E2E testing infrastructure, Auth.js v5 session management, API mocking
**Confidence:** HIGH

## Summary

Phase 12 builds the E2E test infrastructure layer that Phase 13 (regression tests) depends on. The five requirements (TINF-01 through TINF-05) are all well-scoped infrastructure tasks with established Playwright patterns. The project already has `@playwright/test@1.58.2` installed, a `playwright.config.ts` with basic config, and placeholder E2E specs in `e2e/`.

The primary technical consideration is the **"setup project with dependencies"** pattern for auth. This is Playwright's officially recommended approach (not `globalSetup`). A dedicated setup project performs login via the existing credentials provider and saves `storageState` to a JSON file. Test projects declare the setup project as a `dependency` and reference the saved state file. This gives per-project authentication without modifying business code.

For LLM mocking, `route.fulfill()` returns the full response atomically (no streaming support -- confirmed by Playwright GitHub issue #33564). This is acceptable per D-05 which decided on "single complete text response." The chat client receives the full text body just as it would after streaming completes.

The seed script will use the existing `hashPassword()` and Drizzle ORM to insert a test user directly into the database, matching the pattern already used in `src/app/api/auth/register/route.ts`. The script runs via `npx tsx scripts/seed.ts` since `tsx` is available.

**Primary recommendation:** Use Playwright's setup project dependencies pattern for auth, `route.fulfill()` for LLM mock, Drizzle direct-insert for seed, and a standard Next.js API route for the health endpoint. All five deliverables have well-established patterns -- avoid custom solutions.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** storageState reuse -- global setup logs in once via credentials API, saves cookie/storageState to file, each test case reuses it. Playwright recommended pattern.
- **D-02:** Test user creation via seed script (`db:seed`) creating test user to database, auth fixture logs in via `/api/auth/callback/credentials` to get session.
- **D-03:** Single standard test user. Simple, covers most scenarios. Multi-user when needed.
- **D-04:** Mock mechanism -- Playwright `route.fulfill` intercepts `/api/chat` requests, returns pre-constructed streaming response. No business code modification.
- **D-05:** Response format -- single complete text response, simulating streaming chunked transfer. Simple and reliable.
- **D-06:** Phase 12 only provides success response mock (generic `mockLLMResponse()` fixture). Error/timeout scenarios in Phase 13 as needed.
- **D-07:** Seed data scope -- minimal, only create one test user (email + password hash). Test data created/cleaned by individual tests.
- **D-08:** Execution via `npm run db:seed`, consistent with existing `db:*` script naming. Internally calls Drizzle insert. Runnable manually or in Docker.
- **D-09:** Health endpoint -- detailed status: DB connectivity (`SELECT 1`) + app status + timestamp, JSON `{ status, db, timestamp }`. Docker healthcheck and debugging.
- **D-10:** Health endpoint -- no auth required, public endpoint. Docker healthcheck can call directly.

### Claude's Discretion
- Playwright config webServer configuration (Docker vs local switching)
- storageState file path and naming
- Mock streaming response chunked encoding details
- Seed script test user email/password values
- Health endpoint HTTP status codes (200 vs 503)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TINF-01 | Playwright config supports env var override for baseURL (Docker vs local) | Env-driven `PLAYWRIGHT_BASE_URL` with fallback; conditional `webServer` config |
| TINF-02 | Auth fixture for quick authenticated session in E2E tests | Setup project with dependencies pattern; storageState file reuse |
| TINF-03 | LLM API calls mockable via Playwright route.fulfill, no real API key needed | `route.fulfill()` returns full text body atomically; `/api/chat` interception |
| TINF-04 | Seed script creates test user and base data in Docker environment | Drizzle direct insert via `scripts/seed.ts`; `db:seed` npm script |
| TINF-05 | /api/health returns app and DB connectivity status | Next.js API route with `db.execute(sql\`SELECT 1\`)`; public (no auth) |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @playwright/test | 1.58.2 | E2E test framework | Already installed; latest stable; setup project pattern supported |
| drizzle-orm | 0.45.1 | Database operations in seed script | Project standard ORM; used throughout codebase |
| next-auth | 5.0.0-beta.30 | Auth session management | Project standard auth; JWT sessions with credentials provider |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | 4.21.0 | TypeScript execution for seed script | `npx tsx scripts/seed.ts` -- handles TS imports natively |
| bcryptjs | 3.0.3 | Password hashing for seed | Already in deps; `hashPassword()` wraps it |
| postgres | 3.4.8 | PostgreSQL driver | Already used by `src/lib/db/index.ts` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Setup project deps pattern | globalSetup | Setup project is Playwright's recommended approach since 1.38; better isolation, per-project state |
| route.fulfill() | route.fetch() + modify | route.fulfill() is simpler for static mock; route.fetch() useful when proxying real responses with modifications |
| scripts/seed.ts | seed via API endpoint | Direct DB insert is faster, no server dependency; matches register route pattern |

**Installation:**
```bash
# No new packages needed -- all already installed
# tsx available via npx for running seed script
```

**Version verification:**
- `@playwright/test`: 1.58.2 (installed, matches npm registry latest)
- `drizzle-orm`: 0.45.1 (installed)
- `tsx`: 4.21.0 (available via npx)

## Architecture Patterns

### Recommended Project Structure
```
e2e/
├── auth.setup.ts       # Setup project: login + save storageState
├── fixtures.ts         # Custom test fixture exports (mockLLMResponse, etc.)
├── auth.spec.ts        # Existing: auth page tests (update to use fixtures)
├── session.spec.ts     # Existing: session tests (update to use fixtures)
└── ...
scripts/
├── seed.ts             # Test user seed script (new)
src/app/api/health/
└── route.ts            # Health endpoint (new)
playwright.config.ts    # Updated: env-driven baseURL, setup project
```

### Pattern 1: Setup Project with Dependencies (Auth)
**What:** A dedicated Playwright project whose only job is to log in and save session state. Test projects declare it as a dependency so Playwright runs setup first.
**When to use:** Any E2E test that requires an authenticated user.
**Example:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    // Setup project - runs first, saves auth state
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Test projects - depend on setup, use saved state
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',  // Saved by setup
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

```typescript
// e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const authFile = '.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to login
  await page.goto('/login');

  // Fill credentials
  await page.fill('input[name="email"]', 'test@nextmind.dev');
  await page.fill('input[name="password"]', 'Test123456!');

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect to home (authenticated)
  await page.waitForURL('/');

  // Save storage state (cookies + localStorage)
  await page.context().storageState({ path: authFile });
});
```

### Pattern 2: LLM Mock via route.fulfill()
**What:** Intercept `/api/chat` requests and return a static text response, bypassing the real LLM API.
**When to use:** Any E2E test that exercises chat functionality without needing real LLM API keys.
**Example:**
```typescript
// e2e/fixtures.ts
import { test as base, expect } from '@playwright/test';

// Extend base test with LLM mock fixture
export const test = base.extend({
  mockLLMResponse: async ({ page }, use) => {
    // Intercept all POST requests to /api/chat
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: 'This is a mock LLM response for E2E testing.',
      });
    });
    await use('This is a mock LLM response for E2E testing.');
  },
});

export { expect };
```

**Key limitation:** `route.fulfill()` only accepts `string | Buffer` as body. It does NOT support `ReadableStream` or streaming/chunked responses (confirmed by Playwright GitHub issue #33564). The mock returns the complete text at once. This is fine because D-05 decided on single complete text response, and the chat client handles the full text the same way it handles the final accumulated result of streaming.

### Pattern 3: Seed Script with Drizzle
**What:** A standalone TypeScript script that inserts test data directly via Drizzle ORM.
**When to use:** Before running E2E tests that need a pre-existing user.
**Example:**
```typescript
// scripts/seed.ts
import { db } from '../src/lib/db';
import { users } from '../src/lib/db/schema';
import { hashPassword } from '../src/lib/password';
import { eq } from 'drizzle-orm';

async function seed() {
  const testEmail = 'test@nextmind.dev';
  const testPassword = 'Test123456!';

  // Check if test user already exists
  const existing = await db.query.users.findFirst({
    where: eq(users.email, testEmail),
  });

  if (existing) {
    console.log('Test user already exists, skipping seed.');
    return;
  }

  // Create test user (same pattern as register route)
  const hashedPassword = await hashPassword(testPassword);
  await db.insert(users).values({
    id: crypto.randomUUID(),
    name: 'Test User',
    email: testEmail,
    password: hashedPassword,
  });

  console.log('Test user created successfully.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

### Pattern 4: Health Endpoint
**What:** A public API route that checks database connectivity and returns JSON status.
**When to use:** Docker healthcheck, monitoring, debugging.
**Example:**
```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Test database connectivity
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      db: 'disconnected',
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
```

### Anti-Patterns to Avoid
- **Using globalSetup for auth:** Older pattern; Playwright now recommends setup projects with dependencies. globalSetup cannot use `page` or `browser` APIs directly and requires more boilerplate.
- **Mocking LLM at the service layer:** Modifying `src/lib/llm/index.ts` or adding test-only code paths. Use `route.fulfill()` to intercept at the network level -- zero business code changes.
- **Seeding via API endpoint:** Creating a `/api/seed` route adds attack surface. Direct DB insert via script is safer and faster.
- **Forgetting middleware exception for /api/health:** The current middleware protects all `/api/*` routes except `/api/auth`. `/api/health` must be accessible without auth for Docker healthcheck. The middleware must be updated.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth state persistence | Custom cookie injection | Playwright `storageState` | Handles cookies, localStorage, sessionStorage correctly; official pattern |
| API request interception | Custom fetch wrapper or proxy | `page.route()` / `route.fulfill()` | Network-level interception; no code changes; test-only |
| Password hashing in seed | Custom crypto implementation | `hashPassword()` from `src/lib/password.ts` | Already handles bcrypt with 12 salt rounds; used by register route |
| User DB insertion | Raw SQL or custom query builder | Drizzle ORM `db.insert(users).values(...)` | Project standard; type-safe; matches schema |

**Key insight:** Every piece of infrastructure in this phase has a well-established solution. The challenge is wiring them together correctly, not building custom alternatives.

## Runtime State Inventory

> Phase 12 involves adding new files and modifying existing config -- no rename/migration of existing runtime state.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | New test user record in PostgreSQL (created by seed script) | Seed script creates it; idempotent (checks before insert) |
| Live service config | docker-compose.yml app service healthcheck (not yet configured) | Add healthcheck using `/api/health` endpoint |
| OS-registered state | None | None |
| Secrets/env vars | No changes needed; `DATABASE_URL` and `AUTH_SECRET` already required | None |
| Build artifacts | None -- no build step changes | None |

## Common Pitfalls

### Pitfall 1: Middleware Blocks /api/health
**What goes wrong:** The new `/api/health` endpoint returns 401 because middleware protects all `/api/*` routes except `/api/auth`.
**Why it happens:** `src/middleware.ts` line 18: `isProtectedApiRoute = req.nextUrl.pathname.startsWith('/api/') && !isApiAuthRoute`. Health endpoint matches this condition.
**How to avoid:** Add `/api/health` to the middleware's allowlist before the protected API route check.
**Warning signs:** Health endpoint works in local dev (no middleware run) but fails in Docker; `curl /api/health` returns redirect to `/login`.

### Pitfall 2: webServer Starts Even When Target Is Docker
**What goes wrong:** Playwright's `webServer` config always runs `npm run dev`, even when testing against a Docker container at `http://localhost:3000`.
**Why it happens:** `webServer.command` has no conditional logic; it always starts.
**How to avoid:** Use `reuseExistingServer: true` and check if server is already running. Alternatively, conditionally include `webServer` based on `PLAYWRIGHT_BASE_URL` env var. Best approach: if `PLAYWRIGHT_BASE_URL` is set (Docker target), skip webServer by not defining `command`.
**Warning signs:** `npm run test:e2e` starts a local dev server alongside Docker; port conflict errors.

### Pitfall 3: storageState File Not Found
**What goes wrong:** Test projects fail immediately with "Error: storageState file not found: .auth/user.json".
**Why it happens:** Setup project has not run yet, or ran but login failed silently.
**How to avoid:** Ensure `dependencies: ['setup']` is set on test projects. Make setup test assert the redirect to `/` before saving state. Add `testDir` scoping so setup test is in the right directory.
**Warning signs:** Setup test passes but `.auth/` directory is empty; setup test times out on `waitForURL('/')`.

### Pitfall 4: Seed Script Import Path Issues
**What goes wrong:** `npx tsx scripts/seed.ts` fails because imports like `@/lib/db` don't resolve from `scripts/` directory.
**Why it happens:** The `@/*` path alias is configured in `tsconfig.json` for `src/` but may not apply when running scripts outside `src/`.
**How to avoid:** Use relative imports in seed script (`import { db } from '../src/lib/db'`). Alternatively, ensure tsconfig paths are loaded by tsx via `--tsconfig` flag.
**Warning signs:** `MODULE_NOT_FOUND` errors when running `npm run db:seed`.

### Pitfall 5: route.fulfill Content-Type Mismatch
**What goes wrong:** Mock response body arrives but the chat client doesn't display it because it expects streaming format.
**Why it happens:** The real `/api/chat` returns `text/plain; charset=utf-8` with `Transfer-Encoding: chunked`. The mock must match the content type exactly.
**How to avoid:** Set `contentType: 'text/plain; charset=utf-8'` in `route.fulfill()`. The client reads the response body as text -- whether it arrives in chunks or all at once, the final result is the same text content.
**Warning signs:** Chat UI shows empty response after mock; network tab shows correct intercept but UI doesn't render.

### Pitfall 6: Test User Not Seeded Before Setup
**What goes wrong:** Auth setup test tries to log in with `test@nextmind.dev` but the user doesn't exist in the database.
**Why it happens:** Seed script was not run before E2E tests, or it ran against a different database than the app.
**How to avoid:** Document the required order: 1) start Docker/services, 2) run migrations, 3) run `npm run db:seed`, 4) run `npm run test:e2e`. Consider adding seed to a pre-test hook or Docker entrypoint.
**Warning signs:** Setup test fails at `waitForURL('/')` because login returns error; login redirects back to `/login` with error message.

## Code Examples

### Playwright Config Update (TINF-01)
```typescript
// playwright.config.ts -- Updated for env-driven baseURL and setup project
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  // Only start dev server if no external target specified
  ...(process.env.PLAYWRIGHT_BASE_URL ? {} : {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  }),
});
```

### Middleware Update for /api/health
```typescript
// src/middleware.ts -- Add /api/health to public routes
// In the middleware function, before the protected API route check:
const isHealthRoute = req.nextUrl.pathname === '/api/health';

if (isHealthRoute || isAuthPage || isApiAuthRoute) {
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}
```

### docker-compose.yml Healthcheck Addition
```yaml
# Add to app service in docker-compose.yml:
  app:
    # ... existing config ...
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```
Note: Use `wget` instead of `curl` because the Docker image is based on Alpine (Node-alpine), which includes `wget` by default but not `curl`.

### package.json Script Addition
```json
{
  "scripts": {
    "db:seed": "npx tsx scripts/seed.ts"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Playwright globalSetup for auth | Setup project with `dependencies` | Playwright 1.38+ | Cleaner isolation, per-project state, built-in retry |
| Manual cookie injection | `storageState` file reuse | Playwright 1.0+ | Official pattern; handles all browser storage |
| Custom test server mocking | `page.route()` + `route.fulfill()` | Playwright 1.0+ | Network-level interception, no code changes |
| Drizzle `db.run()` for queries | `db.execute(sql\`...\`)` for raw SQL | Drizzle 0.30+ | Correct way to run raw SQL via Drizzle |

**Deprecated/outdated:**
- Playwright `globalSetup` with manual browser launch: Use setup project pattern instead
- Auth.js v4 `getSession()` server-side: v5 uses `auth()` function

## Open Questions

1. **webServer conditional logic in Playwright config**
   - What we know: Playwright does not natively support conditional `webServer` config. Setting `command: undefined` does not skip it.
   - What's unclear: Best approach to conditionally skip `webServer` when `PLAYWRIGHT_BASE_URL` is set.
   - Recommendation: Use spread operator to conditionally include `webServer` key in config object (shown in code example above). This is a well-documented community pattern.

2. **Alpine wget availability in standalone Docker image**
   - What we know: The Dockerfile uses Node alpine base. Alpine includes `wget` (BusyBox version) by default.
   - What's unclear: Whether the standalone output stage preserves `wget` in the final image.
   - Recommendation: Verify during implementation. If `wget` is not available, use Node.js inline: `["CMD-SHELL", "node -e \"fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""]`

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Playwright, tsx | Yes | v25.8.1 | -- |
| @playwright/test | E2E framework | Yes | 1.58.2 | -- |
| Docker | Containerized testing | Yes | 29.3.1 | -- |
| tsx | Seed script execution | Yes (npx) | 4.21.0 | -- |
| PostgreSQL | Database for seed | Via Docker | 16-alpine | -- |

**Missing dependencies with no fallback:**
- None -- all required tools are available.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test --project=chromium -x` |
| Full suite command | `npx playwright test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TINF-01 | Playwright respects PLAYWRIGHT_BASE_URL env var | unit (config) | Manual verification: `PLAYWRIGHT_BASE_URL=http://example.com npx playwright test --list` | Wave 0 |
| TINF-02 | Auth setup logs in and saves storageState; tests use it | integration | `npx playwright test e2e/auth.setup.ts -x` | Wave 0 |
| TINF-03 | route.fulfill intercepts /api/chat and returns mock text | integration | `npx playwright test e2e/ -g "mock" -x` | Wave 0 |
| TINF-04 | db:seed creates test user in database | integration | `npm run db:seed && psql -c "SELECT * FROM \"user\" WHERE email='test@nextmind.dev'"` | Wave 0 |
| TINF-05 | /api/health returns status JSON with DB connectivity | unit + integration | `curl http://localhost:3000/api/health` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx playwright test --project=chromium -x`
- **Per wave merge:** `npx playwright test`
- **Phase gate:** Full E2E suite green + `npm run db:seed` idempotent + `curl /api/health` returns 200

### Wave 0 Gaps
- [ ] `e2e/auth.setup.ts` -- setup project test for auth fixture (TINF-02)
- [ ] `e2e/fixtures.ts` -- custom test fixtures including mockLLMResponse (TINF-03)
- [ ] `scripts/seed.ts` -- seed script for test user creation (TINF-04)
- [ ] `src/app/api/health/route.ts` -- health endpoint (TINF-05)
- [ ] Middleware update for `/api/health` public access
- [ ] `playwright.config.ts` update for env-driven config and setup project
- [ ] `.auth/` in `.gitignore` -- storageState files should not be committed

## Sources

### Primary (HIGH confidence)
- Playwright official docs (playwright.dev) -- auth setup project pattern, route.fulfill API, storageState
- Auth.js v5 docs (authjs.dev) -- credentials provider, JWT sessions, testing guide
- Project source code: `playwright.config.ts`, `src/auth.ts`, `src/middleware.ts`, `src/lib/db/schema.ts`, `src/lib/password.ts`, `src/app/api/chat/route.ts`, `docker-compose.yml`

### Secondary (MEDIUM confidence)
- Playwright GitHub issue #33564 -- route.fulfill does not support ReadableStream/streaming body
- Community patterns for conditional Playwright webServer config

### Tertiary (LOW confidence)
- None -- all findings verified against primary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use; no new dependencies
- Architecture: HIGH -- Playwright setup project pattern is well-documented and officially recommended
- Pitfalls: HIGH -- identified from code inspection (middleware, import paths, webServer config)

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable patterns, unlikely to change)
