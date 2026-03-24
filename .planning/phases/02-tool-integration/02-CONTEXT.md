# Phase 2: Tool Integration - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can extend AI capabilities through MCP tools and custom skills with security controls. This phase delivers MCP protocol implementation, skills system, and approval gates for destructive operations.

</domain>

<decisions>
## Implementation Decisions

### MCP Protocol Implementation
- MCP server runs as HTTP endpoints integrated into Next.js API routes (not separate stdio process)
- Single server deployment, simpler operations, leverages existing auth middleware
- Tools scoped per-user session for isolated state (not global shared)
- All MCP requests authenticated via existing Auth.js session

### Skills Definition Format
- Skills defined as TypeScript functions with metadata decorators/annotations
- Code-first approach stored in version control (not YAML config or database records)
- Auto-discovery from skill files in designated directory
- Full IDE support with type safety

### Approval Flow UX
- Destructive operations (file deletion, system commands) require inline approval in chat
- AI asks "Should I proceed with X?" with Approve/Cancel buttons directly in conversation
- No modal dialogs or separate approval queue pages

### Skill Discovery UI
- Skills displayed in a dedicated sidebar panel
- Always visible alongside conversation
- Shows available skills with descriptions
- Users can browse and invoke skills directly

### Claude's Discretion
- Exact skill metadata format (decorators vs config object)
- Skill orchestration engine implementation
- Error handling for skill execution failures
- Skill versioning and dependency management

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### MCP Protocol
- `https://modelcontextprotocol.io/docs` — Official MCP specification, JSON-RPC 2.0 protocol, transport options

### Security Requirements
- `.planning/REQUIREMENTS.md` (MCP-05 through MCP-09) — Bash execution sandboxing, authentication requirements, input validation, privilege restrictions

### Skills Requirements
- `.planning/REQUIREMENTS.md` (SKILL-01 through SKILL-07) — Predefined skills, custom skills, orchestration, action budgets, approval gates, discovery interface, versioning

### Existing Patterns
- `.planning/phases/01-core-foundation/01-05-SUMMARY.md` — Security hardening patterns (content filter, state management, audit logging)
- `.planning/STATE.md` — Prior decisions on auth (Auth.js v5, JWT), audit logging (fire-and-forget), content filtering (regex-based)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/auth.ts` — Auth.js v5 configuration, session management
- `src/middleware.ts` — Route protection pattern for API endpoints
- `src/lib/audit.ts` — Audit logging utility (fire-and-forget pattern)
- `src/lib/content-filter.ts` — Content safety filtering (regex-based)
- `src/lib/state.ts` — Explicit state management with versioning
- `src/lib/monitoring.ts` — Structured JSON logging with request IDs

### Established Patterns
- API routes in `src/app/api/` with authentication via session
- Retry logic with exponential backoff (max 3 retries) in `src/lib/llm/retry.ts`
- Type definitions in `src/types/index.ts`

### Integration Points
- Chat API (`src/app/api/chat/route.ts`) — Where skills will be invoked
- Sidebar components (`src/components/sidebar/`) — Where skill discovery panel will integrate
- Session management — For per-session tool isolation

</code_context>

<specifics>
## Specific Ideas

- Skill invocation should feel natural in conversation ("Can you analyze this data?")
- Approval prompts should clearly show what action will be taken before user confirms
- Sidebar skills panel should be collapsible like the conversation list

</specifics>

<deferred>
## Deferred Ideas

- Skills marketplace — v2 feature
- Skill rating and reviews — v2 feature
- Multi-agent (A2A) coordination — separate phase scope

</deferred>

---

*Phase: 02-tool-integration*
*Context gathered: 2026-03-24*
