/**
 * Wave-Based Task Scheduler
 *
 * Implements intelligent parallel execution of independent subtasks while
 * respecting dependency ordering using topological sort (Kahn's algorithm).
 *
 * ORCH-01: Dependency analysis and wave grouping
 * ORCH-02: Parallel execution within concurrency limit (MAX_CONCURRENCY=3)
 * ORCH-03: Circular dependency detection
 * ORCH-04: Cascade cancel when task fails
 * ORCH-05: Sequential wave execution with parallel tasks
 */
import type { Subtask, AgentSkillContext, AgentType } from './types';
import type { SubAgentExecutor, SubAgentExecutionResult, SubAgentExecutionOptions } from './executor';

/**
 * Maximum concurrent tasks per wave
 * Fixed at 3 per CONTEXT.md decision for resource management
 */
export const MAX_CONCURRENCY = 3;

/**
 * Task with dependencies for wave scheduling
 */
export interface TaskWithDependencies extends Subtask {
  /** Unique identifier for this task */
  id: string;
  /** IDs of tasks that must complete before this task can run */
  dependencies: string[];
}

/**
 * Execution wave containing task IDs that can run in parallel
 */
export interface ExecutionWave {
  /** Zero-based wave index */
  waveIndex: number;
  /** Task IDs in this wave */
  taskIds: string[];
}

/**
 * Scheduled task with execution status
 */
export interface ScheduledTask {
  /** The task with dependencies */
  task: TaskWithDependencies;
  /** Which wave this task belongs to */
  waveIndex: number;
  /** Current execution status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  /** Execution result (when completed or failed) */
  result?: SubAgentExecutionResult;
}

/**
 * Error thrown when circular dependency is detected
 */
export class CircularDependencyError extends Error {
  constructor(message: string = 'Circular dependency detected in task graph') {
    super(message);
    this.name = 'CircularDependencyError';
  }
}

/**
 * Compute execution waves from tasks with dependencies.
 *
 * Uses Kahn's algorithm for topological sort to determine
 * which tasks can run in parallel (same wave) vs sequentially (different waves).
 *
 * @param tasks - Tasks with their dependencies
 * @param maxConcurrency - Maximum tasks per wave (default: 3)
 * @returns Array of execution waves
 * @throws CircularDependencyError if circular dependency detected
 */
export function computeExecutionWaves(
  tasks: TaskWithDependencies[],
  maxConcurrency: number = MAX_CONCURRENCY
): ExecutionWave[] {
  if (tasks.length === 0) {
    return [];
  }

  // Build task map for quick lookup
  const taskMap = new Map<string, TaskWithDependencies>();
  for (const task of tasks) {
    taskMap.set(task.id, task);
  }

  // Build in-degree map (count of dependencies for each task)
  const inDegree = new Map<string, number>();
  for (const task of tasks) {
    inDegree.set(task.id, task.dependencies.length);
  }

  // Build dependents map (reverse of dependencies)
  const dependents = new Map<string, Set<string>>();
  for (const task of tasks) {
    for (const depId of task.dependencies) {
      if (!dependents.has(depId)) {
        dependents.set(depId, new Set());
      }
      dependents.get(depId)!.add(task.id);
    }
  }

  const waves: ExecutionWave[] = [];
  const completed = new Set<string>();
  const remaining = new Set(tasks.map(t => t.id));

  while (remaining.size > 0) {
    // Find all tasks with in-degree 0 (no unmet dependencies)
    const ready: string[] = [];
    for (const taskId of remaining) {
      if (inDegree.get(taskId) === 0) {
        ready.push(taskId);
      }
    }

    // If no tasks are ready but tasks remain, there's a circular dependency
    if (ready.length === 0) {
      throw new CircularDependencyError(
        `Circular dependency detected among tasks: ${Array.from(remaining).join(', ')}`
      );
    }

    // Create wave with ready tasks, chunked by maxConcurrency
    for (let i = 0; i < ready.length; i += maxConcurrency) {
      const waveTasks = ready.slice(i, i + maxConcurrency);
      waves.push({
        waveIndex: waves.length,
        taskIds: waveTasks,
      });

      // Mark these tasks as completed
      for (const taskId of waveTasks) {
        completed.add(taskId);
        remaining.delete(taskId);

        // Decrease in-degree for dependents
        const taskDependents = dependents.get(taskId);
        if (taskDependents) {
          for (const depId of taskDependents) {
            const currentDegree = inDegree.get(depId) ?? 0;
            inDegree.set(depId, Math.max(0, currentDegree - 1));
          }
        }
      }
    }
  }

  return waves;
}

/**
 * WaveScheduler class
 *
 * Executes tasks in waves, with tasks in the same wave running in parallel
 * (up to MAX_CONCURRENCY) and waves running sequentially.
 */
export class WaveScheduler {
  private executor: SubAgentExecutor;

  constructor(executor: SubAgentExecutor) {
    this.executor = executor;
  }

  /**
   * Execute tasks in waves based on their dependencies.
   *
   * @param tasks - Tasks with dependencies to execute
   * @param baseContext - Base context for execution
   * @param options - Execution options
   * @returns Array of scheduled tasks with their results
   */
  async executeWaves(
    tasks: TaskWithDependencies[],
    baseContext: {
      userId: string;
      sessionId: string;
      conversationId?: string;
    },
    options?: SubAgentExecutionOptions
  ): Promise<ScheduledTask[]> {
    if (tasks.length === 0) {
      return [];
    }

    // Compute execution waves
    const waves = computeExecutionWaves(tasks);

    // Create task map for lookup
    const taskMap = new Map<string, TaskWithDependencies>();
    for (const task of tasks) {
      taskMap.set(task.id, task);
    }

    // Track scheduled tasks
    const scheduledTasks: ScheduledTask[] = tasks.map(task => ({
      task,
      waveIndex: waves.findIndex(w => w.taskIds.includes(task.id)),
      status: 'pending' as const,
    }));

    // Track previous results for context
    const previousResults = new Map<string, { success: boolean; data?: unknown; error?: string; metadata?: Record<string, unknown> }>();

    // Track failed task IDs for cascade cancel
    const failedTaskIds = new Set<string>();

    // Execute waves sequentially
    for (const wave of waves) {
      // Check for cancelled tasks (cascade from previous failures)
      const tasksToRun = wave.taskIds.filter(taskId => {
        const scheduledTask = scheduledTasks.find(st => st.task.id === taskId);
        if (!scheduledTask) return false;

        // Check if any dependency failed
        const task = taskMap.get(taskId);
        if (task) {
          for (const depId of task.dependencies) {
            if (failedTaskIds.has(depId)) {
              scheduledTask.status = 'cancelled';
              failedTaskIds.add(taskId);
              return false;
            }
          }
        }
        return true;
      });

      // Mark tasks as running
      for (const taskId of tasksToRun) {
        const scheduledTask = scheduledTasks.find(st => st.task.id === taskId);
        if (scheduledTask) {
          scheduledTask.status = 'running';
        }
      }

      // Execute tasks in parallel within the wave
      const results = await Promise.all(
        tasksToRun.map(async taskId => {
          const task = taskMap.get(taskId)!;

          const context: AgentSkillContext = {
            userId: baseContext.userId,
            sessionId: baseContext.sessionId,
            conversationId: baseContext.conversationId,
            previousResults: new Map(previousResults),
            workflowId: '', // Will be set by executor
            agentType: task.agentType,
          };

          const result = await this.executor.executeSubtask(task, context, options);
          return { taskId, result };
        })
      );

      // Process results
      for (const { taskId, result } of results) {
        const scheduledTask = scheduledTasks.find(st => st.task.id === taskId);
        if (scheduledTask) {
          scheduledTask.status = result.success ? 'completed' : 'failed';
          scheduledTask.result = result;

          if (result.success) {
            // Add to previous results for next waves
            previousResults.set(taskId, {
              success: true,
              data: result.result?.data,
              metadata: result.result?.metadata,
            });
          } else {
            // Mark for cascade cancel
            failedTaskIds.add(taskId);
          }
        }
      }
    }

    return scheduledTasks;
  }
}

// Singleton instance
let waveSchedulerInstance: WaveScheduler | null = null;

/**
 * Get the singleton WaveScheduler instance.
 * Requires SubAgentExecutor to be available.
 */
export function getWaveScheduler(): WaveScheduler {
  if (!waveSchedulerInstance) {
    // Import dynamically to avoid circular dependency
    const { getSubAgentExecutor } = require('./executor');
    waveSchedulerInstance = new WaveScheduler(getSubAgentExecutor());
  }
  return waveSchedulerInstance;
}
