import type { SkillResult, SkillContext } from './types';

/**
 * Orchestrated skill step
 */
export interface OrchestrationStep {
  skillId: string;
  input: unknown;
  /** Use output from previous step as input */
  usePreviousOutput?: boolean;
  /** Key to extract from previous output */
  outputKey?: string;
}

/**
 * Orchestration plan
 */
export interface OrchestrationPlan {
  steps: OrchestrationStep[];
  /** Stop on first error (default: true) */
  stopOnError?: boolean;
  /** Maximum total execution time in ms */
  timeout?: number;
}

/**
 * Result of a single step in orchestration
 */
export interface OrchestrationStepResult {
  skillId: string;
  result: SkillResult;
  duration: number;
}

/**
 * Error during orchestration
 */
export interface OrchestrationError {
  skillId: string;
  error: Error;
}

/**
 * Orchestration result
 */
export interface OrchestrationResult {
  success: boolean;
  results: OrchestrationStepResult[];
  errors: OrchestrationError[];
  totalDuration: number;
}

/**
 * Skill executor interface for orchestration
 */
interface SkillExecutorLike {
  execute: (
    skillId: string,
    input: unknown,
    context: SkillContext,
    options?: { skipApproval?: boolean; timeout?: number }
  ) => Promise<SkillResult>;
}

/**
 * Skill orchestrator for sequential execution of multiple skills.
 *
 * Allows chaining skills where the output of one skill can be used
 * as input to the next skill in the sequence.
 *
 * @example
 * ```typescript
 * const orchestrator = new SkillOrchestrator(executor);
 *
 * const result = await orchestrator.executePlan({
 *   steps: [
 *     { skillId: 'fetch-data', input: { url: 'https://api.example.com' } },
 *     { skillId: 'parse-json', usePreviousOutput: true },
 *     { skillId: 'save-file', usePreviousOutput: true, outputKey: 'content' },
 *   ],
 * }, context);
 * ```
 */
export class SkillOrchestrator {
  private executor: SkillExecutorLike;

  constructor(executor: SkillExecutorLike) {
    this.executor = executor;
  }

  /**
   * Execute multiple skills in sequence.
   *
   * Each step can optionally use the output from the previous step
   * as its input. The orchestration stops on the first error unless
   * stopOnError is set to false.
   *
   * @param plan - The orchestration plan with steps to execute
   * @param context - Execution context with user/session info
   * @returns The orchestration result with all step results and errors
   */
  async executePlan(
    plan: OrchestrationPlan,
    context: SkillContext
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const results: OrchestrationStepResult[] = [];
    const errors: OrchestrationError[] = [];
    let previousOutput: unknown;

    // Calculate per-step timeout if total timeout is specified
    const stepTimeout = plan.timeout
      ? Math.floor(plan.timeout / plan.steps.length)
      : undefined;

    for (const step of plan.steps) {
      const stepStart = Date.now();

      try {
        // Resolve input - either use provided input or previous output
        let input = step.input;
        if (step.usePreviousOutput && previousOutput !== undefined) {
          if (step.outputKey) {
            input = (previousOutput as Record<string, unknown>)?.[step.outputKey];
          } else {
            input = previousOutput;
          }
        }

        // Execute skill
        const result = await this.executor.execute(step.skillId, input, context, {
          skipApproval: false,
          timeout: stepTimeout,
        });

        const duration = Date.now() - stepStart;
        results.push({ skillId: step.skillId, result, duration });

        // Store output for next step
        previousOutput = result.data;

        // Check for execution error
        if (!result.success && plan.stopOnError !== false) {
          errors.push({
            skillId: step.skillId,
            error: new Error(result.error ?? 'Skill execution failed'),
          });
          break;
        }
      } catch (error) {
        const duration = Date.now() - stepStart;
        const orchestrationError: OrchestrationError = {
          skillId: step.skillId,
          error: error instanceof Error ? error : new Error(String(error)),
        };
        errors.push(orchestrationError);

        // Add failed step to results
        results.push({
          skillId: step.skillId,
          result: {
            success: false,
            error: orchestrationError.error.message,
          },
          duration,
        });

        if (plan.stopOnError !== false) {
          break;
        }
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      totalDuration: Date.now() - startTime,
    };
  }
}

/**
 * Create a new skill orchestrator.
 *
 * @param executor - The skill executor to use for running skills
 * @returns A new SkillOrchestrator instance
 */
export function createSkillOrchestrator(executor: SkillExecutorLike): SkillOrchestrator {
  return new SkillOrchestrator(executor);
}
