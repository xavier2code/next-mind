import { z } from 'zod';
import { logAudit } from '@/lib/audit';
import { discoverSkills, type DiscoveredSkill } from './discovery';
import type { SkillMetadata, SkillContext, SkillResult, SkillFunction } from './types';

/**
 * Approval request interface for the approval flow
 */
export interface ApprovalRequest {
  id: string;
  skillId: string;
  skillName: string;
  action: string;
  details: string;
  input: unknown;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  userId: string;
  sessionId: string;
}

/**
 * Options for skill execution
 */
export interface ExecutionOptions {
  /** Override the skill's default timeout */
  timeout?: number;
  /** Skip approval check (for testing or trusted contexts) */
  skipApproval?: boolean;
  /** Callback when approval is required. Return true to approve, false to deny. */
  onApprovalRequired?: (request: ApprovalRequest) => Promise<boolean>;
}

/**
 * Skill execution engine with timeout and approval support.
 */
export class SkillExecutor {
  private registry: Map<string, DiscoveredSkill>;

  /**
   * Create a new SkillExecutor.
   *
   * @param registry - Map of skill IDs to discovered skills
   */
  constructor(registry: Map<string, DiscoveredSkill>) {
    this.registry = registry;
  }

  /**
   * Execute a skill by ID.
   *
   * @param skillId - The ID of the skill to execute
   * @param input - Input data for the skill
   * @param context - Execution context with user/session info
   * @param options - Optional execution options
   * @returns The skill execution result
   */
  async execute(
    skillId: string,
    input: unknown,
    context: SkillContext,
    options?: ExecutionOptions
  ): Promise<SkillResult> {
    const startTime = Date.now();

    // Get skill from registry
    const skill = this.registry.get(skillId);
    if (!skill) {
      return {
        success: false,
        error: `Skill not found: ${skillId}`,
      };
    }

    // Validate input against schema
    const validationResult = this.validateInput(input, skill.metadata);
    if (!validationResult.success) {
      return validationResult;
    }

    // Handle approval flow for skills requiring approval
    if (skill.metadata.requiresApproval && !options?.skipApproval) {
      const approvalRequest: ApprovalRequest = {
        id: `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        skillId: skill.metadata.id,
        skillName: skill.metadata.name,
        action: skill.metadata.description,
        details: skill.metadata.destructiveActions.length > 0
          ? `Destructive actions: ${skill.metadata.destructiveActions.join(', ')}`
          : 'This operation requires approval',
        input,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minute expiry
        userId: context.userId,
        sessionId: context.sessionId,
      };

      // Check if approval callback is provided
      if (options?.onApprovalRequired) {
        const approved = await options.onApprovalRequired(approvalRequest);

        if (!approved) {
          // Log rejection
          await this.logExecution(skill.metadata, context, false, 0, 'Approval denied');

          return {
            success: false,
            error: 'Approval denied',
          };
        }
      } else {
        // No approval callback - deny by default for safety
        await this.logExecution(skill.metadata, context, false, 0, 'Approval required but no handler provided');

        return {
          success: false,
          error: 'Approval required but no approval handler provided',
        };
      }
    }

    // Execute with timeout
    const timeoutMs = options?.timeout ?? skill.metadata.timeout;
    const result = await this.executeWithTimeout(
      skill.execute,
      input,
      context,
      timeoutMs
    );

    // Log execution
    const duration = Date.now() - startTime;
    await this.logExecution(
      skill.metadata,
      context,
      result.success,
      duration,
      result.error
    );

    return result;
  }

  /**
   * Execute a skill function with a timeout wrapper.
   *
   * @param fn - The skill function to execute
   * @param input - Input data for the skill
   * @param context - Execution context
   * @param timeoutMs - Timeout in milliseconds
   * @returns The skill execution result
   */
  async executeWithTimeout(
    fn: SkillFunction,
    input: unknown,
    context: SkillContext,
    timeoutMs: number
  ): Promise<SkillResult> {
    return new Promise<SkillResult>((resolve) => {
      // Create timeout promise
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: `Skill execution timed out after ${timeoutMs}ms`,
        });
      }, timeoutMs);

      // Execute skill
      fn(input, context)
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          resolve({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        });
    });
  }

  /**
   * Validate input against the skill's input schema.
   */
  private validateInput(input: unknown, metadata: SkillMetadata): SkillResult {
    try {
      // Create a Zod object schema from the input schema
      const schema = z.object(metadata.inputSchema as Record<string, z.ZodTypeAny>);

      const result = schema.safeParse(input);

      if (!result.success) {
        return {
          success: false,
          error: `Input validation failed: ${result.error.issues.map((i) => i.message).join(', ')}`,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Schema validation error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Log skill execution to audit.
   */
  private async logExecution(
    metadata: SkillMetadata,
    context: SkillContext,
    success: boolean,
    durationMs: number,
    error?: string
  ): Promise<void> {
    try {
      await logAudit({
        userId: context.userId,
        action: 'skill_execution',
        resource: 'skill',
        resourceId: metadata.id,
        metadata: {
          skillName: metadata.name,
          success,
          durationMs,
          error,
          sessionId: context.sessionId,
        },
      });
    } catch {
      // Log error but don't fail - fire and forget
      console.error('Failed to log skill execution audit');
    }
  }
}

// Global executor instance (lazy-initialized)
let globalExecutor: SkillExecutor | null = null;

/**
 * Create a skill executor with discovered skills.
 *
 * @param discoveredSkills - Optional array of skills to use. Defaults to all discovered skills.
 * @returns A new SkillExecutor instance
 */
export function createSkillExecutor(discoveredSkills?: DiscoveredSkill[]): SkillExecutor {
  const skills = discoveredSkills ?? discoverSkills();
  const registry = new Map<string, DiscoveredSkill>();

  for (const skill of skills) {
    registry.set(skill.metadata.id, skill);
  }

  return new SkillExecutor(registry);
}

/**
 * Get or create the global skill executor.
 */
function getGlobalExecutor(): SkillExecutor {
  if (!globalExecutor) {
    globalExecutor = createSkillExecutor();
  }
  return globalExecutor;
}

/**
 * Execute a skill using the global executor.
 *
 * Convenience function for simple use cases.
 *
 * @param skillId - The ID of the skill to execute
 * @param input - Input data for the skill
 * @param context - Execution context with user/session info
 * @param options - Optional execution options
 * @returns The skill execution result
 */
export async function executeSkill(
  skillId: string,
  input: unknown,
  context: SkillContext,
  options?: ExecutionOptions
): Promise<SkillResult> {
  return getGlobalExecutor().execute(skillId, input, context, options);
}

// Re-export types
export type { DiscoveredSkill } from './discovery';
