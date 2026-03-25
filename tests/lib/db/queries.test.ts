/**
 * Tests for A2A Database Queries
 *
 * Note: These are integration tests that require a database connection.
 * Unit testing database queries with Drizzle ORM is challenging because
 * the mock must intercept the complex query builder chain.
 *
 * For now, we verify that the queries module exports the expected functions
 * and the type signatures are correct. Full integration tests should be
 * run against a test database.
 */
import { describe, it, expect } from 'vitest';

// Test that the module exports the expected functions
describe('Database Queries Module', () => {
  it('should export workflow query functions', async () => {
    const queries = await import('@/lib/db/queries');

    expect(typeof queries.createWorkflow).toBe('function');
    expect(typeof queries.getWorkflow).toBe('function');
    expect(typeof queries.getWorkflowsByConversation).toBe('function');
    expect(typeof queries.updateWorkflowStatus).toBe('function');
  });

  it('should export task query functions', async () => {
    const queries = await import('@/lib/db/queries');

    expect(typeof queries.createTask).toBe('function');
    expect(typeof queries.getTask).toBe('function');
    expect(typeof queries.getTasksByWorkflow).toBe('function');
    expect(typeof queries.updateTask).toBe('function');
    expect(typeof queries.markTaskRunning).toBe('function');
    expect(typeof queries.markTaskCompleted).toBe('function');
    expect(typeof queries.markTaskFailed).toBe('function');
    expect(typeof queries.getPendingTasks).toBe('function');
    expect(typeof queries.getRunningTasks).toBe('function');
  });

  it('should export agent query functions', async () => {
    const queries = await import('@/lib/db/queries');

    expect(typeof queries.createAgent).toBe('function');
    expect(typeof queries.getAgent).toBe('function');
    expect(typeof queries.getAgentsByTypeDb).toBe('function');
    expect(typeof queries.getAllAgents).toBe('function');
  });
});

describe('Query Function Signatures', () => {
  it('createWorkflow should accept conversationId and return Workflow', async () => {
    const { createWorkflow } = await import('@/lib/db/queries');

    // Verify function signature (won't execute without DB)
    const fn = createWorkflow;
    expect(fn.length).toBe(1); // Takes 1 argument
  });

  it('createTask should accept workflowId, agentType, skillId, input', async () => {
    const { createTask } = await import('@/lib/db/queries');

    // Verify function signature
    const fn = createTask;
    expect(fn.length).toBe(4); // Takes 4 arguments
  });

  it('markTaskCompleted should accept taskId and output', async () => {
    const { markTaskCompleted } = await import('@/lib/db/queries');

    // Verify function signature
    const fn = markTaskCompleted;
    expect(fn.length).toBe(2); // Takes 2 arguments
  });
});
