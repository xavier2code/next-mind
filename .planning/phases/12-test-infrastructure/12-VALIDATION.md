---
phase: 12
slug: test-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.58.2 |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test --project=chromium -x` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test --project=chromium -x`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green + `npm run db:seed` idempotent + `curl /api/health` returns 200
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | TINF-01 | config | `grep PLAYWRIGHT_BASE_URL playwright.config.ts` | ❌ W0 | ⬜ pending |
| 12-02-01 | 02 | 1 | TINF-02 | integration | `npx playwright test e2e/auth.setup.ts -x` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 1 | TINF-04 | integration | `npm run db:seed` | ❌ W0 | ⬜ pending |
| 12-03-01 | 03 | 2 | TINF-03 | integration | `npx playwright test e2e/ -g "mock" -x` | ❌ W0 | ⬜ pending |
| 12-04-01 | 04 | 2 | TINF-05 | unit+integration | `curl http://localhost:3000/api/health` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `playwright.config.ts` — env-driven baseURL, setup project, conditional webServer
- [ ] `e2e/auth.setup.ts` — setup project test for auth fixture
- [ ] `e2e/fixtures.ts` — custom test fixtures including mockLLMResponse
- [ ] `scripts/seed.ts` — seed script for test user creation
- [ ] `src/app/api/health/route.ts` — health endpoint
- [ ] `src/middleware.ts` — update for `/api/health` public access
- [ ] `.gitignore` — add `.auth/` for storageState files

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Docker healthcheck uses /api/health | TINF-05 | Requires running Docker container | Start Docker, verify `docker inspect` shows healthcheck passing |
| Seed script works in Docker | TINF-04 | Requires running Docker + PostgreSQL | `docker compose exec app npm run db:seed` then verify user exists |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
