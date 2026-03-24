# Stack Research

**Domain:** AI Agent Framework for Team Collaboration
**Researched:** 2026-03-24
**Confidence:** HIGH (pi-mono verified via official NPM/GitHub, other technologies verified via official docs and 2025 ecosystem research)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **@mariozechner/pi-ai** | 0.61.x | Unified LLM API with multi-provider support | Already selected by project. Supports OpenAI, Anthropic, Google, and **MiniMax** (Chinese LLM) out of the box. OpenAI-compatible API enables easy integration with Qwen and GLM. Provides TypeBox schemas for type-safe tool definitions, token tracking, cost management, and context serialization. |
| **@mariozechner/pi-agent-core** | 0.61.x | Agent runtime with tool execution and state management | Already selected by project. Provides stateful agent with streaming events, parallel/sequential tool execution, steering/follow-up messages, and lifecycle hooks. Built on pi-ai for seamless integration. |
| **Next.js** | 15.x | Full-stack web framework | Industry standard for React-based web apps in 2025. App Router provides server components for secure API key handling. Excellent DX with Vercel AI SDK integration. Supports API routes for backend services. |
| **TypeScript** | 5.x | Type safety | Required by pi-mono. Provides end-to-end type safety from database to frontend. Essential for complex agent workflows. |
| **PostgreSQL** | 16.x | Primary database | Battle-tested relational database. Supports structured data for users, conversations, audit logs. Combined with pgvector extension for RAG vector storage. |
| **Qdrant** | 1.12.x | Vector database for RAG | Open-source, Rust-based for performance. Cost-effective cloud option ($25/mo starting). TypeScript SDK available. Better for dedicated vector search than pgvector at scale. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Vercel AI SDK** | 4.x | Streaming chat UI and AI primitives | For building ChatGPT-style interface. Handles streaming, tool calling UI, and multi-provider support. Integrates with Next.js App Router. |
| **shadcn/ui** | Latest | UI component library | For ChatGPT-style interface. Built on Tailwind CSS and Radix UI. Copy-paste components you own. Tailwind v4 support (March 2025). |
| **Drizzle ORM** | 0.40.x | Database ORM | For PostgreSQL operations. SQL-like syntax with full TypeScript type safety. Minimal bundle size (~7.4kb). Better serverless performance than Prisma (700ms faster cold starts). |
| **LlamaIndex.TS** | 0.7.x | RAG framework | For document indexing and retrieval. 35% boost in retrieval accuracy (2025). Supports PDFs, SharePoint, Google Drive. TypeScript-native. |
| **Unstructured.io** | Latest | Document parsing | For file processing (PDF, Word, code, images). Supports 64+ file types. OCR, table extraction, multiple parsing strategies (Fast, Hi-Res, VLM, Auto). |
| **Auth.js** | 5.x (NextAuth v5) | Authentication | For user authentication. Industry standard for Next.js. Supports OAuth providers, email/passwordless, session management. Works with App Router. |
| **@modelcontextprotocol/sdk** | Latest | MCP protocol implementation | For MCP server/client implementation. Official TypeScript SDK from Anthropic. Enables resource access, tool calling, prompt templates. |
| **@sinclair/typebox** | 0.34.x | JSON schema validation | Already used by pi-ai. For defining tool parameters with automatic validation. Schemas are serializable for distributed systems. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **pnpm** | Package manager | Faster than npm/yarn. Efficient disk space usage with symlinks. |
| **Turbo** | Monorepo build system | If splitting into multiple packages (web, api, agent-core). |
| **Tailwind CSS** | 4.x | Styling | Required by shadcn/ui. v4 released with improved performance. |
| **Zod** | Runtime validation | Complementary to TypeBox for API validation. |

## Installation

```bash
# Core (pi-mono framework)
npm install @mariozechner/pi-ai @mariozechner/pi-agent-core

# Web framework
npm install next@15 react react-dom

# Database
npm install drizzle-orm postgres
npm install -D drizzle-kit

# Vector database
npm install @qdrant/js-client-rest

# RAG and document processing
npm install llamaindex unstructured

# UI
npm install ai @ai-sdk/openai  # Vercel AI SDK
npm install -D tailwindcss postcss autoprefixer
npx shadcn@latest init

# Authentication
npm install next-auth@beta @auth/drizzle-adapter

# MCP protocol
npm install @modelcontextprotocol/sdk

# Validation (re-exported from pi-ai, but explicit if needed)
npm install @sinclair/typebox

# Dev dependencies
npm install -D typescript @types/node @types/react
npm install -D eslint prettier
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| pi-mono | LangChain + LangGraph | If you need Python-first ecosystem, larger community, or pre-built integrations. LangGraph 1.0 (Oct 2025) is production-ready for multi-agent workflows. |
| pi-mono | CrewAI | For role-based multi-agent orchestration. Better for fast prototypes. Less control than pi-mono's low-level API. |
| pi-mono | AutoGen (Microsoft) | For complex, conversation-driven multi-agent scenarios. Strong observability features. |
| Drizzle ORM | Prisma | If you prefer declarative schema approach over SQL-like syntax, need Prisma Studio visual browser, or want maximum abstraction from SQL. |
| Qdrant | pgvector | If you want unified database for both structured and vector data. Simpler stack but less performant at scale. |
| Qdrant | Pinecone | If you want fully managed with zero DevOps. More expensive ($200-400/mo for 10M vectors vs Qdrant's ~$100/mo). |
| LlamaIndex.TS | LangChain (JS) | If already using LangChain for agent orchestration. LlamaIndex better for RAG-focused applications. |
| Vercel AI SDK | LangChain UI | If building complex agent workflows with LangChain backend. Vercel AI SDK is simpler for chat interfaces. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **TypeORM** | Heavier than Drizzle, slower in serverless, active development slower | Drizzle ORM |
| **Sequelize** | Older, less TypeScript-friendly, dated patterns | Drizzle ORM |
| **MikroORM** | Good but smaller ecosystem, more complexity than needed | Drizzle ORM |
| **MongoDB for vectors** | Atlas Vector Search exists but PostgreSQL + Qdrant is more flexible | PostgreSQL + Qdrant |
| **Weaviate** | Good features but Qdrant has better performance/price ratio for most use cases | Qdrant |
| **Raw OpenAI SDK** | pi-ai already provides unified multi-provider API with tool calling, token tracking | @mariozechner/pi-ai |
| **Custom auth** | Security risks, maintenance burden | Auth.js (NextAuth v5) |
| **Material UI / Ant Design** | Heavier, less customizable than shadcn/ui for chat interfaces | shadcn/ui |

## Stack Patterns by Variant

**If prioritizing Chinese LLM support:**
- Use pi-ai's OpenAI-compatible API support with custom models
- Qwen via OpenAI-compatible endpoint (e.g., AtlasCloud, ModelScope)
- GLM via Zhipu AI's official SDK or OpenAI-compatible endpoint
- MiniMax is already natively supported by pi-ai

**If needing A2A (Agent-to-Agent) protocol:**
- Implement A2A protocol (announced April 2025, donated to Linux Foundation)
- Use official A2A TypeScript SDK for inter-agent communication
- A2A enables agents from different frameworks to collaborate

**If deploying to edge/serverless:**
- Drizzle ORM over Prisma (700ms faster cold starts)
- Qdrant Cloud for managed vector DB
- Vercel for Next.js deployment

## Chinese LLM Integration Details

| Provider | Integration Method | Notes |
|----------|-------------------|-------|
| **Qwen (Alibaba)** | OpenAI-compatible API | Use `@qwen-code/sdk` or custom model config with baseUrl. Supports streaming, tool calling. |
| **GLM (Zhipu AI)** | Official SDK or OpenAI-compatible | GLM-4.5/4.7 models available. Good balance in coding and agent tasks. |
| **MiniMax** | Native in pi-ai | Already supported! Set `MINIMAX_API_KEY` env var. MiniMax M2/M2.5 competitive with DeepSeek. |

```typescript
// Example: Custom Qwen model in pi-ai
import { Model, stream } from '@mariozechner/pi-ai';

const qwenModel: Model<'openai-completions'> = {
  id: 'qwen2.5-72b-instruct',
  name: 'Qwen 2.5 72B',
  api: 'openai-completions',
  provider: 'qwen',
  baseUrl: 'https://api.atlascloud.ai/v1', // or ModelScope
  reasoning: true,
  input: ['text', 'image'],
  cost: { input: 0.04, output: 0.08, cacheRead: 0, cacheWrite: 0 }, // per 1M tokens
  contextWindow: 128000,
  maxTokens: 8192,
  compat: {
    thinkingFormat: 'qwen', // Uses enable_thinking: boolean
  }
};
```

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| @mariozechner/pi-ai | @mariozechner/pi-agent-core | Same version recommended (0.61.x) |
| Next.js 15 | React 19 | App Router requires React 19 |
| Drizzle ORM | PostgreSQL 14+ | pgvector extension requires PG 14+ |
| shadcn/ui | Tailwind CSS 3.4+ or 4.x | v4 support added March 2025 |
| Vercel AI SDK | Next.js 14+ | Streaming requires App Router |

## Architecture Rationale

### Why pi-mono over LangChain/LangGraph

1. **Already selected by project** - Project explicitly chose pi-mono for its lightweight nature and Chinese LLM support
2. **Native MiniMax support** - pi-ai includes MiniMax out of the box, crucial for Chinese LLM requirement
3. **OpenAI-compatible layer** - Easy to add Qwen, GLM via custom model configuration
4. **TypeScript-first** - Better type safety than LangChain.js which has Python roots
5. **Lower overhead** - Minimal abstraction, more control over agent behavior

### Why Qdrant over pgvector for vectors

1. **Dedicated vector engine** - Better HNSW optimization for similarity search
2. **Scalability** - Handles 10M+ vectors better than pgvector
3. **Cloud option** - Qdrant Cloud at $25/mo is cost-effective
4. **TypeScript SDK** - First-class TypeScript support

### Why Drizzle over Prisma

1. **Serverless performance** - 700ms faster cold starts
2. **Bundle size** - ~7.4kb vs Prisma's heavier footprint
3. **SQL-like control** - Better for complex queries
4. **Edge compatibility** - Works better with Vercel Edge Functions

## Sources

- **pi-mono GitHub** - https://github.com/badlogic/pi-mono (verified 2026-03-24)
- **@mariozechner/pi-ai NPM** - https://www.npmjs.com/package/@mariozechner/pi-ai (version 0.61.1, published a day ago)
- **@mariozechner/pi-agent-core NPM** - https://www.npmjs.com/package/@mariozechner/pi-agent-core (version 0.61.1)
- **LangGraph 1.0 announcement** - https://blog.langchain.com/building-langgraph/ (October 2025)
- **A2A Protocol** - https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/ (April 2025)
- **MCP Specification** - https://modelcontextprotocol.io/specification/2025-11-25/changelog
- **Qdrant Pricing** - https://qdrant.tech/pricing/ (verified 2025)
- **Drizzle vs Prisma benchmarks** - https://dev.to/jsgurujobs/6-prisma-vs-drizzle-patterns-that-cut-serverless-cold-starts-by-700ms-5dl5
- **LlamaIndex.TS docs** - https://developers.llamaindex.ai/typescript/framework/
- **Unstructured.io** - https://unstructured.io/ (64+ file types support)
- **shadcn/ui Tailwind v4** - https://ui.shadcn.com/docs/tailwind-v4 (March 2025)
- **Auth.js docs** - https://authjs.dev/ (NextAuth v5)
- **Qwen TypeScript SDK** - https://qwenlm.github.io/qwen-code-docs/zh/developers/sdk-typescript/
- **MiniMax official site** - https://www.minimaxi.com/

---
*Stack research for: AI Agent Framework (Next-Mind)*
*Researched: 2026-03-24*
