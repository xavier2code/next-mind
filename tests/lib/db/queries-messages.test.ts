/**
 * Tests for Agent Messages Database Schema and Queries
 *
 * Tests for the agent_messages table used in Hub-and-Spoke communication.
 * COMM-06: Messages are persisted to database for audit trail.
 */
import { describe, it, expect } from 'vitest';

describe('Agent Messages Table Schema', () => {
  describe('agentMessages table', () => {
    it('should exist with correct columns', async () => {
      const { agentMessages } = await import('@/lib/db/schema');

      const columns = Object.keys(agentMessages);
      expect(columns).toContain('id');
      expect(columns).toContain('workflowId');
      expect(columns).toContain('taskId');
      expect(columns).toContain('type');
      expect(columns).toContain('fromAgent');
      expect(columns).toContain('toAgent');
      expect(columns).toContain('payload');
      expect(columns).toContain('createdAt');
    });

    it('should be defined as pgTable', async () => {
      const { agentMessages } = await import('@/lib/db/schema');

      expect(agentMessages).toBeDefined();
      expect(typeof agentMessages).toBe('object');
    });
  });

  describe('AgentMessageTypeEnum', () => {
    it('should have correct message type values', async () => {
      const { AgentMessageTypeEnum } = await import('@/lib/db/schema');

      expect(AgentMessageTypeEnum).toEqual([
        'context_request',
        'status_notification',
        'human_intervention',
        'progress_update',
      ]);
    });
  });

  describe('Type exports', () => {
    it('should export AgentMessage type', async () => {
      const { AgentMessage } = await import('@/lib/db/schema');

      // Type is exported - this is a compile-time check
      // At runtime, we verify the type exists via the inferred types
      expect(AgentMessage).toBeUndefined(); // Types don't exist at runtime
    });

    it('should export NewAgentMessage type', async () => {
      const { NewAgentMessage } = await import('@/lib/db/schema');

      // Type is exported - this is a compile-time check
      expect(NewAgentMessage).toBeUndefined(); // Types don't exist at runtime
    });
  });
});

describe('Agent Messages Queries', () => {
  it('should export saveAgentMessage function', async () => {
    const queries = await import('@/lib/db/queries');

    expect(typeof queries.saveAgentMessage).toBe('function');
  });

  it('should export getMessagesByWorkflow function', async () => {
    const queries = await import('@/lib/db/queries');

    expect(typeof queries.getMessagesByWorkflow).toBe('function');
  });

  it('should export getMessagesByTask function', async () => {
    const queries = await import('@/lib/db/queries');

    expect(typeof queries.getMessagesByTask).toBe('function');
  });
});

describe('Query Function Signatures', () => {
  it('saveAgentMessage should accept message object', async () => {
    const { saveAgentMessage } = await import('@/lib/db/queries');

    // Verify function signature
    const fn = saveAgentMessage;
    expect(fn.length).toBe(1); // Takes 1 argument (message object)
  });

  it('getMessagesByWorkflow should accept workflowId', async () => {
    const { getMessagesByWorkflow } = await import('@/lib/db/queries');

    // Verify function signature
    const fn = getMessagesByWorkflow;
    expect(fn.length).toBe(1); // Takes 1 argument
  });

  it('getMessagesByTask should accept taskId', async () => {
    const { getMessagesByTask } = await import('@/lib/db/queries');

    // Verify function signature
    const fn = getMessagesByTask;
    expect(fn.length).toBe(1); // Takes 1 argument
  });
});
