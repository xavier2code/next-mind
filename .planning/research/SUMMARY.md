# Project Research Summary

**Project:** Next-Mind
**Domain:** AI Agent Collaboration Platform
**Researched:** 2026-03-24
**Confidence:** HIGH

## Executive Summary

Next-Mind is a team-oriented AI agent collaboration platform optimized for Chinese LLM providers (Qwen, GLM, MiniMax) while supporting full MCP protocol integration for tool access. The research indicates this product should be built on the pi-mono framework (TypeScript-native with native MiniMax support) combined with Next.js 15 for the ChatGPT-style web interface, PostgreSQL for structured data, and Qdrant for vector-based RAG.

The recommended approach prioritizes a **single-team MVP first** with proven architectural patterns (ReAct loop, explicit state management, supervisor-worker topology) before advancing to multi-agent A2A orchestration. Chinese LLM integration is a core differentiator offering 30-50% cost advantage over Western providers, but requires careful attention to API quirks and provider-specific configurations.

The key risks center on **compound reliability decay** in multi-agent systems (failure rates of 41-86% without proper architecture) and **MCP security blind spots** (492 servers found publicly exposed without authentication). These must be addressed from Phase 1 through explicit state objects, verification checkpoints, and security-by-default configurations.

## Key Findings

### Recommended Stack

The project has already selected pi-mono as its foundation, which provides a unified LLM API abstraction (pi-ai) and stateful agent runtime (pi-agent-core) with native MiniMax support. This choice is validated by research showing pi-mono's lightweight nature and TypeScript-first approach suit Chinese LLM integration better than LangChain's Python-heavy ecosystem.

**Core technologies:**
- **@mariozechner/pi-ai (0.61.x):** Unified LLM API with multi-provider support, token tracking, TypeBox schemas
- **@mariozechner/pi-agent-core (0.61.x):** Agent runtime with dual-layer loop (steering + follow-up), lifecycle hooks
- **Next.js 15:** Full-stack framework with App Router for secure API key handling, Vercel AI SDK integration
- **PostgreSQL 16 + Qdrant 1.12:** Hybrid storage - relational for users/conversations, vector for RAG embeddings
- **Drizzle ORM:** TypeScript-native ORM with 700ms faster serverless cold starts than Prisma
- **Auth.js 5.x:** Industry-standard authentication with OAuth and session management
- **LlamaIndex.TS + Unstructured.io:** RAG framework with 35% retrieval accuracy boost, 64+ file type support

### Expected Features

The feature landscape reveals a clear separation between MVP requirements and future enhancements. Chinese LLM optimization and team collaboration are the primary differentiators against competitors like Dify, LangChain, and CrewAI.

**Must have (table stakes):**
- ChatGPT-style conversation UI with streaming, markdown, code highlighting
- User authentication with SSO support, conversation history and persistence
- File upload and basic RAG (document Q&A with citation)
- Multi-model LLM support via unified API abstraction
- API access with rate limiting, audit logging, data encryption

**Should have (competitive):**
- Chinese LLM optimization (Qwen/GLM/MiniMax) for 30-50% cost advantage
- Full MCP protocol implementation for tool interoperability
- Team knowledge base with shared RAG across conversations
- Skills system with predefined and custom capabilities
- Session management with state persistence and resumption

**Defer (v2+):**
- A2A multi-agent collaboration (requires MCP foundation first)
- Skills marketplace (requires skills system maturity)
- Graph-RAG / Hybrid RAG (requires basic RAG validation)
- Agentic document extraction (requires multimodal LLM capabilities)

### Architecture Approach

The architecture follows a layered pattern with clear boundaries: Presentation Layer (Web UI, REST API, WebSocket), Application Layer (Auth, Session, Audit), Agent Core Layer (pi-mono orchestration with dual-loop), Integration Layer (LLM Gateway, File Handler, RAG Engine), and Data Layer (PostgreSQL, Qdrant, Object Storage).

**Major components:**
1. **Agent Loop (pi-agent-core):** Dual-layer loop handling steering (interruptions) and follow-up (continuations) for interactive scenarios
2. **MCP Protocol Layer:** Tools registry, resources manager, prompt templates, skills system - JSON-RPC 2.0 compliant
3. **RAG Engine:** Document ingestion, chunking (400-800 tokens), embedding generation, similarity search, context assembly
4. **Session Manager:** Conversation state, message history, context window management with explicit state objects

### Critical Pitfalls

Research identified 12 critical pitfalls, with the following being most impactful for this project:

1. **Compound Reliability Decay:** Multi-agent systems with 10+ steps fail 2/3 of the time even with 95% individual success. Avoid by keeping chains under 5 steps, adding verification checkpoints at steps 3 and 5.

2. **Invisible State (LLM Memory Assumption):** LLMs approximate state, they don't track it. Use explicit state objects stored and passed intentionally - agents should know, not infer.

3. **MCP Security Blind Spots:** 492 MCP servers found publicly exposed without authentication. Require auth for every request, default to localhost binding, validate all inputs, never run with root privileges.

4. **Monolithic Mega-Prompt:** Prompts exceeding 200+ lines cause models to skip steps. Split into multi-agent system with supervisor pattern, keep individual prompts under 50 actionable instructions.

5. **Chinese LLM Integration Gotchas:** Different API conventions, CN vs international endpoints, provider-specific streaming parameters. Implement retry logic with exponential backoff, verify endpoint matches key version.

## Implications for Roadmap

Based on combined research, suggested phase structure:

### Phase 1: Core Foundation
**Rationale:** Establish secure, reliable foundation before adding complexity. State management, security, and proven patterns must be in place first.
**Delivers:** Working agent with single LLM, basic UI, authentication, and explicit state management
**Addresses:** User authentication, conversation history, single Chinese LLM (MiniMax), ChatGPT-style UI
**Avoids:** Invisible state pitfall, MCP security blind spots, monolithic mega-prompt, context window mismanagement

**Key deliverables:**
- pi-ai LLM gateway with MiniMax integration
- pi-agent-core basic ReAct loop (no steering yet)
- Next.js web UI with Auth.js authentication
- PostgreSQL schema for users, conversations, messages
- Audit logging and rate limiting

### Phase 2: Tool Integration (MCP)
**Rationale:** With foundation stable, add MCP protocol for tool access. This enables the agent to do useful work beyond conversation.
**Delivers:** MCP server/client implementation with authenticated tool execution
**Uses:** @modelcontextprotocol/sdk, TypeBox schemas
**Implements:** MCP Protocol Layer from architecture

**Key deliverables:**
- MCP server with tool registry, resources, prompts
- Input validation and sanitization for all tools
- Permission controls and action budgets
- Basic tools: file read/write, bash execution
- Security audit: localhost binding, auth required

### Phase 3: RAG Knowledge System
**Rationale:** Document processing and retrieval adds significant value for team collaboration use case.
**Delivers:** Document upload, processing, embedding, and retrieval with citation
**Uses:** LlamaIndex.TS, Unstructured.io, Qdrant
**Implements:** RAG Engine from architecture

**Key deliverables:**
- File upload and processing (PDF, Word, images)
- Document chunking with structure awareness
- Qdrant vector store integration
- Hybrid retrieval (semantic + keyword)
- Retrieval quality metrics (precision@k)

### Phase 4: Multi-Agent Foundation
**Rationale:** With tools and RAG working, introduce role-based agents with supervisor pattern. Avoids compound reliability decay.
**Delivers:** Planner, Executor, Verifier agents with structured communication
**Uses:** pi-agent-core dual-layer loop, A2A protocol concepts
**Implements:** Agent Orchestration Layer

**Key deliverables:**
- Supervisor-Worker pattern implementation
- Verification checkpoints at step 3 and 5
- Structured output contracts between agents
- Maximum 3 retries per agent, circuit breakers
- End-to-end reliability testing (target 95%+)

### Phase 5: Team Collaboration
**Rationale:** Multi-user features require the platform to be stable first. Shared knowledge builds on proven RAG.
**Delivers:** Team knowledge base, shared RAG, collaboration features
**Uses:** Existing RAG Engine, Session Manager
**Implements:** Team features from FEATURES.md

**Key deliverables:**
- Team workspaces and shared file library
- Shared conversation history for team context
- Permission controls by role
- Team-level API access

### Phase Ordering Rationale

- **Foundation first:** State management, security, and proven patterns must be established before adding complexity - research shows 40% of agentic AI projects fail due to architectural shortcuts
- **MCP before A2A:** MCP handles agent-to-tool communication; A2A handles agent-to-agent. MCP foundation enables future A2A implementation
- **RAG before multi-agent:** Document understanding is higher value for team collaboration than complex agent orchestration
- **Verification from start:** Compound reliability decay is prevented by verification checkpoints built into multi-agent architecture from Phase 4

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (MCP):** Tool design patterns, schema best practices - while MCP is well-documented, tool schema design has subtle pitfalls
- **Phase 4 (Multi-Agent):** A2A protocol integration - Linux Foundation standard is new (April 2025), patterns still emerging

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Well-documented patterns for Next.js, Auth.js, PostgreSQL, pi-mono
- **Phase 3 (RAG):** LlamaIndex.TS and Qdrant have established patterns with good documentation

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | pi-mono verified via official NPM/GitHub, other technologies verified via official docs and 2025 ecosystem research |
| Features | HIGH | Competitor analysis covers LangChain, CrewAI, AutoGen, Dify; feature prioritization based on user expectation research |
| Architecture | HIGH | Multi-agent system architecture patterns well-documented, pi-mono architecture analyzed in depth |
| Pitfalls | HIGH | Primary sources include IBM Watsonx team, Google DeepMind research, MAST study, academic papers |

**Overall confidence:** HIGH

### Gaps to Address

- **A2A Protocol Maturity:** Linux Foundation standard donated April 2025 - patterns still emerging. Plan for potential API changes during Phase 4 implementation.
- **Chinese LLM API Stability:** Provider-specific quirks documented but may change. Implement abstraction layer early to isolate changes.
- **Skills System Standardization:** SKILL.md standard emerging but not finalized. Phase 3 skills implementation should be flexible to accommodate standard evolution.

## Sources

### Primary (HIGH confidence)
- pi-mono GitHub and NPM - https://github.com/badlogic/pi-mono, https://www.npmjs.com/package/@mariozechner/pi-ai
- MCP Official Documentation - https://modelcontextprotocol.io/
- A2A Protocol Official Documentation - https://a2a-protocol.org/latest/
- AI Agent Anti-Patterns (IBM Watsonx) - https://achan2013.medium.com/ai-agent-anti-patterns-part-1-architectural-pitfalls-that-break-enterprise-agents-before-they-32d211dded43
- Multi-Agent System Architecture Guide 2026 - https://www.clickittech.com/ai/multi-agent-system-architecture/

### Secondary (MEDIUM confidence)
- Google DeepMind Multi-Agent Research - "Towards a Science of Scaling Agent Systems" (December 2025)
- MAST Study - Multi-Agent Systems Failure Taxonomy (March 2025)
- LlamaIndex.TS Documentation - https://developers.llamaindex.ai/typescript/framework/
- Qdrant Documentation and Pricing - https://qdrant.tech/pricing/

### Tertiary (contextual)
- Chinese LLM comparisons (MiniMax M2.7 vs GLM-5 vs Claude) - Medium
- Enterprise AI Platform comparisons (LangChain vs CrewAI vs AutoGen) - Multiple sources
- RAG implementation best practices - ChatRAG, DataNucleus

---
*Research completed: 2026-03-24*
*Ready for roadmap: yes*
