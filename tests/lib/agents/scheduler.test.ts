/**
 * Tests for Wave-Based Task Scheduler
 *
 * ORCH-01~05: Comprehensive tests for dependency analysis, parallel execution,
 * circular dependency detection, cascade cancel, and wave execution.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeExecutionWaves,
  WaveScheduler,
  CircularDependencyError,
  MAX_CONCURRENCY,
  type TaskWithDependencies,
  type ScheduledTask,
} from '@/lib/agents/scheduler';
import type { SubAgentExecutor, SubAgentExecutionResult } from '@/lib/agents/executor';

// Helper to create a test task
function createTask(
  id: string,
  dependencies: string[] = [],
  overrides: Partial<TaskWithDependencies> = {}
): TaskWithDependencies {
  return {
    id,
    agentType: 'code',
    skillId: `skill-${id}`,
    input: {},
    dependencies,
    ...overrides,
  };
}

describe('computeExecutionWaves', () => {
  it('returns empty array for empty input', () => {
    expect(computeExecutionWaves([])).toEqual([]);
  });

  it('returns single wave for single task with no dependencies', () => {
    const tasks = [createTask('A')];
    const waves = computeExecutionWaves(tasks);

    expect(waves).toHaveLength(1);
    expect(waves[0]).toEqual({
      waveIndex: 0,
      taskIds: ['A'],
    });
  });

  it('returns single wave for multiple tasks with no dependencies', () => {
    const tasks = [createTask('A'), createTask('B'), createTask('C')];
    const waves = computeExecutionWaves(tasks);

    expect(waves).toHaveLength(1);
    expect(waves[0].taskIds).toEqual(expect.arrayContaining(['A', 'B', 'C']));
  });

  it('returns two waves for simple chain A -> B', () => {
    const tasks = [createTask('A'), createTask('B', ['A'])];
    const waves = computeExecutionWaves(tasks);

    expect(waves).toHaveLength(2);
    expect(waves[0].taskIds).toContain('A');
    expect(waves[1].taskIds).toContain('B');
  });

  it('returns correct waves for A -> B, A -> C', () => {
    const tasks = [
      createTask('A'),
      createTask('B', ['A']),
      createTask('C', ['A']),
    ];
    const waves = computeExecutionWaves(tasks);

    expect(waves).toHaveLength(2);
    expect(waves[0].taskIds).toContain('A');
    expect(waves[1].taskIds).toEqual(expect.arrayContaining(['B', 'C']));
  });

  it('returns three waves for chain A -> B -> C', () => {
    const tasks = [
      createTask('A'),
      createTask('B', ['A']),
      createTask('C', ['B']),
    ];
    const waves = computeExecutionWaves(tasks);

    expect(waves).toHaveLength(3);
    expect(waves[0].taskIds).toContain('A');
    expect(waves[1].taskIds).toContain('B');
    expect(waves[2].taskIds).toContain('C');
  });

  it('handles diamond dependency A -> B, A -> C, B -> D, C -> D', () => {
    const tasks = [
      createTask('A'),
      createTask('B', ['A']),
      createTask('C', ['A']),
      createTask('D', ['B', 'C']),
    ];
    const waves = computeExecutionWaves(tasks);

    expect(waves).toHaveLength(3);
    expect(waves[0].taskIds).toContain('A');
    expect(waves[1].taskIds).toEqual(expect.arrayContaining(['B', 'C']));
    expect(waves[2].taskIds).toContain('D');
  });

  it('throws CircularDependencyError for circular dependency A -> B -> A', () => {
    const tasks = [
      createTask('A', ['B']),
      createTask('B', ['A']),
    ];

    expect(() => computeExecutionWaves(tasks)).toThrow(CircularDependencyError);
  });

  it('throws CircularDependencyError for longer cycle A -> B -> C -> A', () => {
    const tasks = [
      createTask('A', ['C']),
      createTask('B', ['A']),
      createTask('C', ['B']),
    ];

    expect(() => computeExecutionWaves(tasks)).toThrow(CircularDependencyError);
  });

  it('respects maxConcurrency parameter', () => {
    const tasks = [
      createTask('A'),
      createTask('B'),
      createTask('C'),
      createTask('D'),
      createTask('E'),
    ];
    const waves = computeExecutionWaves(tasks, 2);

    // With maxConcurrency=2, 5 tasks should be split into multiple waves
    expect(waves.length).toBeGreaterThan(1);
    for (const wave of waves) {
      expect(wave.taskIds.length).toBeLessThanOrEqual(2);
    }
  });

  it('uses MAX_CONCURRENCY=3 by default', () => {
    const tasks = [
      createTask('A'),
      createTask('B'),
      createTask('C'),
      createTask('D'),
    ];
    const waves = computeExecutionWaves(tasks);

    // With default MAX_CONCURRENCY=3, first wave should have 3 tasks
    expect(waves[0].taskIds.length).toBe(3);
    expect(waves[1].taskIds.length).toBe(1);
  });

  it('handles complex dependency graph', () => {
    // Complex graph:
    // A -> B -> D
    // A -> C -> D
    // E (independent)
    const tasks = [
      createTask('A'),
      createTask('B', ['A']),
      createTask('C', ['A']),
      createTask('D', ['B', 'C']),
      createTask('E'),
    ];
    const waves = computeExecutionWaves(tasks);

    // Wave 0: A, E (no dependencies)
    expect(waves[0].taskIds).toEqual(expect.arrayContaining(['A', 'E']));
    // Wave 1: B, C (depend on A)
    expect(waves[1].taskIds).toEqual(expect.arrayContaining(['B', 'C']));
    // Wave 2: D (depends on B and C)
    expect(waves[2].taskIds).toContain('D');
  });
});

describe('WaveScheduler', () => {
  let mockExecutor: SubAgentExecutor;
  let scheduler: WaveScheduler;

  beforeEach(() => {
    // Create mock executor
    mockExecutor = {
      executeSubtask: vi.fn(),
    } as unknown as SubAgentExecutor;

    scheduler = new WaveScheduler(mockExecutor);
  });

  const baseContext = {
    userId: 'user-1',
    sessionId: 'session-1',
    conversationId: 'conv-1',
  };

  it('returns empty array for empty tasks', async () => {
    const result = await scheduler.executeWaves([], baseContext);
    expect(result).toEqual([]);
  });

  it('executes single task successfully', async () => {
    const mockResult: SubAgentExecutionResult = {
      success: true,
      taskId: 'task-1',
      workflowId: 'wf-1',
      result: { success: true, data: { output: 'done' } },
    };

    vi.mocked(mockExecutor.executeSubtask).mockResolvedValue(mockResult);

    const tasks = [createTask('A')];
    const result = await scheduler.executeWaves(tasks, baseContext);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('completed');
    expect(result[0].task.id).toBe('A');
  });

  it('executes tasks in correct wave order', async () => {
    vi.mocked(mockExecutor.executeSubtask).mockResolvedValue({
      success: true,
      taskId: 'test',
      workflowId: 'wf-1',
    });

    const tasks = [
      createTask('A'),
      createTask('B', ['A']),
      createTask('C', ['B']),
    ];
    const result = await scheduler.executeWaves(tasks, baseContext);

    // All should complete
    expect(result.every(r => r.status === 'completed')).toBe(true);

    // Verify wave indices
    const taskA = result.find(r => r.task.id === 'A');
    const taskB = result.find(r => r.task.id === 'B');
    const taskC = result.find(r => r.task.id === 'C');

    expect(taskA?.waveIndex).toBe(0);
    expect(taskB?.waveIndex).toBe(1);
    expect(taskC?.waveIndex).toBe(2);
  });

  it('executes parallel tasks concurrently', async () => {
    const executionOrder: string[] = [];

    vi.mocked(mockExecutor.executeSubtask).mockImplementation(async (task) => {
      executionOrder.push(task.skillId);
      await new Promise(resolve => setTimeout(resolve, 10));
      return {
        success: true,
        taskId: task.skillId,
        workflowId: 'wf-1',
      };
    });

    const tasks = [
      createTask('A'),
      createTask('B'),
      createTask('C'),
    ];
    await scheduler.executeWaves(tasks, baseContext);

    // All tasks should have been called
    expect(executionOrder).toHaveLength(3);
    expect(executionOrder).toEqual(expect.arrayContaining(['skill-A', 'skill-B', 'skill-C']));
  });

  it('cancels dependent tasks when parent fails (cascade cancel)', async () => {
    vi.mocked(mockExecutor.executeSubtask)
      .mockImplementationOnce(async () => ({
        success: false,
        taskId: 'A',
        workflowId: 'wf-1',
        error: 'Task A failed',
      }))
      .mockImplementation(async () => ({
        success: true,
        taskId: 'B',
        workflowId: 'wf-1',
      }));

    const tasks = [
      createTask('A'),
      createTask('B', ['A']), // B depends on A
    ];
    const result = await scheduler.executeWaves(tasks, baseContext);

    // A should be failed
    const taskA = result.find(r => r.task.id === 'A');
    expect(taskA?.status).toBe('failed');

    // B should be cancelled (cascade)
    const taskB = result.find(r => r.task.id === 'B');
    expect(taskB?.status).toBe('cancelled');
  });

  it('marks task as failed when executor returns failure', async () => {
    vi.mocked(mockExecutor.executeSubtask).mockResolvedValue({
      success: false,
      taskId: 'A',
      workflowId: 'wf-1',
      error: 'Execution failed',
    });

    const tasks = [createTask('A')];
    const result = await scheduler.executeWaves(tasks, baseContext);

    expect(result[0].status).toBe('failed');
    expect(result[0].result?.error).toBe('Execution failed');
  });

  it('handles mix of successful and failed tasks in same wave', async () => {
    vi.mocked(mockExecutor.executeSubtask)
      .mockImplementationOnce(async () => ({
        success: true,
        taskId: 'A',
        workflowId: 'wf-1',
      }))
      .mockImplementationOnce(async () => ({
        success: false,
        taskId: 'B',
        workflowId: 'wf-1',
        error: 'B failed',
      }))
      .mockImplementationOnce(async () => ({
        success: true,
        taskId: 'C',
        workflowId: 'wf-1',
      }));

    const tasks = [
      createTask('A'),
      createTask('B'),
      createTask('C'),
    ];
    const result = await scheduler.executeWaves(tasks, baseContext);

    const taskA = result.find(r => r.task.id === 'A');
    const taskB = result.find(r => r.task.id === 'B');
    const taskC = result.find(r => r.task.id === 'C');

    expect(taskA?.status).toBe('completed');
    expect(taskB?.status).toBe('failed');
    expect(taskC?.status).toBe('completed');
  });

  it('passes previous results to subsequent tasks', async () => {
    let capturedContext: unknown = null;

    vi.mocked(mockExecutor.executeSubtask)
      .mockImplementationOnce(async (task, context) => ({
        success: true,
        taskId: 'A',
        workflowId: 'wf-1',
        result: { success: true, data: { value: 'from-A' } },
      }))
      .mockImplementationOnce(async (task, context) => {
        capturedContext = context;
        return {
          success: true,
          taskId: 'B',
          workflowId: 'wf-1',
        };
      });

    const tasks = [
      createTask('A'),
      createTask('B', ['A']),
    ];
    await scheduler.executeWaves(tasks, baseContext);

    // B should have received previousResults from A
    expect(capturedContext).not.toBeNull();
    expect((capturedContext as { previousResults: Map<string, unknown> }).previousResults).toBeInstanceOf(Map);
  });
});

describe('CircularDependencyError', () => {
  it('has correct name', () => {
    const error = new CircularDependencyError();
    expect(error.name).toBe('CircularDependencyError');
  });

  it('has default message', () => {
    const error = new CircularDependencyError();
    expect(error.message).toBe('Circular dependency detected in task graph');
  });

  it('accepts custom message', () => {
    const error = new CircularDependencyError('Custom message');
    expect(error.message).toBe('Custom message');
  });
});

describe('MAX_CONCURRENCY', () => {
  it('is set to 3', () => {
    expect(MAX_CONCURRENCY).toBe(3);
  });
});
