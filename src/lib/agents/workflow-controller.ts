/**
 * WorkflowController - Centralized management of workflow execution control.
 *
 * Manages WaveScheduler instances and provides control methods for
 * pause/resume/cancel operations.
 *
 * CTRL-01, CTRL-02, CTRL-05: User control over workflow execution.
 */
import { WaveScheduler, getWaveScheduler } from './scheduler';
import type { TaskWithDependencies } from './types';
import {
  updateWorkflowStatus,
  loadCheckpoint,
  getWorkflow,
  getTasksByWorkflow,
} from '@/lib/db/queries';
import type { WorkflowStatus } from '@/lib/db/schema';

/**
 * Valid workflow control actions
 */
export type WorkflowControlAction = 'pause' | 'resume' | 'cancel';

/**
 * Result of a control action
 */
export interface ControlActionResult {
  success: boolean;
  status: WorkflowStatus;
  error?: string;
}

/**
 * In-memory registry of active schedulers by workflow ID.
 * Note: For multi-instance production, use Redis.
 */
const activeSchedulers = new Map<string, WaveScheduler>();

/**
 * Register a scheduler for a workflow.
 */
export function registerScheduler(workflowId: string, scheduler: WaveScheduler): void {
  activeSchedulers.set(workflowId, scheduler);
}

/**
 * Unregister a scheduler (called when workflow completes/fails/cancels).
 */
export function unregisterScheduler(workflowId: string): void {
  activeSchedulers.delete(workflowId);
}

/**
 * Get the scheduler for a workflow.
 */
export function getScheduler(workflowId: string): WaveScheduler | undefined {
  return activeSchedulers.get(workflowId);
}

/**
 * Pause a running workflow.
 * D-02: Sets pause flag, scheduler completes current wave then pauses.
 */
export async function pauseWorkflow(workflowId: string): Promise<ControlActionResult> {
  const workflow = await getWorkflow(workflowId);
  if (!workflow) {
    return { success: false, status: 'failed', error: 'Workflow not found' };
  }

  if (workflow.status !== 'running') {
    return {
      success: false,
      status: workflow.status as WorkflowStatus,
      error: `Cannot pause workflow in '${workflow.status}' state`,
    };
  }

  // Set workflow status to 'pausing' (transitioning to paused)
  await updateWorkflowStatus(workflowId, 'pausing');

  // Signal scheduler to pause
  const scheduler = getScheduler(workflowId);
  if (scheduler) {
    scheduler.pause();
  }

  return { success: true, status: 'pausing' };
}

/**
 * Resume a paused workflow.
 * D-03, D-08: Loads checkpoint and continues execution.
 */
export async function resumeWorkflow(
  workflowId: string,
  tasks: TaskWithDependencies[],
  baseContext: { userId: string; sessionId: string; conversationId?: string; }
): Promise<ControlActionResult> {
  const workflow = await getWorkflow(workflowId);
  if (!workflow) {
    return { success: false, status: 'failed', error: 'Workflow not found' };
  }

  if (workflow.status !== 'paused') {
    return {
      success: false,
      status: workflow.status as WorkflowStatus,
      error: `Cannot resume workflow in '${workflow.status}' state`,
    };
  }

  const checkpoint = await loadCheckpoint(workflowId);
  if (!checkpoint) {
    return { success: false, status: workflow.status as WorkflowStatus, error: 'No checkpoint found' };
  }

  // Update status to running
  await updateWorkflowStatus(workflowId, 'running');

  // Get or create scheduler and resume
  const scheduler = getScheduler(workflowId) || getWaveScheduler();
  registerScheduler(workflowId, scheduler);

  // Resume execution (async, don't wait)
  scheduler.resumeFromCheckpoint(checkpoint, tasks, baseContext).then(async (results) => {
    const allCompleted = results.every(r => r.status === 'completed');
    const anyFailed = results.some(r => r.status === 'failed');
    const anyCancelled = results.some(r => r.status === 'cancelled');

    if (anyCancelled) {
      await updateWorkflowStatus(workflowId, 'cancelled');
    } else if (anyFailed) {
      await updateWorkflowStatus(workflowId, 'failed');
    } else if (allCompleted) {
      await updateWorkflowStatus(workflowId, 'completed');
    }

    unregisterScheduler(workflowId);
  });

  return { success: true, status: 'running' };
}

/**
 * Cancel a workflow.
 * D-04: Terminates entire workflow, all tasks cancelled.
 */
export async function cancelWorkflowController(workflowId: string): Promise<ControlActionResult> {
  const workflow = await getWorkflow(workflowId);
  if (!workflow) {
    return { success: false, status: 'failed', error: 'Workflow not found' };
  }

  if (!['running', 'pausing', 'paused'].includes(workflow.status)) {
    return {
      success: false,
      status: workflow.status as WorkflowStatus,
      error: `Cannot cancel workflow in '${workflow.status}' state`,
    };
  }

  // Signal scheduler to cancel
  const scheduler = getScheduler(workflowId);
  if (scheduler) {
    scheduler.cancel();
  }

  // Update status
  await updateWorkflowStatus(workflowId, 'cancelled');
  unregisterScheduler(workflowId);

  return { success: true, status: 'cancelled' };
}

/**
 * Validate a control action is allowed for the current workflow status.
 */
export function validateControlAction(
  currentStatus: WorkflowStatus,
  action: WorkflowControlAction
): { valid: boolean; error?: string } {
  const validTransitions: Record<WorkflowControlAction, WorkflowStatus[]> = {
    pause: ['running'],
    resume: ['paused'],
    cancel: ['running', 'pausing', 'paused'],
  };

  if (!validTransitions[action].includes(currentStatus)) {
    return {
      valid: false,
      error: `Cannot ${action} workflow in '${currentStatus}' state`,
    };
  }

  return { valid: true };
}

/**
 * WorkflowController class for object-oriented usage.
 * Wraps the functional API in a class interface.
 */
export class WorkflowController {
  /**
   * Pause a running workflow.
   */
  async pause(workflowId: string): Promise<ControlActionResult> {
    return pauseWorkflow(workflowId);
  }

  /**
   * Resume a paused workflow.
   */
  async resume(
    workflowId: string,
    tasks: TaskWithDependencies[],
    baseContext: { userId: string; sessionId: string; conversationId?: string; }
  ): Promise<ControlActionResult> {
    return resumeWorkflow(workflowId, tasks, baseContext);
  }

  /**
   * Cancel a workflow.
   */
  async cancel(workflowId: string): Promise<ControlActionResult> {
    return cancelWorkflowController(workflowId);
  }

  /**
   * Validate a control action.
   */
  validate(currentStatus: WorkflowStatus, action: WorkflowControlAction): { valid: boolean; error?: string } {
    return validateControlAction(currentStatus, action);
  }
}

// Singleton instance
let workflowControllerInstance: WorkflowController | null = null;

/**
 * Get the singleton WorkflowController instance.
 */
export function getWorkflowController(): WorkflowController {
  if (!workflowControllerInstance) {
    workflowControllerInstance = new WorkflowController();
  }
  return workflowControllerInstance;
}
