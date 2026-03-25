# Project Research Summary

**Project:** Next-Mind (AI Agent Collaboration Platform)
**Domain:** AI Agent Framework with A2A Multi-Agent Integration
**Researched:** 2026-03-25
**Confidence:** HIGH

## Executive Summary

Next-Mind is an AI agent collaboration platform built on pi-mono (TypeScript-first LLM framework) with native support for Chinese LLMs (Qwen, GLM, MiniMax). The v1.0 platform is complete with ChatGPT-style UI, MCP protocol implementation, Skills system, and approval workflows. The v1.1 milestone focuses on adding A2A (Agent-to-Agent) multi-agent collaboration for task decomposition and delegation.

Research reveals that multi-agent systems have a 93-95% failure rate before production, primarily due to coordination and design issues rather than technical problems. The recommended approach follows Anthropic's orchestrator-worker pattern: a lead agent decomposes complex tasks into subtasks with clear boundaries, delegates to specialized sub-agents (File, Search, Code, Custom), and aggregates results. Critical success factors include: typed schemas for all agent communication (avoid natural language ambiguity), structured sharing protocols between agents, independent verification of outputs, and checkpoint/resume capability for long-running tasks.

Key risks include the "more agents = more capability" fallacy (coordination overhead often exceeds benefits), specification ambiguity (41.77% of failures), and compounding error cascades across agent handoffs. Mitigation requires JSON schemas for all inputs/outputs, circuit breakers at each handoff, and explicit completion criteria verified by an independent judge agent.

## Key Findings

### Recommended Stack

The platform uses pi-mono (@mariozechner/pi-ai, @mariozechner/pi-agent-core) as the unified LLM layer with native MiniMax support and OpenAI-compatible API for Qwen/GLM. Next.js 15 with App Router provides the full-stack web framework. PostgreSQL with Drizzle ORM handles persistence, with Qdrant for vector storage in RAG scenarios.

**Core technologies:**
- **pi-mono (0.61.x):** Unified LLM API with multi-provider support, TypeBox schemas for tools, streaming events -- already selected by project
- **Next.js 15:** Full-stack framework with App Router for secure API key handling, Vercel AI SDK integration
- **PostgreSQL 16 + Drizzle ORM:** Battle-tested relational DB with minimal bundle size (~7.4kb), 700ms faster cold starts than Prisma
- **Qdrant 1.12.x:** Dedicated vector database for RAG, better HNSW optimization at scale than pgvector

**Supporting libraries:**
- **Vercel AI SDK 4.x:** Streaming chat UI, tool calling UI patterns
- **shadcn/ui:** ChatGPT-style interface components, Tailwind v4 support
- **LlamaIndex.TS 0.7.x:** RAG framework with 35% boost in retrieval accuracy
- **Auth.js 5.x:** Authentication with OAuth, session management
- **@modelcontextprotocol/sdk:** MCP protocol implementation for tool/resource access

### Expected Features

**Must have (table stakes for v1.1 A2A):**
- Task Decomposition Engine -- Lead agent breaks complex requests into subtasks with clear boundaries
- Agent Registry -- Track available sub-agents and their capabilities
- Basic Sub-Agent Types (File, Search) -- Specialized agents with domain-optimized prompts
- Sequential Execution -- Run sub-agents one after another with state persistence
- Result Aggregation (Merge) -- Combine sub-agent outputs into coherent response
- Basic Progress Status -- Show which agents are running, completed, failed

**Should have (competitive differentiators):**
- Parallel Execution -- Run independent sub-agents simultaneously (90% time reduction)
- Dependency Analysis -- Determine task dependencies automatically for smart scheduling
- All Four Agent Types -- Add Code and Custom agent types
- Enhanced Result Handling -- Compare mode, summarize mode, user selection

**Defer (v2+):**
- Skills marketplace -- Requires skills system maturity, community building
- Graph-RAG / Hybrid RAG -- Adds significant complexity
- Mobile native apps -- Web-first validated; mobile as enhancement
- Multi-tenancy -- Single-team focus validated first

### Architecture Approach

The architecture extends the existing v1.0 system (LLM Gateway, MCP Server, Skills System, Approval Flow) with a new A2A layer. Sub-agents ARE specialized skills -- the existing skill system becomes the foundation for agent capabilities, minimizing code duplication.

**Major components:**
1. **Agent Registry** -- Registration, discovery, capability mapping; extends existing `SkillMetadata` pattern
2. **Task Queue** -- Task enqueue/dequeue with priority and retry logic
3. **Communication Bus** -- Pub/sub messaging between agents with structured message types
4. **Result Aggregator** -- Merge, compare, summarize results from parallel/sequential agents
5. **Workflow Engine** -- Multi-agent workflow orchestration with state persistence

**Key integration points:**
- Skills System: Sub-agents extend `AgentMetadata` from `SkillMetadata`
- MCP Server: Agents exposed as MCP tools via `agent_${id}` naming
- Approval Flow: Delegation requires approval via `AgentApprovalStateMachine`
- Database: New tables for `agents`, `agentTasks`, `agentMessages`, `workflows`

### Critical Pitfalls

1. **Specification Ambiguity (41.77% of failures)** -- Agents cannot infer context; treat specifications like API contracts with JSON schemas for ALL inputs/outputs, explicit action constraints, discriminated unions for validatable options.

2. **Compounding Error Cascade (17x amplification)** -- Errors compound across handoffs; implement structured communication protocols with schema validation, circuit breakers at each boundary, shared memory with TTL, and independent verification.

3. **"More Agents = More Capability" Fallacy** -- Multi-agent coordination yields highest returns only when single-agent baseline is below 45% success rate; start with clear justification, use read-only sub-agents first, implement clear ownership model.

4. **Weak Verification (13.48% of failures)** -- Garbage in, garbage out with more steps; add independent judge agent with isolated prompts and context, multi-level verification (low-level correctness + high-level objectives), external knowledge sources.

5. **Context Window Exhaustion** -- Token duplication rates of 53-86% across frameworks; implement context compression, TTL for shared state, priority-based retention, agent-scoped context windows.

## Implications for Roadmap

Based on research, suggested phase structure for v1.1 A2A milestone:

### Phase 1: Foundation & Task Decomposition
**Rationale:** Must establish agent types, registry, and database schema before any multi-agent execution can occur. Addresses specification ambiguity pitfall with typed schemas from the start.
**Delivers:** Agent type definitions, registry, database schema, task decomposition engine
**Addresses:** Task Decomposition, Agent Registry, Basic Sub-Agent Types
**Avoids:** Specification Ambiguity (typed schemas from day one)

### Phase 2: Core Execution & Communication
**Rationale:** With foundation in place, build execution engine and communication bus. Addresses compounding errors with structured protocols.
**Delivers:** Agent executor, task queue, communication bus, LLM context handler
**Uses:** pi-mono streaming, existing Skills executor patterns
**Implements:** Sequential Execution, Result Aggregation (Merge)
**Avoids:** Compounding Error Cascade (circuit breakers, structured messaging), Context Window Exhaustion (TTL, compression)

### Phase 3: Verification & Progress
**Rationale:** Add independent verification layer and user-facing progress. Addresses weak verification pitfall.
**Delivers:** Independent judge agent, progress status, completion checklists, workflow state persistence
**Addresses:** Basic Progress Status, Error Recovery
**Avoids:** Weak Verification (independent judge), Premature Termination (completion checklists)

### Phase 4: Parallel Execution & Smart Scheduling
**Rationale:** With sequential execution validated, add parallelism for independent tasks. Research shows 3-5 subagents in parallel = up to 90% time reduction.
**Delivers:** Parallel execution, dependency analysis, auto-scheduling, all four agent types
**Uses:** Promise.all patterns, Task Queue concurrency
**Implements:** Parallel Execution, Dependency Analysis, Auto-Scheduling

### Phase 5: Advanced Features & Polish
**Rationale:** Final features for competitive differentiation and UX.
**Delivers:** Enhanced result handling (compare, summarize, select), checkpoint/resume, agent cards, workflow progress UI
**Addresses:** Result Comparison Mode, Checkpoint/Resume, Agent Card Discovery

### Phase Ordering Rationale

- **Foundation first:** Database schema and types are dependencies for all other components
- **Execution before parallelism:** Sequential execution validates core patterns before adding complexity
- **Verification before scale:** Independent judge catches issues before parallel execution amplifies them
- **Communication last among core:** Inter-agent messaging is valuable but secondary to basic delegation

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4:** Dependency analysis algorithms for auto-scheduling -- may need research on graph-based task planning
- **Phase 5:** Checkpoint/resume patterns for long-running tasks -- durable state management strategies

Phases with standard patterns (skip research-phase):
- **Phase 1:** Well-documented patterns for registry and schema design, follows existing Skills system
- **Phase 2:** Executor and queue patterns are standard, communication bus follows pub/sub patterns
- **Phase 3:** Verification patterns documented in MAST study and Anthropic research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | pi-mono verified via official NPM/GitHub, other technologies verified via official docs and 2025 ecosystem research |
| Features | HIGH | Primary sources include Anthropic multi-agent research, Google A2A protocol docs, MAST failure taxonomy study |
| Architecture | HIGH | Based on direct analysis of existing codebase plus official MCP/A2A documentation |
| Pitfalls | HIGH | MAST study (arXiv 2503.13657v2) analyzed 200+ traces, GitHub Blog official patterns, Augment Code industry research |

**Overall confidence:** HIGH

### Gaps to Address

- **Dependency analysis algorithm:** Phase 4 may need specific graph-based task planning research; recommend `/gsd:research-phase` when planning that phase
- **Checkpoint/resume state management:** Phase 5 durable state patterns need validation; consider Redis vs PostgreSQL trade-offs at scale
- **Rate limit coordination:** Multi-agent scenarios hitting same LLM APIs simultaneously -- need exponential backoff coordination strategy

## Sources

### Primary (HIGH confidence)
- **Anthropic Engineering** -- [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) -- Architecture, prompting principles, evaluation methods
- **Google Developers Blog** -- [Announcing the Agent2Agent Protocol (A2A)](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/) -- Official A2A specification, design principles
- **arXiv 2503.13657v2** -- [MAST: Multi-Agent System Failure Taxonomy](https://arxiv.org/html/2503.13657v2) -- 200+ traces analyzed, 14 failure modes identified
- **GitHub Blog** -- [Multi-agent workflows often fail](https://github.blog/ai-and-ml/generative-ai/multi-agent-workflows-often-fail-heres-how-to-engineer-ones-that-dont/) -- Official engineering patterns
- **pi-mono GitHub/NPM** -- Verified 2026-03-24, version 0.61.1 published

### Secondary (MEDIUM confidence)
- **Augment Code** -- [Why Multi-Agent LLM Systems Fail](https://www.augmentcode.com/guides/why-multi-agent-llm-systems-fail-and-how-to-fix-them) -- 41-86.7% failure rates, prevention strategies
- **Galileo AI** -- [Multi-Agent Coordination Strategies](https://galileo.ai/blog/multi-agent-coordination-strategies) -- 10 coordination strategies, token duplication data
- **OneReach AI** -- [MCP vs A2A Protocols](https://onereach.ai/blog/guide-choosing-mcp-vs-a2a-protocols/) -- Protocol comparison, enterprise considerations
- **LangGraph Documentation** -- [Multi-Agent Workflows](https://blog.langchain.com/langgraph-multi-agent-workflows/) -- Official patterns

### Tertiary (LOW confidence)
- **Medium articles** -- Production patterns, framework comparisons -- needs validation against primary sources
- **Industry blog posts** -- Competitor analysis, feature matrices -- useful for context but not definitive

---
*Research completed: 2026-03-25*
*Ready for roadmap: yes*
