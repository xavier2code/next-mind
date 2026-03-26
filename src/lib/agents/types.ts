/**
 * Agent Type Definitions
 *
 * This module defines the core types for the Agent system:
 * - AgentType: The four supported agent types
 * - AgentCard: Reference-based agent definition with skill IDs
 * - RegisteredAgent: Agent with resolved skills
 * - Subtask: Single decomposed task
 * - DecompositionResult: LLM decomposition output
 */
import { z } from 'zod';
import type { DiscoveredSkill } from '@/lib/skills/discovery';

/**
 * The four supported agent types
 */
export type AgentType = 'file' | 'search' | 'code' | 'custom';

/**
 * Agent Card - Reference-based design
 *
 * Defines an agent type with references to existing skills.
 * Skills are resolved at registration time from the SkillRegistry.
 */
export interface AgentCard {
  /** Unique identifier for this agent type (e.g., 'file-agent') */
  id: string;
  /** Display name for the agent */
  name: string;
  /** Description of what this agent does */
  description: string;
  /** References to existing skill IDs - resolved at registration time */
  skillIds: string[];
  /** Top-level agent input schema using Zod */
  inputSchema: Record<string, z.ZodTypeAny>;
  /** Top-level agent output schema using Zod */
  outputSchema: Record<string, z.ZodTypeAny>;
  /** Optional override of the default system prompt */
  systemPrompt?: string;
}

/**
 * Registered Agent - Agent Card with resolved skills
 *
 * Created when an agent is registered with the AgentRegistry.
 * Contains the original card plus the resolved skill implementations.
 */
export interface RegisteredAgent {
  /** The original agent card definition */
  card: AgentCard;
  /** The agent type classification */
  type: AgentType;
  /** Resolved skill implementations from the SkillRegistry */
  skills: DiscoveredSkill[];
}

/**
 * Subtask - A single decomposed task
 *
 * Represents one step in a decomposed workflow, specifying
 * which agent type and skill should handle it.
 */
export interface Subtask {
  /** The agent type to execute this subtask */
  agentType: AgentType;
  /** The skill ID to invoke */
  skillId: string;
  /** Input data for the skill */
  input: Record<string, unknown>;
  /** Optional description of what this subtask accomplishes */
  description?: string;
}

/**
 * Decomposition Result - LLM decomposition output
 *
 * Structured output from the task decomposition process,
 * containing the list of subtasks and optional metadata.
 */
export interface DecompositionResult {
  /** The list of decomposed subtasks */
  tasks: Subtask[];
  /** Optional reasoning explaining the decomposition */
  reasoning?: string;
  /** Optional complexity estimate */
  estimatedComplexity?: 'low' | 'medium' | 'high';
}

/**
 * Agent Skill Context - Extended SkillContext for sub-agent execution
 *
 * Extends the base SkillContext with workflow and task tracking
 * for multi-agent coordination.
 */
export interface AgentSkillContext {
  /** ID of the user invoking the skill */
  userId: string;
  /** ID of the current session */
  sessionId: string;
  /** Optional conversation ID for context */
  conversationId?: string;
  /** Results from previous skill executions in the same workflow */
  previousResults: Map<string, { success: boolean; data?: unknown; error?: string; metadata?: Record<string, unknown> }>;
  /** ID of the workflow this task belongs to */
  workflowId: string;
  /** ID of the parent task (if this is a subtask) */
  parentTaskId?: string;
  /** Type of agent executing this task */
  agentType: AgentType;
}

/**
 * Create an AgentSkillContext for sub-agent execution.
 *
 * @param userId - The user ID
 * @param sessionId - The session ID
 * @param workflowId - The workflow ID
 * @param agentType - The agent type
 * @param options - Optional conversationId and parentTaskId
 * @returns An AgentSkillContext instance
 */
export function createAgentSkillContext(
  userId: string,
  sessionId: string,
  workflowId: string,
  agentType: AgentType,
  options?: { conversationId?: string; parentTaskId?: string }
): AgentSkillContext {
  return {
    userId,
    sessionId,
    conversationId: options?.conversationId,
    previousResults: new Map(),
    workflowId,
    parentTaskId: options?.parentTaskId,
    agentType,
  };
}

/**
 * Subtask with dependency information for parallel execution.
 * Extends Subtask with id (for dependency references) and dependencies array.
 */
export interface SubtaskWithDeps extends Subtask {
  /** Unique identifier for dependency references (e.g., "task-1", "task-2") */
  id: string;
  /** Task IDs that must complete before this task can start */
  dependencies: string[];
}

/**
 * Decomposition Result with dependency information.
 * Includes both tasks with deps and a dependency map for quick lookup.
 */
export interface DecompositionResultWithDeps extends DecompositionResult {
  /** Tasks with dependency information */
  tasks: SubtaskWithDeps[];
  /** Map of taskId -> dependency taskIds */
  dependencies: Record<string, string[]>;
}
