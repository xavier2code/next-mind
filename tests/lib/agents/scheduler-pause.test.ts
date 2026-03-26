/**
 * Tests for WaveScheduler pause/resume workflow control
 *
 * CTRL-01: User can pause a running workflow
 * CTRL-04: Paused workflow saves checkpoint to database
 * CTRL-05: User can resume a paused workflow from checkpoint
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  WaveScheduler,
  computeExecutionWaves,
  type TaskWithDependencies,
  type ScheduledTask,
} from '@/lib/agents/scheduler';
import type { CheckpointData } from '@/lib/agents/types';
import type { SubAgentExecutionResult } from '@/lib/agents/executor';

// Mock the database queries
vi.mock('@/lib/db/queries', () => ({
  saveCheckpoint: vi.fn().mockResolvedValue({}),
  loadCheckpoint: vi.fn().mockResolvedValue(null),
  updateWorkflowStatus: vi.fn().mockResolvedValue({}),
}));

// Mock executor
const mockExecutor = {
  executeSubtask: vi.fn(),
};

function createMockTask(
  id: string,
  dependencies: string[] = [],
  agentType: 'file' | 'search' | 'code' | 'custom' = 'file'
): TaskWithDependencies {
  return {
    id,
    agentType,
    skillId: `skill-${id}`,
    input: { prompt: `Task ${id}` },
    dependencies,
  };
}

function createSuccessfulResult(taskId: string, data: unknown = {}): SubAgentExecutionResult {
  return {
    success: true,
    taskId,
    workflowId: 'test-workflow',
    result: { data },
  };
}

function createFailedResult(taskId: string, error: string): SubAgentExecutionResult {
  return {
    success: false,
    taskId,
    workflowId: 'test-workflow',
    error,
  };
}

describe('WaveScheduler - Pause/Resume Control', () => {
  let scheduler: WaveScheduler;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecutor.executeSubtask.mockReset();
    scheduler = new WaveScheduler(mockExecutor as unknown as typeof mockExecutor & { executeSubtask: typeof mockExecutor.executeSubtask });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('pause()', () => {
    it('sets paused flag to true', () => {
      expect(scheduler.isPaused()).toBe(false);
      scheduler.pause();
      expect(scheduler.isPaused()).toBe(true);
    });
  });

  describe('cancel()', () => {
    it('sets cancelled flag to true', () => {
      expect(scheduler.isCancelled()).toBe(false);
      scheduler.cancel();
      expect(scheduler.isCancelled()).toBe(true);
    });
  });

  describe('isPaused()', () => {
    it('returns current pause state', () => {
      expect(scheduler.isPaused()).toBe(false);
      scheduler.pause();
      expect(scheduler.isPaused()).toBe(true);
    });
  });

  describe('isCancelled()', () => {
    it('returns current cancel state', () => {
      expect(scheduler.isCancelled()).toBe(false);
      scheduler.cancel();
      expect(scheduler.isCancelled()).toBe(true);
    });
  });

  describe('resetControlState()', () => {
    it('resets pause and cancel flags', () => {
      scheduler.pause();
      scheduler.cancel();
      expect(scheduler.isPaused()).toBe(true);
      expect(scheduler.isCancelled()).toBe(true);

      scheduler.resetControlState();
      expect(scheduler.isPaused()).toBe(false);
      expect(scheduler.isCancelled()).toBe(false);
    });
  });

  describe('executeWaves with pause', () => {
    it('pause prevents next wave from starting', async () => {
      // Create tasks: A -> B (sequential waves)
      const tasks: TaskWithDependencies[] = [
        createMockTask('task-a', []),
        createMockTask('task-b', ['task-a']),
      ];

      // Mock executor to pause after first task
      mockExecutor.executeSubtask.mockImplementation(async (task) => {
        if (task.id === 'task-a') {
          // Pause after first task completes
          scheduler.pause();
          return createSuccessfulResult('task-a', { result: 'a-done' });
        }
        return createSuccessfulResult('task-b', { result: 'b-done' });
      });

      const results = await scheduler.executeWaves(tasks, {
        userId: 'test-user',
        sessionId: 'test-session',
      }, undefined, 'workflow-123'); // Pass workflowId to enable pause

      // First task should complete, second should be pending
      expect(results.find(r => r.task.id === 'task-a')?.status).toBe('completed');
      expect(results.find(r => r.task.id === 'task-b')?.status).toBe('pending');
    });

    it('saves checkpoint when paused with workflowId', async () => {
      const { saveCheckpoint } = await import('@/lib/db/queries');
      const tasks: TaskWithDependencies[] = [
        createMockTask('task-a', []),
        createMockTask('task-b', ['task-a']),
      ];

      mockExecutor.executeSubtask.mockImplementation(async (task) => {
        if (task.id === 'task-a') {
          scheduler.pause();
          return createSuccessfulResult('task-a', { result: 'a-done' });
        }
        return createSuccessfulResult('task-b', { result: 'b-done' });
      });

      await scheduler.executeWaves(tasks, {
        userId: 'test-user',
        sessionId: 'test-session',
      }, undefined, 'workflow-123');

      // Checkpoint should be saved
      expect(saveCheckpoint).toHaveBeenCalledWith('workflow-123', expect.objectContaining({
        workflowId: 'workflow-123',
        currentWaveIndex: expect.any(Number),
        totalWaves: expect.any(Number),
        completedResults: expect.any(Object),
        remainingTaskIds: ['task-b'],
        savedAt: expect.any(String),
      }));
    });
  });

  describe('executeWaves with cancel', () => {
    it('cancel marks all remaining tasks as cancelled', async () => {
      // Create 3 tasks in sequence
      const tasks: TaskWithDependencies[] = [
        createMockTask('task-a', []),
        createMockTask('task-b', ['task-a']),
        createMockTask('task-c', ['task-b']),
      ];

      // Cancel during first wave
      mockExecutor.executeSubtask.mockImplementation(async (task) => {
        if (task.id === 'task-a') {
          scheduler.cancel();
          return createSuccessfulResult('task-a', { result: 'a-done' });
        }
        return createSuccessfulResult(task.id, { result: 'done' });
      });

      const results = await scheduler.executeWaves(tasks, {
        userId: 'test-user',
        sessionId: 'test-session',
      });

      // First task completed, rest cancelled
      expect(results.find(r => r.task.id === 'task-a')?.status).toBe('completed');
      expect(results.filter(r => r.status === 'cancelled')).toHaveLength(2);
    });
  });

  describe('resumeFromCheckpoint', () => {
    it('restores previous results from checkpoint', async () => {
      const checkpoint: CheckpointData = {
        workflowId: 'workflow-123',
        currentWaveIndex: 0,
        totalWaves: 2,
        completedResults: {
          'task-a': { success: true, data: { result: 'a-done' } },
        },
        remainingTaskIds: ['task-b'],
        savedAt: new Date().toISOString(),
      };

      const tasks: TaskWithDependencies[] = [
        createMockTask('task-a', []),
        createMockTask('task-b', ['task-a']),
      ];

      mockExecutor.executeSubtask.mockResolvedValue(
        createSuccessfulResult('task-b', { result: 'b-done' })
      );

      const results = await scheduler.resumeFromCheckpoint(
        checkpoint,
        tasks,
        { userId: 'test-user', sessionId: 'test-session' }
      );

      // Task-a should be marked completed from checkpoint
      expect(results.find(r => r.task.id === 'task-a')?.status).toBe('completed');
      // Task-b should have been executed
      expect(results.find(r => r.task.id === 'task-b')?.status).toBe('completed');
    });

    it('continues execution from correct wave', async () => {
      const checkpoint: CheckpointData = {
        workflowId: 'workflow-123',
        currentWaveIndex: 1, // Wave 1 completed, start from wave 2
        totalWaves: 3,
        completedResults: {
          'task-a': { success: true, data: {} },
          'task-b': { success: true, data: {} },
        },
        remainingTaskIds: ['task-c'],
        savedAt: new Date().toISOString(),
      };

      const tasks: TaskWithDependencies[] = [
        createMockTask('task-a', []),
        createMockTask('task-b', ['task-a']),
        createMockTask('task-c', ['task-b']),
      ];

      mockExecutor.executeSubtask.mockResolvedValue(
        createSuccessfulResult('task-c', { result: 'c-done' })
      );

      const results = await scheduler.resumeFromCheckpoint(
        checkpoint,
        tasks,
        { userId: 'test-user', sessionId: 'test-session' }
      );

      // Only task-c should have been executed
      expect(mockExecutor.executeSubtask).toHaveBeenCalledTimes(1);
      expect(mockExecutor.executeSubtask).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'task-c' }),
        expect.any(Object),
        undefined
      );

      // All should be completed
      expect(results.filter(r => r.status === 'completed')).toHaveLength(3);
    });
  });

  describe('pause then resume workflow continues correctly', () => {
    it('completes full workflow after pause and resume', async () => {
      const tasks: TaskWithDependencies[] = [
        createMockTask('task-a', []),
        createMockTask('task-b', ['task-a']),
        createMockTask('task-c', ['task-b']),
      ];

      // Phase 1: Execute and pause after wave 1
      mockExecutor.executeSubtask.mockImplementation(async (task) => {
        if (task.id === 'task-a') {
          scheduler.pause();
          return createSuccessfulResult('task-a', { result: 'a-done' });
        }
        return createSuccessfulResult(task.id, { result: 'done' });
      });

      const results1 = await scheduler.executeWaves(tasks, {
        userId: 'test-user',
        sessionId: 'test-session',
      }, undefined, 'workflow-123');

      expect(results1.filter(r => r.status === 'completed')).toHaveLength(1);

      // Phase 2: Resume from checkpoint
      const checkpoint: CheckpointData = {
        workflowId: 'workflow-123',
        currentWaveIndex: 0,
        totalWaves: 3,
        completedResults: {
          'task-a': { success: true, data: { result: 'a-done' } },
        },
        remainingTaskIds: ['task-b', 'task-c'],
        savedAt: new Date().toISOString(),
      };

      mockExecutor.executeSubtask.mockResolvedValue(
        createSuccessfulResult('task-b', { result: 'b-done' })
      );

      // For task-c
      mockExecutor.executeSubtask.mockImplementation(async (task) => {
        return createSuccessfulResult(task.id, { result: `${task.id}-done` });
      });

      const results2 = await scheduler.resumeFromCheckpoint(
        checkpoint,
        tasks,
        { userId: 'test-user', sessionId: 'test-session' }
      );

      // All should be completed after resume
      expect(results2.filter(r => r.status === 'completed')).toHaveLength(3);
    });
  });
});

describe('computeExecutionWaves', () => {
  it('computes correct waves for dependent tasks', () => {
    const tasks: TaskWithDependencies[] = [
      createMockTask('task-a', []),
      createMockTask('task-b', ['task-a']),
      createMockTask('task-c', ['task-a']),
      createMockTask('task-d', ['task-b', 'task-c']),
    ];

    const waves = computeExecutionWaves(tasks);

    expect(waves).toHaveLength(3);
    expect(waves[0].taskIds).toContain('task-a');
    expect(waves[1].taskIds).toEqual(expect.arrayContaining(['task-b', 'task-c']));
    expect(waves[2].taskIds).toContain('task-d');
  });
});
