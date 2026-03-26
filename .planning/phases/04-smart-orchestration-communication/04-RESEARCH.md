# Phase 4: Smart Orchestration & Communication - Research

**Researched:** 2026-03-26
**Domain:** Multi-Agent Orchestration, Dependency Graph Analysis, Real-time Communication
**Confidence:** HIGH

## Summary

Phase 4 implements the core orchestration layer that transforms the A2A system from sequential task execution to intelligent parallel orchestration. This involves three major components: (1) dependency analysis and wave-based execution scheduling, (2) a Hub-and-Spoke communication bus for agent coordination, and (3) real-time status broadcasting via SSE for visualization.

The architecture follows proven patterns from the multi-agent systems research: the Hub-and-Spoke model with a central orchestrator coordinating specialized worker agents. For real-time updates, SSE is the recommended approach for Vercel deployments due to WebSocket limitations in Serverless environments.

**Primary recommendation:** Extend existing `SubAgentExecutor` with wave-based parallel execution using topological sort for dependency resolution, implement a lightweight `AgentMessageBus` class for Hub-and-Spoke communication, and use SSE (Server-Sent Events) for real-time status updates to the frontend.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### 依赖分析与调度策略
- **依赖识别**: LLM 在分解时同时生成依赖关系（如 A→B→C）
- **依赖存储**: 扩展 DecompositionResult 增加 `dependencies: Record<string, string[]>` 字段
- **调度决策**: 系统自动分析依赖图，独立任务并行，有依赖任务顺序执行
- **执行模式**: Wave-based — 同级独立任务同时开始，等待全部完成后进入下一级

#### 并行执行控制
- **最大并发数**: 固定上限（3），防止 token 消耗爆炸
- **资源隔离**: 每个 SubAgentExecutor 实例独立执行
- **上下文传递**: 每波次完成后更新 previousResults Map

#### Agent 通信机制
- **通信模式**: Hub-and-Spoke — 子 Agent 只与主 Agent 通信，子 Agent 间不直接通信
- **消息类型**:
  - `context_request`: 子 Agent 请求额外上下文
  - `status_notification`: 开始/完成/失败状态变更
  - `human_intervention`: 敏感决策请求用户确认
  - `progress_update`: Agent 向主 Agent 汇报执行进度
- **消息格式**: 标准化 JSON `{ type, from, to, payload, timestamp }`
- **消息存储**: 持久化到数据库（agent_messages 表），用于审计和调试

#### 执行计划可视化
- **展示形式**: 简化流水线视图（类似 CI/CD 流水线的步骤列表）
- **状态图标**: 运行中(旋转)、完成(绿色勾)、失败(红色叉)、等待(灰色)
- **展示时机**: 分解完成后显示执行计划，执行中实时更新状态

#### 实时状态推送
- **推送机制**: WebSocket 连接推送状态更新
- **推送内容**: 任务状态变更、进度更新、错误事件
- **前端处理**: 状态消息更新 UI，无需轮询

#### 错误处理策略
- **失败传播**: Cascade cancel — 依赖失败任务的所有任务取消，其他独立任务可继续
- **错误记录**: 错误信息存入 Task 表 output 字段
- **状态同步**: WebSocket 推送失败事件，前端显示失败原因

### Claude's Discretion
- 依赖图数据结构的具体实现（邻接表 vs 邻接矩阵）
- WebSocket 消息协议的详细格式
- agent_messages 表的索引策略
- 并发池的具体实现（Promise.all vs 自定义调度器）

### Deferred Ideas (OUT OF SCOPE)
- 用户可配置最大并发数 — Phase 5 控制机制
- 动态任务分解（执行中生成新子任务）— 未来版本
- 复杂 DAG 可视化编辑器 — Out of Scope
- Agent 间直接通信（全互联模式）— Out of Scope
- 结果聚合策略（合并/对比/总结/选择）— Phase 5

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ORCH-01 | 系统分析子任务之间的依赖关系 | Topological sort with dependency graph; DecompositionResult.dependencies field |
| ORCH-02 | 独立的子任务并行执行 | Wave-based execution with Promise.all for parallel tasks within same wave |
| ORCH-03 | 有依赖的子任务按正确顺序执行 | Topological sort ensures correct ordering; wave-based ensures dependencies complete first |
| ORCH-04 | 系统自动决定顺序或并行执行模式 | Dependency analyzer automatically determines execution strategy |
| ORCH-05 | 并行执行时控制最大并发数（防止 token 消耗） | Concurrency pool with MAX_CONCURRENCY = 3; p-limit pattern or custom scheduler |
| ORCH-06 | 执行计划可视化展示给用户 | SSE for real-time updates; pipeline view component |
| COMM-01 | 子 Agent 可向主 Agent 请求额外上下文 | AgentMessageBus with context_request message type |
| COMM-02 | 子 Agent 之间可以发送消息共享信息 | Hub-and-Spoke: messages route through main agent, not direct |
| COMM-03 | Agent 状态变更时发送通知（开始、完成、失败） | AgentMessageBus with status_notification message type |
| COMM-04 | 子 Agent 可以请求人工介入确认 | AgentMessageBus with human_intervention message type |
| COMM-05 | 通信消息有标准化的格式和类型 | AgentMessage interface: `{ type, from, to, payload, timestamp }` |
| COMM-06 | 通信记录保存用于审计和调试 | agent_messages table in database |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | 4.3.6 | Schema validation for messages and dependencies | Already in project; type-safe parsing |
| drizzle-orm | 0.45.1 | Database operations for message persistence | Already in project; type-safe queries |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @upstash/redis | 1.37.0 | Cross-instance message broadcast (optional) | Multi-instance Vercel deployment; Phase 5+ |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SSE (for real-time) | WebSocket | SSE works on Vercel; WebSocket requires custom server |
| SSE (for real-time) | Socket.io | Socket.io needs VPS/Railway; adds complexity |
| Custom message bus | EventEmitter | EventEmitter not persistent; needs external storage for audit |
| Promise.all with slice | p-limit library | p-limit adds dependency; custom pool is simple enough for MAX=3 |

**Note:** No new dependencies required for Phase 4 core functionality. All patterns can be implemented with existing project dependencies (zod, drizzle-orm, Next.js built-in ReadableStream for SSE).

## Architecture Patterns

### Recommended Project Structure
```
src/lib/agents/
├── types.ts              # Existing - extend with dependencies, message types
├── executor.ts           # Existing - extend with parallel execution
├── decomposition.ts      # Existing - extend with dependency generation
├── registry.ts           # Existing - no changes needed
├── scheduler.ts          # NEW - WaveScheduler with topological sort
├── message-bus.ts        # NEW - AgentMessageBus for Hub-and-Spoke
└── status-broadcaster.ts # NEW - SSE status broadcasting

src/lib/db/
├── schema.ts             # Existing - add agent_messages table
└── queries.ts            # Existing - add message CRUD operations

src/app/api/
├── chat/route.ts         # Existing - integrate with scheduler
└── workflow-status/route.ts  # NEW - SSE endpoint for real-time updates

src/components/workflow/
├── pipeline-view.tsx     # NEW - Execution plan visualization
└── task-status-icon.tsx  # NEW - Status icons component
```

### Pattern 1: Wave-Based Execution with Topological Sort

**What:** Group tasks into "waves" where each wave contains independent tasks that can run in parallel. Tasks in wave N+1 depend on tasks in wave N.

**When to use:** When you have a DAG of tasks with dependencies and want to maximize parallelism while respecting ordering constraints.

**Example:**
```typescript
// Source: Based on topological sort patterns from GeeksforGeeks, Stack Overflow
// https://www.geeksforgeeks.org/dsa/topological-sorting/

interface TaskWithDependencies {
  id: string;
  dependencies: string[]; // Task IDs that must complete first
}

interface ExecutionWave {
  waveIndex: number;
  taskIds: string[];
}

/**
 * Group tasks into waves using Kahn's algorithm variant.
 * Tasks in the same wave have no dependencies on each other.
 */
function computeExecutionWaves(
  tasks: TaskWithDependencies[],
  maxConcurrency: number = 3
): ExecutionWave[] {
  const waves: ExecutionWave[] = [];
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  // Build dependency graph
  for (const task of tasks) {
    inDegree.set(task.id, task.dependencies.length);
    for (const dep of task.dependencies) {
      dependents.set(dep, [...(dependents.get(dep) || []), task.id]);
    }
  }

  // Process waves
  let remaining = new Set(tasks.map(t => t.id));

  while (remaining.size > 0) {
    // Find tasks with no remaining dependencies
    const ready = Array.from(remaining).filter(
      id => (inDegree.get(id) || 0) === 0
    );

    if (ready.length === 0) {
      throw new Error('Circular dependency detected in task graph');
    }

    // Limit concurrency within a wave
    const waveTasks = ready.slice(0, maxConcurrency);
    waves.push({
      waveIndex: waves.length,
      taskIds: waveTasks
    });

    // Mark as processed and update dependencies
    for (const taskId of waveTasks) {
      remaining.delete(taskId);
      for (const dependent of dependents.get(taskId) || []) {
        inDegree.set(dependent, (inDegree.get(dependent) || 1) - 1);
      }
    }
  }

  return waves;
}
```

### Pattern 2: Hub-and-Spoke Message Bus

**What:** Central message bus that routes all agent communications through a single point. Sub-agents never communicate directly with each other.

**When to use:** Multi-agent systems requiring coordination, audit trails, and controlled communication flow.

**Example:**
```typescript
// Source: Based on Hub-and-Spoke patterns from Solace, LinkedIn
// https://solace.com/blog/analysts-say-mas-needs-real-time-context-eda/

import { z } from 'zod';

// Message types from CONTEXT.md
export const AgentMessageTypeSchema = z.enum([
  'context_request',
  'status_notification',
  'human_intervention',
  'progress_update',
]);

export const AgentMessageSchema = z.object({
  type: AgentMessageTypeSchema,
  from: z.string(),  // Agent ID
  to: z.string(),    // 'orchestrator' or agent ID
  payload: z.record(z.unknown()),
  timestamp: z.string().datetime(),
  workflowId: z.string(),
  taskId: z.string().optional(),
});

export type AgentMessage = z.infer<typeof AgentMessageSchema>;

export class AgentMessageBus {
  private handlers: Map<string, Set<(msg: AgentMessage) => Promise<void>>>;
  private messageStore: MessageStore;

  constructor(messageStore: MessageStore) {
    this.handlers = new Map();
    this.messageStore = messageStore;
  }

  /**
   * Send a message through the bus.
   * Routes to appropriate handler and persists for audit.
   */
  async send(message: AgentMessage): Promise<void> {
    // Validate message
    const validated = AgentMessageSchema.parse(message);

    // Persist for audit (COMM-06)
    await this.messageStore.save(validated);

    // Route to handler
    const handlers = this.handlers.get(validated.to) || new Set();
    await Promise.all(
      Array.from(handlers).map(h => h(validated))
    );
  }

  /**
   * Register a handler for messages addressed to a specific agent.
   */
  on(to: string, handler: (msg: AgentMessage) => Promise<void>): void {
    const handlers = this.handlers.get(to) || new Set();
    handlers.add(handler);
    this.handlers.set(to, handlers);
  }
}
```

### Pattern 3: SSE for Real-Time Status Updates

**What:** Server-Sent Events endpoint that streams workflow status changes to connected clients.

**When to use:** Vercel deployments where WebSocket is not supported; real-time status updates needed.

**Example:**
```typescript
// Source: Based on Next.js SSE patterns from eastondev.com
// https://eastondev.com/blog/zh/posts/dev/20260107-nextjs-realtime-chat/

// app/api/workflow-status/route.ts
import { NextRequest } from 'next/server';

// In-memory listeners (use Redis Pub/Sub for multi-instance)
const listeners = new Map<string, Set<(data: string) => void>>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get('workflowId');

  if (!workflowId) {
    return new Response('Missing workflowId', { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
      );

      // Register listener for this workflow
      const listener = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      const workflowListeners = listeners.get(workflowId) || new Set();
      workflowListeners.add(listener);
      listeners.set(workflowId, workflowListeners);

      // Heartbeat to prevent Vercel timeout (25s limit)
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 15000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        const wl = listeners.get(workflowId);
        if (wl) {
          wl.delete(listener);
          if (wl.size === 0) listeners.delete(workflowId);
        }
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Broadcast utility (call this when task status changes)
export function broadcastWorkflowUpdate(
  workflowId: string,
  update: { taskId: string; status: string; error?: string }
) {
  const workflowListeners = listeners.get(workflowId);
  if (workflowListeners) {
    const data = JSON.stringify(update);
    workflowListeners.forEach(listener => listener(data));
  }
}
```

### Pattern 4: Parallel Execution with Concurrency Limit

**What:** Execute multiple tasks in parallel while respecting a maximum concurrency limit.

**When to use:** When you have more parallel tasks than allowed concurrent executions.

**Example:**
```typescript
// Source: Custom implementation based on Promise patterns

import type { Subtask, AgentSkillContext } from './types';
import type { SubAgentExecutionResult } from './executor';

const MAX_CONCURRENCY = 3; // Fixed limit per CONTEXT.md

/**
 * Execute a wave of tasks in parallel with concurrency limit.
 */
async function executeWave(
  tasks: Subtask[],
  context: AgentSkillContext,
  executor: SubAgentExecutor,
  options?: SubAgentExecutionOptions
): Promise<SubAgentExecutionResult[]> {
  // For small waves, just use Promise.all
  if (tasks.length <= MAX_CONCURRENCY) {
    return Promise.all(
      tasks.map(task => executor.executeSubtask(task, context, options))
    );
  }

  // For larger waves, use chunked execution
  const results: SubAgentExecutionResult[] = [];

  for (let i = 0; i < tasks.length; i += MAX_CONCURRENCY) {
    const chunk = tasks.slice(i, i + MAX_CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map(task => executor.executeSubtask(task, context, options))
    );
    results.push(...chunkResults);

    // Check for cascade cancel: stop if any task failed
    if (chunkResults.some(r => !r.success)) {
      // Mark remaining tasks as cancelled
      for (let j = i + MAX_CONCURRENCY; j < tasks.length; j++) {
        // Handle cascade cancel logic
      }
      break;
    }
  }

  return results;
}
```

### Anti-Patterns to Avoid

- **Direct agent-to-agent communication:** Violates Hub-and-Spoke pattern, makes debugging impossible, no audit trail
- **Polling for status updates:** Inefficient, adds latency, wastes resources; use SSE instead
- **Unbounded parallelism:** Token consumption explosion; always enforce MAX_CONCURRENCY
- **WebSocket on Vercel:** Not supported in Serverless; use SSE for real-time updates
- **Storing messages in memory only:** Loses audit trail; must persist to database

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation | Custom type guards | zod schemas | Already in project, type-safe, runtime validation |
| Database queries | Raw SQL strings | drizzle-orm queries | Type-safe, existing pattern in project |
| Real-time updates | WebSocket server | SSE with ReadableStream | Works on Vercel, simpler implementation |
| Dependency resolution | Complex graph library | Simple topological sort | DAG is small (typically <10 tasks), custom solution sufficient |
| Concurrency control | Full-featured scheduler | Promise.all with slicing | MAX=3 is small enough for simple implementation |

**Key insight:** Phase 4 requirements are well-scoped and don't require external orchestration libraries. The existing project patterns (SubAgentExecutor, SkillExecutor, database queries) can be extended to support parallel execution and communication without adding significant complexity.

## Common Pitfalls

### Pitfall 1: Circular Dependency Detection
**What goes wrong:** Tasks with circular dependencies cause infinite loops or stack overflow in topological sort.
**Why it happens:** LLM may generate logically inconsistent dependency chains.
**How to avoid:** Implement cycle detection in `computeExecutionWaves()`; if no tasks have in-degree=0, throw error with helpful message.
**Warning signs:** Tasks stuck in "pending" state indefinitely; execution never progresses.

### Pitfall 2: Vercel SSE Timeout
**What goes wrong:** SSE connections drop after 25 seconds on Vercel Edge Functions.
**Why it happens:** Vercel has hard timeout limits for Serverless functions.
**How to avoid:** Implement heartbeat messages every 15 seconds; client auto-reconnects on disconnect.
**Warning signs:** Clients stop receiving updates after ~25 seconds.

### Pitfall 3: Race Conditions in Result Aggregation
**What goes wrong:** `previousResults` Map contains stale or missing data when parallel tasks complete out of order.
**Why it happens:** Multiple async operations updating shared state without synchronization.
**How to avoid:** Use immutable updates: create new Map for each wave, don't mutate in-place. Wait for entire wave to complete before starting next wave.
**Warning signs:** Subsequent tasks receive wrong data from previous tasks.

### Pitfall 4: Message Loss on Server Restart
**What goes wrong:** In-memory message listeners are lost when serverless function recycles.
**Why it happens:** Vercel functions are ephemeral.
**How to avoid:** For production, use Redis Pub/Sub (@upstash/redis) for cross-instance message distribution. For Phase 4, accept limitation for single-instance deployments.
**Warning signs:** Some clients don't receive updates after deployment.

### Pitfall 5: Unhandled Cascade Cancel
**What goes wrong:** When a task fails, dependent tasks continue running or hang indefinitely.
**Why it happens:** Missing error propagation logic.
**How to avoid:** Implement explicit cascade cancel: mark all dependent tasks as "cancelled" immediately when parent fails; broadcast cancel event via SSE.
**Warning signs:** Workflow shows "failed" but tasks still show "running".

## Code Examples

### Extended DecompositionResult with Dependencies

```typescript
// Source: Extension of existing src/lib/agents/types.ts

import { z } from 'zod';

// Extend the schema to include dependencies
export const SubtaskWithDepsSchema = z.object({
  agentType: z.enum(['file', 'search', 'code', 'custom']),
  skillId: z.string(),
  input: z.record(z.unknown()),
  description: z.string().optional(),
  id: z.string(), // Required for dependency references
  dependencies: z.array(z.string()).default([]), // Task IDs this depends on
});

export interface SubtaskWithDeps extends Subtask {
  id: string;
  dependencies: string[];
}

export interface DecompositionResultWithDeps extends DecompositionResult {
  tasks: SubtaskWithDeps[];
  dependencies: Record<string, string[]>; // Map of taskId -> dependency taskIds
}
```

### Updated DECOMPOSITION_SYSTEM_PROMPT

```typescript
// Source: Extension of existing src/lib/agents/decomposition.ts

export const DECOMPOSITION_SYSTEM_PROMPT_WITH_DEPS = `You are a task decomposition engine. Given a complex user request, break it down into subtasks with dependency information.

Available agent types:
- file: File operations (read, list, process documents)
- search: Web search and knowledge retrieval
- code: Code generation, review, refactoring tasks
- custom: User-defined specialized agent

Output a JSON object with this structure:
{
  "tasks": [
    {
      "id": "task-1",
      "agentType": "file" | "search" | "code" | "custom",
      "skillId": "exact-skill-id-from-catalog",
      "input": { ... skill-specific input ... },
      "description": "Human-readable task description",
      "dependencies": [] // Empty for first task, or list of task IDs this depends on
    }
  ],
  "dependencies": {
    "task-1": [],
    "task-2": ["task-1"],
    "task-3": ["task-1"],
    "task-4": ["task-2", "task-3"]
  },
  "reasoning": "Why these subtasks are needed and their dependencies"
}

Rules:
1. Each task must have a unique "id" field (e.g., "task-1", "task-2")
2. Dependencies array lists task IDs that must complete before this task can start
3. Independent tasks should have empty dependencies (can run in parallel)
4. Avoid circular dependencies (task A depends on B, B depends on A)
5. Use only skillIds that exist in the provided skill catalog

Output ONLY valid JSON. No markdown, no code blocks, no explanation outside the JSON.`;
```

### Database Schema for agent_messages

```typescript
// Source: Extension of existing src/lib/db/schema.ts

export const AgentMessageTypeEnum = [
  'context_request',
  'status_notification',
  'human_intervention',
  'progress_update',
] as const;

export const agentMessages = pgTable('agent_message', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  type: text('type', { enum: AgentMessageTypeEnum }).notNull(),
  fromAgent: text('from_agent').notNull(),
  toAgent: text('to_agent').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  workflowIdx: index('agent_message_workflow_idx').on(table.workflowId),
  typeIdx: index('agent_message_type_idx').on(table.type),
  createdAtIdx: index('agent_message_created_at_idx').on(table.createdAt),
}));

export type AgentMessageRecord = typeof agentMessages.$inferSelect;
export type NewAgentMessageRecord = typeof agentMessages.$inferInsert;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sequential task execution | Wave-based parallel execution | Phase 4 | ~3x speedup for independent tasks |
| No agent communication | Hub-and-Spoke message bus | Phase 4 | Enables context requests, human intervention |
| Polling for status | SSE real-time push | Phase 4 | Lower latency, better UX |
| No dependency tracking | DAG with topological sort | Phase 4 | Correct execution order guaranteed |

**Deprecated/outdated:**
- WebSocket for Vercel deployments: Not supported in Serverless; SSE is the replacement
- Full mesh agent communication: Too complex, debugging nightmare; Hub-and-Spoke is the proven pattern

## Open Questions

1. **Should we use @upstash/redis for multi-instance message broadcasting in Phase 4?**
   - What we know: Vercel functions are ephemeral; in-memory listeners won't survive restarts
   - What's unclear: Is single-instance deployment sufficient for Phase 4 scope?
   - Recommendation: Start with in-memory implementation; add Redis in Phase 5+ when scaling becomes necessary

2. **How should cascade cancel interact with in-progress tasks?**
   - What we know: When a task fails, dependent tasks should be cancelled
   - What's unclear: Should currently-running tasks be aborted, or allowed to complete?
   - Recommendation: Allow in-progress tasks to complete naturally (graceful degradation), but mark pending dependent tasks as "cancelled". Abort would require AbortController integration which adds complexity.

3. **Should human_intervention messages block the workflow or run asynchronously?**
   - What we know: Sub-agents can request human confirmation for sensitive decisions
   - What's unclear: Should the workflow pause waiting for response, or continue with other tasks?
   - Recommendation: Block the specific task waiting for response, but allow other independent tasks in the same wave to continue. This is consistent with the approval flow pattern already in the project.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | vitest.config.ts |
| Quick run command | `npm test -- --grep "scheduler\|message-bus\|wave" --reporter=verbose` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ORCH-01 | Dependency graph analysis | unit | `vitest run tests/lib/agents/scheduler.test.ts` | ❌ Wave 0 |
| ORCH-02 | Parallel task execution | unit | `vitest run tests/lib/agents/scheduler.test.ts` | ❌ Wave 0 |
| ORCH-03 | Sequential execution with deps | unit | `vitest run tests/lib/agents/scheduler.test.ts` | ❌ Wave 0 |
| ORCH-04 | Auto mode selection | unit | `vitest run tests/lib/agents/scheduler.test.ts` | ❌ Wave 0 |
| ORCH-05 | Concurrency limit enforcement | unit | `vitest run tests/lib/agents/scheduler.test.ts` | ❌ Wave 0 |
| ORCH-06 | Pipeline visualization | integration | `vitest run tests/components/pipeline-view.test.tsx` | ❌ Wave 0 |
| COMM-01 | Context request handling | unit | `vitest run tests/lib/agents/message-bus.test.ts` | ❌ Wave 0 |
| COMM-02 | Agent-to-agent via hub | unit | `vitest run tests/lib/agents/message-bus.test.ts` | ❌ Wave 0 |
| COMM-03 | Status notifications | unit | `vitest run tests/lib/agents/message-bus.test.ts` | ❌ Wave 0 |
| COMM-04 | Human intervention requests | unit | `vitest run tests/lib/agents/message-bus.test.ts` | ❌ Wave 0 |
| COMM-05 | Message format validation | unit | `vitest run tests/lib/agents/message-bus.test.ts` | ❌ Wave 0 |
| COMM-06 | Message persistence | unit | `vitest run tests/lib/db/queries-messages.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --grep "scheduler\|message-bus" --run`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/lib/agents/scheduler.test.ts` — ORCH-01~05: Wave scheduler with topological sort
- [ ] `tests/lib/agents/message-bus.test.ts` — COMM-01~05: Agent message bus
- [ ] `tests/lib/db/queries-messages.test.ts` — COMM-06: Message persistence queries
- [ ] `tests/lib/agents/decomposition-deps.test.ts` — ORCH-01: Dependency-aware decomposition
- [ ] `tests/components/pipeline-view.test.tsx` — ORCH-06: Pipeline visualization component
- [ ] `tests/app/api/workflow-status.test.ts` — SSE endpoint tests

*(Existing test infrastructure covers: executor, registry, types, db schema)*

## Sources

### Primary (HIGH confidence)
- [Next.js SSE Implementation](https://eastondev.com/blog/zh/posts/dev/20260107-nextjs-realtime-chat/) - Comprehensive guide on SSE vs WebSocket for Next.js/Vercel
- [Topological Sort - GeeksforGeeks](https://www.geeksforgeeks.org/dsa/topological-sorting/) - Algorithm for DAG ordering
- [TypeScript Topological Sort](https://github.com/kumar-sanjeet1/typescript-algorithms/blob/master/src/algorithms/graph/topological-sorting/README.md) - TypeScript implementation reference

### Secondary (MEDIUM confidence)
- [Hub-and-Spoke Pattern - Solace](https://solace.com/blog/analysts-say-mas-needs-real-time-context-eda/) - Multi-agent orchestration patterns
- [Hub-and-Spoke Multi-Agent AI - LinkedIn](https://www.linkedin.com/pulse/understanding-hub-and-spoke-pattern-multi-agent-ai-lucas-semelin-v9pff) - Architecture explanation
- [Parallelizing Tasks with Dependencies - DZone](https://dzone.com/articles/parallelizing-tasks-with-dependencies-design-your) - DAG execution patterns

### Tertiary (LOW confidence)
- [2026 Multi-Agent Systems Trends](https://www.rtinsights.com/if-2025-was-the-year-of-ai-agents-2026-will-be-the-year-of-multi-agent-systems/) - Industry trends (general context)

### Project Files (VERIFIED)
- `src/lib/agents/types.ts` - Existing type definitions (AgentType, Subtask, DecompositionResult)
- `src/lib/agents/executor.ts` - Existing SubAgentExecutor (sequential execution)
- `src/lib/agents/decomposition.ts` - Existing decomposeTask function
- `src/lib/skills/orchestration.ts` - Existing SkillOrchestrator pattern
- `src/lib/db/schema.ts` - Existing database schema (agents, tasks, workflows)
- `src/lib/db/queries.ts` - Existing database queries

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already in project; no new libraries needed
- Architecture: HIGH - Patterns well-documented; existing code provides solid foundation
- Pitfalls: HIGH - Real-time communication pitfalls well-documented in Next.js ecosystem

**Research date:** 2026-03-26
**Valid until:** 30 days (stable patterns; SSE/topological sort are foundational)
