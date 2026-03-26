/**
 * Task Decomposition Engine
 *
 * This module provides the decomposeTask function that breaks down complex
 * user requests into sequential subtasks assigned to appropriate agent types.
 *
 * Key components:
 * - decomposeTask: Main function that orchestrates task decomposition
 * - buildSkillCatalog: Creates skill catalog string for LLM context
 * - DECOMPOSITION_SYSTEM_PROMPT: System prompt for the decomposition LLM
 */
import { z } from 'zod';
import { logAudit } from '@/lib/audit';
import { discoverSkills, type DiscoveredSkill } from '@/lib/skills/discovery';
import { streamChat } from '@/lib/llm';
import type { AgentType, Subtask, DecompositionResult, SubtaskWithDeps, DecompositionResultWithDeps } from './types';

/**
 * Input for the decomposeTask function
 */
export interface DecomposePrompt {
  /** The user's original request/task description */
  userRequest: string;
  /** Optional conversation ID for context */
  conversationId?: string;
  /** User ID for audit logging */
  userId: string;
  /** Session ID for audit logging */
  sessionId: string;
  /** Model ID to use for decomposition (default: qwen-plus) */
  modelId?: string;
}

/**
 * Schema for validating DecompositionResult from LLM
 */
const SubtaskSchema = z.object({
  agentType: z.enum(['file', 'search', 'code', 'custom']),
  skillId: z.string(),
  input: z.record(z.unknown()),
  description: z.string().optional(),
});

const DecompositionResultSchema = z.object({
  tasks: z.array(SubtaskSchema),
  reasoning: z.string().optional(),
  estimatedComplexity: z.enum(['low', 'medium', 'high']).optional(),
});

/**
 * System prompt for the task decomposition LLM.
 * Includes instructions for output format and rules.
 */
export const DECOMPOSITION_SYSTEM_PROMPT = `You are a task decomposition engine. Given a complex user request, break it down into sequential subtasks.

Available agent types:
- file: File operations (read, list, process documents)
- search: Web search and knowledge retrieval
- code: Code generation, review, refactoring tasks
- custom: User-defined specialized agent

Output a JSON object with this structure:
{
  "tasks": [
    {
      "agentType": "file" | "search" | "code" | "custom",
      "skillId": "exact-skill-id-from-catalog",
      "input": { ... skill-specific input ... },
      "description": "Human-readable task description"
    }
  ],
  "reasoning": "Why these subtasks are needed and in what order",
  "estimatedComplexity": "low" | "medium" | "high" (optional)
}

Rules:
1. Each task must map to exactly one existing skill from the provided skill catalog
2. Tasks should be ordered by dependency (earlier tasks provide context for later)
3. Keep decompositions minimal - prefer fewer tasks when possible
4. Use only skillIds that exist in the provided skill catalog
5. If a skillId is not found in the catalog, do not invent one - skip that task
6. Return an empty tasks array if no suitable skills are found

Output ONLY valid JSON. No markdown, no code blocks, no explanation outside the JSON.`;

/**
 * Build a skill catalog string from discovered skills.
 *
 * Creates a formatted list of available skills for the LLM context,
 * including skill ID, name, and description.
 *
 * @param skills - Array of discovered skills
 * @returns Formatted skill catalog string
 */
export function buildSkillCatalog(skills: DiscoveredSkill[]): string {
  if (skills.length === 0) {
    return 'No skills available.';
  }

  const skillLines = skills.map((skill) => {
    const { id, name, description, category } = skill.metadata;
    return `- ${id}: ${name} (${category}) - ${description}`;
  });

  return `Available Skills:\n${skillLines.join('\n')}`;
}

/**
 * Validate that all skillIds in the decomposition result exist in the skill registry.
 *
 * @param result - The decomposition result to validate
 * @param skillIds - Set of valid skill IDs
 * @throws Error if any skillId is invalid
 */
function validateSkillIds(
  result: DecompositionResult,
  skillIds: Set<string>
): void {
  for (const task of result.tasks) {
    if (!skillIds.has(task.skillId)) {
      throw new Error(
        `Invalid skillId "${task.skillId}" in decomposition. ` +
          `Valid skills: ${Array.from(skillIds).join(', ')}`
      );
    }
  }
}

/**
 * Parse the LLM response into a DecompositionResult.
 *
 * Handles various response formats including markdown code blocks.
 *
 * @param response - Raw LLM response string
 * @returns Parsed DecompositionResult
 * @throws Error if parsing fails
 */
function parseDecompositionResponse(response: string): DecompositionResult {
  let jsonStr = response.trim();

  // Handle markdown code blocks
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Remove any leading/trailing text that's not JSON
  const jsonStart = jsonStr.indexOf('{');
  const jsonEnd = jsonStr.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);
  }

  try {
    const parsed = JSON.parse(jsonStr);
    const validated = DecompositionResultSchema.parse(parsed);
    return {
      tasks: validated.tasks.map((t) => ({
        agentType: t.agentType as AgentType,
        skillId: t.skillId,
        input: t.input,
        description: t.description,
      })),
      reasoning: validated.reasoning,
      estimatedComplexity: validated.estimatedComplexity,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse decomposition response: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Decompose a user request into sequential subtasks.
 *
 * This function:
 * 1. Discovers available skills
 * 2. Builds a skill catalog for LLM context
 * 3. Calls the LLM to decompose the task
 * 4. Validates the decomposition result
 * 5. Logs the decomposition to audit
 *
 * @param prompt - The decomposition prompt containing user request and context
 * @returns The decomposition result with tasks and metadata
 * @throws Error if no skills are available or decomposition fails
 */
export async function decomposeTask(
  prompt: DecomposePrompt
): Promise<DecompositionResult> {
  const startTime = Date.now();

  // 1. Discover available skills
  const skills = discoverSkills();
  const skillIds = new Set(skills.map((s) => s.metadata.id));

  if (skills.length === 0) {
    throw new Error('No skills available for task decomposition');
  }

  // 2. Build skill catalog
  const skillCatalog = buildSkillCatalog(skills);

  // 3. Construct messages for LLM
  const systemPrompt = `${DECOMPOSITION_SYSTEM_PROMPT}

${skillCatalog}`;

  const messages = [
    {
      role: 'user' as const,
      content: `Decompose this task: ${prompt.userRequest}`,
    },
  ];

  // 4. Call LLM for decomposition
  let responseText = '';
  try {
    const stream = await streamChat({
      modelId: prompt.modelId ?? 'qwen-plus',
      messages,
      systemPrompt,
    });

    // Collect stream chunks
    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        responseText += chunk.text;
      }
    }
  } catch (error) {
    const errorMsg = `LLM call failed: ${
      error instanceof Error ? error.message : String(error)
    }`;
    await logAudit({
      userId: prompt.userId,
      action: 'task_decomposition_failed',
      resource: 'decomposition',
      metadata: {
        sessionId: prompt.sessionId,
        conversationId: prompt.conversationId,
        error: errorMsg,
        userRequest: prompt.userRequest,
      },
    });
    throw new Error(errorMsg);
  }

  // 5. Parse and validate response
  let result: DecompositionResult;
  try {
    result = parseDecompositionResponse(responseText);
  } catch (error) {
    await logAudit({
      userId: prompt.userId,
      action: 'task_decomposition_parse_failed',
      resource: 'decomposition',
      metadata: {
        sessionId: prompt.sessionId,
        conversationId: prompt.conversationId,
        error: error instanceof Error ? error.message : String(error),
        rawResponse: responseText,
        userRequest: prompt.userRequest,
      },
    });
    throw error;
  }

  // 6. Validate skill IDs
  try {
    validateSkillIds(result, skillIds);
  } catch (error) {
    await logAudit({
      userId: prompt.userId,
      action: 'task_decomposition_validation_failed',
      resource: 'decomposition',
      metadata: {
        sessionId: prompt.sessionId,
        conversationId: prompt.conversationId,
        error: error instanceof Error ? error.message : String(error),
        result,
        userRequest: prompt.userRequest,
      },
    });
    throw error;
  }

  // 7. Log successful decomposition
  const duration = Date.now() - startTime;
  await logAudit({
    userId: prompt.userId,
    action: 'task_decomposition',
    resource: 'decomposition',
    metadata: {
      sessionId: prompt.sessionId,
      conversationId: prompt.conversationId,
      taskCount: result.tasks.length,
      duration,
      reasoning: result.reasoning,
      complexity: result.estimatedComplexity,
      skillCatalogSize: skills.length,
    },
  });

  return result;
}

/**
 * Schema for subtask with dependencies
 */
const SubtaskWithDepsSchema = z.object({
  id: z.string(),
  agentType: z.enum(['file', 'search', 'code', 'custom']),
  skillId: z.string(),
  input: z.record(z.unknown()),
  description: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
});

/**
 * Schema for decomposition result with dependencies
 */
const DecompositionResultWithDepsSchema = z.object({
  tasks: z.array(SubtaskWithDepsSchema),
  dependencies: z.record(z.array(z.string())),
  reasoning: z.string().optional(),
  estimatedComplexity: z.enum(['low', 'medium', 'high']).optional(),
});

/**
 * System prompt for dependency-aware task decomposition.
 */
export const DECOMPOSITION_SYSTEM_PROMPT_WITH_DEPS = `You are a task decomposition engine. Given a complex user request, break it down into subtasks with dependency information.

Available agent types:
- file: File operations (read, list, process documents)
- search: Web search and knowledge retrieval
- code: Code generation, review, refactoring tasks
- custom: User-defined specialized agent

Output a JSON object with this structure:
{
  "tasks": [
    {
      "id": "task-1",
      "agentType": "file" | "search" | "code" | "custom",
      "skillId": "exact-skill-id-from-catalog",
      "input": { ... skill-specific input ... },
      "description": "Human-readable task description",
      "dependencies": []
    }
  ],
  "dependencies": {
    "task-1": [],
    "task-2": ["task-1"],
    "task-3": ["task-1"],
    "task-4": ["task-2", "task-3"]
  },
  "reasoning": "Why these subtasks are needed and their dependencies"
}

Rules:
1. Each task must have a unique "id" field (e.g., "task-1", "task-2")
2. Dependencies array lists task IDs that must complete before this task can start
3. Independent tasks should have empty dependencies (can run in parallel)
4. Avoid circular dependencies (task A depends on B, B depends on A)
5. Use only skillIds that exist in the provided skill catalog

Output ONLY valid JSON. No markdown, no code blocks, no explanation outside the JSON.`;

/**
 * Validate dependencies in decomposition result.
 * Checks for missing references and circular dependencies.
 */
function validateDependencies(
  tasks: Array<{ id: string; dependencies: string[] }>
): void {
  const taskIds = new Set(tasks.map(t => t.id));

  // Check for missing references
  for (const task of tasks) {
    for (const dep of task.dependencies) {
      if (!taskIds.has(dep)) {
        throw new Error(
          `Task "${task.id}" depends on non-existent task "${dep}"`
        );
      }
    }
  }

  // Check for circular dependencies using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(taskId: string): boolean {
    if (recursionStack.has(taskId)) return true;
    if (visited.has(taskId)) return false;

    visited.add(taskId);
    recursionStack.add(taskId);

    const task = tasks.find(t => t.id === taskId);
    if (task) {
      for (const dep of task.dependencies) {
        if (hasCycle(dep)) return true;
      }
    }

    recursionStack.delete(taskId);
    return false;
  }

  for (const task of tasks) {
    if (hasCycle(task.id)) {
      throw new Error('Circular dependency detected in task graph');
    }
  }
}

/**
 * Decompose a user request into subtasks with dependency information.
 *
 * @param prompt - The decomposition prompt containing user request and context
 * @returns The decomposition result with tasks, dependencies, and metadata
 * @throws Error if no skills are available or decomposition fails
 */
export async function decomposeTaskWithDeps(
  prompt: DecomposePrompt
): Promise<DecompositionResultWithDeps> {
  const startTime = Date.now();

  // 1. Discover available skills
  const skills = discoverSkills();
  const skillIds = new Set(skills.map(s => s.metadata.id));

  if (skills.length === 0) {
    throw new Error('No skills available for task decomposition');
  }

  // 2. Build skill catalog
  const skillCatalog = buildSkillCatalog(skills);

  // 3. Construct messages for LLM
  const systemPrompt = `${DECOMPOSITION_SYSTEM_PROMPT_WITH_DEPS}

${skillCatalog}`;

  const messages = [
    {
      role: 'user' as const,
      content: `Decompose this task: ${prompt.userRequest}`,
    },
  ];

  // 4. Call LLM for decomposition
  let responseText = '';
  try {
    const stream = await streamChat({
      modelId: prompt.modelId ?? 'qwen-plus',
      messages,
      systemPrompt,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        responseText += chunk.text;
      }
    }
  } catch (error) {
    const errorMsg = `LLM call failed: ${error instanceof Error ? error.message : String(error)}`;
    await logAudit({
      userId: prompt.userId,
      action: 'task_decomposition_with_deps_failed',
      resource: 'decomposition',
      metadata: {
        sessionId: prompt.sessionId,
        conversationId: prompt.conversationId,
        error: errorMsg,
        userRequest: prompt.userRequest,
      },
    });
    throw new Error(errorMsg);
  }

  // 5. Parse response
  let result: DecompositionResultWithDeps;
  try {
    let jsonStr = responseText.trim();

    // Handle markdown code blocks
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const jsonStart = jsonStr.indexOf('{');
    const jsonEnd = jsonStr.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);
    }

    const parsed = JSON.parse(jsonStr);
    const validated = DecompositionResultWithDepsSchema.parse(parsed);

    result = {
      tasks: validated.tasks.map(t => ({
        id: t.id,
        agentType: t.agentType as AgentType,
        skillId: t.skillId,
        input: t.input,
        description: t.description,
        dependencies: t.dependencies || [],
      })),
      dependencies: validated.dependencies,
      reasoning: validated.reasoning,
      estimatedComplexity: validated.estimatedComplexity,
    };
  } catch (error) {
    await logAudit({
      userId: prompt.userId,
      action: 'task_decomposition_with_deps_parse_failed',
      resource: 'decomposition',
      metadata: {
        sessionId: prompt.sessionId,
        conversationId: prompt.conversationId,
        error: error instanceof Error ? error.message : String(error),
        rawResponse: responseText,
        userRequest: prompt.userRequest,
      },
    });
    throw error;
  }

  // 6. Validate skill IDs
  const basicResult: DecompositionResult = {
    tasks: result.tasks.map(t => ({
      agentType: t.agentType,
      skillId: t.skillId,
      input: t.input,
      description: t.description,
    })),
    reasoning: result.reasoning,
    estimatedComplexity: result.estimatedComplexity,
  };
  validateSkillIds(basicResult, skillIds);

  // 7. Validate dependencies
  try {
    validateDependencies(result.tasks);
  } catch (error) {
    await logAudit({
      userId: prompt.userId,
      action: 'task_decomposition_deps_failed',
      resource: 'decomposition',
      metadata: {
        sessionId: prompt.sessionId,
        conversationId: prompt.conversationId,
        error: error instanceof Error ? error.message : String(error),
        result,
        userRequest: prompt.userRequest,
      },
    });
    throw error;
  }

  // 8. Log successful decomposition
  const duration = Date.now() - startTime;
  await logAudit({
    userId: prompt.userId,
    action: 'task_decomposition_with_deps',
    resource: 'decomposition',
    metadata: {
      sessionId: prompt.sessionId,
      conversationId: prompt.conversationId,
      taskCount: result.tasks.length,
      duration,
      hasDependencies: Object.values(result.dependencies).some(d => d.length > 0),
      reasoning: result.reasoning,
      complexity: result.estimatedComplexity,
      skillCatalogSize: skills.length,
    },
  });

  return result;
}
