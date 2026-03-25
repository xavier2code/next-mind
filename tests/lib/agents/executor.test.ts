/**
 * Tests for Sub-Agent Executor
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  SubAgentExecutor,
  getSubAgentExecutor,
  executeSubtask,
  type SubAgentExecutionOptions,
} from '@/lib/agents/executor';
import { createAgentSkillContext, type AgentSkillContext, type Subtask } from '@/lib/agents/types';
import { agentRegistry } from '@/lib/agents/registry';
import { discoverSkills, getSkillById } from '@/lib/skills/discovery';

// Mock the database queries
vi.mock('@/lib/db/queries', () => ({
  createTask: vi.fn().mockResolvedValue({ id: 'task-123', workflowId: 'workflow-456' }),
  createWorkflow: vi.fn().mockResolvedValue({ id: 'workflow-456', conversationId: 'conv-789' }),
  getTask: vi.fn().mockResolvedValue({ id: 'task-123' }),
  getWorkflow: vi.fn().mockResolvedValue({ id: 'workflow-456' }),
  markTaskRunning: vi.fn().mockResolvedValue({ id: 'task-123', status: 'running' }),
  markTaskCompleted: vi.fn().mockResolvedValue({ id: 'task-123', status: 'completed' }),
  markTaskFailed: vi.fn().mockResolvedValue({ id: 'task-123', status: 'failed' }),
  updateWorkflowStatus: vi.fn().mockResolvedValue({ id: 'workflow-456' }),
  getTasksByWorkflow: vi.fn().mockResolvedValue([]),
}));

// Mock the audit logger
vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

// Mock the skill executor
vi.mock('@/lib/skills/executor', () => ({
  createSkillExecutor: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue({
      success: true,
      data: { result: 'test data' },
      metadata: { duration: 100 },
    }),
  })),
}));

describe('SubAgentExecutor', () => {
  let executor: SubAgentExecutor;
  let mockContext: AgentSkillContext;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create executor
    executor = new SubAgentExecutor();

    // Create mock context
    mockContext = createAgentSkillContext(
      'user-123',
      'session-456',
      'workflow-789',
      'file',
      { conversationId: 'conv-123' }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createAgentSkillContext', () => {
    it('should create context with all required fields', () => {
      const context = createAgentSkillContext(
        'user-1',
        'session-1',
        'workflow-1',
        'file'
      );

      expect(context.userId).toBe('user-1');
      expect(context.sessionId).toBe('session-1');
      expect(context.workflowId).toBe('workflow-1');
      expect(context.agentType).toBe('file');
      expect(context.previousResults).toBeInstanceOf(Map);
    });

    it('should include optional fields when provided', () => {
      const context = createAgentSkillContext(
        'user-1',
        'session-1',
        'workflow-1',
        'search',
        { conversationId: 'conv-1', parentTaskId: 'task-1' }
      );

      expect(context.conversationId).toBe('conv-1');
      expect(context.parentTaskId).toBe('task-1');
    });
  });

  describe('executeSubtask', () => {
    it('should fail if no agent of the specified type is registered', async () => {
      // Clear registry
      agentRegistry.clear();

      const subtask: Subtask = {
        agentType: 'file',
        skillId: 'file-read',
        input: { path: '/test/file.txt' },
        description: 'Read a test file',
      };

      const result = await executor.executeSubtask(subtask, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No registered agent of type');
    });

    it('should fail if skill is not in agent\'s allowed skills', async () => {
      // Register agent with no skills
      const { fileAgent } = await import('@/agents');
      agentRegistry.clear();

      // Create a mock agent card with empty skillIds
      const mockCard = {
        id: 'test-file-agent',
        name: 'Test File Agent',
        description: 'A test agent',
        skillIds: ['file-read'], // Only file-read
        inputSchema: {},
        outputSchema: {},
      };

      // This will fail if file-read skill doesn't exist, so we need to mock getSkillById
      const originalGetSkillById = getSkillById;
      vi.spyOn(await import('@/lib/skills/discovery'), 'getSkillById').mockImplementation((id) => {
        if (id === 'file-read') {
          return { metadata: { id: 'file-read', name: 'File Read' } } as any;
        }
        return undefined;
      });

      agentRegistry.register(mockCard, 'file');

      const subtask: Subtask = {
        agentType: 'file',
        skillId: 'unknown-skill', // Not in agent's skills
        input: { path: '/test/file.txt' },
        description: 'Read a test file',
      };

      const result = await executor.executeSubtask(subtask, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot execute skill');
      expect(result.error).toContain('skill not in agent\'s allowed skills');
    });
  });

  describe('getSubAgentExecutor', () => {
    it('should return a singleton instance', () => {
      const instance1 = getSubAgentExecutor();
      const instance2 = getSubAgentExecutor();

      expect(instance1).toBe(instance2);
    });
  });
});

describe('AgentSkillContext type', () => {
  it('should extend SkillContext with workflow fields', () => {
    const context = createAgentSkillContext(
      'user-1',
      'session-1',
      'workflow-1',
      'code',
      { conversationId: 'conv-1', parentTaskId: 'task-1' }
    );

    // Verify required fields
    expect(context.userId).toBeDefined();
    expect(context.sessionId).toBeDefined();
    expect(context.workflowId).toBeDefined();
    expect(context.agentType).toBeDefined();
    expect(context.previousResults).toBeInstanceOf(Map);

    // Verify optional fields
    expect(context.conversationId).toBeDefined();
    expect(context.parentTaskId).toBeDefined();
  });
});
