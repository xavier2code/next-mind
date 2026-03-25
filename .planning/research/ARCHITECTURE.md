# Architecture Research: AI Agent Framework with A2A Multi-Agent Integration

**Domain:** AI Agent Collaboration Platform (Next-Mind)
**Framework Base:** pi-mono (TypeScript)
**Researched:** 2026-03-25 (Updated for v1.1 A2A)
**Confidence:** HIGH

---

## Existing Architecture Overview

### Current System Structure (v1.0)

```
+------------------------------------------------------------------+
|                        Next.js App Router                         |
+------------------------------------------------------------------+
|  +------------+  +------------+  +------------+  +--------------+ |
|  | /api/chat  |  | /api/mcp   |  |/api/skills |  |/api/approval | |
|  +-----+------+  +-----+------+  +-----+------+  +-------+------+ |
|        |              |               |                   |        |
+--------|--------------|---------------|-------------------|--------+
         |              |               |                   |
+--------v--------------v---------------v-------------------v--------+
|                            Core Services                           |
+-------------------------------------------------------------------+
|  +----------+  +-----------+  +-----------+  +-----------------+  |
|  |LLM Gate- |  | MCP Server|  |  Skills   |  | Approval State  |  |
|  |   way    |  |(JSON-RPC) |  |  System   |  |    Machine      |  |
|  +----------+  +-----------+  +-----------+  +-----------------+  |
|  |Qwen/GLM/ |  |Tool Reg.  |  |Decorator  |  |ApprovalRequest  |  |
|  |MiniMax   |  |Resource   |  |Discovery  |  |StateMachine     |  |
|  |          |  |Prompts    |  |Executor   |  |                 |  |
|  +----------+  +-----------+  |Orchestr.  |  +-----------------+  |
|                              +-----------+                       |
+-------------------------------------------------------------------+
|                          Data Layer                               |
+-------------------------------------------------------------------+
|  +-----------------+  +------------------+  +-------------------+ |
|  |   PostgreSQL    |  |   Drizzle ORM    |  |   Auth.js v5      | |
|  | users/sessions  |  |   Schema         |  |   Sessions        | |
|  | conversations   |  |                  |  |                   | |
|  | messages        |  |                  |  |                   | |
|  | audit_logs      |  |                  |  |                   | |
|  +-----------------+  +------------------+  +-------------------+ |
+-------------------------------------------------------------------+
```

### Key Existing Components

| Component | File | Responsibility | Integration Points |
|-----------|------|----------------|-------------------|
| LLM Gateway | `src/lib/llm/index.ts` | Multi-provider streaming chat | Used by `/api/chat` |
| MCP Server | `src/lib/mcp/server.ts` | JSON-RPC 2.0 protocol handler | Session-scoped, tool registry |
| Tool Registry | `src/lib/mcp/registry.ts` | Tool registration & execution | Zod schemas, handler execution |
| Skill Types | `src/lib/skills/types.ts` | `SkillMetadata`, `SkillContext`, `SkillResult` | Foundation for all skills |
| Skill Discovery | `src/lib/skills/discovery.ts` | Decorator-based skill registration | `registerSkill()`, `discoverSkills()` |
| Skill Executor | `src/lib/skills/executor.ts` | Skill execution with timeout/approval | Uses registry, approval flow |
| Skill Orchestrator | `src/lib/skills/orchestration.ts` | Sequential skill execution | `executePlan()` with steps |
| Approval State | `src/lib/approval/state.ts` | State machine for approvals | `ApprovalStateMachine` |
| DB Schema | `src/lib/db/schema.ts` | Drizzle ORM definitions | users, sessions, conversations, messages |

---

## A2A Multi-Agent Integration Architecture (v1.1)

### System Overview with A2A Components

```
+------------------------------------------------------------------+
|                        Next.js App Router                         |
+------------------------------------------------------------------+
|  +------------+  +------------+  +------------+  +--------------+ |
|  |/api/chat   |  |/api/mcp    |  |/api/skills |  |/api/agents   | |
|  +-----+------+  +-----+------+  +-----+------+  +-------+------+ |
|        |              |               |               | NEW        |
+--------|--------------|---------------|---------------|-----------+
         |              |               |               |
+--------v--------------v---------------v---------------v-----------+
|                            Core Services                           |
+-------------------------------------------------------------------+
|                         EXISTING                                  |
|  +----------+  +-----------+  +-----------+  +-----------------+  |
|  |LLM Gate- |  | MCP Server|  |  Skills   |  | Approval State  |  |
|  |   way    |  |(JSON-RPC) |  |  System   |  |    Machine      |  |
|  +----------+  +-----------+  +-----------+  +-----------------+  |
+-------------------------------------------------------------------+
|                         NEW - A2A Layer                           |
|  +----------------+  +----------------+  +---------------------+  |
|  | Agent Registry |  | Task Queue     |  | Communication Bus   |  |
|  | - register()   |  | - enqueue()    |  | - publish()         |  |
|  | - discover()   |  | - dequeue()    |  | - subscribe()       |  |
|  | - getAgent()   |  | - getStatus()  |  | - broadcast()       |  |
|  +----------------+  +----------------+  +---------------------+  |
|  +----------------+  +----------------+  +---------------------+  |
|  | Agent Lifecycle|  | Result Aggreg. |  | Workflow State      |  |
|  | - spawn()      |  | - merge()      |  | - saveState()       |  |
|  | - terminate()  |  | - compare()    |  | - loadState()       |  |
|  | - healthCheck()|  | - summarize()  |  | - trackProgress()   |  |
|  +----------------+  +----------------+  +---------------------+  |
+-------------------------------------------------------------------+
|                          Data Layer                               |
+-------------------------------------------------------------------+
|  +-----------------+                                              |
|  |   PostgreSQL    |  NEW TABLES: agents, agent_tasks,           |
|  |   + NEW         |  agent_messages, workflows, workflow_steps  |
|  +-----------------+                                              |
+-------------------------------------------------------------------+
```

### New Component Responsibilities

| Component | Responsibility | Communicates With | Integration Type |
|-----------|---------------|-------------------|------------------|
| Agent Registry | Agent registration, discovery, capability mapping | Skills (as agent implementations), Workflow Engine | Uses existing `SkillMetadata` pattern |
| Task Queue | Task enqueue, dequeue, priority, retry | Agent Registry, Communication Bus | New component |
| Communication Bus | Pub/sub messaging between agents | Task Queue, Result Aggregator | New component |
| Result Aggregator | Merge, compare, summarize results | Communication Bus, Workflow State | New component |
| Workflow State | Persist multi-step workflow state | PostgreSQL, Agent Registry | Extends existing schema |
| Agent Lifecycle | Spawn, terminate, health monitoring | Agent Registry, Task Queue | New component |

---

## Integration Points with Existing Architecture

### 1. Skills System Integration (HIGH Priority)

**Current:** Skills are discovered via decorator pattern and executed sequentially by `SkillOrchestrator`.

**Integration:** Sub-agents ARE specialized skills. The existing skill system becomes the foundation for agent capabilities.

```typescript
// src/lib/agents/types.ts - extends existing SkillMetadata
import type { SkillMetadata, SkillContext, SkillResult } from '@/lib/skills/types';

export interface AgentMetadata extends SkillMetadata {
  /** Agent type classification */
  agentType: 'file' | 'search' | 'code' | 'custom';
  /** Whether this agent can spawn sub-agents */
  canDelegate: boolean;
  /** Maximum concurrent tasks this agent can handle */
  maxConcurrency: number;
  /** Timeout for agent initialization */
  initTimeout: number;
}

export interface AgentContext extends SkillContext {
  /** Parent agent ID if spawned by another agent */
  parentAgentId?: string;
  /** Workflow ID for tracking multi-agent tasks */
  workflowId: string;
  /** Communication channel for inter-agent messaging */
  communicationChannel: string;
}

export interface AgentResult extends SkillResult {
  /** Agent ID that produced this result */
  agentId: string;
  /** Execution time in ms */
  duration: number;
  /** Child agent results if delegation occurred */
  childResults?: AgentResult[];
}
```

**Files to Modify:**
- `src/lib/skills/types.ts` - Add agent-specific interfaces (non-breaking)
- `src/lib/skills/discovery.ts` - Support agent discovery alongside skills

**Files to Create:**
- `src/lib/agents/types.ts` - Agent-specific types extending skills
- `src/lib/agents/registry.ts` - Agent registry (similar to skill registry)
- `src/lib/agents/discovery.ts` - Agent discovery from skill modules

### 2. MCP Server Integration (MEDIUM Priority)

**Current:** MCP provides tools via JSON-RPC 2.0 with session-scoped tool registry.

**Integration:** Expose agents as MCP tools. The host agent becomes an MCP tool that can orchestrate sub-agents.

```typescript
// src/lib/mcp/agent-tools.ts - register agents as MCP tools
import type { McpTool } from '@/lib/mcp/types';
import { getAgentRegistry } from '@/lib/agents/registry';

export function registerAgentTools(registry: ToolRegistry): void {
  const agents = getAgentRegistry().listAgents();

  for (const agent of agents) {
    registry.registerTool({
      name: `agent_${agent.metadata.id}`,
      description: agent.metadata.description,
      inputSchema: z.object(agent.metadata.inputSchema),
      handler: async (args) => {
        const result = await executeAgent(agent.metadata.id, args, context);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      },
    });
  }
}
```

**Files to Modify:**
- `src/lib/mcp/session.ts` - Include agent registry in session
- `src/app/api/mcp/route.ts` - Register agent tools on session creation

**Files to Create:**
- `src/lib/mcp/agent-tools.ts` - Agent-as-MCP-tool registration

### 3. LLM Gateway Integration (MEDIUM Priority)

**Current:** `streamChat()` provides streaming completion with provider abstraction.

**Integration:** Each agent needs its own LLM context. Host agent orchestrates by generating delegation prompts.

```typescript
// src/lib/agents/llm-context.ts
import { streamChat, type StreamChatOptions } from '@/lib/llm';

export interface AgentLLMContext {
  /** Agent-specific system prompt */
  systemPrompt: string;
  /** Delegated task description */
  taskPrompt: string;
  /** Context from parent agent */
  parentContext?: string;
}

export async function executeAgentLLM(
  agent: AgentMetadata,
  context: AgentLLMContext,
  options: Partial<StreamChatOptions>
): Promise<ReadableStream> {
  return streamChat({
    modelId: options.modelId ?? 'qwen3.5-turbo',
    messages: [
      { role: 'system', content: context.systemPrompt },
      { role: 'user', content: context.taskPrompt },
    ],
    ...options,
  });
}
```

**Files to Create:**
- `src/lib/agents/llm-context.ts` - Agent-specific LLM context handling

### 4. Approval Flow Integration (HIGH Priority)

**Current:** `ApprovalStateMachine` handles skill approval requests with pending/approved/rejected states.

**Integration:** Multi-agent workflows may require aggregated approvals. Extend approval flow for agent delegation.

```typescript
// src/lib/approval/agent-approval.ts
import { ApprovalStateMachine, type ApprovalRequest } from './state';

export interface AgentDelegationApproval extends ApprovalRequest {
  /** Agent being delegated to */
  targetAgentId: string;
  /** Task being delegated */
  delegatedTask: string;
  /** Parent agent requesting delegation */
  parentAgentId: string;
}

export class AgentApprovalStateMachine extends ApprovalStateMachine {
  createDelegationApproval(params: {
    targetAgentId: string;
    parentAgentId: string;
    task: string;
    userId: string;
    sessionId: string;
  }): AgentDelegationApproval {
    return this.createRequest({
      skillId: `agent_delegation_${params.targetAgentId}`,
      skillName: `Agent Delegation: ${params.targetAgentId}`,
      action: `Delegate task to ${params.targetAgentId}`,
      details: params.task,
      input: { task: params.task },
      userId: params.userId,
      sessionId: params.sessionId,
    }) as AgentDelegationApproval;
  }
}
```

**Files to Modify:**
- `src/lib/approval/types.ts` - Add `AgentDelegationApproval` type
- `src/lib/approval/state.ts` - Extend for agent delegation approvals

**Files to Create:**
- `src/lib/approval/agent-approval.ts` - Agent-specific approval handling

### 5. Database Schema Extension (HIGH Priority)

**Current:** Schema has `users`, `sessions`, `conversations`, `messages`, `audit_logs`.

**Integration:** Add tables for agents, tasks, workflows, and inter-agent messages.

```typescript
// src/lib/db/schema.ts - additions
import { pgTable, text, timestamp, jsonb, integer, boolean, index } from 'drizzle-orm/pg-core';

// Agent definitions (registered agents)
export const agents = pgTable('agent', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  agentType: text('agent_type').notNull(), // 'file' | 'search' | 'code' | 'custom'
  description: text('description').notNull(),
  capabilities: jsonb('capabilities').$type<string[]>().notNull(),
  config: jsonb('config').$type<Record<string, unknown>>(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  agentTypeIdx: index('agent_type_idx').on(table.agentType),
}));

// Agent tasks (individual task executions)
export const agentTasks = pgTable('agent_task', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  workflowId: text('workflow_id').references(() => workflows.id, { onDelete: 'set null' }),
  parentTaskId: text('parent_task_id'), // For nested delegation
  status: text('status').notNull().default('pending'), // pending | running | completed | failed
  input: jsonb('input').$type<unknown>().notNull(),
  output: jsonb('output').$type<unknown>(),
  error: text('error'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  agentIdIdx: index('agent_task_agent_idx').on(table.agentId),
  workflowIdIdx: index('agent_task_workflow_idx').on(table.workflowId),
  statusIdx: index('agent_task_status_idx').on(table.status),
}));

// Inter-agent messages
export const agentMessages = pgTable('agent_message', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  fromAgentId: text('from_agent_id').notNull(),
  toAgentId: text('to_agent_id').notNull(),
  workflowId: text('workflow_id').references(() => workflows.id, { onDelete: 'cascade' }),
  messageType: text('message_type').notNull(), // 'request' | 'response' | 'notification' | 'context_request'
  payload: jsonb('payload').$type<unknown>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  workflowIdIdx: index('agent_message_workflow_idx').on(table.workflowId),
  fromAgentIdx: index('agent_message_from_idx').on(table.fromAgentId),
}));

// Multi-agent workflows
export const workflows = pgTable('workflow', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'), // pending | running | completed | failed | cancelled
  executionMode: text('execution_mode').notNull(), // 'sequential' | 'parallel' | 'adaptive'
  currentStep: integer('current_step').default(0),
  totalSteps: integer('total_steps').notNull(),
  result: jsonb('result').$type<unknown>(),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  conversationIdIdx: index('workflow_conversation_idx').on(table.conversationId),
  userIdIdx: index('workflow_user_idx').on(table.userId),
  statusIdx: index('workflow_status_idx').on(table.status),
}));

// Type exports
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type AgentTask = typeof agentTasks.$inferSelect;
export type NewAgentTask = typeof agentTasks.$inferInsert;
export type AgentMessage = typeof agentMessages.$inferSelect;
export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
```

**Files to Modify:**
- `src/lib/db/schema.ts` - Add new tables

---

## Recommended Project Structure

```
src/
+-- lib/
|   +-- agents/                 # NEW - Agent system
|   |   +-- types.ts            # Agent types extending SkillTypes
|   |   +-- registry.ts         # Agent registration/discovery
|   |   +-- lifecycle.ts        # Agent spawn/terminate/health
|   |   +-- executor.ts         # Agent execution engine
|   |   +-- llm-context.ts      # Agent-specific LLM handling
|   |   +-- task-queue.ts       # Task queue management
|   |   +-- communication.ts    # Inter-agent message bus
|   |   +-- result-aggregator.ts# Result merge/compare/summarize
|   |   +-- workflow-engine.ts  # Multi-agent workflow orchestration
|   |   +-- predefined/         # Predefined agent implementations
|   |       +-- file-agent.ts
|   |       +-- search-agent.ts
|   |       +-- code-agent.ts
|   +-- skills/                 # EXISTING - Extended for agent support
|   |   +-- types.ts            # MODIFY: Add agent interfaces
|   |   +-- discovery.ts        # MODIFY: Support agent discovery
|   |   +-- executor.ts         # KEEP: Used by agent executor
|   |   +-- orchestration.ts    # KEEP: Sequential execution
|   +-- mcp/                    # EXISTING - Extended for agent tools
|   |   +-- agent-tools.ts      # NEW: Agent-as-MCP-tool registration
|   |   +-- session.ts          # MODIFY: Include agent registry
|   +-- approval/               # EXISTING - Extended for agent delegation
|   |   +-- agent-approval.ts   # NEW: Agent-specific approvals
|   |   +-- types.ts            # MODIFY: Add delegation types
|   +-- db/
|   |   +-- schema.ts           # MODIFY: Add agent/workflow tables
+-- app/
|   +-- api/
|   |   +-- agents/             # NEW - Agent API endpoints
|   |   |   +-- route.ts        # List/register agents
|   |   |   +-- [id]/
|   |   |       +-- route.ts    # Get/execute specific agent
|   |   +-- workflows/          # NEW - Workflow API endpoints
|   |   |   +-- route.ts        # Create/list workflows
|   |   |   +-- [id]/
|   |   |       +-- route.ts    # Get/cancel workflow
|   |   |       +-- steps/
|   |   |           +-- route.ts # Get workflow steps
+-- agents/                     # NEW - Agent definitions (like skills/)
    +-- file-agent.ts           # File processing agent
    +-- search-agent.ts         # Web search agent
    +-- code-agent.ts           # Code analysis agent
```

### Structure Rationale

- **lib/agents/**: Core agent infrastructure, mirrors lib/skills pattern for consistency
- **agents/**: Agent definitions as first-class citizens alongside skills
- **api/agents/** and **api/workflows/**: REST endpoints for agent interaction
- **lib/mcp/agent-tools.ts**: Bridges agents to MCP protocol

---

## Architectural Patterns

### Pattern 1: Agent-as-Skill Extension

**What:** Agents extend the existing skill system with delegation capability.

**When to use:** All sub-agents should follow this pattern for consistency.

**Trade-offs:**
- Pros: Reuses existing discovery/execution infrastructure, minimal code duplication
- Cons: Skills may need to be more stateful for agent use cases

```typescript
// src/lib/agents/decorator.ts
import 'reflect-metadata';
import type { AgentMetadata, AgentFunction, AgentContext, AgentResult } from './types';

const AGENT_METADATA_KEY = Symbol('agent:metadata');

export function agent(metadata: Omit<AgentMetadata, 'inputSchema' | 'timeout' | 'requiresApproval' | 'destructiveActions' | 'dependencies'>): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<unknown>) => {
    const existingSchema = Reflect.getMetadata('skill:inputSchema', target, propertyKey) ?? {};

    const fullMetadata: AgentMetadata = {
      ...metadata,
      inputSchema: existingSchema,
      timeout: 60000, // Default 1 minute for agents
      requiresApproval: metadata.canDelegate, // Delegation requires approval
      destructiveActions: [],
      dependencies: [],
    };

    Reflect.defineMetadata(AGENT_METADATA_KEY, fullMetadata, target, propertyKey);
  };
}

export function getAgentMetadata(target: object, propertyKey: string): AgentMetadata | undefined {
  return Reflect.getMetadata(AGENT_METADATA_KEY, target, propertyKey);
}
```

### Pattern 2: Event-Driven Communication Bus

**What:** Agents communicate via publish/subscribe channels rather than direct calls.

**When to use:** All inter-agent communication should use the bus.

**Trade-offs:**
- Pros: Decoupled agents, easier debugging, supports parallel execution
- Cons: Additional complexity, eventual consistency considerations

```typescript
// src/lib/agents/communication.ts
import type { AgentMessage } from '@/lib/db/schema';

type MessageHandler = (message: AgentMessage) => Promise<void>;

export class AgentCommunicationBus {
  private channels: Map<string, Set<MessageHandler>> = new Map();
  private messageLog: AgentMessage[] = [];

  subscribe(channel: string, handler: MessageHandler): () => void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(handler);

    return () => {
      this.channels.get(channel)?.delete(handler);
    };
  }

  async publish(message: Omit<AgentMessage, 'id' | 'createdAt'>): Promise<void> {
    const fullMessage: AgentMessage = {
      ...message,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    this.messageLog.push(fullMessage);

    // Persist to database (fire-and-forget)
    this.persistMessage(fullMessage).catch(console.error);

    // Notify subscribers
    const channelKey = `${message.workflowId}:${message.toAgentId}`;
    const handlers = this.channels.get(channelKey) ?? new Set();

    await Promise.all(
      Array.from(handlers).map(handler => handler(fullMessage))
    );
  }

  private async persistMessage(message: AgentMessage): Promise<void> {
    // Implementation would use Drizzle to insert into agentMessages table
  }
}

export const communicationBus = new AgentCommunicationBus();
```

### Pattern 3: Result Aggregation Pipeline

**What:** Standardized approach to combining results from multiple agents.

**When to use:** When host agent needs to combine parallel/sequential results.

**Trade-offs:**
- Pros: Consistent result handling, supports multiple aggregation strategies
- Cons: May over-engineer simple cases

```typescript
// src/lib/agents/result-aggregator.ts
import type { AgentResult } from './types';

export type AggregationStrategy = 'merge' | 'compare' | 'summarize' | 'select_best';

export interface AggregationConfig {
  strategy: AggregationStrategy;
  /** For 'select_best', the criteria to compare */
  selectionCriteria?: 'fastest' | 'highest_confidence' | 'most_comprehensive';
}

export class ResultAggregator {
  async aggregate(results: AgentResult[], config: AggregationConfig): Promise<AgentResult> {
    switch (config.strategy) {
      case 'merge':
        return this.mergeResults(results);
      case 'compare':
        return this.compareResults(results);
      case 'summarize':
        return this.summarizeResults(results);
      case 'select_best':
        return this.selectBestResult(results, config.selectionCriteria ?? 'fastest');
    }
  }

  private mergeResults(results: AgentResult[]): AgentResult {
    const mergedData = results.map(r => r.data);
    return {
      success: results.every(r => r.success),
      data: mergedData,
      agentId: 'aggregator',
      duration: Math.max(...results.map(r => r.duration)),
      childResults: results,
    };
  }

  private compareResults(results: AgentResult[]): AgentResult {
    return {
      success: true,
      data: {
        comparison: results.map(r => ({
          agentId: r.agentId,
          success: r.success,
          summary: this.summarizeData(r.data),
        })),
      },
      agentId: 'aggregator',
      duration: Math.max(...results.map(r => r.duration)),
    };
  }

  private summarizeResults(results: AgentResult[]): AgentResult {
    // Would typically call LLM to summarize
    return {
      success: results.every(r => r.success),
      data: { summary: 'Aggregated result', count: results.length },
      agentId: 'aggregator',
      duration: Math.max(...results.map(r => r.duration)),
    };
  }

  private selectBestResult(results: AgentResult[], criteria: string): AgentResult {
    if (criteria === 'fastest') {
      return results.reduce((best, curr) =>
        curr.duration < best.duration ? curr : best
      );
    }
    // Other criteria would need more sophisticated evaluation
    return results[0];
  }

  private summarizeData(data: unknown): string {
    return typeof data === 'string' ? data.slice(0, 100) : JSON.stringify(data).slice(0, 100);
  }
}
```

### Pattern 4: Dual-Layer Agent Loop (pi-mono Core) - EXISTING

**What:** A two-level loop architecture that separates "steering" (interruptions) from "follow-up" (continuations).

**When to use:** Interactive scenarios where users sit in front of a screen and may interrupt or append messages.

**Trade-offs:**
- Pros: Clean separation of interrupt vs. continue semantics, responsive to user input
- Cons: More complex than simple ReAct loop, requires careful state management

### Pattern 5: A2A (Agent-to-Agent) Collaboration

**What:** Protocol for multi-agent communication enabling specialized agents to collaborate on complex tasks.

**When to use:** Complex decisions requiring multiple perspectives, tasks that benefit from role separation.

**Trade-offs:**
- Pros: Improved reliability through separation of concerns, built-in checks and balances
- Cons: Coordination overhead, potential for increased token usage

**Common Patterns:**

| Pattern | Description | Use Case |
|---------|-------------|----------|
| **Coordinator** | Central orchestrator assigns tasks | Enterprise workflows |
| **Pipeline** | Sequential agent processing | Content generation, data processing |
| **Fan-out/Fan-in** | Parallel execution, result aggregation | Research, analysis |
| **Hierarchical** | Nested delegation | Complex planning |

---

## Data Flow

### Multi-Agent Workflow Execution Flow

```
[User Request]
    |
    v
[Chat API] --> [Host Agent Selection]
    |                |
    v                v
[LLM Gateway]   [Agent Registry]
    |                |
    v                v
[Task Decomposition] --> [Workflow Engine]
    |                         |
    v                         v
[Delegation Decision]   [Task Queue]
    |                         |
    +--------+--------+-------+
             |        |
             v        v
     [Sub-Agent 1] [Sub-Agent 2] ... (parallel or sequential)
             |        |
             v        v
        [Result]  [Result]
             |        |
             +--------+
                  |
                  v
         [Result Aggregator]
                  |
                  v
         [Final Response]
```

### Key Data Flows

1. **Task Delegation Flow:** Host agent receives user request -> LLM decomposes task -> Workflow engine creates task queue -> Sub-agents dequeue and execute
2. **Inter-Agent Communication:** Agent publishes message to channel -> Bus routes to target -> Target agent handles via subscription
3. **Result Aggregation Flow:** Sub-agents complete -> Results collected -> Aggregator applies strategy -> Host agent receives combined result
4. **Approval Flow Extension:** Delegation requires approval -> Extended state machine creates delegation approval -> User approves/rejects -> Execution continues or stops

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-50 users (current) | In-memory task queue, single-process agents, PostgreSQL for persistence |
| 50-500 users | Redis for task queue and pub/sub, connection pooling for LLM providers |
| 500+ users | Horizontal scaling with stateless agent workers, distributed task queue (BullMQ), read replicas |

### Scaling Priorities

1. **First bottleneck:** LLM API rate limits - implement request queuing and batching
2. **Second bottleneck:** Agent execution concurrency - limit concurrent agents per user, implement fair scheduling

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Agents Calling LLM Directly Without Gateway

**What people do:** Sub-agents make direct API calls to LLM providers.

**Why it's wrong:** Bypasses retry logic, monitoring, and provider abstraction in LLM Gateway.

**Do this instead:** All agents use `streamChat()` from `src/lib/llm/index.ts`.

### Anti-Pattern 2: Synchronous Agent Execution for Parallel Tasks

**What people do:** Execute sub-agents sequentially when tasks are independent.

**Why it's wrong:** Wastes time, poor user experience for parallelizable tasks.

**Do this instead:** Use `Promise.all()` with Task Queue for independent tasks, track in Workflow Engine.

### Anti-Pattern 3: Storing Agent State in Memory Only

**What people do:** Keep workflow state in memory without database persistence.

**Why it's wrong:** Lost state on restart, no audit trail, cannot resume interrupted workflows.

**Do this instead:** Persist all workflow state to PostgreSQL via new schema tables.

### Anti-Pattern 4: Bypassing Approval Flow for Agent Delegation

**What people do:** Allow agents to delegate without user approval.

**Why it's wrong:** Security risk - malicious prompts could spawn unlimited sub-agents.

**Do this instead:** All delegation requires approval via extended `AgentApprovalStateMachine`.

### Anti-Pattern 5: Unstructured Agent Communication

**What people do:** Let agents communicate via free-form natural language without contracts.

**Why it's wrong:** Parsing failures, inconsistent behavior, difficult to debug, schema drift.

**Do this instead:** Use structured outputs with JSON schemas, versioned contracts between agents.

---

## Build Order

Based on dependencies and integration points:

### Phase 1: Foundation (Week 1-2)
1. **Database Schema Extension** - Add `agents`, `agentTasks`, `agentMessages`, `workflows` tables
2. **Agent Types** - Create `src/lib/agents/types.ts` extending skill types
3. **Agent Registry** - Create `src/lib/agents/registry.ts` (similar to skill registry pattern)
4. **Agent Decorator** - Create `src/lib/agents/decorator.ts` for agent definition

### Phase 2: Core Execution (Week 2-3)
5. **Agent Executor** - Create `src/lib/agents/executor.ts` (extends skill executor)
6. **Task Queue** - Create `src/lib/agents/task-queue.ts` (in-memory initially)
7. **LLM Context Handler** - Create `src/lib/agents/llm-context.ts`

### Phase 3: Communication & Workflow (Week 3-4)
8. **Communication Bus** - Create `src/lib/agents/communication.ts`
9. **Workflow Engine** - Create `src/lib/agents/workflow-engine.ts`
10. **Result Aggregator** - Create `src/lib/agents/result-aggregator.ts`

### Phase 4: Integration (Week 4-5)
11. **MCP Agent Tools** - Create `src/lib/mcp/agent-tools.ts`
12. **Agent Approval Extension** - Create `src/lib/approval/agent-approval.ts`
13. **API Endpoints** - Create `/api/agents` and `/api/workflows` routes

### Phase 5: Predefined Agents (Week 5-6)
14. **File Agent** - Create `src/agents/file-agent.ts`
15. **Search Agent** - Create `src/agents/search-agent.ts`
16. **Code Agent** - Create `src/agents/code-agent.ts`

### Phase 6: UI & Testing (Week 6-7)
17. **Agent Panel UI** - Extend sidebar to show agents
18. **Workflow Progress UI** - Display multi-agent execution progress
19. **Integration Tests** - End-to-end multi-agent workflow tests

---

## Sources

### Official Documentation
- [MCP Official Documentation](https://modelcontextprotocol.io/development/roadmap) - Model Context Protocol specification
- [Announcing the Agent2Agent Protocol (A2A)](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/) - HIGH confidence (official announcement)
- [LangGraph Multi-Agent Workflows](https://blog.langchain.com/langgraph-multi-agent-workflows/) - HIGH confidence (official documentation)
- [Command: A New Tool for Multi-Agent Architectures in LangGraph](https://blog.langchain.com/command-a-new-tool-for-multi-agent-architectures-in-langgraph/) - HIGH confidence

### Architecture Guides
- [Building Scalable Multi-Agent Systems: Integrating MCP and A2A Protocols](https://medium.com/@ashispapu/building-scalable-multi-agent-systems-integrating-mcp-and-a2a-protocols-dbdfd590ae97) - MEDIUM confidence (practical implementation guide)
- [Multi-Agent System Architecture Guide 2026](https://www.clickittech.com/ai/multi-agent-system-architecture/) - HIGH confidence
- [MCP and A2A: A Tale of Two Protocols](https://mcpmarket.com/news/2da90308-b24e-466c-a8f9-97a0e24d021f) - MEDIUM confidence

### Research Papers
- [AgentTrace: Structured Logging Framework](https://arxiv.org/abs/2602.10133) - Agent audit and tracing
- [AI Agent Systems Survey](https://arxiv.org/html/2601.13671v1) - MCP and A2A as dual foundation

### Existing Codebase
- Direct analysis of `src/lib/skills/`, `src/lib/mcp/`, `src/lib/approval/`, `src/lib/db/schema.ts` - HIGH confidence

---

*Architecture research for: AI Agent Framework (Next-Mind) with A2A Multi-Agent Integration*
*Researched: 2026-03-25*
