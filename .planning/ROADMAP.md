# Roadmap: Next-Mind AI Agent Framework

## Overview

Next-Mind is a team-oriented AI agent collaboration platform optimized for Chinese LLM providers. This roadmap delivers the v1 release through three phases: establishing a secure conversational foundation, enabling tool access via MCP protocol, and building knowledge management with team collaboration capabilities.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Core Foundation** - Secure conversational AI with Chinese LLM support, authentication, and explicit state management
- [ ] **Phase 2: Tool Integration** - MCP protocol implementation with skills system for agent tool access
- [ ] **Phase 3: Knowledge & Collaboration** - File processing, RAG knowledge retrieval, and team collaboration features

## Phase Details

### Phase 1: Core Foundation
**Goal**: Users can have secure, authenticated conversations with AI using Chinese LLMs through a ChatGPT-style interface
**Depends on**: Nothing (first phase)
**Requirements**: CORE-01, CORE-02, CORE-03, CORE-04, CORE-05, CORE-06, CORE-07, LLM-01, LLM-02, LLM-03, LLM-04, LLM-05, LLM-06, LLM-07, SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06
**Success Criteria** (what must be TRUE):
  1. User can create account and log in via email/password or SSO providers
  2. User can have streaming conversations with AI in ChatGPT-style UI with markdown and code highlighting
  3. User session persists across browser refreshes
  4. User can search and filter conversation history
  5. User can switch between Qwen, GLM, and MiniMax models from the UI
**Plans**: 5 plans

Plans:
- [x] 01-01: Project scaffolding - Next.js 16, Drizzle ORM, shadcn/ui, test frameworks
- [x] 01-02: Authentication - Auth.js v5 with Google SSO and email/password
- [x] 01-03: LLM gateway - Unified API for Qwen, GLM, MiniMax with streaming
- [x] 01-04: Chat UI - ChatGPT-style interface with sidebar, model selector, markdown
- [x] 01-05: Security - Content filtering, audit logging, state management

### Phase 2: Tool Integration
**Goal**: Users can extend AI capabilities through MCP tools and custom skills with security controls
**Depends on**: Phase 1
**Requirements**: MCP-01, MCP-02, MCP-03, MCP-04, MCP-05, MCP-06, MCP-07, MCP-08, MCP-09, SKILL-01, SKILL-02, SKILL-03, SKILL-04, SKILL-05, SKILL-06, SKILL-07
**Success Criteria** (what must be TRUE):
  1. User can use predefined skills (file processing, data analysis, web search) through conversation
  2. User can create custom skills through UI or configuration files
  3. AI can execute multiple skills in sequence for complex tasks
  4. Destructive operations (file deletion, system commands) require explicit user approval
  5. All MCP requests are authenticated and tools run with sandboxed permissions
**Plans**: TBD

Plans:
- [ ] 02-01: MCP server implementation with JSON-RPC 2.0
- [ ] 02-02: Tool registry and resource manager
- [ ] 02-03: Skills system with predefined capabilities
- [ ] 02-04: Custom skill creation and orchestration
- [ ] 02-05: Security controls and approval gates

### Phase 3: Knowledge & Collaboration
**Goal**: Teams can upload files, build shared knowledge bases, and collaborate through shared conversations
**Depends on**: Phase 2
**Requirements**: FILE-01, FILE-02, FILE-03, FILE-04, FILE-05, FILE-06, FILE-07, FILE-08, FILE-09, FILE-10, RAG-01, RAG-02, RAG-03, RAG-04, RAG-05, RAG-06, RAG-07, RAG-08, RAG-09, TEAM-01, TEAM-02, TEAM-03, TEAM-04, TEAM-05, TEAM-06
**Success Criteria** (what must be TRUE):
  1. User can upload PDF, Word, code, data, and image files with automatic content extraction
  2. User can ask questions about uploaded documents and receive answers with citations
  3. User can modify file content through natural language instructions
  4. Team members can share workspaces with common file libraries
  5. Team members can share conversations and access shared RAG knowledge
  6. Admin can manage team member roles (admin, member, viewer)
**Plans**: TBD

Plans:
- [ ] 03-01: File upload and processing pipeline
- [ ] 03-02: RAG engine with vector storage
- [ ] 03-03: Hybrid retrieval and context assembly
- [ ] 03-04: Team workspaces and permissions
- [ ] 03-05: Shared knowledge and collaboration

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Foundation | 5/5 | Complete | 01-01, 01-02, 01-03, 01-04, 01-05 |
| 2. Tool Integration | 0/5 | Not started | - |
| 3. Knowledge & Collaboration | 0/5 | Not started | - |

---
*Roadmap created: 2026-03-24*
*Granularity: coarse*
