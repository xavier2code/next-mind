# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next-Mind is an AI Agent collaboration platform for mid-size teams, built on Next.js 16 (App Router). It supports Chinese LLM providers (Qwen, GLM, MiniMax) via `@mariozechner/pi-ai`, implements the Model Context Protocol (MCP), and features a multi-agent workflow system with wave-based parallel task execution.

## Common Commands

```bash
npm run dev            # Dev server (Turbopack)
npm run build          # Production build
npm run lint           # ESLint
npm test               # Run all unit tests (Vitest)
npm run test:watch     # Watch mode
npx vitest run tests/path/to/file.test.ts  # Single test file
npm run test:coverage  # Coverage report
npm run test:e2e       # Playwright E2E tests
npm run db:generate    # Drizzle migration generation
npm run db:migrate     # Run migrations
npm run db:push        # Push schema changes directly
npm run db:studio      # Drizzle Studio GUI
```

## Architecture

### LLM Gateway (`src/lib/llm/`)

Unified interface for multiple LLM providers. Each provider (qwen.ts, glm.ts, minimax.ts) exports a `Model` record keyed by model ID and a `getApiKey()` function. The main `index.ts` aggregates all models and provides `streamChat()` which wraps calls with retry logic (`retry.ts`). Qwen requires `incremental_output: true` for streaming.

### MCP Protocol (`src/lib/mcp/`)

Implements Model Context Protocol using `@modelcontextprotocol/sdk`. The MCP server (`server.ts`) is created per session. Tools are registered via `registry.ts` and validated through `validation.ts`. The bash tool (`tools/bash.ts`) uses an allowlist of 27 commands, blocks dangerous patterns, enforces timeouts, and runs via `execFile` (not `exec`).

### Skills System (`src/lib/skills/` + `src/skills/`)

TypeScript decorator-based skill registration using `reflect-metadata`. Use `@skill()` decorator on class methods to define skills with metadata (id, name, version in semver, category, inputSchema). Skills are auto-discovered via `discovery.ts`, can be converted to MCP tools via `skillToMcpTool()`, and orchestrated through `orchestration.ts`. Predefined skills live in `src/skills/` (web-search, file-processing, data-analysis).

### Agent Workflow System (`src/lib/agents/`)

Multi-agent task execution pipeline:
- **decomposition.ts**: LLM-powered task decomposition — breaks user requests into subtasks with dependency info. Uses `decomposeTask()` (sequential) or `decomposeTaskWithDeps()` (parallel-aware).
- **scheduler.ts**: Wave-based parallel executor using Kahn's algorithm for topological sort. `MAX_CONCURRENCY=3` tasks per wave. Supports pause/resume via checkpointing.
- **workflow-controller.ts**: Manages workflow lifecycle (pause/resume/cancel). In-memory scheduler registry (noted: needs Redis for multi-instance).
- **executor.ts**: Executes individual subtasks via appropriate agent types.
- **message-bus.ts**: Inter-agent communication.
- **registry.ts**: Agent type registration (file, search, code, custom).
- **status-broadcaster.ts**: Real-time status updates.

Agent definitions are in `src/agents/` (code-agent, file-agent, search-agent, custom-agent).

### Approval Flow (`src/lib/approval/`)

`ApprovalStateMachine` manages in-memory approval requests with 5-minute timeout and auto-cleanup. Used for sensitive skill operations. Global instance exported as `approvalState`.

### Auth & Middleware (`src/auth.ts`, `src/middleware.ts`)

Auth.js v5 with Google OAuth + credentials provider. JWT session strategy (30-day maxAge). Middleware protects all `/api/*` routes and chat pages. MCP endpoints have additional DNS rebinding protection via Origin header validation.

### Database (`src/lib/db/`)

PostgreSQL + Drizzle ORM. Schema in `schema.ts` defines tables: users, sessions, accounts, verificationTokens, conversations, messages, auditLogs, agents, workflows, tasks, agentMessages. Workflows contain checkpoint JSON for pause/resume. `queries.ts` provides data access functions.

### Routing

- `(auth)/` — Login and register pages
- `(chat)/` — Main chat interface with `[conversationId]` dynamic route
- `api/chat` — Streaming chat endpoint (text/plain, chunked transfer)
- `api/mcp` — MCP protocol endpoint
- `api/approval` — Approval request handling
- `api/workflow-control` + `api/workflow-status` — Workflow management
- `api/skills`, `api/conversations`, `api/task-logs` — CRUD endpoints

Next.js typed routes are enabled (`typedRoutes: true`).

## Key Patterns

- **Path alias**: `@/*` maps to `./src/*`
- **UI components**: shadcn/ui (base-nova style, lucide icons) in `src/components/ui/`. Use `cn()` from `src/lib/utils.ts` for class merging.
- **Decorators**: `experimentalDecorators` and `emitDecoratorMetadata` are enabled in tsconfig for the skills system.
- **Streaming**: Chat API returns `text/plain; charset=utf-8` with `Transfer-Encoding: chunked`. Client reads text deltas directly (not SSE).
- **Audit logging**: `logAudit()` from `src/lib/audit.ts` is used throughout for security event tracking. Fire-and-forget pattern (`.catch(() => {})`).
- **Content safety**: `checkMessagesSafety()` from `src/lib/content-filter.ts` validates chat messages before processing.
- **Singletons**: Several modules use singleton pattern (WaveScheduler, WorkflowController, ApprovalStateMachine). For production multi-instance deployment, these need external state (Redis noted in comments).

## Testing

- Unit tests: Vitest + jsdom, test files in `tests/`, setup in `tests/setup.ts`
- E2E tests: Playwright, specs in `e2e/`
- Test setup mocks `DATABASE_URL` and `AUTH_SECRET` env vars
- Coverage via v8 provider
- Component tests use `@testing-library/react` with `@testing-library/jest-dom/vitest` matchers

## Environment Variables

Required: `DATABASE_URL`, `AUTH_SECRET`, and at least one LLM API key (`QWEN_API_KEY`, `GLM_API_KEY`, or `MINIMAX_API_KEY`). Optional: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` for Google SSO.
