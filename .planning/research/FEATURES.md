# Feature Research

**Domain:** AI Agent Collaboration Platform
**Researched:** 2026-03-24
**Confidence:** HIGH

## Feature Landscape

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

## MVP Definition

### Launch With (v1)

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

**Rationale:** These features form the minimal viable product that delivers the core value (team AI assistant with file processing and knowledge retrieval). Users can authenticate, upload files, ask questions, and get answers - validating the fundamental use case.

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Additional Chinese LLMs (GLM-5, other MiniMax models) - Trigger: User demand for specific models
- [ ] MCP protocol implementation - Trigger: User request for tool integrations
- [ ] Skills system (predefined + custom) - Trigger: Repetitive task patterns identified
- [ ] Team knowledge base (shared RAG) - Trigger: Multiple users working on similar content
- [ ] Session management & resumption - Trigger: Long-running task complaints
- [ ] Rate limiting & quotas - Trigger: Cost management needs
- [ ] Permission controls - Trigger: Team role differentiation needs

**Rationale:** These features enhance the core experience but are not required for initial validation. They address scalability, extensibility, and team collaboration needs that emerge after basic usage patterns are established.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] A2A multi-agent collaboration - Requires MCP foundation; complex orchestration
- [ ] Skills marketplace - Requires skills system maturity; community building
- [ ] Graph-RAG / Hybrid RAG - Requires basic RAG validation; adds significant complexity
- [ ] Agentic document extraction - Requires multimodal LLM capabilities; specialized processing
- [ ] Mobile native apps - Web-first validated; mobile as enhancement
- [ ] Multi-tenancy - Single-team focus validated first

**Rationale:** These are powerful features but require significant infrastructure and user validation. A2A needs MCP working first. Skills marketplace needs a skills system with users. Advanced RAG needs basic RAG proven. Focus on getting core value working before adding complexity.

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
- P1: Must have for launch (MVP)
- P2: Should have, add when possible (v1.x)
- P3: Nice to have, future consideration (v2+)

## Competitor Feature Analysis

| Feature | LangChain/LangGraph | CrewAI | AutoGen | Dify | Next-Mind Approach |
|---------|---------------------|--------|---------|------|-------------------|
| Core focus | Flexible workflows | Role-based agents | Multi-agent conversations | Low-code AI apps | Team collaboration platform |
| LLM abstraction | Yes (unified) | Yes | Yes | Yes | Yes (pi-ai) |
| Chinese LLMs | Limited | Limited | Limited | Good | Native (primary) |
| MCP support | Yes | Via extension | Via extension | Partial | Full implementation |
| A2A support | Via LangGraph | No | Native (different protocol) | No | Planned (v2+) |
| Skills/Tools | Chains/Tools | Tasks | Conversations | Workflows | Skills system (planned) |
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

## Sources

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
*Researched: 2026-03-24*
