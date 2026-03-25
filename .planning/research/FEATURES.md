# Feature Research

**Domain:** AI Agent Collaboration Platform
**Researched:** 2026-03-25 (Updated for v1.1 A2A milestone)
**Confidence:** HIGH

---

## v1.1 A2A Multi-Agent Collaboration Features

This section covers NEW features for the v1.1 milestone: adding A2A multi-agent collaboration (task decomposition & delegation) to the existing platform.

### Executive Summary

Key findings from A2A multi-agent research:
- **Multi-agent systems excel at breadth-first queries** - Anthropic's research shows 90.2% improvement over single-agent for parallel exploration tasks
- **Token usage explains 80% of performance variance** - distributing work across agents with separate context windows scales capacity
- **93-95% of AI agent projects fail before production** - mostly due to coordination/design issues, not technical problems
- **A2A and MCP are complementary protocols** - MCP connects agents to tools/data, A2A enables agent-to-agent collaboration

### Table Stakes for A2A (Users Expect These)

Features users assume exist in any multi-agent system. Missing these = product feels incomplete or unreliable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Task Decomposition** | Users expect the main agent to break complex requests into subtasks automatically | HIGH | Requires LLM-based planning; must produce clear task boundaries to prevent duplicate work |
| **Sub-Agent Spawning** | Users expect the system to create and manage multiple specialized agents | MEDIUM | Leverage existing Skills/MCP infrastructure; need agent lifecycle management |
| **Progress Visibility** | Users need to see what agents are doing, especially for long-running tasks | MEDIUM | Real-time status updates, not just final results; prevent "black box" perception |
| **Result Aggregation** | Users expect combined, coherent outputs from multiple agents | MEDIUM | Must synthesize results without losing information or creating contradictions |
| **Error Recovery** | Users expect graceful handling when sub-agents fail | MEDIUM | Resume from checkpoints, not restart from beginning; let agents adapt to failures |
| **Human Intervention** | Users expect to be able to intervene, correct, or redirect agents | LOW | Already have approval flow; extend for multi-agent context |

### Differentiators for A2A (Competitive Advantage)

Features that set the product apart. Not required, but valuable for v1.1.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Smart Scheduling (Auto Sequential/Parallel)** | Automatically determines optimal execution order based on task dependencies | HIGH | Uses dependency graph analysis; saves user from manual orchestration |
| **Four Specialized Agent Types** | File Processing, Search, Code, Custom agents with domain-optimized prompts | MEDIUM | Each type has tailored tools, prompts, and output formats |
| **Inter-Agent Messaging** | Agents can request context from each other, share findings, coordinate | HIGH | Enables collaborative problem-solving beyond simple delegation |
| **Result Comparison Mode** | Present multiple agent results side-by-side for user selection | MEDIUM | Useful when agents produce different approaches to same task |
| **Agent Card / Capability Discovery** | Standardized declaration of agent capabilities for dynamic routing | LOW | A2A protocol pattern; enables flexible agent ecosystems |
| **Checkpoint/Resume** | Long-running research can be paused and resumed without losing progress | HIGH | Critical for tasks that may take hours; requires durable state |

### Anti-Features for A2A (Commonly Requested, Often Problematic)

Features that seem good but create problems in multi-agent systems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Unlimited Parallel Agents** | More agents = faster results, right? | Token burn (15x more than chat), coordination overhead, duplicate work, conflicting results | Scale effort to task complexity (Anthropic: 1 agent for simple, 2-4 for comparison, 10+ for complex research) |
| **Real-Time Agent-to-Agent Chat** | Users want to "watch agents collaborate" | Creates bottlenecks, adds complexity, agents aren't great at real-time coordination | Asynchronous delegation with status notifications; lead agent coordinates |
| **Shared Memory Between All Agents** | Agents should "know what each other knows" | Context pollution, conflicting information, privacy concerns | Separate context windows with controlled information flow; lead agent synthesizes |
| **Fully Autonomous Delegation** | "Just handle it, don't bother me" | 79% of failures are design/coordination issues; runaway agents; no accountability | Human-in-the-loop at key decision points; effort budgets; clear escalation triggers |
| **Complex DAG Workflows** | Visual workflow builders, intricate branching | Maintenance nightmare, hard to debug, over-engineering for most use cases | Simple orchestrator-worker pattern; parallel subagents with lead agent coordination |
| **Agent "Learning" From Each Other** | Agents should improve by observing peers | Cross-contamination of errors, emergent bad behaviors, hard to debug | Explicit knowledge sharing through structured outputs; no implicit behavioral learning |

### A2A Feature Dependencies

```
Task Decomposition
    └──requires──> Agent Registry / Capability Discovery
                       └──requires──> Agent Card Schema

Smart Scheduling
    └──requires──> Task Decomposition (to analyze dependencies)
    └──requires──> Dependency Graph Builder

Sub-Agent Spawning
    └──requires──> Agent Registry
    └──requires──> Existing Skills/MCP Infrastructure (already built)

Result Aggregation
    └──requires──> Sub-Agent Spawning (to get results)
    └──requires──> Output Schema Standardization

Inter-Agent Messaging
    └──requires──> Agent Registry
    └──requires──> Message Bus / Event System

Human Intervention
    └──requires──> Progress Visibility (to know when to intervene)
    └──enhances──> Existing Approval Flow (already built)

Process Visibility
    └──requires──> Status Notification System
    └──requires──> Event Stream / SSE
```

### Dependency Notes for A2A

- **Task Decomposition requires Agent Registry:** The lead agent needs to know what sub-agents exist and their capabilities before it can decompose tasks effectively
- **Smart Scheduling requires Task Decomposition:** Cannot determine parallel vs sequential without understanding task dependencies
- **Sub-Agent Spawning leverages existing Skills/MCP:** The v1.0 Skills system provides the execution layer; sub-agents are specialized skill executors
- **Result Aggregation requires Output Schema:** Agents must produce structured outputs that can be merged, compared, or summarized
- **Inter-Agent Messaging requires Message Bus:** Need infrastructure for agents to communicate asynchronously
- **Human Intervention enhances existing Approval Flow:** Extend v1.0 approval mechanism for multi-agent context (pause specific sub-agent, redirect research, provide guidance)

### A2A Feature Categories (For Roadmap Phases)

**Category 1: Core Delegation (Foundation)**
- Task decomposition with clear task boundaries
- Basic sub-agent spawning (2-3 agent types)
- Sequential execution with result aggregation
- Simple progress status

**Category 2: Smart Orchestration (Optimization)**
- Parallel execution
- Dependency analysis for auto-scheduling
- All four agent types (File, Search, Code, Custom)
- Enhanced result handling (merge, compare, summarize)

**Category 3: Communication & Control (Advanced)**
- Inter-agent messaging
- Context requests between agents
- Human intervention hooks
- Checkpoint/resume for long tasks

**Category 4: Visibility & Polish (UX)**
- Rich process visualization
- Real-time status streaming
- Agent card / capability discovery
- Result selection UI

### A2A MVP Definition (v1.1 Scope)

**Phase 1: Core Delegation (Must Have)**

Minimum viable multi-agent - what's needed to validate the delegation concept.

- [ ] Task Decomposition Engine — Lead agent breaks complex requests into subtasks
- [ ] Agent Registry — Track available sub-agents and their capabilities
- [ ] Basic Sub-Agent Types (2-3) — File Processing, Search (Code/Custom can be v1.2)
- [ ] Sequential Execution — Run sub-agents one after another
- [ ] Result Aggregation (Merge) — Combine sub-agent outputs into coherent response
- [ ] Basic Progress Status — Show which agents are running, completed, failed

**Phase 2: Smart Orchestration (Should Have)**

Add once core delegation works reliably.

- [ ] Parallel Execution — Run independent sub-agents simultaneously
- [ ] Dependency Analysis — Determine task dependencies automatically
- [ ] Auto-Scheduling — Choose sequential vs parallel based on dependencies
- [ ] All Four Agent Types — Add Code and Custom agent types
- [ ] Enhanced Result Handling — Compare mode, summarize mode, user selection

**Phase 3: Communication & Control (Enhancement)**

Advanced features for complex workflows.

- [ ] Inter-Agent Messaging — Agents can communicate findings to each other
- [ ] Context Requests — Sub-agents can request additional context from lead agent
- [ ] Human Intervention Hooks — Pause, redirect, provide guidance mid-execution
- [ ] Checkpoint/Resume — Save state for long-running tasks

### A2A Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Task Decomposition | HIGH | HIGH | P1 |
| Agent Registry | HIGH | MEDIUM | P1 |
| Basic Sub-Agent Types | HIGH | MEDIUM | P1 |
| Sequential Execution | HIGH | LOW | P1 |
| Result Aggregation | HIGH | MEDIUM | P1 |
| Basic Progress Status | HIGH | LOW | P1 |
| Parallel Execution | MEDIUM | MEDIUM | P2 |
| Dependency Analysis | MEDIUM | HIGH | P2 |
| Auto-Scheduling | MEDIUM | HIGH | P2 |
| All Four Agent Types | MEDIUM | MEDIUM | P2 |
| Enhanced Result Handling | MEDIUM | MEDIUM | P2 |
| Inter-Agent Messaging | LOW | HIGH | P3 |
| Context Requests | LOW | MEDIUM | P3 |
| Human Intervention Hooks | MEDIUM | MEDIUM | P3 |
| Checkpoint/Resume | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.1 MVP (core delegation working)
- P2: Should have, add once core is validated
- P3: Nice to have, future consideration

### Key Design Principles for A2A (From Research)

**From Anthropic's Multi-Agent Research System:**

1. **Scale effort to query complexity** — Simple fact-finding: 1 agent, 3-10 tool calls. Direct comparisons: 2-4 subagents, 10-15 calls each. Complex research: 10+ subagents with clear division of labor
2. **Teach the orchestrator how to delegate** — Each subagent needs: objective, output format, tool/source guidance, clear task boundaries
3. **Parallel tool calling transforms speed** — 3-5 subagents in parallel + 3+ tools in parallel = up to 90% time reduction
4. **Start wide, then narrow down** — Begin with broad queries, evaluate what's available, then progressively narrow
5. **Agents are stateful and errors compound** — Need resume from checkpoints, not restart from beginning

**From Google's A2A Protocol:**

1. **Capability discovery via Agent Cards** — JSON format declaring capabilities and endpoints
2. **Task lifecycle management** — Tasks have states: submitted, processing, complete
3. **Modality agnostic** — Support text, audio, video (though text is primary for v1.1)
4. **Secure by default** — OAuth-based authentication, encrypted transport

**From Multi-Agent Failure Analysis:**

1. **93-95% failure rate before production** — Most failures are coordination/design issues, not technical
2. **41-86% fail in production** — Need robust error handling and recovery
3. **79% of failures are NOT technical** — They're design and coordination problems
4. **Near-total failure for 3+ agent coordination** — Dynamic ad-hoc coordination is hard; use structured delegation

### A2A Competitor Feature Analysis

| Feature | LangGraph | CrewAI | Anthropic Research | Our Approach (v1.1) |
|---------|-----------|--------|-------------------|---------------------|
| Architecture | Graph-based state machine | Role-based agents | Orchestrator-worker | Orchestrator-worker (simpler) |
| Parallelization | Explicit edges | Sequential by default | 3-5 subagents parallel | Phase 2: Parallel execution |
| Task Decomposition | Manual graph design | Automatic roles | Lead agent decomposes | LLM-based decomposition |
| Agent Types | Custom nodes | Role definitions | Specialized subagents | 4 types: File, Search, Code, Custom |
| Result Handling | State aggregation | Task output | Lead agent synthesizes | Merge, compare, summarize, select |
| Protocol | Custom | Custom | MCP + internal | MCP (existing) + A2A patterns |

**Our differentiator:** Simplicity and integration with existing v1.0 infrastructure (Skills, MCP, Approval Flow). Not trying to be a general-purpose framework like LangGraph or CrewAI.

### A2A Sources

**Primary Sources (HIGH Confidence):**
- [Anthropic: How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) - Detailed architecture, prompting principles, evaluation methods
- [Google: Announcing the Agent2Agent Protocol (A2A)](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/) - Official A2A specification, design principles
- [OneReach: MCP vs A2A Protocols for Multi-Agent Collaboration](https://onereach.ai/blog/guide-choosing-mcp-vs-a2a-protocols/) - Protocol comparison, enterprise considerations

**Secondary Sources (MEDIUM Confidence):**
- [arXiv: DynTaskMAS - Dynamic Task Graph-driven Framework](https://arxiv.org/html/2503.07675v1) - Asynchronous parallel execution patterns
- [arXiv: GAP - Graph-based Agent Planning](https://arxiv.org/html/2510.25320v1) - Task dependency modeling
- [Swarm Signal: Multi-Agent Coordination Failure Modes](https://swarmsignal.net/multi-agent-coordination-failure-modes-and-mitigation/) - Failure patterns and mitigations
- [Langflow: Complete Guide to AI Agent Frameworks 2025](https://www.langflow.org/blog/the-complete-guide-to-choosing-an-ai-agent-framework-in-2025) - Framework comparison

**Additional Context (LOW Confidence - Web Search Only):**
- [Medium: Agentic AI in Production - 10 Patterns That Ship](https://medium.com/@ThinkingLoop/d3-1-agentic-ai-in-production-10-patterns-that-ship-in-2025-d9c367827e58) - Production patterns
- [Claude Code: Sub-agents Documentation](https://code.claude.com/docs/en/sub-agents) - Specialized subagent patterns
- [Google ADK: Multi-agent Systems](https://google.github.io/adk-docs/agents/multi-agents/) - Agent hierarchy patterns

---

## Platform-Wide Features (v1.0 Foundation)

This section covers features for the overall platform, including what's already built and future roadmap.

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| ChatGPT-style conversation UI | Users are trained on ChatGPT interface; familiar patterns reduce learning curve | MEDIUM | Sidebar history, message threading, markdown rendering, code highlighting |
| Conversation history & persistence | Users expect to resume past conversations; reference previous context | MEDIUM | JSON-based storage, searchable history, conversation management |
| User authentication | Enterprise requirement; access control and audit trail foundation | LOW | SSO integration preferred, SCIM support for team management |
| Multi-model LLM support | Users expect flexibility; cost optimization across providers | MEDIUM | Unified API abstraction (pi-ai provides this), model switching without code changes |
| File upload & basic processing | Core value proposition; users want to work with documents | MEDIUM | Drag-and-drop, progress indicators, file type validation |
| Basic RAG (document Q&A) | Standard expectation after ChatGPT Plus popularized file analysis | HIGH | Chunking, embedding, retrieval, citation |
| API access | Developers and integrators expect programmatic access | MEDIUM | RESTful API, authentication, rate limiting |
| Rate limiting & quotas | Prevents abuse; manages costs for LLM API consumption | MEDIUM | Token-based (TPM) vs request-based (RPM), exponential backoff |
| Audit logging | Enterprise compliance requirement; security incident investigation | LOW | Action logging, user attribution, retention policies |
| Data encryption (transit/storage) | Security baseline; regulatory compliance | LOW | TLS 1.3, AES-256 at rest |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Chinese LLM optimization (Qwen/GLM/MiniMax) | Cost advantage (30-50% cheaper), regulatory compliance in China market, native Chinese language performance | MEDIUM | GLM-5 best for system design, MiniMax best value, Qwen3.5 for reasoning |
| Full MCP protocol implementation | Interoperability with growing ecosystem of MCP tools; standardized tool access | HIGH | Resources, tools, prompts, bash access; complements A2A for agent communication |
| A2A multi-agent collaboration | Complex task delegation; specialized agents working together; no single agent can do everything | HIGH | Task delegation, agent discovery, result aggregation; Linux Foundation standard (Google-donated) |
| Skills system with marketplace | Extensibility without development; community contributions; modular capability building | HIGH | Predefined skills, custom skills, skill orchestration; SKILL.md standard emerging |
| Agentic document extraction (beyond OCR) | Handles complex layouts, tables, embedded images as structured multimodal objects | HIGH | LlamaParse-style processing vs legacy OCR; understands document structure |
| Team knowledge base (shared RAG) | Collective intelligence; onboarding acceleration; institutional memory | HIGH | File library, conversation history, external knowledge sources, web resources |
| Hybrid RAG (vector + graph) | Better contextual retrieval; relationship understanding; enterprise knowledge systems | HIGH | Graph-RAG for complex relationships; agentic RAG for autonomous retrieval |
| Session management & resumption | Interrupted work recovery; long-running task continuity | MEDIUM | Full state management, resume capability (pi-agent-core provides foundation) |
| Permission controls & path protection | Fine-grained access control; security boundaries for agent actions | MEDIUM | Role-based permissions, action approval workflows, sandboxed execution |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time everything | Users want instant responses | Compounding Error Rate (CER) reaches 31.2% for 5+ step tasks; early mistakes cascade; memory drift in long sessions | Streaming responses for UX, but atomic state changes for reliability; graceful degradation patterns |
| Unlimited tool access | Maximum flexibility for agent | Tool overload anti-pattern; poorly described tools lead to wrong selections; confusion and incorrect usage | Clear tool boundaries; documented tool descriptions; role-specific tool sets |
| Overly complex prompts | Comprehensive instructions | Instruction bloat leads to unpredictable behavior; conflicting instructions; role confusion (agent switches modes mid-response) | Focused, single-purpose prompts; clear separation of responsibilities; atomic tool definitions |
| Shared agent memory | Efficiency, knowledge sharing | Race conditions; memory poisoning from bad outputs; state corruption across agents | Agent-isolated memory; A2A protocol for controlled information exchange; opaque agent boundaries |
| Mobile-first design | Access anywhere | Web-primary platforms suffer on mobile; feature parity impossible; maintenance burden | Responsive web design; PWA for mobile access; defer native apps |
| Multi-tenancy from day one | Scale preparation | Adds complexity before validation; premature optimization; distracts from core value | Single-team focus; validate with real users; add multi-tenancy after product-market fit |
| Private deployment option | Enterprise sales requirement | Infrastructure complexity; support burden; security maintenance overhead | Cloud-first with strong security; SOC2 compliance; data residency options later |

## Feature Dependencies

```
User Authentication
    └──requires──> Session Management
                       └──requires──> Conversation History

MCP Protocol
    └──requires──> Tool Execution Framework
    └──requires──> Permission Controls

A2A Multi-Agent
    └──requires──> MCP Protocol (agent-to-tool)
    └──requires──> Agent Discovery Service
    └──requires──> Task Queue/Orchestration

RAG Knowledge Base
    └──requires──> File Upload & Processing
    └──requires──> Embedding Service
    └──requires──> Vector Database
                       └──requires──> Chunking Strategy

Skills System
    └──requires──> Tool Execution Framework
    └──requires──> Permission Controls
    └──enhances──> MCP Protocol (skills as MCP tools)

Chinese LLM Support
    └──requires──> Unified LLM API (pi-ai)
    └──conflicts──> None (complementary to other features)

API Access
    └──requires──> User Authentication
    └──requires──> Rate Limiting
    └──requires──> Audit Logging

ChatGPT-Style UI
    └──requires──> Conversation History
    └──requires──> User Authentication
    └──enhances──> All features (unified interface)
```

### Dependency Notes

- **A2A requires MCP**: MCP handles agent-to-tool communication; A2A handles agent-to-agent. They are complementary standards - MCP for tools, A2A for collaboration.
- **Skills enhance MCP**: Skills can be exposed as MCP tools, allowing skill invocation through the standard protocol.
- **RAG requires multiple services**: Embedding, vector storage, and chunking are separate concerns that must work together.
- **Chinese LLM Support has no conflicts**: Unified API abstraction (pi-ai) enables model switching without affecting other features.
- **UI enhances all features**: The ChatGPT-style interface is the unified entry point for all capabilities.

## Platform MVP Definition

### Launch With (v1) - COMPLETED

Minimum viable product - what's needed to validate the concept.

- [x] ChatGPT-style conversation UI - Core interaction pattern; users expect this
- [x] User authentication (email/password + SSO) - Security baseline; team context
- [x] Conversation history & persistence - Users need to resume work
- [x] Single Chinese LLM integration (Qwen3.5 or MiniMax) - Cost advantage; validate model choice
- [x] File upload & basic processing (PDF, Word, images) - Core value proposition
- [x] Basic RAG (document Q&A with citation) - Immediate utility
- [x] API access with authentication - Integration path for power users
- [x] Audit logging - Enterprise requirement
- [x] Data encryption - Security baseline
- [x] MCP protocol implementation - Tool integration foundation
- [x] Skills system (predefined + custom) - Extensibility
- [x] Permission controls & approval flow - Security boundaries

**Status:** v1.0 MVP released.

### Add After Validation (v1.x)

Features to add once core is working.

- [x] Additional Chinese LLMs (GLM-5, other MiniMax models) - Trigger: User demand for specific models
- [ ] Team knowledge base (shared RAG) - Trigger: Multiple users working on similar content
- [ ] Rate limiting & quotas - Trigger: Cost management needs
- [ ] **A2A multi-agent collaboration (v1.1 current milestone)** - Requires MCP foundation; complex orchestration

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Skills marketplace - Requires skills system maturity; community building
- [ ] Graph-RAG / Hybrid RAG - Requires basic RAG validation; adds significant complexity
- [ ] Agentic document extraction - Requires multimodal LLM capabilities; specialized processing
- [ ] Mobile native apps - Web-first validated; mobile as enhancement
- [ ] Multi-tenancy - Single-team focus validated first

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| ChatGPT-style UI | HIGH | MEDIUM | P1 |
| User authentication | HIGH | LOW | P1 |
| Conversation history | HIGH | MEDIUM | P1 |
| Chinese LLM support | HIGH | MEDIUM | P1 |
| File upload & processing | HIGH | MEDIUM | P1 |
| Basic RAG | HIGH | HIGH | P1 |
| API access | MEDIUM | MEDIUM | P1 |
| Audit logging | MEDIUM | LOW | P1 |
| Data encryption | MEDIUM | LOW | P1 |
| MCP protocol | HIGH | HIGH | P2 |
| Skills system | HIGH | HIGH | P2 |
| Team knowledge base | HIGH | HIGH | P2 |
| Session management | MEDIUM | MEDIUM | P2 |
| Rate limiting | MEDIUM | MEDIUM | P2 |
| Permission controls | MEDIUM | MEDIUM | P2 |
| A2A multi-agent | HIGH | HIGH | P3 |
| Skills marketplace | MEDIUM | HIGH | P3 |
| Graph-RAG | MEDIUM | HIGH | P3 |
| Agentic document extraction | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch (MVP) - DONE
- P2: Should have, add when possible (v1.x)
- P3: Nice to have, future consideration (v2+)

## Competitor Feature Analysis

| Feature | LangChain/LangGraph | CrewAI | AutoGen | Dify | Next-Mind Approach |
|---------|---------------------|--------|---------|------|-------------------|
| Core focus | Flexible workflows | Role-based agents | Multi-agent conversations | Low-code AI apps | Team collaboration platform |
| LLM abstraction | Yes (unified) | Yes | Yes | Yes | Yes (pi-ai) |
| Chinese LLMs | Limited | Limited | Limited | Good | Native (primary) |
| MCP support | Yes | Via extension | Via extension | Partial | Full implementation |
| A2A support | Via LangGraph | No | Native (different protocol) | No | Planned (v1.1) |
| Skills/Tools | Chains/Tools | Tasks | Conversations | Workflows | Skills system (implemented) |
| RAG | Strong (LlamaIndex) | Basic | Basic | Good | Native (file + knowledge base) |
| UI | No (library) | No | No | Yes (low-code) | Yes (ChatGPT-style) |
| API | No (library) | No | No | Yes | Yes |
| Team features | No | No | No | Basic | Native (shared knowledge) |
| Deployment | Self-hosted | Self-hosted | Self-hosted | Cloud/Self | Cloud-first |

**Differentiation strategy:**
1. **Chinese LLM first** - Not an afterthought; optimized for Qwen/GLM/MiniMax from day one
2. **Team collaboration native** - Shared knowledge, conversation history, team context
3. **Full MCP + planned A2A** - Standards-based interoperability; future-proof architecture
4. **Unified interface** - ChatGPT-style UI for all features; no context switching
5. **File processing focus** - Beyond basic upload; document understanding and organization

## Platform Sources

### Framework Comparisons
- [Propelius AI - LangChain vs CrewAI vs AutoGen Guide 2026](https://propelius.ai/blogs/langchain-crewai-autogen-comparison-2026/)
- [Medium - LangGraph vs CrewAI vs AutoGen](https://medium.com/data-science-collective/langgraph-vs-crewai-vs-autogen-which-agent-framework-should-you-actually-use-in-2026-b8b2c84f1229)
- [Turing - Top 6 AI Agent Frameworks](https://www.turing.com/resources/ai-agent-frameworks)

### Enterprise AI Platforms
- [Vellum AI - 2026 Guide to Enterprise AI Automation Platforms](https://vellum.ai/blog/guide-to-enterprise-ai-automation-platforms)
- [Rasa - 8 Best AI Agent Builders for Enterprise in 2026](https://rasa.com/blog/best-ai-agent-builders)
- [Beam AI - Top 5 AI Agent Platforms in 2026](https://beam.ai/agentic-insights/the-best-5-ai-agent-platforms-in-2026-and-how-to-pick-the-right-one)

### MCP Protocol
- [MCP Official Blog - The 2026 MCP Roadmap](http://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/)
- [SitePoint - MCP Complete 2026 Guide](https://www.sitepoint.com/model-context-protocol-mcp/)
- [CData - 2026: Enterprise-Ready MCP Adoption](https://www.cdata.com/blog/2026-year-enterprise-ready-mcp-adoption)

### A2A Protocol
- [A2A Protocol Official Documentation](https://a2a-protocol.org/latest/)
- [Ruh AI - AI Agent Protocols 2026: Complete Guide](https://www.ruh.ai/blogs/ai-agent-protocols-2026-complete-guide)
- [O'Reilly - Designing Collaborative Multi-Agent Systems with A2A](https://www.oreilly.com/radar/designing-collaborative-multi-agent-systems-with-the-a2a-protocol/)

### Chinese LLMs
- [Medium - MiniMax M2.7 vs GLM-5 vs Claude Opus 4.6](https://lalatenduswain.medium.com/minimax-m2-7-vs-glm-5-vs-claude-opus-4-6-the-definitive-ai-model-showdown-of-march-2026-f89a1bbaac15)
- [Zhihu - Qwen3.5 Series Announcement](https://zhuanlan.zhihu.com/p/2008846603730048341)

### RAG Systems
- [ChatRAG - 7 Best Practices for RAG Implementation](https://www.chatrag.ai/blog/2026-02-06-7-best-practices-for-rag-implementation-that-actually-improve-your-ai-results)
- [Medium - From RAG to Graph-RAG](https://medium.com/@amitvsolutions/from-rag-to-graph-rag-a-complete-guide-to-building-enterprise-knowledge-systems-49f7d564cb74)
- [DataNucleus - Agentic RAG in 2026](https://datanucleus.dev/rag-and-agentic-ai/agentic-rag-enterprise-guide-2026)

### Skills & Plugin Architecture
- [Medium - 10 Must-Have Skills for Claude in 2026](https://medium.com/@unicodeveloper/10-must-have-skills-for-claude-and-any-coding-agent-in-2026-b5451b013051)
- [The Prompt Index - How to Use AI Agent Skills in 2026](https://www.thepromptindex.com/how-to-use-ai-agent-skills-the-complete-guide.html)
- [GitConnected - Mental Model: Skills, Subagents, and Plugins](https://levelup.gitconnected.com/a-mental-model-for-claude-code-skills-subagents-and-plugins-3dea9924bf05)

### Anti-Patterns
- [Tamirdresher - 9 AI Agents, One API Quota](https://www.tamirdresher.com/blog/2026/03/21/rate-limiting-multi-agent)
- [Beam AI - AI Agent Security in 2026](https://beam.ai/agentic-insights/ai-agent-security-in-2026-the-risks-most-enterprises-still-ignore)

### Document Processing
- [LlamaIndex - Best OCR Software of 2026](https://www.llamaindex.ai/insights/best-ocr-software)
- [Fast.io - AI Agent Document Processing: The 2026 Guide](https://fast.io/resources/ai-agent-document-processing/)
- [Medium - Beyond OCR: Agentic Document Extraction](https://medium.com/@tam.tamanna18/beyond-ocr-how-agentic-document-extraction-agents-are-transforming-complex-files-in-2026-3e4124c4c7d7)

### pi-mono Framework
- [GitHub - pi-mono](https://github.com/badlogic/pi-mono)
- [pi-mono Documentation](https://shittycodingagent.ai/)

---
*Feature research for: AI Agent Collaboration Platform*
*Researched: 2026-03-24 (Platform), 2026-03-25 (A2A Multi-Agent)*
