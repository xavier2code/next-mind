/**
 * Tests for Workflow Control API
 *
 * CTRL-01, CTRL-02, CTRL-05: User control over workflow execution
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateControlAction,
  pauseWorkflow,
  resumeWorkflow,
  cancelWorkflowController,
  type WorkflowControlAction,
} from '@/lib/agents/workflow-controller';
import type { WorkflowStatus } from '@/lib/db/schema';

// Mock the database queries
vi.mock('@/lib/db/queries', () => ({
  getWorkflow: vi.fn(),
  updateWorkflowStatus: vi.fn(),
  loadCheckpoint: vi.fn(),
  getTasksByWorkflow: vi.fn().mockResolvedValue([]),
}));

// Mock the scheduler
vi.mock('@/lib/agents/scheduler', () => ({
  getWaveScheduler: vi.fn().mockReturnValue({
    pause: vi.fn(),
    cancel: vi.fn(),
    resumeFromCheckpoint: vi.fn().mockResolvedValue([]),
  }),
}));

describe('validateControlAction', () => {
  describe('valid transitions', () => {
    it('allows pause from running state', () => {
      const result = validateControlAction('running', 'pause');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows resume from paused state', () => {
      const result = validateControlAction('paused', 'resume');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows cancel from running state', () => {
      const result = validateControlAction('running', 'cancel');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows cancel from paused state', () => {
      const result = validateControlAction('paused', 'cancel');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows cancel from pausing state', () => {
      const result = validateControlAction('pausing', 'cancel');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('invalid transitions', () => {
    it('rejects pause from completed state', () => {
      const result = validateControlAction('completed', 'pause');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot pause');
      expect(result.error).toContain('completed');
    });

    it('rejects pause from paused state', () => {
      const result = validateControlAction('paused', 'pause');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot pause');
    });

    it('rejects resume from running state', () => {
      const result = validateControlAction('running', 'resume');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot resume');
    });

    it('rejects cancel from completed state', () => {
      const result = validateControlAction('completed', 'cancel');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot cancel');
    });

    it('rejects cancel from failed state', () => {
      const result = validateControlAction('failed', 'cancel');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot cancel');
    });
  });
});

describe('pauseWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when workflow not found', async () => {
    const { getWorkflow } = await import('@/lib/db/queries');
    (getWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await pauseWorkflow('nonexistent-workflow');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Workflow not found');
    expect(result.status).toBe('failed');
  });

  it('returns error when workflow not in running state', async () => {
    const { getWorkflow } = await import('@/lib/db/queries');
    (getWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'workflow-123',
      status: 'completed',
    });

    const result = await pauseWorkflow('workflow-123');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot pause');
    expect(result.error).toContain('completed');
  });

  it('pauses running workflow successfully', async () => {
    const { getWorkflow, updateWorkflowStatus } = await import('@/lib/db/queries');
    (getWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'workflow-123',
      status: 'running',
    });
    (updateWorkflowStatus as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await pauseWorkflow('workflow-123');

    expect(result.success).toBe(true);
    expect(result.status).toBe('pausing');
    expect(updateWorkflowStatus).toHaveBeenCalledWith('workflow-123', 'pausing');
  });
});

describe('resumeWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when workflow not found', async () => {
    const { getWorkflow } = await import('@/lib/db/queries');
    (getWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await resumeWorkflow('nonexistent-workflow', [], {
      userId: 'user-1',
      sessionId: 'session-1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Workflow not found');
  });

  it('returns error when workflow not in paused state', async () => {
    const { getWorkflow } = await import('@/lib/db/queries');
    (getWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'workflow-123',
      status: 'running',
    });

    const result = await resumeWorkflow('workflow-123', [], {
      userId: 'user-1',
      sessionId: 'session-1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot resume');
  });

  it('returns error when no checkpoint found', async () => {
    const { getWorkflow, loadCheckpoint } = await import('@/lib/db/queries');
    (getWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'workflow-123',
      status: 'paused',
    });
    (loadCheckpoint as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await resumeWorkflow('workflow-123', [], {
      userId: 'user-1',
      sessionId: 'session-1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('No checkpoint found');
  });

  it('resumes paused workflow with checkpoint', async () => {
    const { getWorkflow, loadCheckpoint, updateWorkflowStatus } = await import('@/lib/db/queries');
    (getWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'workflow-123',
      status: 'paused',
    });
    (loadCheckpoint as ReturnType<typeof vi.fn>).mockResolvedValue({
      workflowId: 'workflow-123',
      currentWaveIndex: 0,
      totalWaves: 2,
      completedResults: {},
      remainingTaskIds: ['task-1'],
      savedAt: new Date().toISOString(),
    });
    (updateWorkflowStatus as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await resumeWorkflow('workflow-123', [], {
      userId: 'user-1',
      sessionId: 'session-1',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('running');
    expect(updateWorkflowStatus).toHaveBeenCalledWith('workflow-123', 'running');
  });
});

describe('cancelWorkflowController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when workflow not found', async () => {
    const { getWorkflow } = await import('@/lib/db/queries');
    (getWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await cancelWorkflowController('nonexistent-workflow');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Workflow not found');
  });

  it('returns error when workflow cannot be cancelled', async () => {
    const { getWorkflow } = await import('@/lib/db/queries');
    (getWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'workflow-123',
      status: 'completed',
    });

    const result = await cancelWorkflowController('workflow-123');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot cancel');
  });

  it('cancels running workflow', async () => {
    const { getWorkflow, updateWorkflowStatus } = await import('@/lib/db/queries');
    (getWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'workflow-123',
      status: 'running',
    });
    (updateWorkflowStatus as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await cancelWorkflowController('workflow-123');

    expect(result.success).toBe(true);
    expect(result.status).toBe('cancelled');
    expect(updateWorkflowStatus).toHaveBeenCalledWith('workflow-123', 'cancelled');
  });

  it('cancels paused workflow', async () => {
    const { getWorkflow, updateWorkflowStatus } = await import('@/lib/db/queries');
    (getWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'workflow-123',
      status: 'paused',
    });
    (updateWorkflowStatus as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await cancelWorkflowController('workflow-123');

    expect(result.success).toBe(true);
    expect(result.status).toBe('cancelled');
  });

  it('cancels pausing workflow', async () => {
    const { getWorkflow, updateWorkflowStatus } = await import('@/lib/db/queries');
    (getWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'workflow-123',
      status: 'pausing',
    });
    (updateWorkflowStatus as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await cancelWorkflowController('workflow-123');

    expect(result.success).toBe(true);
    expect(result.status).toBe('cancelled');
  });
});
