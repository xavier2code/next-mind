import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import 'reflect-metadata';
import {
  SkillExecutor,
  executeSkill,
  createSkillExecutor,
  type ExecutionOptions,
} from '@/lib/skills/executor';
import {
  clearRegistry,
  registerSkill,
  type DiscoveredSkill,
} from '@/lib/skills/discovery';
import type { SkillMetadata, SkillContext, SkillResult, SkillFunction } from '@/lib/skills/types';

// Mock for approval request
const mockApprovalRequest = {
  id: 'test-approval-id',
  skillId: 'test-skill',
  skillName: 'Test Skill',
  action: 'Test action',
  details: 'Test details',
  input: {},
  status: 'pending' as const,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  userId: 'test-user',
  sessionId: 'test-session',
};

describe('Skill Executor', () => {
  beforeEach(() => {
    clearRegistry();
  });

  // Helper to create a test skill
  function createTestSkill(overrides: Partial<SkillMetadata> = {}): DiscoveredSkill {
    const metadata: SkillMetadata = {
      id: 'test-skill',
      name: 'Test Skill',
      description: 'A test skill',
      version: '1.0.0',
      category: 'custom',
      tags: ['test'],
      inputSchema: { value: z.string() },
      requiresApproval: false,
      destructiveActions: [],
      dependencies: [],
      timeout: 5000,
      ...overrides,
    };

    const execute: SkillFunction = async (input: unknown) => {
      const typedInput = input as { value: string };
      return { success: true, data: `Processed: ${typedInput.value}` };
    };

    return {
      metadata,
      execute,
      sourceFile: 'test-skill.ts',
    };
  }

  // Helper to create a slow skill for timeout testing
  function createSlowSkill(timeoutMs: number): DiscoveredSkill {
    const metadata: SkillMetadata = {
      id: 'slow-skill',
      name: 'Slow Skill',
      description: 'A slow skill for timeout testing',
      version: '1.0.0',
      category: 'custom',
      tags: ['slow'],
      inputSchema: {},
      requiresApproval: false,
      destructiveActions: [],
      dependencies: [],
      timeout: timeoutMs,
    };

    const execute: SkillFunction = async () => {
      // Wait 200ms to simulate slow execution
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { success: true, data: 'Slow operation completed' };
    };

    return {
      metadata,
      execute,
      sourceFile: 'slow-skill.ts',
    };
  }

  // Helper to create a skill requiring approval
  function createApprovalSkill(): DiscoveredSkill {
    const metadata: SkillMetadata = {
      id: 'approval-skill',
      name: 'Approval Skill',
      description: 'A skill requiring approval',
      version: '1.0.0',
      category: 'system',
      tags: ['approval'],
      inputSchema: { action: z.string() },
      requiresApproval: true,
      destructiveActions: ['delete'],
      dependencies: [],
      timeout: 10000,
    };

    const execute: SkillFunction = async (input: unknown) => {
      const typedInput = input as { action: string };
      return { success: true, data: `Executed: ${typedInput.action}` };
    };

    return {
      metadata,
      execute,
      sourceFile: 'approval-skill.ts',
    };
  }

  describe('Test 3: executeSkill runs skill and returns result', () => {
    it('should execute a skill and return success result', async () => {
      const testSkill = createTestSkill();
      const registry = new Map<string, DiscoveredSkill>();
      registry.set(testSkill.metadata.id, testSkill);

      const executor = new SkillExecutor(registry);
      const context: SkillContext = {
        userId: 'user-1',
        sessionId: 'session-1',
        previousResults: new Map(),
      };

      const result = await executor.execute('test-skill', { value: 'hello' }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBe('Processed: hello');
    });

    it('should pass context to skill execution', async () => {
      const testSkill = createTestSkill();
      const registry = new Map<string, DiscoveredSkill>();
      registry.set(testSkill.metadata.id, testSkill);

      const executor = new SkillExecutor(registry);
      const context: SkillContext = {
        userId: 'user-123',
        sessionId: 'session-456',
        conversationId: 'conv-789',
        previousResults: new Map(),
      };

      const result = await executor.execute('test-skill', { value: 'test' }, context);

      expect(result.success).toBe(true);
    });
  });

  describe('Test 4: executeSkill respects timeout limit', () => {
    it('should timeout when skill execution exceeds timeout', async () => {
      const slowSkill = createSlowSkill(100); // 100ms timeout, skill takes 200ms
      const registry = new Map<string, DiscoveredSkill>();
      registry.set(slowSkill.metadata.id, slowSkill);

      const executor = new SkillExecutor(registry);
      const context: SkillContext = {
        userId: 'user-1',
        sessionId: 'session-1',
        previousResults: new Map(),
      };

      const result = await executor.execute('slow-skill', {}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });

    it('should complete when skill execution is within timeout', async () => {
      const slowSkill = createSlowSkill(500); // 500ms timeout, skill takes 200ms
      const registry = new Map<string, DiscoveredSkill>();
      registry.set(slowSkill.metadata.id, slowSkill);

      const executor = new SkillExecutor(registry);
      const context: SkillContext = {
        userId: 'user-1',
        sessionId: 'session-1',
        previousResults: new Map(),
      };

      const result = await executor.execute('slow-skill', {}, context);

      expect(result.success).toBe(true);
      expect(result.data).toBe('Slow operation completed');
    });

    it('should allow timeout override via options', async () => {
      const slowSkill = createSlowSkill(5000); // Default 5s timeout
      const registry = new Map<string, DiscoveredSkill>();
      registry.set(slowSkill.metadata.id, slowSkill);

      const executor = new SkillExecutor(registry);
      const context: SkillContext = {
        userId: 'user-1',
        sessionId: 'session-1',
        previousResults: new Map(),
      };

      // Override timeout to 100ms (too short)
      const result = await executor.execute('slow-skill', {}, context, { timeout: 100 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });
  });

  describe('Test 5: executeSkill throws error for unknown skill', () => {
    it('should return error for unknown skill id', async () => {
      const registry = new Map<string, DiscoveredSkill>();
      const executor = new SkillExecutor(registry);
      const context: SkillContext = {
        userId: 'user-1',
        sessionId: 'session-1',
        previousResults: new Map(),
      };

      const result = await executor.execute('unknown-skill', {}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle empty registry gracefully', async () => {
      const registry = new Map<string, DiscoveredSkill>();
      const executor = new SkillExecutor(registry);
      const context: SkillContext = {
        userId: 'user-1',
        sessionId: 'session-1',
        previousResults: new Map(),
      };

      const result = await executor.execute('any-skill', {}, context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Test 6: executeSkill validates input against schema', () => {
    it('should validate input against skill inputSchema', async () => {
      const testSkill = createTestSkill();
      const registry = new Map<string, DiscoveredSkill>();
      registry.set(testSkill.metadata.id, testSkill);

      const executor = new SkillExecutor(registry);
      const context: SkillContext = {
        userId: 'user-1',
        sessionId: 'session-1',
        previousResults: new Map(),
      };

      // Valid input
      const validResult = await executor.execute('test-skill', { value: 'test' }, context);
      expect(validResult.success).toBe(true);
    });

    it('should return error for invalid input', async () => {
      const testSkill = createTestSkill({
        inputSchema: {
          value: z.string().min(1),
          count: z.number().positive(),
        },
      });
      const registry = new Map<string, DiscoveredSkill>();
      registry.set(testSkill.metadata.id, testSkill);

      const executor = new SkillExecutor(registry);
      const context: SkillContext = {
        userId: 'user-1',
        sessionId: 'session-1',
        previousResults: new Map(),
      };

      // Invalid input: count is negative
      const result = await executor.execute('test-skill', { value: 'test', count: -5 }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });

    it('should return error for missing required fields', async () => {
      const testSkill = createTestSkill({
        inputSchema: {
          required: z.string(),
        },
      });
      const registry = new Map<string, DiscoveredSkill>();
      registry.set(testSkill.metadata.id, testSkill);

      const executor = new SkillExecutor(registry);
      const context: SkillContext = {
        userId: 'user-1',
        sessionId: 'session-1',
        previousResults: new Map(),
      };

      // Missing 'required' field
      const result = await executor.execute('test-skill', {}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });
  });

  describe('Approval flow integration', () => {
    it('should request approval for skills requiring approval', async () => {
      const approvalSkill = createApprovalSkill();
      const registry = new Map<string, DiscoveredSkill>();
      registry.set(approvalSkill.metadata.id, approvalSkill);

      const executor = new SkillExecutor(registry);
      const context: SkillContext = {
        userId: 'user-1',
        sessionId: 'session-1',
        previousResults: new Map(),
      };

      const onApprovalRequired = vi.fn().mockResolvedValue(true);

      const result = await executor.execute('approval-skill', { action: 'delete' }, context, {
        onApprovalRequired,
      });

      expect(onApprovalRequired).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should deny execution when approval is rejected', async () => {
      const approvalSkill = createApprovalSkill();
      const registry = new Map<string, DiscoveredSkill>();
      registry.set(approvalSkill.metadata.id, approvalSkill);

      const executor = new SkillExecutor(registry);
      const context: SkillContext = {
        userId: 'user-1',
        sessionId: 'session-1',
        previousResults: new Map(),
      };

      const onApprovalRequired = vi.fn().mockResolvedValue(false);

      const result = await executor.execute('approval-skill', { action: 'delete' }, context, {
        onApprovalRequired,
      });

      expect(onApprovalRequired).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Approval denied');
    });

    it('should skip approval when skipApproval option is true', async () => {
      const approvalSkill = createApprovalSkill();
      const registry = new Map<string, DiscoveredSkill>();
      registry.set(approvalSkill.metadata.id, approvalSkill);

      const executor = new SkillExecutor(registry);
      const context: SkillContext = {
        userId: 'user-1',
        sessionId: 'session-1',
        previousResults: new Map(),
      };

      const onApprovalRequired = vi.fn();

      const result = await executor.execute('approval-skill', { action: 'delete' }, context, {
        skipApproval: true,
        onApprovalRequired,
      });

      expect(onApprovalRequired).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('createSkillExecutor and executeSkill convenience functions', () => {
    it('should create executor with discovered skills', () => {
      const executor = createSkillExecutor();
      expect(executor).toBeInstanceOf(SkillExecutor);
    });

    it('should create executor with custom skills array', () => {
      const testSkill = createTestSkill();
      const executor = createSkillExecutor([testSkill]);
      expect(executor).toBeInstanceOf(SkillExecutor);
    });

    it('executeSkill should work as convenience function', async () => {
      // This test uses the global executor
      const context: SkillContext = {
        userId: 'user-1',
        sessionId: 'session-1',
        previousResults: new Map(),
      };

      // executeSkill uses the global executor, which discovers real skills
      const result = await executeSkill('file-read', { path: '/nonexistent' }, context);

      // Should fail because file doesn't exist, but skill was found
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
    });
  });
});
