# Architecture Research: AI Agent Framework

**Domain:** AI Agent Collaboration Platform (Next-Mind)
**Framework Base:** pi-mono (TypeScript)
**Researched:** 2026-03-24
**Confidence:** HIGH

---

## Standard Architecture

### System Overview

```
+-----------------------------------------------------------------------------+
|                           PRESENTATION LAYER                                 |
|  +------------------+    +------------------+    +------------------+        |
|  |    Web UI        |    |    REST API      |    |   WebSocket      |        |
|  |  (ChatGPT-style) |    |    Gateway       |    |   Real-time      |        |
|  +--------+---------+    +--------+---------+    +--------+---------+        |
|           |                       |                       |                  |
+-----------+-----------------------+-----------------------+------------------+
|                           APPLICATION LAYER                                  |
|  +------------------+    +------------------+    +------------------+        |
|  |  Auth Service    |    |  Session Manager |    |  Audit Logger    |        |
|  |  (JWT/OAuth2)    |    |  (Conversation)  |    |  (Compliance)    |        |
|  +--------+---------+    +--------+---------+    +--------+---------+        |
|           |                       |                       |                  |
+-----------+-----------------------+-----------------------+------------------+
|                           AGENT CORE LAYER (pi-mono)                         |
|  +-----------------------------------------------------------------------+  |
|  |                        Orchestration Layer                             |  |
|  |  +-------------+  +-------------+  +-------------+  +-------------+   |  |
|  |  |   Planner   |  |  Executor   |  |  Verifier   |  |  Critic     |   |  |
|  |  |   Agent     |  |   Agent     |  |   Agent     |  |  Agent      |   |  |
|  |  +------+------+  +------+------+  +------+------+  +------+------+   |  |
|  |         |                |                |                |          |  |
|  +---------+----------------+----------------+----------------+----------+  |
|  |                     Agent Loop (Dual-Layer)                             |  |
|  |         [Steering Queue] + [Follow-up Queue]                            |  |
|  +---------+----------------+----------------+----------------+----------+  |
|  |                          MCP Protocol Layer                             |  |
|  |  +-------------+  +-------------+  +-------------+  +-------------+   |  |
|  |  |   Tools     |  |  Resources  |  |   Prompts   |  |   Skills    |   |  |
|  |  |  Registry   |  |   Manager   |  |  Templates  |  |   System    |   |  |
|  |  +-------------+  +-------------+  +-------------+  +-------------+   |  |
|  +-----------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------+
|                           INTEGRATION LAYER                                  |
|  +------------------+    +------------------+    +------------------+        |
|  |   LLM Gateway    |    |   File Handler   |    |   RAG Engine     |        |
|  |  (Multi-Model)   |    |  (OCR/Parse)     |    |  (Vector DB)     |        |
|  |  Qwen/GLM/MinMax |    |  PDF/Doc/Image   |    |  Embedding       |        |
|  +--------+---------+    +--------+---------+    +--------+---------+        |
|           |                       |                       |                  |
+-----------+-----------------------+-----------------------+------------------+
|                           DATA LAYER                                         |
|  +------------------+    +------------------+    +------------------+        |
|  |  PostgreSQL      |    |  Vector Store    |    |  Object Storage  |        |
|  |  (Relational)    |    |  (Embeddings)    |    |  (Files/Artifacts)|       |
|  +------------------+    +------------------+    +------------------+        |
+-----------------------------------------------------------------------------+
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Web UI** | ChatGPT-style conversation interface, file upload, artifact rendering | React/Next.js, streaming responses |
| **REST API Gateway** | External API access, rate limiting, request validation | Fastify/Express, OpenAPI spec |
| **Auth Service** | User authentication, authorization, session tokens | JWT, OAuth2, RBAC |
| **Session Manager** | Conversation state, message history, context window management | In-memory + persistent store |
| **Audit Logger** | Compliance logging, action tracking, traceability | Structured logs, immutable store |
| **Planner Agent** | Decompose objectives, create task graphs, assign work | LLM-powered planning |
| **Executor Agent** | Carry out actions, call tools, interact with external systems | Tool orchestration |
| **Verifier Agent** | Validate outputs against constraints, safety checks | Rule-based + LLM validation |
| **Critic Agent** | Evaluate quality, challenge assumptions, provide feedback | Adversarial prompting |
| **Agent Loop** | Core reasoning cycle: perceive -> reason -> act -> observe | pi-mono dual-layer loop |
| **MCP Protocol** | Standardized tool/resource/prompt interface | JSON-RPC 2.0 |
| **Skills System** | Predefined capabilities, custom skills, skill orchestration | Plugin architecture |
| **LLM Gateway** | Multi-provider abstraction, model routing, cost tracking | pi-ai unified API |
| **File Handler** | Document parsing, OCR, format conversion, extraction | Docling, LlamaParse, OCR |
| **RAG Engine** | Embedding generation, similarity search, knowledge retrieval | Vector DB + embeddings |

---

## Recommended Project Structure

```
next-mind/
+-- packages/
|   +-- core/                    # Core agent framework (pi-mono based)
|   |   +-- ai/                  # LLM abstraction layer (pi-ai)
|   |   +-- agent/               # Agent loop and orchestration (pi-agent-core)
|   |   +-- mcp/                 # MCP protocol implementation
|   |   +-- skills/              # Skills system core
|   |   +-- rag/                 # RAG engine
|   |   +-- file-processor/      # File handling and parsing
|   |
|   +-- api/                     # REST API server
|   |   +-- routes/              # API endpoints
|   |   +-- middleware/          # Auth, rate limiting, validation
|   |   +-- services/            # Business logic services
|   |
|   +-- web/                     # Web UI (Next.js)
|   |   +-- app/                 # Next.js app router
|   |   +-- components/          # React components
|   |   +-- hooks/               # Custom hooks for agent interaction
|   |   +-- lib/                 # Client-side utilities
|   |
|   +-- shared/                  # Shared utilities and types
|       +-- types/               # TypeScript type definitions
|       +-- utils/               # Common utilities
|       +-- constants/           # Configuration constants
|
+-- services/                    # Standalone services
|   +-- auth/                    # Authentication service
|   +-- audit/                   # Audit logging service
|   +-- embedding/               # Embedding generation worker
|
+-- infrastructure/              # Deployment configuration
|   +-- docker/                  # Docker configurations
|   +-- k8s/                     # Kubernetes manifests
|
+-- docs/                        # Documentation
+-- tests/                       # Integration tests
```

### Structure Rationale

- **packages/core/**: Contains pi-mono-based agent framework, isolated from UI/API concerns
- **packages/api/**: REST API as separate package for independent scaling and testing
- **packages/web/**: Next.js application for ChatGPT-style interface
- **packages/shared/**: Eliminates code duplication between packages
- **services/**: Background workers and standalone services
- **infrastructure/**: Infrastructure-as-code for deployment

---

## Architectural Patterns

### Pattern 1: Dual-Layer Agent Loop (pi-mono Core)

**What:** A two-level loop architecture that separates "steering" (interruptions) from "follow-up" (continuations).

**When to use:** Interactive scenarios where users sit in front of a screen and may interrupt or append messages.

**Trade-offs:**
- Pros: Clean separation of interrupt vs. continue semantics, responsive to user input
- Cons: More complex than simple ReAct loop, requires careful state management

```
// Outer loop: Handle follow-up messages (when agent is about to stop)
while (true) {
    let hasMoreToolCalls = true;

    // Inner loop: Handle tool calls + steering messages (interruptions)
    while (hasMoreToolCalls || pendingMessages.length > 0) {
        // Inject pending steering messages
        if (pendingMessages.length > 0) {
            context.messages.push(...pendingMessages);
            pendingMessages = [];
        }

        // Call LLM
        const message = await streamAssistantResponse(context);

        // Execute tools, checking for steering after each
        const toolCalls = message.content.filter(c => c.type === "toolCall");
        hasMoreToolCalls = toolCalls.length > 0;

        if (hasMoreToolCalls) {
            const result = await executeToolCalls(tools, getSteeringMessages);
            // Steering messages cause remaining tools to be skipped
        }

        pendingMessages = await getSteeringMessages() || [];
    }

    // Check for follow-up messages before truly stopping
    const followUp = await getFollowUpMessages() || [];
    if (followUp.length > 0) {
        pendingMessages = followUp;
        continue;  // Start new round
    }
    break;  // Truly done
}
```

### Pattern 2: MCP (Model Context Protocol) Integration

**What:** Standardized protocol for connecting AI models to external tools, resources, and prompts using JSON-RPC 2.0.

**When to use:** When building systems that require multiple tools, need model-agnostic integration, or want ecosystem compatibility.

**Trade-offs:**
- Pros: Vendor-neutral, enables model swapping without rewriting integrations, growing ecosystem
- Cons: Protocol overhead, learning curve for MCP server development

**Three Primitives:**

| Primitive | Control | Purpose |
|-----------|---------|---------|
| **Tools** | Model-controlled | Functions AI can invoke (APIs, databases, actions) |
| **Resources** | Application-controlled | Data AI can read (files, records, context) |
| **Prompts** | User-controlled | Reusable templates for structured interactions |

```
// MCP Server Example (Tools)
@mcp.tool()
async def query_database(sql: str) -> str:
    """Execute a read-only SQL query against the analytics database."""
    # Input validation
    if not sql.strip().upper().startswith("SELECT"):
        return "Only SELECT queries are allowed"

    result = await db.execute(sql)
    return format_result(result)

// MCP Resource Example
@mcp.resource("config://settings")
async def get_settings() -> str:
    """Return current configuration."""
    return json.dumps(config)
```

### Pattern 3: A2A (Agent-to-Agent) Collaboration

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

### Pattern 4: RAG (Retrieval-Augmented Generation) Architecture

**What:** Architecture combining vector similarity search with LLM generation for knowledge-grounded responses.

**When to use:** When agents need access to large knowledge bases, document collections, or historical context.

**Trade-offs:**
- Pros: Reduces hallucinations, enables access to proprietary knowledge
- Cons: Retrieval quality affects output quality, latency overhead

**Pipeline:**

```
[Document Ingestion]
     |
     v
[Text Extraction] --> [Chunking] --> [Embedding Generation]
                                            |
                                            v
                                     [Vector Store]
                                            |
[User Query] --> [Query Embedding] --> [Similarity Search]
                                            |
                                            v
                                    [Retrieved Chunks]
                                            |
                                            v
                                    [Context Assembly]
                                            |
                                            v
                                    [LLM Generation]
```

### Pattern 5: Role-Based Agent Design

**What:** Assigning specialized roles to agents (Planner, Executor, Verifier, Critic) to mirror human team structures.

**When to use:** Long-running, tool-heavy workflows where separation of planning, execution, and validation improves reliability.

**Trade-offs:**
- Pros: Improved reliability, interpretability, maintainability
- Cons: More agents to manage, coordination complexity

| Role | Responsibility | Tool Access |
|------|----------------|-------------|
| **Planner** | Decompose objectives, create task graphs | Read-only |
| **Executor** | Execute actions, call APIs | Write + Read |
| **Verifier** | Validate outputs, enforce constraints | Read-only |
| **Critic** | Challenge assumptions, evaluate quality | Read-only |

---

## Data Flow

### Request Flow

```
[User Message]
     |
     v
[Auth Middleware] --> Validate JWT/Session
     |
     v
[Session Manager] --> Load/Create Conversation
     |
     v
[Agent Loop] --> [Planner Agent] --> Analyze & Plan
     |                  |
     v                  v
[Executor Agent] <-- [Task Queue]
     |
     v
[MCP Tools] --> External APIs / File System / Database
     |
     v
[Verifier Agent] --> Validate Results
     |
     v
[Critic Agent] --> Quality Check (optional)
     |
     v
[Response Stream] --> WebSocket / SSE --> [Web UI]
     |
     v
[Audit Logger] --> Log all actions for compliance
```

### State Management

```
[Session State] (PostgreSQL)
     |
     +-- Conversation History
     +-- User Preferences
     +-- Permission Context
     |
[Agent State] (In-Memory + Checkpoints)
     |
     +-- Message Queue (steering/follow-up)
     +-- Tool Results Buffer
     +-- Execution Checkpoints
     |
[Knowledge State] (Vector Store)
     |
     +-- Document Embeddings
     +-- Conversation Embeddings
     +-- External Knowledge Index
```

### Key Data Flows

1. **Conversation Flow:** User message -> Session -> Agent Loop -> LLM -> Tools -> Response -> Audit Log
2. **RAG Flow:** Query -> Embedding -> Vector Search -> Context Assembly -> LLM Generation
3. **File Processing Flow:** Upload -> Storage -> OCR/Parse -> Chunk -> Embed -> Vector Store
4. **Multi-Agent Flow:** Task -> Planner -> Executor(s) -> Verifier -> Aggregator -> Response

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Monolith acceptable. Single API server, single agent instance, PostgreSQL + single vector store. |
| 1k-10k users | Separate API and Agent workers. Add Redis for session caching. Consider read replicas for PostgreSQL. |
| 10k-100k users | Horizontal scaling of API servers. Agent workers with load balancing. Vector store sharding. |
| 100k+ users | Full microservices. Dedicated LLM gateway with caching. Multi-region deployment. Async job queues for heavy processing. |

### Scaling Priorities

1. **First bottleneck:** LLM API latency and costs. Mitigation: Response caching, streaming, smaller models for simple tasks.
2. **Second bottleneck:** Vector search latency. Mitigation: Index optimization, approximate nearest neighbor, caching.
3. **Third bottleneck:** Session state management. Mitigation: Redis clustering, session partitioning.

---

## Anti-Patterns

### Anti-Pattern 1: Single Agent for Everything

**What people do:** Build one monolithic agent that handles planning, execution, validation, and all tool interactions.

**Why it's wrong:** Prompt bloat, context window exhaustion, difficult to debug, single point of failure.

**Do this instead:** Use role-based agent design with specialized agents for planning, execution, and validation.

### Anti-Pattern 2: Unstructured Agent Communication

**What people do:** Let agents communicate via free-form natural language without contracts.

**Why it's wrong:** Parsing failures, inconsistent behavior, difficult to debug, schema drift.

**Do this instead:** Use structured outputs with JSON schemas, versioned contracts between agents.

### Anti-Pattern 3: Missing Iteration Limits

**What people do:** Allow agent loops to run indefinitely until completion.

**Why it's wrong:** Infinite loops, runaway costs, resource exhaustion.

**Do this instead:** Implement max_iterations (e.g., 20), cost budgets, convergence criteria, and human escalation paths.

### Anti-Pattern 4: Shared Memory Without Validation

**What people do:** Allow all agents to read/write to shared memory without validation.

**Why it's wrong:** Memory contamination, error propagation, reduced reasoning diversity.

**Do this instead:** Use hybrid approach - shared memory for validated information, isolated memory for reasoning/exploration.

### Anti-Pattern 5: Tool Access Without Scoping

**What people do:** Give all agents access to all tools.

**Why it's wrong:** Security risks, unintended actions, difficult audit trails.

**Do this instead:** Apply least-privilege principle - each agent only has tools it absolutely needs.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Qwen3.5 / GLM / MinMax** | LLM Gateway (pi-ai) | Unified API abstraction, streaming support |
| **Cloud Storage** | MCP Resource | File upload/download, artifact storage |
| **Vector Database** | RAG Engine | Milvus/Pinecone/Qdrant for embeddings |
| **OCR Service** | File Processor | Document parsing, text extraction |
| **Email/Notification** | MCP Tool | Async notifications, alerts |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Web UI <-> API | REST + WebSocket | Streaming responses, real-time updates |
| API <-> Agent Core | Direct function calls | Same process, shared memory |
| Agent <-> MCP Tools | JSON-RPC 2.0 | Protocol-compliant tool invocation |
| Agent <-> RAG | Async API | Non-blocking retrieval |
| Agent <-> File Processor | Message Queue | Background processing for large files |

---

## Security Architecture

### Authentication Flow

```
[User] --> [OAuth2/JWT] --> [Auth Service]
                                |
                                v
                         [Token Validation]
                                |
                                v
                         [Session Creation]
                                |
                                v
                         [Permission Context]
                                |
                                v
                         [Agent Context Injection]
```

### Security Layers

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| **Transport** | TLS 1.3 | Encrypted communication |
| **Authentication** | OAuth2 / JWT | User identity verification |
| **Authorization** | RBAC | Permission-based access control |
| **Data** | AES-256 encryption | At-rest encryption |
| **Audit** | Immutable logs | Compliance and traceability |

### Content Safety

| Check | Trigger | Action |
|-------|---------|--------|
| **Input Filtering** | User message received | Sanitize, detect injection |
| **Prompt Injection** | Before LLM call | Isolate system prompts |
| **Output Filtering** | LLM response generated | Content safety scan |
| **Tool Validation** | Before tool execution | Validate parameters, check permissions |

---

## Audit and Observability

### What to Log

| Event Type | Data Captured | Retention |
|------------|---------------|-----------|
| **Authentication** | User ID, timestamp, IP, success/failure | 90 days |
| **Conversation** | Message content, agent decisions, tool calls | Per policy |
| **Tool Execution** | Tool name, parameters, result, duration | 90 days |
| **Errors** | Stack trace, context, recovery action | 90 days |
| **Performance** | Latency, token usage, cost | 30 days |

### Observability Stack

```
[Application] --> [Structured Logs] --> [Log Aggregator]
                       |
                       v
              [Metrics Exporter] --> [Time-Series DB]
                       |
                       v
              [Trace Collector] --> [Distributed Tracing]
```

---

## Build Order Implications

Based on component dependencies, recommended implementation order:

### Phase 1: Foundation
1. **LLM Gateway (pi-ai)** - Core abstraction for multi-model support
2. **Agent Loop (pi-agent-core)** - Basic ReAct loop without steering
3. **Session Manager** - Conversation persistence
4. **Auth Service** - Basic authentication

### Phase 2: Core Features
5. **MCP Protocol** - Tool/resource/prompt infrastructure
6. **Basic Tools** - File read/write, bash execution
7. **Web UI** - ChatGPT-style conversation interface
8. **Audit Logger** - Basic logging for compliance

### Phase 3: Intelligence
9. **RAG Engine** - Vector store, embedding, retrieval
10. **File Processor** - Document parsing, OCR
11. **Skills System** - Predefined and custom skills
12. **Dual-Layer Loop** - Steering and follow-up support

### Phase 4: Multi-Agent
13. **Role-Based Agents** - Planner, Executor, Verifier, Critic
14. **A2A Communication** - Agent-to-agent messaging
15. **Orchestration Layer** - Task assignment, coordination

### Phase 5: Enterprise
16. **Advanced Security** - Content safety, encryption
17. **Scalability** - Horizontal scaling, caching
18. **API Gateway** - External API access, rate limiting

---

## Sources

### Official Documentation
- [MCP Official Documentation](https://modelcontextprotocol.io/development/roadmap) - Model Context Protocol specification
- [pi-mono Architecture Analysis](https://zhuanlan.zhihu.com/p/2007047649933693864) - Deep dive into pi-mono agent loop design

### Architecture Guides
- [Multi-Agent System Architecture Guide 2026](https://www.clickittech.com/ai/multi-agent-system-architecture/) - Comprehensive MAS architecture (HIGH confidence)
- [AI Architecture Patterns 101](https://aipmguru.substack.com/p/ai-architecture-patterns-101-workflows) - Workflows, Agents, MCP, A2A patterns (HIGH confidence)
- [MCP Complete Guide 2026](https://www.sitepoint.com/model-context-protocol-mcp/) - MCP architecture and implementation (HIGH confidence)

### Research Papers
- [AgentTrace: Structured Logging Framework](https://arxiv.org/abs/2602.10133) - Agent audit and tracing
- [AI Agent Systems Survey](https://arxiv.org/html/2601.13671v1) - MCP and A2A as dual foundation

### Framework Comparisons
- [Reddit: AI Agent Framework Comparison 2026](https://www.reddit.com/r/LangChain/comments/1rnc2u9/comprehensive_comparison_of_every_ai_agent/) - Community comparison
- [Top 9 AI Agent Frameworks 2026](https://www.capsolver.com/blog/AI/top-9-ai-agent-frameworks-in-2026) - Framework selection guide

---

*Architecture research for: AI Agent Framework (Next-Mind)*
*Researched: 2026-03-24*
