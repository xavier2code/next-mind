/**
 * Sub-Agent Executor
 *
 * Executes sub-tasks by wrapping the SkillExecutor with workflow/task context.
 * Integrates agents with the existing Skills infrastructure.
 *
 * CTRL-06: 60-second timeout enforcement
 * RSLT-01: Error information recorded for result display
 */
import { logAudit } from '@/lib/audit';
import { SkillExecutor, createSkillExecutor, type ExecutionOptions } from '@/lib/skills/executor';
import type { SkillContext, SkillResult } from '@/lib/skills/types';
import { agentRegistry } from './registry';
import type { AgentSkillContext, AgentType, RegisteredAgent, Subtask } from './types';
import { createAgentSkillContext } from './types';
import {
  createTask,
  createWorkflow,
  getTask,
  getWorkflow,
  markTaskCompleted,
  markTaskFailed,
  markTaskRunning,
  updateWorkflowStatus,
  getTasksByWorkflow,
} from '@/lib/db/queries';

/**
 * Default timeout for sub-agent task execution.
 * D-10: Fixed 60 second timeout per CONTEXT.md decision.
 */
export const DEFAULT_SUBAGENT_TIMEOUT_MS = 60000;

/**
 * Sub-agent execution options
 */
export interface SubAgentExecutionOptions {
  /** Override the default timeout */
  timeout?: number;
  /** Skip approval check (for trusted contexts) */
  skipApproval?: boolean;
  /** Callback when approval is required */
  onApprovalRequired?: (request: {
    skillId: string;
    skillName: string;
    input: unknown;
  }) => Promise<boolean>;
}

/**
 * Result of sub-agent execution
 */
export interface SubAgentExecutionResult {
  /** Whether execution was successful */
  success: boolean;
  /** The task ID */
  taskId: string;
  /** The workflow ID */
  workflowId: string;
  /** The skill result */
  result?: SkillResult;
  /** Error message if failed */
  error?: string;
}

/**
 * SubAgentExecutor class
 *
 * Manages execution of sub-tasks within a workflow context.
 * Wraps the existing SkillExecutor with workflow tracking.
 */
export class SubAgentExecutor {
  private skillExecutor: SkillExecutor;

  constructor() {
    this.skillExecutor = createSkillExecutor();
  }

  /**
   * Execute a single subtask.
   *
   * @param subtask - The subtask to execute
   * @param context - The agent skill context with workflow info
   * @param options - Execution options
   * @returns The execution result
   */
  async executeSubtask(
    subtask: Subtask,
    context: AgentSkillContext,
    options?: SubAgentExecutionOptions
  ): Promise<SubAgentExecutionResult> {
    const startTime = Date.now();

    // Get the agent for this subtask
    const agents = agentRegistry.getByType(subtask.agentType);
    if (agents.length === 0) {
      return {
        success: false,
        taskId: '',
        workflowId: context.workflowId,
        error: `No registered agent of type: ${subtask.agentType}`,
      };
    }

    const agent = agents[0];

    // Verify the skill is in the agent's allowed skills
    const skill = agent.skills.find((s) => s.metadata.id === subtask.skillId);
    if (!skill) {
      return {
        success: false,
        taskId: '',
        workflowId: context.workflowId,
        error: `Agent "${agent.card.id}" cannot execute skill "${subtask.skillId}" - skill not in agent's allowed skills`,
      };
    }

    // Create task record in database
    const task = await createTask(
      context.workflowId,
      subtask.agentType,
      subtask.skillId,
      subtask.input
    );

    // Mark task as running
    await markTaskRunning(task.id);

    // Convert AgentSkillContext to SkillContext for SkillExecutor
    const skillContext: SkillContext = {
      userId: context.userId,
      sessionId: context.sessionId,
      conversationId: context.conversationId,
      previousResults: context.previousResults,
    };

    // Build execution options with enforced timeout (D-10)
    // D-10: Fixed 60s timeout, can only be reduced (not increased) via options
    const execOptions: ExecutionOptions = {
      timeout: Math.min(
        options?.timeout ?? skill.metadata.timeout ?? DEFAULT_SUBAGENT_TIMEOUT_MS,
        DEFAULT_SUBAGENT_TIMEOUT_MS
      ),
      skipApproval: options?.skipApproval,
    };

    if (options?.onApprovalRequired) {
      execOptions.onApprovalRequired = async (request) => {
        return options.onApprovalRequired!({
          skillId: request.skillId,
          skillName: request.skillName,
          input: request.input,
        });
      };
    }

    try {
      // Execute the skill
      const result = await this.skillExecutor.execute(
        subtask.skillId,
        subtask.input,
        skillContext,
        execOptions
      );

      // Update task status based on result
      if (result.success) {
        await markTaskCompleted(task.id, {
          success: true,
          data: result.data,
          metadata: result.metadata,
        });
      } else {
        await markTaskFailed(task.id, result.error || 'Skill execution failed');
      }

      // Log execution to audit
      const duration = Date.now() - startTime;
      await this.logSubAgentExecution(
        context,
        subtask,
        task.id,
        result.success,
        duration,
        result.error
      );

      return {
        success: result.success,
        taskId: task.id,
        workflowId: context.workflowId,
        result,
        error: result.error,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await markTaskFailed(task.id, errorMessage);

      // Log failure
      const duration = Date.now() - startTime;
      await this.logSubAgentExecution(
        context,
        subtask,
        task.id,
        false,
        duration,
        errorMessage
      );

      return {
        success: false,
        taskId: task.id,
        workflowId: context.workflowId,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute multiple subtasks sequentially.
   *
   * @param subtasks - The subtasks to execute
   * @param baseContext - Base context (userId, sessionId, conversationId)
   * @param options - Execution options
   * @returns Array of execution results
   */
  async executeSubtasks(
    subtasks: Subtask[],
    baseContext: {
      userId: string;
      sessionId: string;
      conversationId?: string;
    },
    options?: SubAgentExecutionOptions
  ): Promise<SubAgentExecutionResult[]> {
    // Create workflow for this execution
    const workflow = await createWorkflow(baseContext.conversationId || '');
    await updateWorkflowStatus(workflow.id, 'running');

    const results: SubAgentExecutionResult[] = [];
    const previousResults = new Map<string, SkillResult>();

    for (let i = 0; i < subtasks.length; i++) {
      const subtask = subtasks[i];

      // Create context for this subtask
      const context = createAgentSkillContext(
        baseContext.userId,
        baseContext.sessionId,
        workflow.id,
        subtask.agentType,
        {
          conversationId: baseContext.conversationId,
        }
      );

      // Add previous results to context
      context.previousResults = previousResults;

      // Execute subtask
      const result = await this.executeSubtask(subtask, context, options);
      results.push(result);

      // Store result for next subtask if successful
      if (result.success && result.result) {
        previousResults.set(subtask.skillId, result.result);
        previousResults.set(`task-${i}`, result.result);
      }

      // Stop execution if task failed
      if (!result.success) {
        await updateWorkflowStatus(workflow.id, 'failed');
        break;
      }
    }

    // Mark workflow as completed if all tasks succeeded
    const allSucceeded = results.every((r) => r.success);
    if (allSucceeded) {
      await updateWorkflowStatus(workflow.id, 'completed');
    }

    return results;
  }

  /**
   * Log sub-agent execution to audit.
   */
  private async logSubAgentExecution(
    context: AgentSkillContext,
    subtask: Subtask,
    taskId: string,
    success: boolean,
    durationMs: number,
    error?: string
  ): Promise<void> {
    try {
      await logAudit({
        userId: context.userId,
        action: 'sub_agent_execution',
        resource: 'task',
        resourceId: taskId,
        metadata: {
          workflowId: context.workflowId,
          agentType: subtask.agentType,
          skillId: subtask.skillId,
          success,
          durationMs,
          error,
          sessionId: context.sessionId,
        },
      });
    } catch {
      // Log error but don't fail
      console.error('Failed to log sub-agent execution audit');
    }
  }
}

// Singleton instance
let subAgentExecutorInstance: SubAgentExecutor | null = null;

/**
 * Get the singleton SubAgentExecutor instance.
 */
export function getSubAgentExecutor(): SubAgentExecutor {
  if (!subAgentExecutorInstance) {
    subAgentExecutorInstance = new SubAgentExecutor();
  }
  return subAgentExecutorInstance;
}

/**
 * Convenience function to execute a single subtask.
 */
export async function executeSubtask(
  subtask: Subtask,
  context: AgentSkillContext,
  options?: SubAgentExecutionOptions
): Promise<SubAgentExecutionResult> {
  return getSubAgentExecutor().executeSubtask(subtask, context, options);
}

/**
 * Convenience function to execute multiple subtasks sequentially.
 */
export async function executeSubtasks(
  subtasks: Subtask[],
  baseContext: {
    userId: string;
    sessionId: string;
    conversationId?: string;
  },
  options?: SubAgentExecutionOptions
): Promise<SubAgentExecutionResult[]> {
  return getSubAgentExecutor().executeSubtasks(subtasks, baseContext, options);
}

// Re-export types
export type { AgentSkillContext } from './types';
