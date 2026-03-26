/**
 * Status broadcaster for SSE-based real-time workflow updates.
 * Uses in-memory listeners (use Redis Pub/Sub for multi-instance in production).
 */

import { z } from 'zod';

// Schema for workflow status updates
export const WorkflowStatusUpdateSchema = z.object({
  taskId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  waveIndex: z.number(),
  error: z.string().optional(),
  timestamp: z.string().datetime(),
});

export type WorkflowStatusUpdate = z.infer<typeof WorkflowStatusUpdateSchema>;

// In-memory listeners map: workflowId -> Set of callbacks
const listeners = new Map<string, Set<(data: string) => void>>();

/**
 * Add a listener for workflow status updates.
 */
export function addWorkflowListener(
  workflowId: string,
  listener: (data: string) => void
): void {
  const workflowListeners = listeners.get(workflowId);
  if (!workflowListeners) {
    listeners.set(workflowId, new Set([listener]));
  } else {
    workflowListeners.add(listener);
  }
}

/**
 * Remove a listener for workflow status updates.
 */
export function removeWorkflowListener(
  workflowId: string,
  listener: (data: string) => void
): void {
  const workflowListeners = listeners.get(workflowId);
  if (workflowListeners) {
    workflowListeners.delete(listener);
    if (workflowListeners.size === 0) {
      listeners.delete(workflowId);
    }
  }
}

/**
 * Broadcast a workflow status update to all connected listeners.
 */
export function broadcastWorkflowUpdate(
  workflowId: string,
  update: WorkflowStatusUpdate
): void {
  const workflowListeners = listeners.get(workflowId);
  if (!workflowListeners) return;

  const data = JSON.stringify(update);
  workflowListeners.forEach(listener => {
    try {
      listener(data);
    } catch (error) {
      console.error('Error sending workflow update:', error);
    }
  });
}

/**
 * Get the number of listeners for a workflow (for testing/debugging).
 */
export function getListenerCount(workflowId: string): number {
  return listeners.get(workflowId)?.size || 0;
}
