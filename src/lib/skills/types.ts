import { z } from 'zod';

/**
 * Skill categories for classification
 */
export type SkillCategory = 'file' | 'data' | 'web' | 'system' | 'custom';

/**
 * Metadata attached to a skill via the @skill decorator
 */
export interface SkillMetadata {
  /** Unique identifier for the skill (e.g., "file-read") */
  id: string;
  /** Display name for the skill */
  name: string;
  /** Description of what the skill does */
  description: string;
  /** Semantic version (e.g., "1.0.0") */
  version: string;
  /** Category for grouping and filtering */
  category: SkillCategory;
  /** Tags for searchability */
  tags: string[];
  /** Zod schema for input validation */
  inputSchema: Record<string, z.ZodTypeAny>;
  /** Whether this skill requires user approval before execution */
  requiresApproval: boolean;
  /** List of destructive actions this skill can perform */
  destructiveActions: string[];
  /** IDs of other skills this skill depends on */
  dependencies: string[];
  /** Maximum execution time in milliseconds */
  timeout: number;
}

/**
 * Context provided to skill execution
 */
export interface SkillContext {
  /** ID of the user invoking the skill */
  userId: string;
  /** ID of the current session */
  sessionId: string;
  /** Optional conversation ID for context */
  conversationId?: string;
  /** Results from previous skill executions in the same workflow */
  previousResults: Map<string, SkillResult>;
}

/**
 * Result returned from skill execution
 */
export interface SkillResult {
  /** Whether the skill executed successfully */
  success: boolean;
  /** Data returned by the skill (if successful) */
  data?: unknown;
  /** Error message (if unsuccessful) */
  error?: string;
  /** Additional metadata about the execution */
  metadata?: Record<string, unknown>;
}

/**
 * Function signature for a skill
 */
export type SkillFunction = (
  input: unknown,
  context: SkillContext
) => Promise<SkillResult>;

/**
 * Create a default skill context
 */
export function createSkillContext(
  userId: string,
  sessionId: string,
  options?: { conversationId?: string }
): SkillContext {
  return {
    userId,
    sessionId,
    conversationId: options?.conversationId,
    previousResults: new Map(),
  };
}

/**
 * Create a successful skill result
 */
export function successResult(data?: unknown, metadata?: Record<string, unknown>): SkillResult {
  return {
    success: true,
    data,
    metadata,
  };
}

/**
 * Create an error skill result
 */
export function errorResult(error: string, metadata?: Record<string, unknown>): SkillResult {
  return {
    success: false,
    error,
    metadata,
  };
}
