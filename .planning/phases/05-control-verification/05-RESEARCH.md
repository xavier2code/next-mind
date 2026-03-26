# Phase 5: Control & Verification - Research

**Researched:** 2026-03-26
**Domain:** Workflow control mechanisms, checkpoint persistence, result aggregation
**Confidence:** HIGH

## Summary

Phase 5 implements user control over multi-agent workflows (pause/resume/cancel), checkpoint-based recovery for long-running tasks, timeout enforcement, and result display with source attribution. The implementation extends existing infrastructure from Phases 3-4: `WaveScheduler` handles execution, `Workflow`/`Task` tables store state, and `PipelineView` provides the UI foundation.

**Primary recommendation:** Extend `WaveScheduler` with pause/resume control flow, add `checkpoint` JSONB column to `workflows` table, add `paused` to `WorkflowStatusEnum`, and add control buttons to `PipelineView`. Result handling is simplified to sequential display with source labels (no LLM-based merging per CONTEXT.md decisions).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Workflow Control (CTRL-01~03)
- **D-01**: Trigger method — Add Pause/Cancel/Resume buttons next to Pipeline view
- **D-02**: Pause behavior — Wait for all tasks in current Wave to complete, don't start next Wave
- **D-03**: Resume method — User clicks Resume button manually
- **D-04**: Cancel granularity — Cancel entire workflow, all tasks terminate (consistent with existing Cascade cancel)
- **D-05**: Decision points — No decision points, workflow executes fully automated, sensitive operations reuse existing approval flow

#### Checkpoint & Recovery (CTRL-04~05)
- **D-06**: Save timing — Auto-save checkpoint after each Wave completes
- **D-07**: Save content — Minimal state set:
  - Completed task results Map (taskId -> result)
  - Remaining pending task list
  - Current Wave index
- **D-08**: Recovery method — User sees paused workflows in workflow list, clicks continue
- **D-09**: Storage location — Checkpoint data stored in Workflow table's checkpoint JSONB field

#### Timeout & Error Handling (CTRL-06)
- **D-10**: Timeout limit — Each sub-agent task fixed 60 second timeout (consistent with existing SkillExecutor default)
- **D-11**: Timeout behavior — Timed-out task marked failed, Cascade cancel for dependent tasks
- **D-12**: Error strategy — Continue executing independent tasks (consistent with Phase 4 Cascade cancel)
- **D-13**: Error recording — Error info stored in Task table output field's error property

#### Result Aggregation (RSLT-01~05)
- **D-14**: Result display — Display each Agent's results sequentially by task execution order, no auto-merge
- **D-15**: Comparison feature — No side-by-side comparison view
- **D-16**: Summary generation — No additional summary generation
- **D-17**: User selection — No user selection of which result to adopt
- **D-18**: Source labeling — Each result shows source label (Agent type + Skill ID)

### Claude's Discretion
- Checkpoint data structure's specific JSON schema
- Pipeline view button's specific UI style and position
- Source label display format (e.g., `[File Agent] file-processing`)
- Pause/cancel/resume API endpoint design

### Deferred Ideas (OUT OF SCOPE)
- User-configurable timeout — Future version
- Per-task cancellation (not entire workflow) — Future version
- LLM intelligent multi-result merging — Future version
- Result comparison view — Future version
- Auto-recovery of incomplete workflows (after system restart) — Future version
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CTRL-01 | User can pause a running workflow | WaveScheduler.pauseWorkflow(), paused state in DB |
| CTRL-02 | User can cancel a specific sub-agent task | Cancel via Cascade cancel, existing pattern in scheduler.ts |
| CTRL-03 | User can provide guidance at decision points | D-05: No decision points - use existing approval flow instead |
| CTRL-04 | Long-running tasks support checkpoint saving | checkpoint JSONB column in workflows table, save after each Wave |
| CTRL-05 | Resume execution from checkpoint | WaveScheduler.resumeFromCheckpoint(), load from DB |
| CTRL-06 | Set sub-agent execution timeout limits | 60s fixed timeout, SkillExecutor.executeWithTimeout pattern |
| RSLT-01 | Result merging — multiple Agent outputs combined | D-14: Sequential display only, no merging |
| RSLT-02 | Result comparison — side-by-side view | D-15: Not implemented |
| RSLT-03 | Result summary — generate summary of multiple results | D-16: Not implemented |
| RSLT-04 | User selection — user chooses which result to adopt | D-17: Not implemented |
| RSLT-05 | Result includes source attribution | Source label format: `[AgentType] skillId` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.1 | Database ORM | Existing project standard, JSONB support for checkpoint |
| zod | ^3.25.76 | Schema validation | Existing project standard, validate checkpoint data |
| vitest | ^4.1.1 | Test framework | Existing project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/react | ^16.3.2 | React component testing | PipelineView control button tests |
| @playwright/test | ^1.58.2 | E2E testing | Full workflow pause/resume flows |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Fixed 60s timeout | Configurable per-task timeout | Simplicity vs flexibility - fixed chosen per D-10 |
| Wave-granularity checkpoint | Task-granularity checkpoint | Coarser grain simpler, matches execution model |

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── agents/
│   │   ├── scheduler.ts        # Extend with pause/resume/checkpoint
│   │   ├── executor.ts         # Already has timeout support
│   │   ├── types.ts            # Add CheckpointData interface
│   │   └── status-broadcaster.ts  # Already exists for SSE
│   └── db/
│       ├── schema.ts           # Add checkpoint column, paused status
│       └── queries.ts          # Add checkpoint CRUD functions
├── app/api/
│   └── workflow-control/
│       └── route.ts            # New: pause/resume/cancel endpoints
└── components/
    └── workflow/
        └── pipeline-view.tsx   # Add control buttons
```

### Pattern 1: WaveScheduler Pause Control
**What:** Pause between waves, allowing current wave to complete
**When to use:** User-initiated pause during workflow execution
**Example:**
```typescript
// Extend WaveScheduler class in src/lib/agents/scheduler.ts
export class WaveScheduler {
  private paused = false;
  private cancelled = false;

  async executeWaves(/* ... */): Promise<ScheduledTask[]> {
    for (const wave of waves) {
      // Check for cancellation before each wave
      if (this.cancelled) {
        // Mark remaining tasks as cancelled
        break;
      }

      // Execute current wave
      await this.executeWaveTasks(wave);

      // Check for pause after wave completes (D-02)
      if (this.paused) {
        // Save checkpoint and wait
        await this.saveCheckpoint(/* ... */);
        break;
      }
    }
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    // Continue execution from checkpoint
  }

  cancel(): void {
    this.cancelled = true;
  }
}
```

### Pattern 2: Checkpoint Data Structure
**What:** Minimal state snapshot for recovery
**When to use:** After each wave completes (D-06)
**Example:**
```typescript
// Add to src/lib/agents/types.ts
export interface CheckpointData {
  /** Workflow ID this checkpoint belongs to */
  workflowId: string;
  /** Current wave index (0-based) */
  currentWaveIndex: number;
  /** Total waves in execution plan */
  totalWaves: number;
  /** Completed task results: taskId -> result */
  completedResults: Record<string, { success: boolean; data?: unknown; error?: string }>;
  /** Remaining task IDs to execute */
  remainingTaskIds: string[];
  /** Timestamp when checkpoint was saved */
  savedAt: string; // ISO datetime
}
```

### Pattern 3: Control API Endpoints
**What:** REST endpoints for workflow control
**When to use:** UI button clicks
**Example:**
```typescript
// New file: src/app/api/workflow-control/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { workflowId, action } = await request.json();

  switch (action) {
    case 'pause':
      // D-02: Wait for current wave to complete
      await updateWorkflowStatus(workflowId, 'pausing');
      getWaveScheduler(workflowId)?.pause();
      break;
    case 'resume':
      // D-08: Load checkpoint and continue
      const checkpoint = await getWorkflowCheckpoint(workflowId);
      await updateWorkflowStatus(workflowId, 'running');
      // Resume from checkpoint...
      break;
    case 'cancel':
      // D-04: Cancel entire workflow
      await updateWorkflowStatus(workflowId, 'cancelled');
      getWaveScheduler(workflowId)?.cancel();
      break;
  }

  return NextResponse.json({ success: true });
}
```

### Pattern 4: Result Display with Source Attribution
**What:** Sequential result display with agent labels
**When to use:** After workflow completes
**Example:**
```typescript
// Extend PipelineView or create ResultView component
interface TaskResult {
  taskId: string;
  agentType: 'file' | 'search' | 'code' | 'custom';
  skillId: string;
  result: { success: boolean; data?: unknown; error?: string };
}

function formatSourceLabel(agentType: string, skillId: string): string {
  // D-18: Source label format
  return `[${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Agent] ${skillId}`;
}
```

### Anti-Patterns to Avoid
- **Blocking pause:** Don't interrupt running tasks - wait for wave boundary (D-02)
- **Per-task checkpoint:** Don't save after every task - wave granularity only (D-06)
- **LLM result merging:** Don't add complexity with AI-based result synthesis - sequential display only (D-14)
- **Decision points in workflow:** Don't add user decision gates - use existing approval flow for sensitive ops (D-05)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timeout enforcement | Custom Promise.race logic | SkillExecutor.executeWithTimeout | Already exists, handles cleanup correctly |
| Status persistence | Custom file storage | Workflow/Task tables with JSONB | Drizzle ORM handles JSONB serialization |
| Real-time UI updates | Polling or custom WebSocket | SSE via status-broadcaster.ts | Already implemented for Phase 4 |
| Cascade cancel | Custom dependency traversal | WaveScheduler's existing cascade logic | Already handles failedTaskIds Set |

**Key insight:** Phase 4 built the execution engine; Phase 5 adds control flow around it. Reuse, don't rebuild.

## Runtime State Inventory

> This is a feature-add phase (not rename/refactor), but tracking state is useful for checkpoint design.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | workflows.status (enum), tasks.status (enum) | Add 'paused' to WorkflowStatusEnum, add checkpoint JSONB column |
| Live service config | WaveScheduler in-memory state (paused/cancelled flags) | Persist to DB checkpoint on pause |
| OS-registered state | None | None |
| Secrets/env vars | None relevant | None |
| Build artifacts | None | None |

## Common Pitfalls

### Pitfall 1: Race Condition on Pause
**What goes wrong:** User clicks pause but next wave starts before flag is checked
**Why it happens:** Async execution allows wave to start before pause flag is read
**How to avoid:** Check pause flag at wave boundary only (after current wave completes), not mid-wave
**Warning signs:** Workflow continues after user clicked pause

### Pitfall 2: Checkpoint Desync
**What goes wrong:** Checkpoint doesn't match actual DB task states
**Why it happens:** Saving checkpoint without transaction, or reading stale data
**How to avoid:** Use DB transaction for checkpoint save + task status updates; load fresh data on resume
**Warning signs:** Resume shows different results than what was displayed before pause

### Pitfall 3: Timeout Not Propagating
**What goes wrong:** Task times out but status never updates in DB
**Why it happens:** SkillExecutor returns timeout error but WaveScheduler doesn't persist it
**How to avoid:** Ensure SubAgentExecutor.markTaskFailed is called for timeout (existing pattern in executor.ts:144-161)
**Warning signs:** Task shows 'running' forever after timeout period

### Pitfall 4: Memory Leak in Paused Workflows
**What goes wrong:** Paused workflows hold references and never get cleaned up
**Why it happens:** WaveScheduler instance stays in memory waiting for resume
**How to avoid:** Persist checkpoint to DB, allow WaveScheduler to be garbage collected, recreate on resume
**Warning signs:** Increasing memory usage with many paused workflows

## Code Examples

Verified patterns from existing codebase:

### Timeout Enforcement (from executor.ts:155-184)
```typescript
// Already exists in SkillExecutor - use same pattern
async executeWithTimeout(
  fn: SkillFunction,
  input: unknown,
  context: SkillContext,
  timeoutMs: number
): Promise<SkillResult> {
  return new Promise<SkillResult>((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve({
        success: false,
        error: `Skill execution timed out after ${timeoutMs}ms`,
      });
    }, timeoutMs);

    fn(input, context)
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });
  });
}
```

### Cascade Cancel (from scheduler.ts:214-231)
```typescript
// Already exists in WaveScheduler - reuse this pattern
const tasksToRun = wave.taskIds.filter(taskId => {
  const scheduledTask = scheduledTasks.find(st => st.task.id === taskId);
  if (!scheduledTask) return false;

  // Check if any dependency failed
  const task = taskMap.get(taskId);
  if (task) {
    for (const depId of task.dependencies) {
      if (failedTaskIds.has(depId)) {
        scheduledTask.status = 'cancelled';
        failedTaskIds.add(taskId);
        return false;
      }
    }
  }
  return true;
});
```

### Database Status Update (from queries.ts:41-50)
```typescript
// Pattern for updating workflow status
export async function updateWorkflowStatus(
  workflowId: string,
  status: WorkflowStatus
): Promise<Workflow | undefined> {
  const [workflow] = await db.update(workflows)
    .set({ status, updatedAt: new Date() })
    .where(eq(workflows.id, workflowId))
    .returning();
  return workflow;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling for status | SSE real-time push | Phase 4 | Lower latency, less server load |
| Sequential execution only | Wave-based parallel | Phase 4 | Faster completion for independent tasks |
| No checkpoint | Wave-granularity checkpoint | Phase 5 | Recovery without restart |

**Deprecated/outdated:**
- None for this phase - building on current patterns

## Open Questions

1. **Checkpoint Size Limits**
   - What we know: JSONB can store large objects, but large results may impact performance
   - What's unclear: Maximum practical checkpoint size before DB operations slow down
   - Recommendation: Start with current design, add size monitoring if needed

2. **Multi-Instance Resume**
   - What we know: status-broadcaster uses in-memory Map (noted as "use Redis for production")
   - What's unclear: If user pauses on instance A, can they resume on instance B?
   - Recommendation: Checkpoint persists to DB, so resume works - but scheduler instance is in-memory. For v1.1, assume single instance.

## Environment Availability

> Step 2.6: External dependencies for this phase

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Checkpoint storage | Assumed | 15+ | — |
| Node.js | Runtime | Yes | 20+ | — |
| Vitest | Testing | Yes | 4.1.1 | — |

**Missing dependencies with no fallback:**
- None identified

**Missing dependencies with fallback:**
- None identified

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | vitest.config.ts |
| Quick run command | `npm test` |
| Full suite command | `npm run test:coverage` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CTRL-01 | Pause workflow at wave boundary | unit | `vitest run tests/lib/agents/scheduler.test.ts -t pause` | Wave 0: extend scheduler.test.ts |
| CTRL-02 | Cancel workflow | unit | `vitest run tests/lib/agents/scheduler.test.ts -t cancel` | Wave 0: extend scheduler.test.ts |
| CTRL-04 | Save checkpoint after wave | unit | `vitest run tests/lib/agents/checkpoint.test.ts` | Wave 0: create |
| CTRL-05 | Resume from checkpoint | unit | `vitest run tests/lib/agents/checkpoint.test.ts -t resume` | Wave 0: create |
| CTRL-06 | 60s timeout enforcement | unit | `vitest run tests/lib/skills/executor.test.ts -t timeout` | Existing |
| RSLT-05 | Source label format | unit | `vitest run tests/lib/agents/result-display.test.ts` | Wave 0: create |

### Sampling Rate
- **Per task commit:** `npm test` (quick validation)
- **Per wave merge:** `npm run test:coverage` (full coverage)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/lib/agents/checkpoint.test.ts` - checkpoint save/load tests (CTRL-04, CTRL-05)
- [ ] `tests/lib/agents/result-display.test.ts` - source label formatting (RSLT-05)
- [ ] `tests/app/api/workflow-control.test.ts` - API endpoint tests (CTRL-01, CTRL-02)
- [ ] Extend `tests/lib/agents/scheduler.test.ts` - add pause/cancel test cases
- [ ] `tests/lib/db/schema-checkpoint.test.ts` - verify checkpoint column migration

## Sources

### Primary (HIGH confidence)
- `src/lib/agents/scheduler.ts` - WaveScheduler implementation, cascade cancel pattern
- `src/lib/agents/executor.ts` - SubAgentExecutor, timeout handling
- `src/lib/db/schema.ts` - WorkflowStatusEnum, workflows table structure
- `src/lib/db/queries.ts` - CRUD patterns for workflow/task
- `src/components/workflow/pipeline-view.tsx` - Existing UI component

### Secondary (MEDIUM confidence)
- `src/lib/agents/types.ts` - Type definitions
- `src/lib/agents/status-broadcaster.ts` - SSE infrastructure
- `src/app/api/workflow-status/route.ts` - API pattern for SSE

### Tertiary (LOW confidence)
- None - all findings from codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages already in use
- Architecture: HIGH - Building on established Phase 3-4 patterns
- Pitfalls: MEDIUM - Based on general async patterns, may discover edge cases

**Research date:** 2026-03-26
**Valid until:** 30 days (stable patterns, no external API dependencies)
