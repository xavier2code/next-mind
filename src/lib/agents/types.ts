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
