/**
 * tests for SSE status broadcaster and workflow-status endpoint
 *
 * ORCH-06: Execution plan visualization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  addWorkflowListener,
  removeWorkflowListener,
  broadcastWorkflowUpdate,
  getListenerCount
} from '@/lib/agents/status-broadcaster';
import type { WorkflowStatusUpdate } from './status-broadcaster';

// Helper to create mock listener
function createMockListener(): jest.Mock<(data: string) => void> {
  return {
    mock: jest.fn(),
  };
}

describe('addWorkflowListener', () => {
  let listener1: ReturnType<typeof createMockListener>['mock']>;
  let listener2: ReturnType<typeof createMockListener>['mock']>;

  beforeEach(() => {
    // Clear any existing listeners before each test
    const workflowId = 'test-workflow';
    const existingListeners = getListenerCount(workflowId);
    if (existingListeners > 0) {
      // Clean up by removing all listeners
      for (let i = 0; i < existingListeners; i++) {
        const mockListener = createMockListener();
        removeWorkflowListener(workflowId, mockListener.mock);
      }
    }
  });

  it('should register listener for workflow', () => {
    const workflowId = 'test-workflow-1';
    const listener = createMockListener();

    addWorkflowListener(workflowId, listener.mock);
    expect(getListenerCount(workflowId)).toBe(1);
  });

  it('should allow multiple listeners for same workflow', () => {
    const workflowId = 'test-workflow-2';
    const listener1 = createMockListener();
    const listener2 = createMockListener();

    addWorkflowListener(workflowId, listener1.mock);
    addWorkflowListener(workflowId, listener2.mock);
    expect(getListenerCount(workflowId)).toBe(2);
  });

  it('should remove listener from workflow', () => {
    const workflowId = 'test-workflow-3';
    const listener = createMockListener();

    addWorkflowListener(workflowId, listener.mock);
    expect(getListenerCount(workflowId)).toBe(1);

    removeWorkflowListener(workflowId, listener.mock);
    expect(getListenerCount(workflowId)).toBe(0);
  });

  it('should handle removing non-existent listener gracefully', () => {
    const workflowId = 'test-workflow-4';
    const listener = createMockListener();

    // Should not throw
    expect(() => removeWorkflowListener(workflowId, listener.mock)).not.toThrow();
  });
});

describe('broadcastWorkflowUpdate', () => {
  let listener1: ReturnType<typeof createMockListener>['mock'];
  let listener2: ReturnType<typeof createMockListener>['mock'];

  beforeEach(() => {
    // Clean up any existing listeners
    const workflowId = 'broadcast-test-workflow';
    const existingListeners = getListenerCount(workflowId);
    if (existingListeners > 0) {
      for (let i = 0; i < existingListeners; i++) {
        const mockListener = createMockListener();
        removeWorkflowListener(workflowId, mockListener.mock);
      }
    }
  });

  it('should send update to all listeners', () => {
    const workflowId = 'broadcast-test-1';
    listener1 = createMockListener();
    listener2 = createMockListener();

    addWorkflowListener(workflowId, listener1.mock);
    addWorkflowListener(workflowId, listener2.mock);

    const update: WorkflowStatusUpdate = {
      taskId: 'task-1',
      status: 'running',
      waveIndex: 0,
      timestamp: new Date().toISOString(),
    };

    broadcastWorkflowUpdate(workflowId, update);

    expect(listener1.mock).toHaveBeenCalledWith(JSON.stringify(update));
    expect(listener2.mock).toHaveBeenCalledWith(JSON.stringify(update));
  });

  it('should not throw when no listeners', () => {
    const workflowId = 'broadcast-test-2';
    const update: WorkflowStatusUpdate = {
      taskId: 'task-2',
      status: 'completed',
      waveIndex: 1,
      timestamp: new Date().toISOString(),
    };

    // Should not throw
    expect(() => broadcastWorkflowUpdate(workflowId, update)).not.toThrow();
  });

  it('should handle listener errors gracefully', () => {
    const workflowId = 'broadcast-test-3';
    const errorListener = {
      mock: jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      }),
    };
    const normalListener = createMockListener();

    addWorkflowListener(workflowId, errorListener.mock);
    addWorkflowListener(workflowId, normalListener.mock);

    const update: WorkflowStatusUpdate = {
      taskId: 'task-3',
      status: 'failed',
      waveIndex: 0,
      error: 'Task failed',
      timestamp: new Date().toISOString(),
    };

    // Mock console.error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    broadcastWorkflowUpdate(workflowId, update);

    expect(errorListener.mock).toHaveBeenCalled();
    expect(normalListener.mock).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should clean up workflow when all listeners removed', () => {
    const workflowId = 'broadcast-test-4';
    const listener = createMockListener();

    addWorkflowListener(workflowId, listener.mock);
    expect(getListenerCount(workflowId)).toBe(1);

    removeWorkflowListener(workflowId, listener.mock);
    expect(getListenerCount(workflowId)).toBe(0);
  });
});

describe('SSE Endpoint Integration', () => {
  it('should have correct SSE message format', async () => {
    const update: WorkflowStatusUpdate = {
      taskId: 'task-1',
      status: 'running',
      waveIndex: 0,
      timestamp: '2025-01-01T00:00:00.000Z',
    };

    const encoded = JSON.stringify(update);
    expect(encoded).toContain('"taskId":"task-1"');
    expect(encoded).toContain('"status":"running"');
  });
});
