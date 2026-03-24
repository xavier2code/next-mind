# Phase 2: Tool Integration - Research

**Researched:** 2026-03-24
**Domain:** MCP Protocol, Skills System, Security
**Confidence:** HIGH

## Summary

This phase implements the Model Context Protocol (MCP) server integrated into Next.js API routes, a TypeScript-first skills system with decorator-based metadata, inline approval flows for destructive operations, and a sidebar skill discovery panel. The core architecture integrates MCP's JSON-RPC 2.0 protocol with HTTP transport, builds on the @modelcontextprotocol/sdk TypeScript package, and provides inline approval UX patterns embedded in the chat interface.

**Primary recommendation:** Use the official @modelcontextprotocol/sdk (v1.27.1+) with Streamable HTTP transport, implement skills as TypeScript functions with Zod schema validation and metadata objects, and integrate approval flows directly into the chat message stream.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **MCP Protocol Implementation**: MCP server runs as HTTP endpoints integrated into Next.js API routes (not separate stdio process). Single server deployment, simpler operations, leverages existing auth middleware. Tools scoped per-user session for isolated state (not global shared). All MCP requests authenticated via existing Auth.js session.
- **Skills Definition Format**: Skills defined as TypeScript functions with metadata decorators/annotations. Code-first approach stored in version control (not YAML config or database records). Auto-discovery from skill files in designated directory. Full IDE support with type safety.
- **Approval Flow UX**: Destructive operations (file deletion, system commands) require inline approval in chat. AI asks "Should I proceed with X?" with Approve/Cancel buttons directly in conversation. No modal dialogs or separate approval queue pages.
- **Skill Discovery UI**: Skills displayed in a dedicated sidebar panel. Always visible alongside conversation. Shows available skills with descriptions. Users can browse and invoke skills directly.

### Claude's Discretion
- Exact skill metadata format (decorators vs config object)
- Skill orchestration engine implementation
- Error handling for skill execution failures
- Skill versioning and dependency management

### Deferred Ideas (OUT OF SCOPE)
- Skills marketplace - v2 feature
- Skill rating and reviews - v2 feature
- Multi-agent (A2A) coordination - separate phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MCP-01 | System implements MCP server with JSON-RPC 2.0 compliance | Use @modelcontextprotocol/sdk with McpServer class, implement JSON-RPC handlers for tools/list, tools/call, resources/list, prompts/list |
| MCP-02 | System provides MCP Tools registry for agent tool access | Implement McpServer.setRequestHandler(ListToolsRequestSchema), tools stored in session-scoped registry |
| MCP-03 | System provides MCP Resources manager for file and data access | Implement McpServer.setRequestHandler(ListResourcesRequestSchema), resources stored in session-scoped storage |
| MCP-04 | System provides MCP Prompts templates for reusable prompt patterns | Implement McpServer.setRequestHandler(ListPromptsRequestSchema), prompt templates stored in code-first config |
| MCP-05 | System implements bash execution tool with sandboxing and permission controls | Use allowlist for dangerous commands, exec with timeout, non-root user, working directory restrictions, command sanitization |
| MCP-06 | System requires authentication for all MCP requests (no anonymous access) | Use existing Auth.js session in middleware, return 401 for unauthenticated requests |
| MCP-07 | System binds MCP server to localhost by default (not externally exposed) | Next.js API routes only bind to localhost by default in Next.js deployment |
| MCP-08 | System validates and sanitizes all inputs to MCP tools | Zod schema validation on input sanitization for command arguments, path validation |
| MCP-09 | System never runs MCP tools with root privileges | Process never runs as root, drop privileges before exec, run with limited user permissions |
| SKILL-01 | System provides predefined skills for common tasks | Use skill decorator pattern with @skill metadata, implement file processing, data analysis, web search skills |
| SKILL-02 | Users can create custom skills through UI or configuration files | TypeScript functions in src/skills/, auto-discovery via file system scan, metadata extraction |
| SKILL-03 | System supports skill orchestration for combining multiple skills in sequence | Skill executor with sequential invocation, state passing between skills, error recovery |
| SKILL-04 | System implements skill execution with action budgets and approval gates | Per-session action counter, approval gate decorator for destructive operations, timeout handling |
| SKILL-05 | System requires human approval for destructive operations | Inline approval component in chat, approval state machine, audit logging of approvals |
| SKILL-06 | System provides skill discovery and browsing interface | Sidebar skills panel component, skill list with descriptions, invoke buttons |
| SKILL-07 | System supports skill versioning and dependency management | Semantic versioning in skill metadata, dependency resolution, version compatibility checks |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @modelcontextprotocol/sdk | 1.27.1 | Official MCP TypeScript SDK | Industry standard, handles JSON-RPC 2.0, HTTP transport, tools/resources/prompts |
| zod | 3.25.76 | Schema validation | Already in project, validates MCP tool inputs and skill parameters |
| reflect-metadata | 0.2.2 | Decorator metadata support | Enables @skill decorator pattern for function metadata extraction |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| @modelcontextprotocol/server-zod | latest | MCP server with Zod validation | Alternative to raw SDK, Zod for tool schemas |
| @modelcontextprotocol/client-zod | latest | MCP client with Zod validation | Alternative to raw SDK, Zod for client schemas |
| child_process | Node.js built-in | Bash execution | Required for MCP-05 bash tool implementation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------| -----------|----------|
| Manual JSON-RPC implementation | @modelcontextprotocol/sdk | Official SDK handles protocol details, edge cases, transport negotiation |
| YAML-based skill configs | TypeScript decorators | Lose type safety, IDE support, runtime validation |
| Database skill storage | Code-first approach | Simpler deployment, version control via git |

**Installation:**
```bash
npm install @modelcontextprotocol/sdk zod reflect-metadata
# or
npm install --save-dev @modelcontextprotocol/server-zod @modelcontextprotocol/client-zod
# Optional: for Zod validation
```

**Version verification:**
- @modelcontextprotocol/sdk: 1.27.1 (verified 2026-03-24)
- zod: 3.25.76 (in project, verified)
- reflect-metadata: 0.2.2 (verified 2026-03-24)

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/mcp/                    # MCP HTTP endpoints
│   ├── route.ts               # Main MCP endpoint (JSON-RPC handler)
│   └── tools/
│       └── route.ts            # Tools API endpoint
├── lib/
│   ├── mcp/                  # MCP core implementation
│   │   ├── server.ts           # McpServer instance, transport setup
│   │   ├── registry.ts         # Tools, resources, prompts registries
│   │   └── session.ts            # Per-session tool isolation
│   ├── skills/                # Skills system
│   │   ├── decorator.ts          # @skill decorator and metadata extraction
│   │   ├── executor.ts          # Skill execution engine
│   │   ├── discovery.ts          # Auto-discovery from skill files
│   │   └── types.ts              # Skill types and interfaces
│   └── approval/                # Approval flow
│       ├── component.tsx        # Inline approval UI component
│       ├── state.ts              # Approval state machine
│       └── hooks.ts              # Approval hooks
├── components/
│   └── sidebar/
│       └── skills-panel.tsx       # Skills discovery sidebar panel
```

### Pattern 1: MCP HTTP Transport in Next.js
**What:** Integrate MCP server as HTTP endpoints within Next.js App Router
**When to use:** When embedding MCP into existing Next.js application with authentication
**Example:**
```typescript
// Source: https://github.com/modelcontextprotocol/typescript-sdk
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/server-sse.js";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

// Create session-scoped MCP server
function createMcpServer(sessionId: string) {
  const server = new McpServer(
    { name: "next-mind-mcp", version: "1.0.0" },
    { capabilities: { tools: {}, resources: {}, prompts: {} } }
  );

  // Store in session registry for isolation
  mcpSessionRegistry.set(sessionId, server);

  return server;
}

// API Route Handler
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId } = body;

  // Get or create session-scoped server
  const server = mcpSessionRegistry.get(sessionId) ||
    createMcpServer(sessionId);

  // Create SSE transport for HTTP
  const transport = new SSEServerTransport("/api/mcp/message");
  await server.connect(transport);

  // Handle JSON-RPC message
  const response = await server.handleRequest(body);
  return NextResponse.json(response);
}
```

### Pattern 2: Skill Decorator with Metadata
**What:** TypeScript decorator for attaching metadata to skill functions
**When to use:** Defining skills with rich metadata and type safety
**Example:**
```typescript
// Source: Based on reflect-metadata pattern
import 'reflect-metadata';

const SKILL_METADATA_KEY = Symbol('skill:metadata');

export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  inputSchema: Record<string, unknown>;
  requiresApproval: boolean;
  destructiveActions: string[];
  dependencies: string[];
}

export function skill(metadata: SkillMetadata) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(SKILL_METADATA_KEY, metadata, target, propertyKey);
    return descriptor;
  };
}

// Usage in skill file
export class FileProcessingSkills {
  @skill({
    id: 'file-read',
    name: 'Read File',
    description: 'Read content from a file',
    version: '1.0.0',
    category: 'file',
    tags: ['file', 'read'],
    inputSchema: { path: { type: 'string' } },
    requiresApproval: false,
    destructiveActions: [],
    dependencies: [],
  })
  async readFile(path: string): Promise<string> {
    // Implementation
  }
}
```

### Pattern 3: Inline Approval Flow
**What:** Approval prompts embedded in chat message stream
**When to use:** Destructive operations requiring user confirmation
**Example:**
```typescript
// Source: UX pattern from AG-UI protocol
interface ApprovalRequest {
  id: string;
  toolName: string;
  action: string;
  details: string;
  status: 'pending' | 'approved' | 'rejected';
}

// In chat message component
function ApprovalPrompt({ request, onApprove, onReject }: {
  request: ApprovalRequest;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="approval-prompt">
      <p>{request.action}</p>
      <p className="details">{request.details}</p>
      <div className="buttons">
        <button onClick={onApprove}>Approve</button>
        <button onClick={onReject}>Cancel</button>
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Using `child_process.exec` with unsanitized input**: Leads to command injection. Always use `execFile` with explicit arguments.
- **Global MCP server instance**: Breaks per-session isolation. Create per-session servers.
- **Running tools as root**: Security risk. Drop privileges with `process.setuid` or use containerization.
- **Storing skills in database**: Version control nightmare. Use code-first approach with TypeScript files.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON-RPC 2.0 protocol | Custom JSON-RPC parser | @modelcontextprotocol/sdk | Edge cases (batch requests, notifications, error codes), protocol compliance |
| Tool input validation | Custom validation logic | Zod schemas in tool definitions | Schema evolution, type safety, auto-generated documentation |
| Skill metadata storage | Custom metadata format | reflect-metadata decorators | IDE support, type inference, compile-time validation |
| Bash command execution | Direct `exec` calls | Sandboxed executor with allowlist | Command injection prevention, privilege restriction, audit logging |
| Session tool isolation | Global tool registry | Map-based session registry | Concurrent user support, state isolation, memory cleanup |

**Key insight:** MCP protocol and skill orchestration have many edge cases. Using official SDK and established patterns prevents subtle bugs and security vulnerabilities.

## Common Pitfalls

### Pitfall 1: Command Injection in Bash Tool
**What goes wrong:** Passing unsanitized user input to `child_process.exec` allows arbitrary command execution
**Why it happens:** String interpolation in command strings bypasses quoting
**How to avoid:** Use `execFile` with explicit argument array, never interpolate user input into commands
**Warning signs:** Any code that looks like `exec(\`run \${userInput}\`)` is vulnerable

### Pitfall 2: Session State Leakage
**What goes wrong:** Tools in one session accessing or modifying another session's state
**Why it happens:** Global tool registry without session scoping
**How to avoid:** Create per-session MCP server instances with isolated tool registries
**Warning signs:** Single `McpServer` instance shared across requests

### Pitfall 3: DNS Rebinding Attacks (HTTP Transport)
**What goes wrong:** Malicious websites making requests to local MCP server
**Why it happens:** HTTP servers without origin validation accept cross-site requests
**How to avoid:** Validate Origin header, use @modelcontextprotocol/sdk v1.24.0+ which enables DNS rebinding protection by default
**Warning signs:** MCP server accepting requests without Origin validation

### Pitfall 4: Skill Discovery Race Conditions
**What goes wrong:** Skills modified while being executed, causing inconsistent behavior
**Why it happens:** Hot-reloading skill files without version locking
**How to avoid:** Cache skill metadata at startup, implement skill versioning, use atomic updates
**Warning signs:** File system watcher triggering skill reload during execution

## Code Examples

### MCP Server with HTTP Transport (Next.js API Route)
```typescript
// Source: https://github.com/modelcontextprotocol/typescript-sdk
// src/app/api/mcp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getMcpServer } from '@/lib/mcp/server';
import { logAudit, getClientInfo } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Get session-scoped MCP server
  const server = await getMcpServer(session.user.id);

  // Handle JSON-RPC request
  const response = await server.handleRequest(body);

  // Audit log tool invocations
  if (body.method === 'tools/call') {
    await logAudit({
      userId: session.user.id,
      action: 'tool_invocation',
      resource: 'mcp_tool',
      resourceId: body.params?.name,
      metadata: { arguments: body.params?.arguments },
      ...getClientInfo(request),
    });
  }

  return NextResponse.json(response);
}
```

### Bash Execution with Sandboxing
```typescript
// Source: Security best practices for MCP tools
// src/lib/mcp/tools/bash.ts
import { execFile } from 'child_process';
import { z } from 'zod';

const ALLOWED_COMMANDS = [
  'ls', 'cat', 'head', 'tail', 'grep', 'find', 'wc', 'echo',
  'mkdir', 'touch', 'rm', 'cp', 'mv',
] as const;

const DANGEROUS_PATTERNS = [
  /;\s*\|\|/,  // Command chaining
  /\$\(/,     // Command substitution
  /\$\{/,     // Variable expansion
  /\|/,       // Pipes (unless explicitly allowed)
  />/,       // Redirects
  /`/,       // Command substitution
];

const InputSchema = z.object({
  command: z.enum(ALLOWED_COMMANDS),
  args: z.array(z.string()).max(10),
  timeout: z.number().min(1000).max(30000).default(5000),
});

export async function executeBash(input: unknown) {
  const { command, args, timeout } = InputSchema.parse(input);

  // Additional sanitization
  for (const arg of args) {
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(arg)) {
        throw new Error(`Potentially dangerous argument: ${arg}`);
      }
    }
  }

  return new Promise((resolve, reject) => {
    const proc = execFile(
      command,
      args,
      {
        timeout,
        cwd: process.cwd(),
        env: { ...process.env, PATH: process.env.PATH },
        uid: parseInt(process.env.MCP_UID || '1000'),
        gid: parseInt(process.env.MCP_GID || '1000'),
      },
      (error, stdout, stderr) => {
        if (error) {
          reject({ error: error.message, stderr });
        } else {
          resolve({ stdout, stderr });
        }
      }
    );
  });
}
```

### Skill Decorator Implementation
```typescript
// Source: TypeScript decorator pattern with reflect-metadata
// src/lib/skills/decorator.ts
import 'reflect-metadata';

export const SKILL_METADATA_KEY = Symbol('skill:metadata');

export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  inputSchema: Record<string, z.ZodTypeAny>;
  requiresApproval: boolean;
  destructiveActions: string[];
  dependencies: string[];
  timeout: number;
}

export function skill(metadata: SkillMetadata) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    Reflect.defineMetadata(SKILL_METADATA_KEY, metadata, target, propertyKey);
    return {
      ...descriptor,
      value: async function (this: unknown, ...args: unknown[]) {
        const skillMeta = Reflect.getMetadata(SKILL_METADATA_KEY, target, propertyKey);

        // Check approval requirement
        if (skillMeta.requiresApproval) {
          const approval = await requestApproval(skillMeta, args);
          if (!approval.granted) {
            throw new Error(`Skill ${metadata.name} requires approval: ${approval.reason}`);
          }
        }

        // Execute skill
        return descriptor.value.apply(this, args);
      },
    };
  };
}
```

### Inline Approval Component
```typescript
// Source: UX pattern for inline chat approval
// src/components/chat/approval-prompt.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ApprovalPromptProps {
  skillName: string;
  action: string;
  details: string;
  onApprove: () => void;
  onReject: () => void;
}

export function ApprovalPrompt({
  skillName,
  action,
  details,
  onApprove,
  onReject,
}: ApprovalPromptProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await onApprove();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="approval-prompt border rounded-lg p-4 my-2 bg-amber-50 dark:bg-amber-950/30">
      <div className="flex items-start gap-2">
        <span className="text-amber-600 text-sm font-medium">
          Approval Required
        </span>
      </div>
      <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-2">
        <strong>{skillName}:</strong> {action}
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
        {details}
      </p>
      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          variant="outline"
          onClick={onReject}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleApprove}
          disabled={isLoading}
        >
          {isLoading ? 'Approving...' : 'Approve'}
        </Button>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|-------|
| stdio MCP transport | HTTP/SSE transport | 2024-11-05 spec | Enables remote servers, web clients, better error handling |
| YAML skill configs | TypeScript decorators | 2025+ trend | Type safety, IDE support, runtime validation |
| Global tool registry | Session-scoped registries | MCP best practice | Multi-tenancy isolation, per-user state |
| Running tools as root | Non-root user execution | Security best practice | Reduces attack surface |

**Deprecated/outdated:**
- **node-vm sandbox**: Multiple CVEs in 2024-2025 show VM sandboxes are escapable. Use process isolation instead.
- **Direct child_process.exec**: Too dangerous. Use execFile with explicit arguments.

## Open Questions

1. **Skill Version Migration Strategy**
   - What we know: Skills have semantic versioning in metadata
   - What's unclear: How to handle breaking changes when skills are updated
   - Recommendation: Use semver versioning, require explicit version bumps for breaking changes, maintain backward compatibility for patch versions

2. **MCP Session Cleanup**
   - What we know: Per-session MCP servers are created for isolation
   - What's unclear: When to clean up idle sessions
   - Recommendation: Implement session timeout (30 minutes idle), cleanup on logout, periodic sweep

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | vitest.config.ts (root) |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test:coverage` |
| E2E command | `npm run test:e2e` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MCP-01 | JSON-RPC 2.0 compliance | unit | `vitest tests/lib/mcp/protocol.test.ts` | Wave 0 |
| MCP-02 | Tools registry operations | unit | `vitest tests/lib/mcp/registry.test.ts` | Wave 0 |
| MCP-03 | Resources manager operations | unit | `vitest tests/lib/mcp/resources.test.ts` | Wave 0 |
| MCP-04 | Prompts templates operations | unit | `vitest tests/lib/mcp/prompts.test.ts` | Wave 0 |
| MCP-05 | Bash execution sandboxing | unit | `vitest tests/lib/mcp/tools/bash.test.ts` | Wave 0 |
| MCP-06 | MCP authentication | integration | `vitest tests/integration/mcp-auth.test.ts` | Wave 0 |
| MCP-07 | Localhost binding | unit | `vitest tests/lib/mcp/server.test.ts` | Wave 0 |
| MCP-08 | Input validation | unit | `vitest tests/lib/mcp/validation.test.ts` | Wave 0 |
| MCP-09 | Non-root execution | unit | `vitest tests/lib/mcp/tools/bash.test.ts` | Wave 0 |
| SKILL-01 | Predefined skills execution | unit | `vitest tests/lib/skills/predefined.test.ts` | Wave 0 |
| SKILL-02 | Custom skill creation | unit | `vitest tests/lib/skills/custom.test.ts` | Wave 0 |
| SKILL-03 | Skill orchestration | unit | `vitest tests/lib/skills/orchestration.test.ts` | Wave 0 |
| SKILL-04 | Action budgets and approval gates | unit | `vitest tests/lib/skills/approval.test.ts` | Wave 0 |
| SKILL-05 | Destructive operation approval | integration | `vitest tests/integration/skill-approval.test.ts` | Wave 0 |
| SKILL-06 | Skill discovery interface | unit | `vitest tests/components/skills-panel.test.tsx` | Wave 0 |
| SKILL-07 | Skill versioning | unit | `vitest tests/lib/skills/versioning.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --run` (quick unit tests only)
- **Per wave merge:** `npm test:coverage` (full coverage)
- **Phase gate:** Full suite green + E2E tests passing before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/lib/mcp/protocol.test.ts` - JSON-RPC 2.0 protocol compliance
- [ ] `tests/lib/mcp/registry.test.ts` - Tools/resources/prompts registry
- [ ] `tests/lib/mcp/tools/bash.test.ts` - Bash sandboxing and command injection prevention
- [ ] `tests/lib/mcp/server.test.ts` - Session-scoped server creation
- [ ] `tests/lib/mcp/validation.test.ts` - Input validation with Zod schemas
- [ ] `tests/lib/skills/decorator.test.ts` - Skill decorator metadata extraction
- [ ] `tests/lib/skills/executor.test.ts` - Skill execution engine
- [ ] `tests/lib/skills/discovery.test.ts` - Auto-discovery from skill files
- [ ] `tests/lib/skills/approval.test.ts` - Approval gate logic
- [ ] `tests/components/skills-panel.test.tsx` - Skills sidebar panel
- [ ] `tests/components/approval-prompt.test.tsx` - Inline approval component
- [ ] `tests/integration/mcp-auth.test.ts` - MCP authentication integration
- [ ] `tests/integration/skill-approval.test.ts` - End-to-end skill approval flow
- [ ] `tests/lib/mcp/resources.test.ts` - Resources manager
- [ ] `tests/lib/mcp/prompts.test.ts` - Prompts templates
- [ ] `tests/lib/skills/predefined.test.ts` - Predefined skills
- [ ] `tests/lib/skills/custom.test.ts` - Custom skill creation
- [ ] `tests/lib/skills/orchestration.test.ts` - Skill orchestration
- [ ] `tests/lib/skills/versioning.test.ts` - Version compatibility

*(Framework install: Already have Vitest 4.1.1 and Playwright 1.58.2)*

## Sources

### Primary (HIGH confidence)
- https://github.com/modelcontextprotocol/typescript-sdk - Official MCP TypeScript SDK implementation, HTTP transport, server/client patterns
- https://modelcontextprotocol.io/specification/2024-11-05 - MCP protocol specification, JSON-RPC 2.0 requirements
- https://modelcontextprotocol.io/docs/concepts/tools - Tools concept documentation, best practices, security considerations

### Secondary (MEDIUM confidence)
- https://modelcontextprotocol.io/docs/tools/inspector - MCP Inspector for testing and debugging
- https://www.typescriptlang.org/docs/handbook/decorators.html - TypeScript decorator documentation
- https://docs.ag-ui.com/concepts/tools - AG-UI tool approval patterns

### Tertiary (LOW confidence)
- https://www.reddit.com/r/AgentsOfAI/comments/1lqod3e/how_are_you_guys_actually_handling_human_approval/ - Community discussion on approval patterns (needs validation)
- https://medium.com/@poojaauma/how-to-build-an-ai-agent-that-asks-for-permission-human-in-the-loop-ai-with-google-adk-ddd67e664a8f - Tutorial on approval flows (verify against official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official MCP SDK, Zod already in project
- Architecture: HIGH - Based on official MCP patterns, established decorator patterns
- Pitfalls: HIGH - Multiple CVEs documented in 2024-2025, official security guidance available

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (30 days - MCP protocol stable, SDK actively maintained)
