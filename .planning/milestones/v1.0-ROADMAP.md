---
## Phase

 Phase 2: Tool Integration
**Plans:**
- [ ] 02-01: MCP server with JSON-RPC 2.0, session management, and tool registry (Wave 1, depends on: [02-01]
- [ ] 02-02: MCP Resources manager and and prompts templates (Wave 2, depends on: [02-01]
- [ ] 02-03: Skills system with decorator, executor, discovery, and predefined skills (Wave 2, depends on: [02-04, for verification, approval flow, (Wave 3)

- [ ] 02-04: Approval flow and skills discovery sidebar panel (Wave 4, depends on: [02-04]
- [ ] 02-05] MCP tool integration and for skills.
  - Approval flow with sidebar (Wave 4)

- Split 02-04 into 3 plans:
 and 02-05b plans now have which task they taught from the and why. Let me proceed with executing..
</structured_returns>After completing all verification and: plan back to I. Next step.

1. Run `/gsd:execute-phase 02` to verify no issues remain.
 then continue with remaining phases.
2. For committing changes.

 next phase.
3. The about whether the exist.

     </structured_returns> after making any changes.

<revision_context>
<checker issues>
1. **Plan 02-04 Scope Sanity** - Split into 2-3 plans (02-04a, 02-04b) and with clear wave dependencies
2. **Parallel route.ts modification warning** - add explicit dependency in plan frontmatter

2. **Plan 02-03 depends on: ["02-01", "02-02"]** otherwise sequential execution causes quality degradation due to larger context budget and file conflicts.

2. **Dependency correctness (02-02 and 02-03) depends on: [02-01, "02-01"]`
**Why:** Plan 02-03 adds `depends_on: ["02-01", "02-02"]`.
** }
[task 3: Task 1 touches `src/app/api/mcp/route.ts` which has the changes. I next task will come after adding the to make it more concrete.

 if needed.
 I will apply them in parallel. They like about.


- Add explicit dependency: `depends_on: ["02-01", "02-02"]` in plan frontmatter
- Plan 02-03: update `depends_on` from `["02-02"]` and: understand the like "how they interact and why the split is better
 scope
- Plan 02-03 now has 5 tasks with 10 files, which may exceed context budget
- plan 02-03 has 3 tasks. The original 02-04 had 5 tasks too complex. so verify if scope should splitting.
 A checker feedback suggested splitting 02-04 into 02-04a and 02-04b) plans, which they all be infrastructure (decorator pattern, predefined skills, executor pattern)), 3 distinct concerns:

As a make this revision:
-by-piece:
1. **Plan 02-04** split** 02-04a (Wave 2) and 02-04b (Wave 3) — skill executor and later plans will to complete the in Wave 4.

2. **Task 1: Create skill types and decorator** from `02-04` now has 3 files and and 7 tests
   - Creates 3 predefined skills in `src/skills/`
   - Each skill decorated with @skill decorator
   - **Predefined skills** (src/skills/file-processing.ts, src/skills/data-analysis.ts, src/skills/web-search.ts) exist patterns from `src/lib/skills/discovery.ts`

   - **tests/lib/skills/decorator.test.ts, tests/lib/skills/predefined.test.ts tests/lib/skills/discovery.test.ts**

**Files modified:**
  - `src/lib/skills/types.ts`
  - `src/lib/skills/decorator.ts`
  - `src/skills/file-processing.ts`
  - `src/skills/data-analysis.ts`
  - `src/skills/web-search.ts`
  - `tests/lib/skills/decorator.test.ts`
  - `tests/lib/skills/predefined.test.ts`
  - `tests/lib/skills/discovery.test.ts`

**Plan frontmatter:**
```yaml
phase: 02-tool-integration
plan: 04
type: execute
wave: 2
depends_on: [02-01]
files_modified:
  - src/lib/skills/types.ts
  - src/lib/skills/decorator.ts
  - src/skills/file-processing.ts
  - src/skills/data-analysis.ts
  - src/skills/web-search.ts
  - tests/lib/skills/decorator.test.ts
          tests/lib/skills/predefined.test.ts
          tests/lib/skills/discovery.test.ts
autonomous: true
requirements: [SKILL-01, SKILL-02, SKILL-07]
must_haves:
  truths:
    - "User can invoke predefined skills through conversation"
    - "User can create custom skills as TypeScript files"
    - "Skills have version metadata for compatibility tracking"
    - "Predefined skills exist for file processing, data analysis, and web search"
  - "Skills are auto-discovered from `src/skills/` directory"
  - "User can see existing messages on resource read/write"
 - "User can see prompts list"
  - "User can invoke skills directly from sidebar"
  - "AI can execute multiple skills in sequence"
  - "Skill execution respects skill timeout"
    - "Skills are auto-discovered from `src/skills/` directory
    - "Skills have version metadata for compatibility tracking"
  - "All skills have valid semver versions"
    - "Predefined skills exist for common tasks (file processing, data analysis, web search)
  - "Predefined skills are auto-discovered from src/skills/ directory"
    - "Each skill decorated with @skill decorator"
    - "Skills are versioned for compatibility tracking"

    - "User can create custom skills through UI or configuration files"
  artifacts:
    - path: "src/lib/skills/types.ts"
      provides: "Type definitions for skills system"
      exports: ["Skill", "SkillContext", "SkillResult"]
    - path: "src/lib/skills/decorator.ts"
      provides: "@skill decorator for attaching metadata to functions"
      exports: ["skill", "SkillMetadata", "SKILL_METADATA_KEY"]
    - path: "src/skills/file-processing.ts"
      provides: "Predefined file processing skills"
      contains: "@skill"
    - path: "src/skills/data-analysis.ts"
      provides: "Predefined data analysis skills"
      contains: "@skill"
    - path: "src/skills/web-search.ts"
      provides: "Predefined web search skills"
      contains: "@skill"
  key_links:
    - from: "src/lib/skills/executor.ts"
      to: "src/lib/skills/discovery.ts"
      via: "getSkillMetadata"
      pattern: "getSkillMetadata"
    - from: "src/lib/skills/discovery.ts"
      to: "src/skills/*.ts"
      via: "file system scan"
      pattern: "import.*skill"
    - from: "src/lib/skills/executor.ts"
      to: "src/lib/mcp/registry.ts"
      via: "registering skills as MCP tools"
      pattern: "registerTool"
---

<objective>
Implement the skill types, TypeScript decorator-based metadata, skill executor with orchest support, auto-discovery from skill files and register skills with MCP.

Purpose: Enable code-first skill definitions with type safety and IDE support, automatic discovery and sequential execution.
Output: Working skills system with predefined skills for file, data analysis, and web operations.
</objective>

<execution_context>
@/Users/xavier/.claude/get-shit-done/workflows/execute-plan.md
@/Users/xavier/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/02-tool-integration/02-RESEARCH.md

<interfaces>
<!-- Types from 02-01 that this plan depends on -->

From src/lib/mcp/types.ts:
```typescript
export interface McpTool {
  name: string;
  description: string;
  inputSchema: ZodSchema;
  handler: (args: unknown) => Promise<McpToolCallResult>;
}
export interface McpToolCallResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}
```
export function createMcpServer(sessionId: string): McpServer;
```
 From "@modelcontextprotocol/sdk/server/mcp.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ListPromptsRequestSchema, GetPromptRequestSchema } from "@modelcontextprotocol/sdk/types.js";
```

From zod:
``` import { z } from 'zod';
import 'reflect-metadata';
// Reflect.defineMetadata(key, value, target, propertyKey)
// Reflect.getMetadata(key, target, propertyKey)
```

</interfaces>
</context>
<tasks>
<task type="auto" tdd="true">
  <name>Task 1: Create skill types and decorator</name>
  <files>src/lib/skills/types.ts, src/lib/skills/decorator.ts, tests/lib/skills/decorator.test.ts</files>
  <read_first>
    - .planning/phases/02-tool-integration/02-RESEARCH.md (decorator pattern)
    - src/lib/mcp/types.ts (McpTool for conversion)
  </read_first>
  <behavior>
    - Test 1: @skill decorator attaches metadata to function
    - Test 2: getSkillMetadata extracts metadata from decorated function
    - Test 3: SkillMetadata contains all required fields (id, name, version, etc.)
    - Test 4: Skill with requiresApproval=true is marked appropriately
    - Test 5: Version validation checks semver format
  </behavior>
  <action>
    Create src/lib/skills/types.ts with:

    1. SkillMetadata interface:
       - id: string (unique identifier, e.g., "file-read")
       - name: string (display name)
       - description: string
       - version: string (semver, e.g., "1.0.0")
       - category: 'file' | 'data' | 'web' | 'system' | 'custom'
       - tags: string[]
       - inputSchema: Record<string, z.ZodTypeAny>
       - requiresApproval: boolean
       - destructiveActions: string[] (e.g., ["delete", "overwrite"])
       - dependencies: string[] (skill IDs this depends on)
       - timeout: number (ms, default 30000)

    2. SkillContext interface:
       - userId: string
       - sessionId: string
       - conversationId?: string
       - previousResults: Map<string, SkillResult>

    3. SkillResult interface:
       - success: boolean
       - data?: unknown
       - error?: string
       - metadata?: Record<string, unknown>

    4. SkillFunction type:
       - (input: unknown, context: SkillContext) => Promise<SkillResult>

    create src/lib/skills/decorator.ts with:

    1. SKILL_METADATA_KEY = Symbol('skill:metadata')

    2. skill(metadata: SkillMetadata) decorator function:
       - Validate version is semver format (regex: /^\d+\.\d+\.\d+$/)
       - Return function that calls Reflect.defineMetadata(SKILL_METADATA_KEY, metadata, target, propertyKey)
       - Wrap original function to add approval check if requiresApproval=true

    3. getSkillMetadata(target: unknown, propertyKey: string): SkillMetadata | undefined
       - Return Reflect.getMetadata(SKILL_METADATA_KEY, target, propertyKey)

    4. skillToMcpTool(skillFn: SkillFunction, metadata: SkillMetadata): McpTool
       - Convert skill to MCP tool format
       - Create Zod schema from inputSchema record
       - Wrap handler to use SkillContext
    Export all types and functions.
  </action>
  <verify>
    <automated>npm test -- --run tests/lib/skills/decorator.test.ts</automated>
  </verify>
  <done>
    - src/lib/skills/types.ts exports SkillMetadata, SkillContext, SkillResult, SkillFunction
    - src/lib/skills/decorator.ts exports skill decorator, getSkillMetadata, skillToMcpTool
    - Tests pass: decorator attaches metadata, extraction works
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create predefined skills</name>
  <files>src/skills/file-processing.ts, src/skills/data-analysis.ts, src/skills/web-search.ts, tests/lib/skills/predefined.test.ts</files>
  <read_first>
    - src/lib/skills/types.ts (SkillMetadata, SkillFunction, SkillResult)
    - src/lib/skills/decorator.ts (skill decorator)
  </read_first>
  <behavior>
    - Test 1: file-read skill reads file content
    - Test 2: file-list skill lists directory contents
    - Test 3: data-analyze skill performs basic analysis (count, sum, avg)
    - Test 4: data-transform skill transforms data format
    - Test 5: web-search skill returns search results (mocked)
    - Test 6: All skills have valid metadata with version
  </behavior>
  <action>
    Create src/skills/file-processing.ts with:

    1. FileProcessingSkills class with decorated methods:

       @skill({
         id: 'file-read',
         name: 'Read File',
         description: 'Read content from a file',
         version: '1.0.0',
         category: 'file',
         tags: ['file', 'read'],
         inputSchema: { path: z.string() },
         requiresApproval: false,
         destructiveActions: [],
         dependencies: [],
         timeout: 10000,
       })
       async readFile(input: { path: string }, context: SkillContext): Promise<SkillResult>
         - Validate path exists
         - Read file content with fs.readFile
         - Return { success: true, data: content }

       @skill({
         id: 'file-list',
         name: 'List Files',
         description: 'List files in a directory',
         version: '1.0.0',
         category: 'file',
         tags: ['file', 'list', 'directory'],
         inputSchema: { path: z.string(), pattern: z.string().optional() },
         requiresApproval: false,
         destructiveActions: [],
         dependencies: [],
         timeout: 10000
       })
       async listFiles(input: { path: string; pattern?: string }, context: SkillContext): Promise<SkillResult>
         - Validate path exists and is not empty
         - Use fs.readdir to list files
         - Return { success: true, data: files.map(f => ({ name, file.name }) => ({ name, file.name, size: file.size, file.isDirectory })

         - Validate pattern is included (not just listing all files)
 vs placeholder)
         - Return { success: true, data: { count, sum, avg, min, max } }

 format }
       - If pattern provided, transform data format
        - Example: JSON to CSV, { name, rows } headers: ['name', 'data']
 } }

         return { success: true, data: results.map(row => ({ name, file.name, size, file.size }) => ({ name, rows[0].map(row => ({ name: file.name, size, file.size })
 => ({ name: file.name, size }) => format(fileFormat)
 transformations

         - Validate input data against skill's inputSchema
         - Execute skill with timeout wrapper
         - Log execution to audit
         - Return result
       } catch (error) {
         return { success: false, isError: true, error: error.message }
       }

       @skill({
         id: 'data-analyze',
         name: 'Analyze Data',
         description: 'Perform basic statistical analysis on data',
         version: '1.0.0',
         category: 'data',
         tags: ['data', 'analysis', 'statistics'],
         inputSchema: { data: z.array(z.number()), operations: z.array(z.enum(['count', 'sum', 'avg', 'min', 'max'])) },
         requiresApproval: false
         destructiveActions: []
         dependencies: []
         timeout: 5000
       })
       async analyzeData(input: { data: number[]; operations: string[] }, context: SkillContext): Promise<SkillResult>
         - Perform requested operations on data
         - Return { success: true, data: { count, sum, avg, min, max } }

       @skill({
         id: 'data-transform',
         name: 'Transform Data',
         description: 'Transform data between formats (JSON, CSV, etc.)',
         version: '1.0.0',
         category: 'data',
         tags: ['data', 'transform', 'format'],
         inputSchema: { data: z.unknown(), fromFormat: z.enum(['json', 'csv']), toFormat: z.enum(['json', 'csv']).default('json') },
         requiresApproval: false
         destructiveActions: []
         dependencies: []
         timeout: 5000
       })
       async transformData(input: { data: unknown; fromFormat: z.enum(['json', 'csv']), toFormat: z.enum(['json', 'csv']) }, context: SkillContext): Promise<SkillResult>
         - If format === 'csv', {
           const result = data.map(row => ({ name: file.name, size: file.size }) => ({ name, file.name, size })
         return { success: true, data: { name: file.name, size: file.size, file.size } rows, rows[0]
         }
         - If format === 'csv', {
           const headers = ['name', 'data']
           data.push(`format: ${format}`)
         }({ type: 'text', text: result.content })
       }
     }

     // Use fetch to call search API (or mock for now)
     - Use fetch to call search API (or mock for now)
         - Return { success: true, data: results }

       @skill({
         id: 'web-search',
         name: 'Web Search',
         description: 'Search the web for information',
         version: '1.0.0',
         category: 'web',
         tags: ['web', 'search', 'information'],
         inputSchema: { query: z.string(), maxResults: z.number().max(10).default(5) }
         requiresApproval: false
         destructiveActions: []
         dependencies: []
         timeout: 15000
       })
       async searchWeb(input: { query: string; maxResults?: number }, context: SkillContext): Promise<SkillResult>
         - Use fetch to call search API (or mock for now)
         - Return { success: true, data: results }

    Export instance.
  </action>
  <verify>
    <automated>npm test -- --run tests/lib/skills/predefined.test.ts</automated>
  </verify>
  <done>
    - src/skills/file-processing.ts exports fileSkills with read and list methods
    - src/skills/data-analysis.ts exports dataSkills with analyze and transform methods
    - src/skills/web-search.ts exports webSkills with search method
    - All skills decorated with valid metadata
    - Tests pass for all predefined skills
  </done>
</task>

</tasks>

<verification>
After completing all tasks:
1. Run `npm test -- --run tests/lib/skills/decorator.test.ts tests/lib/skills/predefined.test.ts` - all tests pass
2. Run `npm run build` - TypeScript compiles without errors
3. Verify predefined skills exist in src/skills/ directory with @skill decorators
4. Verify decorator pattern in decorator.ts works correctly
    - Check src/lib/skills/types.ts exports all interfaces
    - Check src/lib/skills/decorator.ts for skill decorator and getSkillMetadata
    - All files in src/skills directory use @skill decorator
    - Ensure skill files have valid semver version
</verification>

<success_criteria>
- Skill decorator attaches metadata to TypeScript functions
- Predefined skills for file, data, and web operations
- All skills have valid semver versions
- Requirements SKILL-01, SKILL-02, SKILL-07 satisfied
- All tests pass
</success_criteria>

<output>
After completion, create `.planning/phases/02-tool-integration/02-04-SUMMARY.md`
</output>
