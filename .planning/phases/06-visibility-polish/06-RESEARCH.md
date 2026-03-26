# Phase 6: Visibility & Polish - Research

**Researched:** 2026-03-26
**Domain:** Real-time Agent status visualization, UI integration, log persistence
**Confidence:** HIGH

## Summary

Phase 6 implements the user-facing visibility layer for multi-Agent collaboration. The core infrastructure (SSE real-time updates, workflow controls, database schema) is already in place from Phases 4-5. This phase focuses on extending `PipelineView` with collapsible log sections, progress indicators, and integrating the workflow panel into the chat message UI.

**Primary recommendation:** Extend existing `PipelineView` component rather than building from scratch. Leverage the established SSE infrastructure (`/api/workflow-status`) and reuse existing `TaskStatusIcon`, `WorkflowStatusBadge`, and `WorkflowControls` components.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01**: Agent status panel embedded below user messages, associated with task request
- **D-02**: Default collapsed showing status badge and progress; user can expand for details
- **D-03**: Each workflow bound to the user message that triggered it
- **D-04**: Auto-expand failed task log area to show errors immediately
- **D-05**: Failed workflow shows red border + "Workflow Failed" title with failed task highlighted
- **D-06**: Error logs use red text + XCircle icon
- **D-07**: Logs persisted to `agent_messages` table
- **D-08**: Users can expand historical workflow logs in message history
- **D-09**: Log granularity captures Agent lifecycle events (start, skill invocation, completion, failure)
- **D-10**: Progress indicator shows "{completed}/{total} tasks completed ({percentage}%)"
- **D-11**: Status badges: Running(blue), Completed(green), Failed(red), Pending(gray)
- **D-12**: Progress bar: 8px height, rounded, with transition animation

### Claude's Discretion
- Log entry JSON schema design
- Panel expand/collapse animation effects
- Mobile responsive layout adaptation
- Log scrolling area virtualization (for large logs)

### Deferred Ideas (OUT OF SCOPE)
- Mobile-specific layout optimization — future version
- Log search and filtering — future version
- Log export functionality — future version
- Real-time log streaming (typewriter effect) — future version

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIS-01 | Real-time display of currently executing Agent list | Extend `PipelineView` with SSE subscription; reuse `TaskStatusIcon` for running state |
| VIS-02 | Each Agent shows current status (running/completed/failed) | Existing `TaskStatus` type and `TaskStatusIcon` component cover all states |
| VIS-03 | Workflow overall progress indicator | New `WorkflowProgress` component with percentage calculation from task counts |
| VIS-04 | Agent execution logs viewable (expandable) | New `CollapsibleLogSection` + `LogEntry` components; query `agent_messages` table |
| VIS-05 | Process information displayed compactly (not overwhelming) | Collapsed default state; expand on click; max-height on log scroll area |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.0.0 | UI components | Project standard |
| Lucide React | 1.0.1 | Icons | Already used in `TaskStatusIcon` |
| @base-ui/react | 1.3.0 | Primitive components | shadcn foundation for Button, ScrollArea |
| Zod | 3.25.76 | Log schema validation | Type safety for log entries |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Drizzle ORM | 0.45.1 | Log queries | Fetching logs from `agent_messages` |
| class-variance-authority | 0.7.1 | Component variants | Log entry type styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom progress bar | shadcn Progress | Custom gives precise control over label format and animation |
| Virtualized log list | react-virtualized | Only needed if logs exceed 1000+ entries (deferred) |

**Installation:**
No new packages required. All dependencies already installed.

**Version verification:** Verified from `package.json` - all packages present.

## Architecture Patterns

### Recommended Component Structure
```
src/components/workflow/
├── pipeline-view.tsx           # Extend with collapse state
├── workflow-progress.tsx       # NEW: Progress bar component
├── agent-status-list.tsx       # NEW: Real-time agent display
├── agent-task-row.tsx          # NEW: Individual task row
├── collapsible-log-section.tsx # NEW: Expandable log viewer
├── log-entry.tsx               # NEW: Single log entry
├── task-status-icon.tsx        # REUSE: Existing
├── workflow-status-badge.tsx   # REUSE: Existing
└── workflow-controls.tsx       # REUSE: Existing
```

### Pattern 1: Collapsible Panel with State
**What:** Default collapsed, expands on user click; failed state auto-expands
**When to use:** All workflow panels embedded in chat messages
**Example:**
```typescript
// From UI-SPEC interaction pattern
const [isExpanded, setIsExpanded] = useState(false);

// Auto-expand on failure (D-04)
useEffect(() => {
  if (workflowStatus === 'failed') {
    setIsExpanded(true);
  }
}, [workflowStatus]);
```

### Pattern 2: SSE Real-time Updates
**What:** EventSource connection to `/api/workflow-status` for live task updates
**When to use:** All real-time status displays
**Example:**
```typescript
// From existing pipeline-view.tsx
useEffect(() => {
  const eventSource = new EventSource(`/api/workflow-status?workflowId=${workflowId}`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type !== 'connected' && data.taskId && data.status) {
      updateTaskStatus(data.taskId, data.status);
    }
  };

  return () => eventSource.close();
}, [workflowId]);
```

### Pattern 3: Log Entry Schema
**What:** Structured log format for persistence and retrieval
**When to use:** All agent lifecycle events
**Example:**
```typescript
// D-09: Agent lifecycle events
interface LogEntry {
  timestamp: string;        // ISO 8601
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
  agentType?: AgentType;
  skillId?: string;
  duration?: number;        // milliseconds
}
```

### Anti-Patterns to Avoid
- **Polling instead of SSE:** Use existing SSE infrastructure, don't add HTTP polling
- **Storing logs in component state:** Persist to `agent_messages` table (D-07)
- **Rebuilding status icons:** Reuse `TaskStatusIcon` component
- **Inline styles for status colors:** Use Tailwind classes matching existing patterns

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Status icons | Custom SVG | `TaskStatusIcon` | Already has all states with animation |
| Status badges | Custom badge | `WorkflowStatusBadge` | Consistent styling, i18n ready |
| SSE connection | Custom EventSource wrapper | Existing pattern in `PipelineView` | Handles heartbeat, reconnection |
| Scroll container | Custom overflow | `ScrollArea` from shadcn | Virtualization ready, accessible |

**Key insight:** The heavy lifting (SSE infrastructure, status types, database schema) is done. Focus on UI composition and log querying.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `agent_messages` table exists with `workflowId`, `taskId`, `payload` columns | Add log query function to `queries.ts` |
| Live service config | SSE broadcaster (`status-broadcaster.ts`) maintains in-memory listeners | Extend update payload to include logs |
| OS-registered state | None | N/A |
| Secrets/env vars | None new required | N/A |
| Build artifacts | None affected | N/A |

**Nothing found in category:** OS-registered state, secrets, build artifacts — verified by codebase review.

## Common Pitfalls

### Pitfall 1: Memory Leak from SSE Connections
**What goes wrong:** EventSource not closed on component unmount
**Why it happens:** Missing cleanup in useEffect return
**How to avoid:** Always return cleanup function closing EventSource
**Warning signs:** Browser network tab shows multiple active SSE connections

### Pitfall 2: Stale Progress Calculation
**What goes wrong:** Progress shows 0% after task completion
**Why it happens:** Progress computed from initial props, not updated state
**How to avoid:** Derive progress from current `waves` state, not props
**Warning signs:** Progress bar doesn't animate after status updates

### Pitfall 3: Log Entry Timestamp Format
**What goes wrong:** Timestamps show raw ISO strings or wrong timezone
**Why it happens:** No formatting applied to database timestamps
**How to avoid:** Use `Intl.DateTimeFormat` or `date-fns` for locale-aware display
**Warning signs:** Logs show "2026-03-26T14:32:15.000Z" instead of "14:32:15"

### Pitfall 4: Auto-expand Flash on Mount
**What goes wrong:** Failed workflow panel flashes expanded then collapses
**Why it happens:** Initial state is collapsed, effect runs after render
**How to avoid:** Initialize expanded state based on workflow status
**Warning signs:** Brief visual glitch when loading failed workflow

## Code Examples

### Progress Calculation
```typescript
// From UI-SPEC D-10
function calculateProgress(waves: WaveInfo[]): { completed: number; total: number; percentage: number } {
  const allTasks = waves.flatMap(w => w.tasks);
  const total = allTasks.length;
  const completed = allTasks.filter(t => t.status === 'completed').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percentage };
}
```

### Log Entry Display
```typescript
// From UI-SPEC log entry format
const levelStyles = {
  info: 'text-muted-foreground',
  success: 'text-green-600',
  error: 'text-destructive',
  warning: 'text-amber-600',
};

function LogEntry({ timestamp, level, message }: LogEntry) {
  return (
    <div className="font-mono text-xs flex gap-2">
      <span className="text-muted-foreground">
        [{formatTime(timestamp)}]
      </span>
      <span className={levelStyles[level]}>{message}</span>
    </div>
  );
}
```

### Querying Agent Logs
```typescript
// Extension to src/lib/db/queries.ts
export async function getTaskLogs(workflowId: string): Promise<AgentMessage[]> {
  return db.select()
    .from(agentMessages)
    .where(eq(agentMessages.workflowId, workflowId))
    .orderBy(agentMessages.createdAt);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTTP polling for status | SSE real-time push | Phase 4 | Reduced latency, lower server load |
| Logs in console only | Persisted to database | Phase 6 (this) | Historical audit trail, debugging |
| Static workflow display | Interactive collapse/expand | Phase 6 (this) | Better UX, less screen clutter |

**Deprecated/outdated:**
- Polling-based status updates: SSE is the established pattern
- Storing logs only in memory: Must persist for historical access (D-07, D-08)

## Open Questions

1. **Log Entry JSON Schema Detail**
   - What we know: Must capture timestamp, level, message, agent context
   - What's unclear: Exact fields for `payload` in `agent_messages` table
   - Recommendation: Define typed `LogEntryPayload` interface, store as JSON in `payload` column

2. **Workflow-to-Message Association**
   - What we know: Workflows have `conversationId`, messages have `conversationId`
   - What's unclear: How to link specific user message to workflow
   - Recommendation: Add `triggerMessageId` to `workflows` table OR derive from timestamp ordering

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | v20+ | — |
| PostgreSQL | Database | ✓ | 15+ | — |
| vitest | Testing | ✓ | 4.1.1 | — |
| @testing-library/react | Component tests | ✓ | 16.3.2 | — |

**Missing dependencies with no fallback:**
None — all required dependencies available.

**Missing dependencies with fallback:**
N/A

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | vitest.config.ts |
| Quick run command | `npm test` |
| Full suite command | `npm run test:coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIS-01 | Real-time Agent list display | unit | `vitest run tests/components/agent-status-list.test.tsx` | Wave 0 |
| VIS-02 | Agent status icons render | unit | `vitest run tests/components/task-status-icon.test.tsx` | Existing |
| VIS-03 | Progress bar updates | unit | `vitest run tests/components/workflow-progress.test.tsx` | Wave 0 |
| VIS-04 | Log section expands | unit | `vitest run tests/components/collapsible-log-section.test.tsx` | Wave 0 |
| VIS-05 | Panel collapsed by default | unit | `vitest run tests/components/pipeline-view.test.tsx` | Existing (extend) |

### Sampling Rate
- **Per task commit:** `npm test` (quick run)
- **Per wave merge:** `npm run test:coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/components/agent-status-list.test.tsx` — covers VIS-01
- [ ] `tests/components/workflow-progress.test.tsx` — covers VIS-03
- [ ] `tests/components/collapsible-log-section.test.tsx` — covers VIS-04
- [ ] `tests/lib/db/queries-logs.test.ts` — log query functions
- [ ] Extend `tests/components/pipeline-view.test.tsx` — add collapse/expand tests

*(Existing test infrastructure covers component testing patterns — see `tests/components/pipeline-view.test.tsx` for reference)*

## Sources

### Primary (HIGH confidence)
- `.planning/phases/06-visibility-polish/06-CONTEXT.md` — User decisions and constraints
- `.planning/phases/06-visibility-polish/06-UI-SPEC.md` — Complete UI design contract
- `src/components/workflow/pipeline-view.tsx` — Existing component to extend
- `src/lib/db/schema.ts` — Database schema including `agent_messages` table

### Secondary (MEDIUM confidence)
- `src/app/api/workflow-status/route.ts` — SSE endpoint implementation
- `src/lib/agents/status-broadcaster.ts` — Real-time update infrastructure
- `src/lib/db/queries.ts` — Database query patterns

### Tertiary (LOW confidence)
- None — all findings verified against source code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new dependencies, all existing
- Architecture: HIGH — Patterns established in Phases 4-5, clear extension points
- Pitfalls: HIGH — Based on actual codebase review

**Research date:** 2026-03-26
**Valid until:** 30 days (stable architecture, no external API changes expected)
