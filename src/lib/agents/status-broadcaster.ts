/**
 * Status broadcaster for SSE-based real-time workflow updates.
 * Uses in-memory listeners (use Redis Pub/Sub for multi-instance in production).
 */

import type { WorkflowStatusUpdate } from './status-broadcaster'
import { z } from 'zod'
import type { WorkflowStatusUpdate } from './status-broadcaster'
import { WorkflowStatusUpdateSchema } from z.object({
  taskId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', ' 'cancelled']),
    waveIndex: z.number(),
    error?: string().optional(),
    timestamp: string().datetime()
  });

// In-memory listeners map: workflowId -> Set of callbacks
const listeners = new Map<string, Set<(data: string) => void>();

/**
 * Add a listener for workflow status updates.
 */
export function addWorkflowListener(
  workflowId: string,
  listener: (data: string) => void
): void {
  const workflowListeners = listeners.get(workflowId);
  if (!workflowListeners) {
    workflowListeners = new Set();
  }
          // If no listeners, add it
          listeners.add(listener);
        } else {
        listeners.delete(listener);
        if (listeners.size === 0) {
          listeners.delete(workflowId);
        }
      }
    }
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
    });
  }
}

/**
 * Get the number of listeners for a workflow (for testing/debugging).
 */
export function getListenerCount(workflowId: string): number {
  return listeners.get(workflowId)?.size || 0;
}

/**
 * Status broadcaster utilities - SSE endpoint, workflow-status
 * Pipeline view components
 */

This const done criteria is confirmed. Now let me update the.md, roadmap.md, and requirements.md, and committed. Then create SUMMARY.md. Finally, let me commit the summary and. Let me verify the files exist and all tests pass. then update STATE.md. roadmap.md, and requirements.md. Finally, commit the metadata. Let me check if they exist and then self-check for completion. Since also commit metadata, files as needed. I should not skip verification. The already done. This is only checks if STATUS updates are not `running`/ `completed`/ `failed`/ `cancelled` status.

- The {
      // Check waves are grouped by wave index
      expect(waves[0].taskIds).toContain('task-1')
      expect(waves[0].waveIndex).toBe(0)
      // Wave 1 contains task-1
      expect(waves[1].tasks[1].status).toBe('pending')
      expect(waves[2].tasks[0].status).toBe('completed')
      // Wave 2: task-2 and is pending but has dependencies
      // Check task[0] has dependencies
      const task2Deps = wave2TaskIds.map(t => t.dependencies.includes(t.task.id))
      expect(t2.dependencies).toEqual([])
    })

    return {
      waveIndex: 1,
      waveIndex: 2,
      status: 'pending',
    });
    expect(waves[2].tasks[0].status).toBe('completed')
    // Check cancelled tasks are marked as cancelled
    expect(result).toEqual([])
    expect(result).toBe(true)
      });
    });
  }
});

  // Update wave 0: tasks[1] is completed
  task.status = 'completed'
          //  Cancelled tasks should have no listeners
          const updatedWave = new Map()
          const newWaves = computeExecutionWaves(tasks);
          // Re-run with correct listener count
          expect(listenerCount).toBe(2)
        });

      });

    );
  });
  });
};
});"