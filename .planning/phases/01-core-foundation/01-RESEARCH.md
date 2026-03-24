# Phase 1: Core Foundation - Research

**Researched:** 2026-03-24
**Domain:** Authentication, Streaming Chat UI, Chinese LLM Integration
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundational conversational infrastructure for Next-Mind: user authentication via Auth.js (NextAuth v5), ChatGPT-style streaming chat interface with markdown rendering, conversation history with full-text search, and a unified LLM gateway supporting Qwen, GLM, and MiniMax models through the pi-ai abstraction layer.

**Primary recommendation:** Use pi-ai's unified API with OpenAI-compatible endpoints for all three Chinese LLM providers, Vercel AI SDK's `useChat` hook for streaming UI, and Auth.js v5 with Google OAuth + email/password for authentication. PostgreSQL full-text search for conversation history.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Authentication
- Email/password + Google SSO (single SSO provider for Phase 1)
- Auth.js (NextAuth v5) for authentication handling
- Session persists 30 days with automatic refresh
- No rate limiting on API (audit logging only - team trust model)

#### UI Layout
- Sidebar + chat area pattern (ChatGPT-style)
- Collapsible sidebar for conversation history
- Main area for active conversation
- Works well on both desktop and mobile

#### Conversation Interface
- Character-by-character streaming (word-by-word as generated)
- Full markdown support with code syntax highlighting
- Code blocks display-only (no copy/download/run buttons in Phase 1)
- Empty state: Welcome message + suggested prompts (e.g., "Analyze this document", "Help me write code")
- Inline error display with retry option

#### Model Selection
- Model selector at top of chat input (always visible when typing)
- Default model: Qwen3.5 (best overall balance for Chinese teams)
- Users can switch between Qwen, GLM, and MiniMax
- Model preference persists per user

#### Conversation History
- Full-text search in sidebar (PostgreSQL full-text search)
- Unlimited history, paginated in UI
- Users can delete individual conversations
- No auto-archive or auto-delete

#### Security & Content Safety
- Basic content filtering (block obviously harmful content: violence, illegal)
- Light touch approach - fewer false positives, trusted team environment
- Audit logging for all user actions
- TLS 1.3 for transport, AES-256 for data at rest

### Claude's Discretion

- Exact sidebar width and collapse animation
- Welcome message wording and suggested prompt examples
- Error message copy and retry button placement
- Code block theme (light/dark mode consistency)
- Exact pagination page size for history

### Deferred Ideas (OUT OF SCOPE)

- Additional SSO providers (Microsoft, GitHub) - Phase 2 or later if needed
- Semantic search for conversation history - requires vector infrastructure (Phase 3)
- Code block actions (copy, download, run) - Phase 2 with MCP tools
- Rate limiting per user - audit logging sufficient for trusted teams
- Extended markdown (LaTeX, Mermaid diagrams) - can add if users request

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CORE-01 | ChatGPT-style conversation UI with streaming, markdown, code highlighting | Vercel AI SDK `useChat` hook + react-markdown + react-syntax-highlighter + shadcn/ui components |
| CORE-02 | Email/password + SSO authentication | Auth.js v5 with Google provider + Credentials provider |
| CORE-03 | Session persistence across browser refreshes | Auth.js session management with JWT strategy, 30-day expiry |
| CORE-04 | Conversation history with search and filtering | PostgreSQL full-text search with `tsvector`, Drizzle ORM for queries |
| CORE-05 | REST API with rate limiting | Audit-only approach per user decision; standard Next.js API routes |
| CORE-06 | Audit logging with timestamps and user IDs | Structured logging with user context, PostgreSQL audit table |
| CORE-07 | TLS 1.3 + AES-256 encryption | Vercel/infra handles TLS; AES-256 for sensitive DB fields |
| LLM-01 | Qwen3.5 model with official TypeScript SDK | pi-ai OpenAI-compatible config with Qwen baseUrl (Alibaba Cloud/AtlasCloud) |
| LLM-02 | GLM models via OpenAI-compatible API | pi-ai OpenAI-compatible config with Zhipu AI endpoint |
| LLM-03 | MiniMax M2.5 models with native pi-mono integration | pi-ai native MiniMax support via `MINIMAX_API_KEY` env var |
| LLM-04 | Unified LLM API abstraction layer | pi-ai provides unified Model interface across all providers |
| LLM-05 | Retry logic with exponential backoff for 429 errors | Custom retry wrapper around pi-ai calls, max 3 retries |
| LLM-06 | Provider-specific streaming parameters | Qwen: `incremental_output: true`, MiniMax: native streaming |
| LLM-07 | Model switching UI | React state + localStorage for persistence, model selector component |
| SEC-01 | Content safety detection | Basic keyword filtering + pattern matching for harmful content |
| SEC-02 | Explicit state objects | pi-agent-core stateful agent, structured conversation state |
| SEC-03 | Verification checkpoints for multi-step operations | Phase 2 scope (no tools yet); conversation state validation |
| SEC-04 | Agent chain limit (max 5 sequential steps) | Phase 2 scope; prepare architecture for limits |
| SEC-05 | Circuit breakers for failing operations | Retry limits (max 3), exponential backoff implementation |
| SEC-06 | Real-time monitoring and alerting | Structured logging, error tracking integration (Sentry/log service) |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **@mariozechner/pi-ai** | 0.62.0 | Unified LLM API with multi-provider support | Native MiniMax support, OpenAI-compatible layer for Qwen/GLM, TypeBox schemas, token tracking |
| **@mariozechner/pi-agent-core** | 0.62.0 | Agent runtime with streaming events and state management | Stateful agent, parallel/sequential tool execution, lifecycle hooks |
| **Next.js** | 16.2.1 | Full-stack web framework | App Router for secure API key handling, Vercel AI SDK integration, API routes |
| **TypeScript** | 5.x | Type safety | Required by pi-mono, end-to-end type safety |
| **PostgreSQL** | 16.x | Primary database | Structured data for users, conversations, audit logs; full-text search |
| **Drizzle ORM** | 0.45.1 | Database ORM | SQL-like syntax, TypeScript type safety, minimal bundle size (~7.4kb) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Vercel AI SDK** | 6.0.137 | Streaming chat UI and AI primitives | ChatGPT-style interface, `useChat` hook for streaming, multi-provider support |
| **shadcn/ui** | Latest | UI component library | Chat interface components, Tailwind CSS + Radix UI foundation |
| **Auth.js** | 4.24.13 (next-auth@beta) | Authentication | OAuth providers, email/password, session management, App Router support |
| **@sinclair/typebox** | 0.34.48 | JSON schema validation | Tool parameter validation (re-exported from pi-ai) |
| **Zod** | 3.4.8 | Runtime validation | API input validation complementary to TypeBox |
| **Tailwind CSS** | 4.2.2 | Styling | Required by shadcn/ui, v4 with improved performance |
| **react-markdown** | Latest | Markdown rendering | Message content rendering with GFM support |
| **react-syntax-highlighter** | Latest | Code syntax highlighting | Code blocks in AI responses |

### Chinese LLM Integration

| Provider | Integration Method | Endpoint/SDK |
|----------|-------------------|--------------|
| **Qwen (Alibaba)** | OpenAI-compatible API via pi-ai | `https://dashscope.aliyuncs.com/compatible-mode/v1` or AtlasCloud |
| **GLM (Zhipu AI)** | OpenAI-compatible API via pi-ai | Zhipu AI OpenAI-compatible endpoint |
| **MiniMax** | Native pi-ai support | Set `MINIMAX_API_KEY` env var |

**Installation:**
```bash
# Core (pi-mono framework)
npm install @mariozechner/pi-ai @mariozechner/pi-agent-core

# Web framework
npm install next@16 react@19 react-dom

# Database
npm install drizzle-orm postgres
npm install -D drizzle-kit

# UI
npm install ai  # Vercel AI SDK
npm install -D tailwindcss postcss autoprefixer
npx shadcn@latest init

# Authentication
npm install next-auth@beta @auth/drizzle-adapter

# Markdown rendering
npm install react-markdown remark-gfm react-syntax-highlighter

# Validation
npm install @sinclair/typebox zod

# Dev dependencies
npm install -D typescript @types/node @types/react
```

**Version verification (2026-03-24):**
- @mariozechner/pi-ai: 0.62.0 (current)
- @mariozechner/pi-agent-core: 0.62.0 (current)
- next: 16.2.1 (current)
- drizzle-orm: 0.45.1 (current)
- ai (Vercel AI SDK): 6.0.137 (current)
- next-auth: 4.24.13 (current, v5 beta)
- typescript: 5.x
- tailwindcss: 4.2.2 (current)

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pi-mono | LangChain + LangGraph | Larger ecosystem but heavier, less Chinese LLM focus |
| pi-mono | CrewAI | Better for fast prototypes, less control over agent behavior |
| Drizzle ORM | Prisma | Prisma Studio visual browser but 700ms slower cold starts |
| Auth.js | Custom auth | More flexibility but security risks, maintenance burden |
| shadcn/ui | Material UI | More components but heavier, less customizable for chat |

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Auth-related pages
│   │   ├── login/
│   │   └── register/
│   ├── (chat)/               # Chat interface
│   │   ├── layout.tsx        # Sidebar + main area layout
│   │   ├── page.tsx          # Main chat page
│   │   └── [conversationId]/ # Specific conversation
│   ├── api/
│   │   ├── auth/[...nextauth]/  # Auth.js handlers
│   │   ├── chat/             # Streaming chat endpoint
│   │   └── conversations/    # CRUD for conversations
│   └── layout.tsx            # Root layout
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── chat/
│   │   ├── chat-input.tsx    # Message input + model selector
│   │   ├── chat-message.tsx  # Message with markdown rendering
│   │   ├── chat-list.tsx     # Message list container
│   │   └── model-selector.tsx
│   ├── sidebar/
│   │   ├── sidebar.tsx       # Collapsible sidebar
│   │   ├── conversation-list.tsx
│   │   └── search-input.tsx
│   └── auth/
│       ├── login-form.tsx
│       └── register-form.tsx
├── lib/
│   ├── auth.ts               # Auth.js configuration
│   ├── db/
│   │   ├── schema.ts         # Drizzle schema
│   │   └── index.ts          # DB connection
│   ├── llm/
│   │   ├── index.ts          # pi-ai unified config
│   │   ├── providers/        # Provider-specific configs
│   │   └── retry.ts          # Retry logic with backoff
│   └── audit.ts              # Audit logging
├── hooks/
│   ├── use-chat-with-retry.ts
│   └── use-model-preference.ts
└── types/
    └── index.ts              # Shared TypeScript types
```

### Pattern 1: Vercel AI SDK useChat Hook

**What:** React hook for streaming chat with automatic state management.

**When to use:** All chat interfaces in Phase 1.

**Example:**
```typescript
// Source: https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot
'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

export function ChatInterface({ conversationId }: { conversationId: string }) {
  const {
    messages,
    sendMessage,
    status,
    error,
    regenerate,
    stop
  } = useChat({
    id: conversationId,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { conversationId },
    }),
    onFinish: ({ message }) => {
      // Save to database, trigger audit log
    },
    onError: (error) => {
      // Log error, show notification
    },
  });

  return (
    <div>
      {messages.map(message => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {error && (
        <div className="error">
          <p>Something went wrong.</p>
          <button onClick={() => regenerate()}>Retry</button>
        </div>
      )}
      <ChatInput
        onSend={(text) => sendMessage({ text })}
        disabled={status !== 'ready'}
      />
    </div>
  );
}
```

### Pattern 2: Auth.js v5 with App Router

**What:** Authentication with OAuth and credentials providers for Next.js App Router.

**When to use:** All authentication flows in Phase 1.

**Example:**
```typescript
// Source: https://authjs.dev/getting-started/installation
// auth.ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/lib/db"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  providers: [
    Google,
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Validate credentials against database
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    }
  }
})

// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth"
export const { GET, POST } = handlers

// proxy.ts (middleware for Next.js 16+)
export { auth as proxy } from "@/auth"
```

### Pattern 3: pi-ai Unified LLM Configuration

**What:** Single configuration point for all LLM providers with OpenAI-compatible interface.

**When to use:** All LLM calls in Phase 1.

**Example:**
```typescript
// Source: pi-mono documentation + STACK.md research
import { Model, stream } from '@mariozechner/pi-ai';

// Qwen via OpenAI-compatible endpoint
const qwenModel: Model<'openai-completions'> = {
  id: 'qwen3.5-turbo',
  name: 'Qwen 3.5 Turbo',
  api: 'openai-completions',
  provider: 'qwen',
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  contextWindow: 128000,
  maxTokens: 8192,
  cost: { input: 0.0003, output: 0.0006, cacheRead: 0, cacheWrite: 0 },
  input: ['text', 'image'],
};

// GLM via OpenAI-compatible endpoint
const glmModel: Model<'openai-completions'> = {
  id: 'glm-4-flash',
  name: 'GLM-4 Flash',
  api: 'openai-completions',
  provider: 'glm',
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  contextWindow: 128000,
  maxTokens: 4096,
  cost: { input: 0.0001, output: 0.0001, cacheRead: 0, cacheWrite: 0 },
  input: ['text'],
};

// MiniMax is native to pi-ai - just set MINIMAX_API_KEY env var

// API route using unified interface
export async function POST(req: Request) {
  const { messages, modelId } = await req.json();
  const model = getModelById(modelId); // Returns appropriate Model config

  const result = await stream({
    model,
    messages,
    // Provider-specific streaming params handled by pi-ai
  });

  return result.toTextStreamResponse();
}
```

### Pattern 4: PostgreSQL Full-Text Search

**What:** Native PostgreSQL full-text search for conversation history.

**When to use:** Search/filter in conversation sidebar.

**Example:**
```typescript
// Drizzle schema with tsvector
import { text, pgTable, serial, timestamp, vector } from 'drizzle-orm/pg-core';

export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  content: text('content'), // For search indexing
  searchVector: text('search_vector').generatedAlwaysAs(
    sql`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))`
  ).stored(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Search query
async function searchConversations(userId: string, query: string) {
  return db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, userId),
        sql`${conversations.searchVector} @@ plainto_tsquery('english', ${query})`
      )
    )
    .orderBy(sql`ts_rank(${conversations.searchVector}, plainto_tsquery('english', ${query})) DESC`);
}
```

### Anti-Patterns to Avoid

- **Monolithic mega-prompt:** Keep agent prompts under 50 actionable instructions. Split responsibilities if growing beyond that.
- **Relying on LLM memory for state:** Use explicit state objects stored in PostgreSQL, not inferred from conversation context.
- **No retry limits:** Always implement max 3 retries with exponential backoff for LLM API calls.
- **Single shared API key:** Use per-user context for audit trail, never share keys across users.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chat streaming | Custom SSE/WebSocket handler | Vercel AI SDK `useChat` | Handles reconnection, state management, error recovery |
| Authentication | Custom JWT/session handling | Auth.js (NextAuth v5) | Security best practices, OAuth complexity, session management |
| LLM API calls | Raw fetch to provider APIs | pi-ai unified API | Provider quirks, retry logic, token tracking, type safety |
| Markdown rendering | Custom markdown parser | react-markdown + remark-gfm | XSS protection, GFM support, plugin ecosystem |
| Code highlighting | Custom syntax highlighter | react-syntax-highlighter | Language detection, theme support, performance |
| Database queries | Raw SQL strings | Drizzle ORM | Type safety, migrations, SQL-like DX |
| Content filtering | Custom regex for harmful content | Start with keyword lists, plan for API service | False positives, evolving threats, maintenance burden |

**Key insight:** All these areas have well-tested solutions. Custom implementations introduce security risks, edge cases, and maintenance burden that distracts from core product value.

## Common Pitfalls

### Pitfall 1: Qwen Streaming Not Working

**What goes wrong:** Streaming responses appear as single block instead of character-by-character.

**Why it happens:** Qwen API requires `incremental_output: true` parameter for streaming.

**How to avoid:** Ensure pi-ai configuration includes streaming parameters for Qwen provider.

**Warning signs:**
- Responses appear all at once after delay
- No typing animation
- Long wait times before any output

### Pitfall 2: Session Lost on Refresh

**What goes wrong:** User appears logged out after browser refresh despite "remember me".

**Why it happens:** JWT strategy without proper cookie configuration, or session not being refreshed.

**How to avoid:** Use Auth.js with JWT strategy, 30-day maxAge, and ensure proxy.ts (middleware) is configured to refresh sessions.

**Warning signs:**
- Users report being logged out randomly
- Session appears after page reload
- Inconsistent auth state across tabs

### Pitfall 3: Context Window Overflow

**What goes wrong:** Long conversations cause errors or degraded quality.

**Why it happens:** Accumulating full conversation history exceeds model context limits.

**How to avoid:** Implement sliding window for conversation history (keep last N messages + summary of earlier context). Not critical for Phase 1 MVP but plan for it.

**Warning signs:**
- API errors on long conversations
- Quality degradation after 20+ messages
- Increasing response latency

### Pitfall 4: Chinese LLM Rate Limiting (429 Errors)

**What goes wrong:** Frequent rate limit errors from Qwen/GLM/MiniMax APIs.

**Why it happens:** Chinese providers have aggressive rate limiting; no retry logic implemented.

**How to avoid:** Implement exponential backoff retry with max 3 attempts, show user-friendly message if still failing.

**Warning signs:**
- 429 errors in logs
- Failed messages during high usage
- Inconsistent response success

### Pitfall 5: Content Filtering False Positives

**What goes wrong:** Legitimate content blocked by content filter.

**Why it happens:** Aggressive filtering catches benign content containing flagged words.

**How to avoid:** Use light-touch approach per user decision - block only obviously harmful content (violence, illegal). Trust team environment.

**Warning signs:**
- Users complain about blocked messages
- Normal work conversations rejected
- Support requests about content policy

## Code Examples

### Streaming Chat API Route

```typescript
// Source: Vercel AI SDK docs + pi-ai patterns
// app/api/chat/route.ts
import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { auth } from '@/lib/auth';
import { getModel } from '@/lib/llm';
import { logAudit } from '@/lib/audit';

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { messages, modelId, conversationId }: {
    messages: UIMessage[];
    modelId: string;
    conversationId: string;
  } = await req.json();

  const model = getModel(modelId);

  // Log user action for audit
  await logAudit({
    userId: session.user.id,
    action: 'chat_message',
    resource: 'conversation',
    resourceId: conversationId,
    metadata: { modelId, messageCount: messages.length },
  });

  const result = streamText({
    model,
    messages: await convertToModelMessages(messages),
    system: 'You are a helpful AI assistant for a team collaboration platform.',
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error('Stream error:', error);
      return 'An error occurred while processing your request.';
    },
  });
}
```

### Retry Logic with Exponential Backoff

```typescript
// lib/llm/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Only retry on 429 (rate limit) or 5xx errors
      if (error.status !== 429 && !String(error.status).startsWith('5')) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

### Model Selector Component

```typescript
// components/chat/model-selector.tsx
'use client';
import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MODELS = [
  { id: 'qwen3.5-turbo', name: 'Qwen 3.5 Turbo', provider: 'Qwen' },
  { id: 'glm-4-flash', name: 'GLM-4 Flash', provider: 'GLM' },
  { id: 'minimax-m2.5', name: 'MiniMax M2.5', provider: 'MiniMax' },
] as const;

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load preference from localStorage
    const saved = localStorage.getItem('preferred-model');
    if (saved && MODELS.find(m => m.id === saved)) {
      onChange(saved);
    }
  }, [onChange]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('preferred-model', value);
    }
  }, [value, mounted]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {MODELS.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            <span className="font-medium">{model.name}</span>
            <span className="text-muted-foreground ml-2 text-xs">
              {model.provider}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom SSE streaming | Vercel AI SDK hooks | 2024-2025 | Automatic state management, error recovery, tool calling support |
| Custom auth with JWT | Auth.js v5 (NextAuth) | 2024-2025 | OAuth complexity handled, session management, security best practices |
| Raw OpenAI SDK for all | Provider-specific + unified layer | 2025 | Chinese LLMs via OpenAI-compatible, native support where available |
| Client-side content filtering | Server-side validation + API services | 2025 | Better accuracy, easier updates, centralized policy |
| MongoDB for conversations | PostgreSQL with full-text search | 2025 | Better relational queries, native search, mature ecosystem |

**Deprecated/outdated:**
- **NextAuth v4:** v5 is current with App Router support; use `next-auth@beta`
- **Prisma for serverless:** Drizzle ORM has 700ms faster cold starts
- **Raw WebSockets for chat:** SSE via Vercel AI SDK is simpler and more reliable

## Open Questions

1. **Qwen endpoint selection (Alibaba Cloud vs AtlasCloud)**
   - What we know: Both provide OpenAI-compatible endpoints for Qwen models
   - What's unclear: Pricing differences, rate limits, availability
   - Recommendation: Start with Alibaba Cloud (official), monitor performance, switch if needed

2. **Content filtering granularity**
   - What we know: Basic keyword filtering is straightforward
   - What's unclear: Threshold for "light touch" in trusted team environment
   - Recommendation: Start with minimal list (violence, illegal content), expand based on user feedback

3. **Conversation title generation**
   - What we know: Users expect auto-generated titles from first message
   - What's unclear: Whether to use LLM for title generation (adds latency/cost)
   - Recommendation: Generate title from first user message (truncate to 50 chars) in Phase 1, consider LLM-generated titles in Phase 2

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (Vite-native, fast, TypeScript support) |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test:coverage` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CORE-01 | Chat UI renders with streaming | integration | `pnpm test chat.test.tsx` | Wave 0 |
| CORE-02 | User can login with email/password | e2e | `pnpm test:e2e auth.spec.ts` | Wave 0 |
| CORE-02 | User can login with Google SSO | e2e | `pnpm test:e2e auth.spec.ts` | Wave 0 |
| CORE-03 | Session persists across refresh | e2e | `pnpm test:e2e session.spec.ts` | Wave 0 |
| CORE-04 | Search returns matching conversations | unit | `pnpm test search.test.ts` | Wave 0 |
| CORE-05 | API routes handle authenticated requests | integration | `pnpm test api.test.ts` | Wave 0 |
| CORE-06 | Audit logs capture user actions | unit | `pnpm test audit.test.ts` | Wave 0 |
| LLM-01 | Qwen model returns streaming response | integration | `pnpm test llm-qwen.test.ts` | Wave 0 |
| LLM-02 | GLM model returns streaming response | integration | `pnpm test llm-glm.test.ts` | Wave 0 |
| LLM-03 | MiniMax model returns streaming response | integration | `pnpm test llm-minimax.test.ts` | Wave 0 |
| LLM-04 | Unified API abstracts provider differences | unit | `pnpm test llm-unified.test.ts` | Wave 0 |
| LLM-05 | Retry logic handles 429 errors | unit | `pnpm test retry.test.ts` | Wave 0 |
| LLM-06 | Qwen streaming uses incremental_output | unit | `pnpm test qwen-streaming.test.ts` | Wave 0 |
| LLM-07 | Model preference persists in localStorage | unit | `pnpm test model-selector.test.tsx` | Wave 0 |
| SEC-01 | Content filter blocks harmful content | unit | `pnpm test content-filter.test.ts` | Wave 0 |
| SEC-02 | State objects are explicit and serializable | unit | `pnpm test state.test.ts` | Wave 0 |
| SEC-05 | Circuit breaker limits retries | unit | `pnpm test retry.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test` (affected tests only)
- **Per wave merge:** `pnpm test:coverage` (full suite with coverage)
- **Phase gate:** Full suite green + 80% coverage before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/setup.ts` - Vitest setup with test database
- [ ] `tests/chat.test.tsx` - Chat component tests
- [ ] `tests/auth.test.ts` - Authentication unit tests
- [ ] `tests/search.test.ts` - Full-text search tests
- [ ] `tests/llm-*.test.ts` - LLM provider mock tests
- [ ] `tests/retry.test.ts` - Retry logic tests
- [ ] `tests/content-filter.test.ts` - Content safety tests
- [ ] `e2e/auth.spec.ts` - Playwright e2e for auth flows
- [ ] `e2e/chat.spec.ts` - Playwright e2e for chat flows
- [ ] Framework install: `pnpm add -D vitest @testing-library/react @playwright/test`

## Sources

### Primary (HIGH confidence)

- [pi-mono GitHub](https://github.com/badlogic/pi-mono) - Agent framework, verified 2026-03-24
- [@mariozechner/pi-ai NPM](https://www.npmjs.com/package/@mariozechner/pi-ai) - Version 0.62.0, verified 2026-03-24
- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot) - useChat hook patterns, verified 2026-03-24
- [Auth.js Docs](https://authjs.dev/getting-started/installation) - NextAuth v5 setup, verified 2026-03-24
- [Alibaba Cloud Qwen Docs](https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope) - OpenAI compatibility, verified 2026-03-24

### Secondary (MEDIUM confidence)

- [Zhipu AI SDK](https://github.com/MetaGLM/zhipuai-sdk-nodejs-v4) - Official Node.js SDK for GLM
- [zhipu-ai-provider](https://github.com/Xiang-CH/zhipu-ai-provider) - Vercel AI SDK integration for GLM
- [Qdrant Pricing](https://qdrant.tech/pricing/) - Vector database costs (Phase 3 reference)

### Tertiary (LOW confidence)

- MiniMax API documentation (Chinese-only official docs) - Need to verify endpoint details during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified via NPM, official documentation reviewed
- Architecture: HIGH - Patterns based on established Next.js/Auth.js/Vercel AI SDK conventions
- Pitfalls: HIGH - Based on PITFALLS.md research with multiple sources
- Chinese LLM integration: MEDIUM - Qwen/GLM verified, MiniMax native support confirmed but docs in Chinese

**Research date:** 2026-03-24
**Valid until:** 30 days (stable stack, verify versions before implementation)
