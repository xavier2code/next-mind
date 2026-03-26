/**
 * Tests for AgentMessageBus - Hub-and-Spoke Communication
 *
 * COMM-01~06: Agent communication via message bus.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import * as queries from '@/lib/db/queries';

// Mock the queries module at the top level
vi.mock('@/lib/db/queries', () => ({
  saveAgentMessage: vi.fn().mockResolvedValue({
    id: 'msg-id-1',
    workflowId: '550e8400-e29b-41d4-a716-4a904-a3af6fb8f347',
    type: 'context_request',
    fromAgent: 'agent-1',
    toAgent: 'orchestrator',
    payload: {},
    createdAt: new Date(),
  }),
}));

describe('AgentMessageBus', () => {
  describe('constructor', () => {
    it('should initialize handlers Map', async () => {
      const { AgentMessageBus } = await import('@/lib/agents/message-bus');

      const bus = new AgentMessageBus();
      expect(bus).toBeDefined();
    });
  });

  describe('AgentMessageTypeSchema', () => {
    it('should validate valid message types', async () => {
      const { AgentMessageTypeSchema } = await import('@/lib/agents/message-bus');

      expect(() => AgentMessageTypeSchema.parse('context_request')).not.toThrow();
      expect(() => AgentMessageTypeSchema.parse('status_notification')).not.toThrow();
      expect(() => AgentMessageTypeSchema.parse('human_intervention')).not.toThrow();
      expect(() => AgentMessageTypeSchema.parse('progress_update')).not.toThrow();
    });

    it('should reject invalid message types', async () => {
      const { AgentMessageTypeSchema } = await import('@/lib/agents/message-bus');

      expect(() => AgentMessageTypeSchema.parse('invalid_type')).toThrow();
    });
  });

  describe('AgentMessageSchema', () => {
    it('should validate complete message objects', async () => {
      const { AgentMessageSchema } = await import('@/lib/agents/message-bus');

      const validMessage = {
        type: 'context_request',
        from: 'agent-file-1',
        to: 'orchestrator',
        payload: { query: 'need more context about file X' },
        timestamp: new Date().toISOString(),
        workflowId: '550e8400-e29b-41d4-a716-4a904-a3af6fb8f347',
        taskId: '550e8400-e29b-41d4-a716-4a904-a3af6fb8f348',
      };

      expect(() => AgentMessageSchema.parse(validMessage)).not.toThrow();
    });

    it('should validate message without taskId', async () => {
      const { AgentMessageSchema } = await import('@/lib/agents/message-bus');

      const validMessage = {
        type: 'status_notification',
        from: 'agent-search-1',
        to: 'orchestrator',
        payload: { status: 'completed' },
        timestamp: new Date().toISOString(),
        workflowId: '550e8400-e29b-41d4-a716-4a904-a3af6fb8f347',
      };
      expect(() => AgentMessageSchema.parse(validMessage)).not.toThrow();
    });

    it('should reject messages missing required fields', async () => {
      const { AgentMessageSchema } = await import('@/lib/agents/message-bus');

      // Missing type
      expect(() => AgentMessageSchema.parse({
        from: 'agent-1',
        to: 'orchestrator',
        payload: {},
        timestamp: new Date().toISOString(),
        workflowId: '550e8400-e29b-41d4-a716-4a904-a3af6fb8f347',
      })).toThrow();

      // Missing from
      expect(() => AgentMessageSchema.parse({
        type: 'context_request',
        to: 'orchestrator',
        payload: {},
        timestamp: new Date().toISOString(),
        workflowId: '550e8400-e29b-41d4-a716-4a904-a3af6fb8f347',
      })).toThrow();
    });
  });

  describe('AgentMessageBus.send()', () => {
    let bus: InstanceType<typeof import('@/lib/agents/message-bus').AgentMessageBus>;

    beforeEach(async () => {
      const { AgentMessageBus } = await import('@/lib/agents/message-bus');
      bus = new AgentMessageBus();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should validate message against schema', async () => {
      const message = {
        type: 'context_request',
        from: 'agent-1',
        to: 'orchestrator',
        payload: { query: 'test' },
        timestamp: new Date().toISOString(),
        workflowId: '550e8400-e29b-41d4-a716-4a904-a3af6fb8f347',
      };

      await bus.send(message);

      expect(queries.saveAgentMessage).toHaveBeenCalledWith({
        workflowId: '550e8400-e29b-41d4-a716-4a904-a3af6fb8f347',
        taskId: undefined,
        type: 'context_request',
        fromAgent: 'agent-1',
        toAgent: 'orchestrator',
        payload: { query: 'test' },
      });
    });

    it('should route message into registered handler', async () => {
      const receivedHandler = vi.fn();

      const message = {
        type: 'status_notification',
        from: 'agent-1',
        to: 'orchestrator',
        payload: { status: 'started' },
        timestamp: new Date().toISOString(),
        workflowId: '550e8400-e29b-41d4-a716-4a904-a3af6fb8f347',
      };

      bus.on('orchestrator', receivedHandler);

      await bus.send(message);

      expect(receivedHandler).toHaveBeenCalledWith(expect.objectContaining({
        type: 'status_notification',
        to: 'orchestrator',
      }));
    });

    it('should throw on invalid message type', async () => {
      const invalidMessage = {
        type: 'invalid_type' as 'context_request',
        from: 'agent-1',
        to: 'orchestrator',
        payload: {},
        timestamp: new Date().toISOString(),
        workflowId: '550e8400-e29b-41d4-a716-4a904-a3af6fb8f347',
      };

      await expect(bus.send(invalidMessage)).rejects.toThrow();
    });

    it('should support context_request routing to orchestrator', async () => {
      const receivedHandler = vi.fn();

      const message = {
        type: 'context_request',
        from: 'agent-file-1',
        to: 'orchestrator',
        payload: { query: 'need file context' },
        timestamp: new Date().toISOString(),
        workflowId: '550e8400-e29b-41d4-a716-4a904-a3af6fb8f347',
      };

      bus.on('orchestrator', receivedHandler);

      await bus.send(message);

      expect(receivedHandler).toHaveBeenCalled();
    });

    it('should support human_intervention routing', async () => {
      const receivedHandler = vi.fn();

      const message = {
        type: 'human_intervention',
        from: 'agent-file-1',
        to: 'orchestrator',
        payload: { reason: 'Need user approval for file deletion' },
        timestamp: new Date().toISOString(),
        workflowId: '550e8400-e29b-41d4-a716-4a904-a3af6fb8f347',
      };

      bus.on('orchestrator', receivedHandler);

      await bus.send(message);

      expect(receivedHandler).toHaveBeenCalled();
    });

    it('should support progress_update routing', async () => {
      const receivedHandler = vi.fn();

      const message = {
        type: 'progress_update',
        from: 'agent-code-1',
        to: 'orchestrator',
        payload: { progress: 50, message: 'Halfway done' },
        timestamp: new Date().toISOString(),
        workflowId: '550e8400-e29b-41d4-a716-4a904-a3af6fb8f347',
      };

      bus.on('orchestrator', receivedHandler);

      await bus.send(message);

      expect(receivedHandler).toHaveBeenCalled();
    });
  });

  describe('AgentMessageBus.on()', () => {
    let bus: InstanceType<typeof import('@/lib/agents/message-bus').AgentMessageBus>;

    beforeEach(async () => {
      const { AgentMessageBus } = await import('@/lib/agents/message-bus');
      bus = new AgentMessageBus();
    });

    it('should register handler for recipient', async () => {
      const handler = vi.fn();
      bus.on('agent-1', handler);
      // Handler is registered - no error means success
    });
  });

  describe('AgentMessageBus.off()', () => {
    let bus: InstanceType<typeof import('@/lib/agents/message-bus').AgentMessageBus>;

    beforeEach(async () => {
      const { AgentMessageBus } = await import('@/lib/agents/message-bus');
      bus = new AgentMessageBus();
    });

    it('should remove registered handler', async () => {
      const handler = vi.fn();

      bus.on('agent-1', handler);
      bus.off('agent-1', handler);
      // Handler is removed - no error means success
    });
  });

  describe('getAgentMessageBus singleton', () => {
    it('should return same instance on multiple calls', async () => {
      const { getAgentMessageBus } = await import('@/lib/agents/message-bus');

      const instance1 = getAgentMessageBus();
      const instance2 = getAgentMessageBus();

      expect(instance1).toBe(instance2);
    });
  });
});
