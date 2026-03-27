---
phase: 11
slug: docker-environment
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-27
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose 2>&1 \| tail -20` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose 2>&1 | tail -20`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | DOCK-08, TINF-06 | build | `npx next build 2>&1 \| grep -q "standalone"` | ⬜ pending |
| 11-01-02 | 01 | 1 | TINF-06 | schema | `ls drizzle/*.sql \| wc -l` — should show migration files | ⬜ pending |
| 11-01-03 | 01 | 1 | DOCK-08, TINF-06 | unit-test | `npm test` — existing tests pass after config change | ⬜ pending |
| 11-02-01 | 02 | 1 | DOCK-01, DOCK-02 | build | `docker build -t next-mind-test . 2>&1 \| tail -5` | ⬜ pending |
| 11-02-02 | 02 | 1 | DOCK-04 | lint | `grep -q "next.config" Dockerfile` | ⬜ pending |
| 11-03-01 | 03 | 2 | DOCK-04, DOCK-05 | compose | `docker compose config --quiet` | ⬜ pending |
| 11-03-02 | 03 | 2 | DOCK-06, DOCK-07 | entrypoint | `grep -q "drizzle" docker-entrypoint.sh` | ⬜ pending |
| 11-03-03 | 03 | 2 | DOCK-05 | config | `test -f .env.docker` | ⬜ pending |
| 11-04-01 | 04 | 2 | ALL | e2e | `docker compose up -d && sleep 30 && curl -sf http://localhost:3000/login` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browser loads login page | DOCK-04 | Visual verification | Open http://localhost:3000 in browser, confirm login page renders |
| Volume persistence after restart | DOCK-05 | Requires container restart | `docker compose restart app`, verify uploads persist |
| All v1.0-v1.2 tables exist | TINF-06 | Schema introspection | `docker compose exec db psql -U postgres -d nextmind -c "\dt"` |
| Image size reasonable | DOCK-08 | `docker images` output | `docker images next-mind-app` — should be ~200MB |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
