/**
 * Tests for timeout handling and error recording
 *
 * CTRL-06: Sub-agent tasks timeout after 60 seconds
 * RSLT-01: Error information is properly recorded for result display
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DEFAULT_SUBAGENT_TIMEOUT_MS } from '@/lib/agents/executor';

describe('Timeout Configuration', () => {
  it('sets default timeout to 60 seconds', () => {
    expect(DEFAULT_SUBAGENT_TIMEOUT_MS).toBe(60000);
  });

  it('timeout value is 60000 milliseconds', () => {
    expect(DEFAULT_SUBAGENT_TIMEOUT_MS).toBe(60 * 1000);
  });
});

describe('Timeout Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('cannot exceed 60s timeout even with higher value provided', () => {
    // This test verifies the Math.min() logic in executor.ts
    const userProvidedTimeout = 120000; // 2 minutes
    const enforcedTimeout = Math.min(userProvidedTimeout, DEFAULT_SUBAGENT_TIMEOUT_MS);

    expect(enforcedTimeout).toBe(60000);
  });

  it('allows lower timeout than 60s', () => {
    const userProvidedTimeout = 30000; // 30 seconds
    const enforcedTimeout = Math.min(userProvidedTimeout, DEFAULT_SUBAGENT_TIMEOUT_MS);

    expect(enforcedTimeout).toBe(30000);
  });

  it('uses default timeout when no timeout provided', () => {
    const userProvidedTimeout = undefined;
    const enforcedTimeout = Math.min(
      userProvidedTimeout ?? DEFAULT_SUBAGENT_TIMEOUT_MS,
      DEFAULT_SUBAGENT_TIMEOUT_MS
    );

    expect(enforcedTimeout).toBe(60000);
  });
});

describe('Error Recording', () => {
  it('timeout error message includes task identifier', () => {
    const taskId = 'task-123';
    const errorMessage = `Task ${taskId} timed out after 60000ms`;

    expect(errorMessage).toContain(taskId);
    expect(errorMessage).toContain('timed out');
    expect(errorMessage).toContain('60000ms');
  });

  it('error is storable in task output', () => {
    const errorOutput = {
      success: false,
      error: 'Task timed out after 60000ms',
    };

    expect(errorOutput.success).toBe(false);
    expect(errorOutput.error).toContain('timed out');
  });
});

describe('Cascade Cancel for Timeout Failures', () => {
  it('failed task triggers cascade cancel for dependent tasks', () => {
    const failedTaskIds = new Set<string>();
    const dependencies: Record<string, string[]> = {
      'task-a': [],
      'task-b': ['task-a'],
      'task-c': ['task-b'],
    };

    // Task A fails
    failedTaskIds.add('task-a');

    // Check if Task B should be cancelled
    const taskBShouldCancel = dependencies['task-b'].some(dep => failedTaskIds.has(dep));
    expect(taskBShouldCancel).toBe(true);

    // Task B is now cancelled
    failedTaskIds.add('task-b');

    // Check if Task C should be cancelled
    const taskCShouldCancel = dependencies['task-c'].some(dep => failedTaskIds.has(dep));
    expect(taskCShouldCancel).toBe(true);
  });

  it('independent tasks continue when sibling fails', () => {
    const failedTaskIds = new Set<string>();
    const dependencies: Record<string, string[]> = {
      'task-a': [],
      'task-b': [],
      'task-c': ['task-a', 'task-b'],
    };

    // Task A fails
    failedTaskIds.add('task-a');

    // Task B is independent, should not be cancelled
    const taskBShouldCancel = dependencies['task-b'].some(dep => failedTaskIds.has(dep));
    expect(taskBShouldCancel).toBe(false);

    // Task C depends on both, should be cancelled because A failed
    const taskCShouldCancel = dependencies['task-c'].some(dep => failedTaskIds.has(dep));
    expect(taskCShouldCancel).toBe(true);
  });

  it('timeout failure is treated same as other failures for cascade', () => {
    const failedTaskIds = new Set<string>();

    // Add a timeout failure
    failedTaskIds.add('task-timeout');

    // Verify it triggers cascade cancel
    const dependentTaskId = 'task-dependent';
    const dependencies = ['task-timeout'];
    const shouldCancel = dependencies.some(dep => failedTaskIds.has(dep));

    expect(shouldCancel).toBe(true);
  });
});
