---
phase: 01
slug: core-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 1 — Validation Strategy

| Property | Value |
|----------|-------|
| Framework | Vitest (Vite-native, fast, TypeScript support) |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test:coverage` |
| Estimated runtime | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test:coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | CORE-05 | integration | `pnpm test api.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | CORE-06 | unit | `pnpm test audit.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | CORE-02 | e2e | `pnpm test:e2e auth.spec.ts` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | CORE-03 | e2e | `pnpm test:e2e session.spec.ts` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | LLM-01 | integration | `pnpm test llm-qwen.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 2 | LLM-02 | integration | `pnpm test llm-glm.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-03 | 03 | 2 | LLM-03 | integration | `pnpm test llm-minimax.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-04 | 03 | 2 | LLM-04 | unit | `pnpm test llm-unified.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-05 | 03 | 2 | LLM-05, SEC-05 | unit | `pnpm test retry.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-06 | 03 | 2 | LLM-06 | unit | `pnpm test qwen-streaming.test.ts` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 2 | CORE-01 | integration | `pnpm test chat.test.tsx` | ❌ W0 | ⬜ pending |
| 01-04-02 | 04 | 2 | LLM-07 | unit | `pnpm test model-selector.test.tsx` | ❌ W0 | ⬜ pending |
| 01-04-03 | 04 | 2 | CORE-04 | unit | `pnpm test search.test.ts` | ❌ W0 | ⬜ pending |
| 01-05-01 | 05 | 3 | SEC-01 | unit | `pnpm test content-filter.test.ts` | ❌ W0 | ⬜ pending |
| 01-05-02 | 05 | 3 | SEC-02 | unit | `pnpm test state.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Test Files Required

| File | Purpose | Status |
|------|---------|--------|
| `tests/setup.ts` | Vitest setup with test database | ❌ Missing |
| `tests/chat.test.tsx` | Chat component tests | ❌ Missing |
| `tests/auth.test.ts` | Authentication unit tests | ❌ Missing |
| `tests/search.test.ts` | Full-text search tests | ❌ Missing |
| `tests/llm-qwen.test.ts` | Qwen provider tests | ❌ Missing |
| `tests/llm-glm.test.ts` | GLM provider tests | ❌ Missing |
| `tests/llm-minimax.test.ts` | MiniMax provider tests | ❌ Missing |
| `tests/llm-unified.test.ts` | Unified API tests | ❌ Missing |
| `tests/retry.test.ts` | Retry logic tests | ❌ Missing |
| `tests/qwen-streaming.test.ts` | Qwen streaming tests | ❌ Missing |
| `tests/model-selector.test.tsx` | Model selector tests | ❌ Missing |
| `tests/content-filter.test.ts` | Content safety tests | ❌ Missing |
| `tests/state.test.ts` | State serialization tests | ❌ Missing |
| `tests/api.test.ts` | API route tests | ❌ Missing |
| `tests/audit.test.ts` | Audit logging tests | ❌ Missing |
| `e2e/auth.spec.ts` | Playwright e2e auth flows | ❌ Missing |
| `e2e/session.spec.ts` | Playwright e2e session tests | ❌ Missing |
| `e2e/chat.spec.ts` | Playwright e2e chat flows | ❌ Missing |

---

## Missing Automated Verification

| Behavior | REQ-ID | Reason | Steps |
|----------|--------|--------|-------|
| CORE-07 (TLS 1.3 + AES-256) | CORE-07 | Infrastructure-level; handled by Vercel/deployment | Manual verification of deployment config |

*All other phase behaviors have automated verification planned.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
