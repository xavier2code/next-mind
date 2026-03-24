# Phase 1: Core Foundation - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can have secure, authenticated conversations with AI using Chinese LLMs (Qwen, GLM, MiniMax) through a ChatGPT-style interface with streaming output, session persistence, and conversation history search. This phase delivers the conversational foundation — authentication, streaming chat UI, and LLM gateway. Tool integration (MCP), knowledge management (RAG), and team collaboration come in later phases.

</domain>

<decisions>
## Implementation Decisions

### Authentication
- Email/password + Google SSO (single SSO provider for Phase 1)
- Auth.js (NextAuth v5) for authentication handling
- Session persists 30 days with automatic refresh
- No rate limiting on API (audit logging only — team trust model)

### UI Layout
- Sidebar + chat area pattern (ChatGPT-style)
- Collapsible sidebar for conversation history
- Main area for active conversation
- Works well on both desktop and mobile

### Conversation Interface
- Character-by-character streaming (word-by-word as generated)
- Full markdown support with code syntax highlighting
- Code blocks display-only (no copy/download/run buttons in Phase 1)
- Empty state: Welcome message + suggested prompts (e.g., "Analyze this document", "Help me write code")
- Inline error display with retry option

### Model Selection
- Model selector at top of chat input (always visible when typing)
- Default model: Qwen3.5 (best overall balance for Chinese teams)
- Users can switch between Qwen, GLM, and MiniMax
- Model preference persists per user

### Conversation History
- Full-text search in sidebar (PostgreSQL full-text search)
- Unlimited history, paginated in UI
- Users can delete individual conversations
- No auto-archive or auto-delete

### Security & Content Safety
- Basic content filtering (block obviously harmful content: violence, illegal)
- Light touch approach — fewer false positives, trusted team environment
- Audit logging for all user actions
- TLS 1.3 for transport, AES-256 for data at rest

### Claude's Discretion
- Exact sidebar width and collapse animation
- Welcome message wording and suggested prompt examples
- Error message copy and retry button placement
- Code block theme (light/dark mode consistency)
- Exact pagination page size for history

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Vision, constraints, key decisions (pi-mono framework, Chinese LLMs, cloud deployment)
- `.planning/REQUIREMENTS.md` — Phase 1 requirements: CORE-01 to CORE-07, LLM-01 to LLM-07, SEC-01 to SEC-06
- `.planning/ROADMAP.md` — Phase 1 scope and success criteria

### Technical Research
- `.planning/research/STACK.md` — Recommended stack: pi-ai, pi-agent-core, Next.js 15, Drizzle ORM, Auth.js, Vercel AI SDK, shadcn/ui
- `.planning/research/ARCHITECTURE.md` — System architecture patterns, dual-layer agent loop, security architecture
- `.planning/research/FEATURES.md` — Feature patterns for chat UI, authentication flows, streaming
- `.planning/research/PITFALLS.md` — Common pitfalls to avoid in AI agent platforms

### Requirements by ID (Phase 1 scope)
- CORE-01: ChatGPT-style conversation UI with streaming, markdown, code highlighting
- CORE-02: Email/password + SSO authentication
- CORE-03: Session persistence across browser refreshes
- CORE-04: Conversation history with search and filtering
- CORE-05: REST API with rate limiting (audit-only approach chosen)
- CORE-06: Audit logging with timestamps and user IDs
- CORE-07: TLS 1.3 + AES-256 encryption
- LLM-01 through LLM-07: Chinese LLM support (Qwen, GLM, MiniMax)
- SEC-01 through SEC-06: Security hardening, content safety, audit logging

</canonical_refs>

<code_context>
## Existing Code Insights

### Starting Point
- Greenfield project — no existing source code
- Planning documents and research complete
- Ready for project scaffolding

### Framework Foundation (from research)
- **pi-ai** — Unified LLM API with native MiniMax support, OpenAI-compatible layer for Qwen/GLM
- **pi-agent-core** — Agent runtime with streaming events, state management
- **Next.js 15** — App Router for secure API key handling, Vercel AI SDK integration
- **Drizzle ORM** — PostgreSQL operations with TypeScript type safety
- **Auth.js v5** — OAuth providers, session management, App Router support
- **shadcn/ui** — UI components on Tailwind CSS foundation

### Integration Points
- LLM Gateway → pi-ai unified API (Qwen, GLM, MiniMax)
- Web UI → Next.js App Router + Vercel AI SDK for streaming
- Auth → Auth.js with Google OAuth + email/password
- Database → PostgreSQL via Drizzle ORM

</code_context>

<specifics>
## Specific Ideas

- "ChatGPT-style interface" — familiar pattern for users, low learning curve
- Character-by-character streaming for responsive feel
- Welcome screen with suggested prompts guides new users
- Google SSO chosen as most common provider for team tools
- Basic content filtering — light touch for trusted team environment

</specifics>

<deferred>
## Deferred Ideas

- Additional SSO providers (Microsoft, GitHub) — Phase 2 or later if needed
- Semantic search for conversation history — requires vector infrastructure (Phase 3)
- Code block actions (copy, download, run) — Phase 2 with MCP tools
- Rate limiting per user — audit logging sufficient for trusted teams
- Extended markdown (LaTeX, Mermaid diagrams) — can add if users request

</deferred>

---

*Phase: 01-core-foundation*
*Context gathered: 2026-03-24*
