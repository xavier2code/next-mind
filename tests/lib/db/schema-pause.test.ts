/**
 * Tests for workflow pause/resume schema extensions
 *
 * CTRL-01: User can pause a running workflow
 * CTRL-04: Paused workflow saves checkpoint to database
 * CTRL-05: User can resume a paused workflow from checkpoint
 */
import { describe, it, expect } from 'vitest';
import {
  WorkflowStatusEnum,
  TaskStatusEnum,
  type WorkflowCheckpoint,
} from '@/lib/db/schema';

describe('Workflow Schema - Pause/Resume', () => {
  describe('WorkflowStatusEnum', () => {
    it('includes paused state', () => {
      expect(WorkflowStatusEnum).toContain('paused');
    });

    it('includes pausing state', () => {
      expect(WorkflowStatusEnum).toContain('pausing');
    });

    it('includes cancelled state', () => {
      expect(WorkflowStatusEnum).toContain('cancelled');
    });

    it('maintains original states', () => {
      expect(WorkflowStatusEnum).toContain('pending');
      expect(WorkflowStatusEnum).toContain('running');
      expect(WorkflowStatusEnum).toContain('completed');
      expect(WorkflowStatusEnum).toContain('failed');
    });
  });

  describe('TaskStatusEnum', () => {
    it('includes cancelled state', () => {
      expect(TaskStatusEnum).toContain('cancelled');
    });

    it('maintains original states', () => {
      expect(TaskStatusEnum).toContain('pending');
      expect(TaskStatusEnum).toContain('running');
      expect(TaskStatusEnum).toContain('completed');
      expect(TaskStatusEnum).toContain('failed');
    });
  });

  describe('WorkflowCheckpoint type', () => {
    it('has required fields', () => {
      const checkpoint: WorkflowCheckpoint = {
        workflowId: 'test-workflow-id',
        currentWaveIndex: 0,
        totalWaves: 3,
        completedResults: {
          'task-1': { success: true, data: { result: 'test' } },
          'task-2': { success: false, error: 'Test error' },
        },
        remainingTaskIds: ['task-3', 'task-4'],
        savedAt: new Date().toISOString(),
      };

      expect(checkpoint.workflowId).toBe('test-workflow-id');
      expect(checkpoint.currentWaveIndex).toBe(0);
      expect(checkpoint.totalWaves).toBe(3);
      expect(Object.keys(checkpoint.completedResults)).toHaveLength(2);
      expect(checkpoint.remainingTaskIds).toHaveLength(2);
      expect(checkpoint.savedAt).toBeDefined();
    });

    it('supports empty completed results', () => {
      const checkpoint: WorkflowCheckpoint = {
        workflowId: 'test-workflow-id',
        currentWaveIndex: 0,
        totalWaves: 1,
        completedResults: {},
        remainingTaskIds: ['task-1'],
        savedAt: new Date().toISOString(),
      };

      expect(checkpoint.completedResults).toEqual({});
    });

    it('supports empty remaining tasks', () => {
      const checkpoint: WorkflowCheckpoint = {
        workflowId: 'test-workflow-id',
        currentWaveIndex: 2,
        totalWaves: 3,
        completedResults: {
          'task-1': { success: true },
          'task-2': { success: true },
          'task-3': { success: true },
        },
        remainingTaskIds: [],
        savedAt: new Date().toISOString(),
      };

      expect(checkpoint.remainingTaskIds).toEqual([]);
    });
  });
});
