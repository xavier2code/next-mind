---
phase: 9
slug: file-management-preview
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-T1 | 01 | 1 | MGMT-01, MGMT-02, MGMT-03 | unit | `npx vitest run tests/lib/db/queries-files.test.ts tests/app/api/files/list.test.ts tests/app/api/files/delete.test.ts tests/app/api/files/detail.test.ts` | ❌ W0 | ⬜ pending |
| 09-01-T2 | 01 | 1 | MGMT-05 | unit | `npx vitest run tests/lib/extraction/classifier.test.ts` | ❌ W0 | ⬜ pending |
| 09-02-T1 | 02 | 2 | MGMT-01, MGMT-03 | component | `npx vitest run tests/components/files/file-table.test.tsx tests/components/files/file-filter.test.tsx` | ❌ W0 | ⬜ pending |
| 09-02-T2 | 02 | 2 | MGMT-01 | unit | `npx vitest run tests/hooks/use-file-list.test.ts tests/hooks/use-file-detail.test.ts` | ❌ W0 | ⬜ pending |
| 09-03-T1 | 03 | 3 | MGMT-04 | component | `npx vitest run tests/components/files/preview-panel.test.tsx tests/components/files/markdown-preview.test.tsx tests/components/files/code-preview.test.tsx tests/components/files/data-preview.test.tsx` | ❌ W0 | ⬜ pending |
| 09-03-T2 | 03 | 3 | MGMT-01, MGMT-02 | component | `npx vitest run tests/app/files/page.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lib/db/queries-files.test.ts` — stubs for paginated file query
- [ ] `tests/app/api/files/list.test.ts` — stubs for list API
- [ ] `tests/app/api/files/delete.test.ts` — stubs for delete API
- [ ] `tests/app/api/files/detail.test.ts` — stubs for file detail API (GET /api/files/[id])
- [ ] `tests/components/files/` — directory for file management component tests
- [ ] `tests/lib/extraction/classifier.test.ts` — stubs for auto-classification
- [ ] `tests/hooks/` — directory for hook tests (use-file-list, use-file-detail)

*Existing infrastructure covers framework setup. New test files needed for phase-specific coverage.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Split layout rendering | MGMT-01 | Visual layout check | Navigate to /files, verify left/right panel proportions |
| Empty state display | MGMT-01 | Visual component | Create fresh user, verify empty state illustration and CTA |
| Preview type switching | MGMT-04 | Interactive UX | Click files of different types, verify correct renderer activates |
| Delete confirmation dialog | MGMT-02 | Dialog interaction | Click delete, verify modal appears with filename |
| Sidebar Files entry | MGMT-01 | Navigation | Verify FolderOpen icon appears in sidebar below New chat |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
