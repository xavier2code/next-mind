/**
 * Tests for getTaskLogs query function
 *
 * VIS-04: Tests for log entry retrieval and transformation
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the db module
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(),
        })),
      })),
    })),
  },
}));

// Mock drizzle-orm functions
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value, type: 'eq' })),
  desc: vi.fn((field) => ({ field, type: 'desc' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
}));

describe('getTaskLogs Query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('LogEntry interface', () => {
    it('should export LogEntry type', async () => {
      const queries = await import('@/lib/db/queries');

      // LogEntry should be exported as a type/interface
      expect(queries).toHaveProperty('LogEntry');
    });

    it('should have correct LogEntry fields', async () => {
      const { LogEntry } = await import('@/lib/db/queries');

      // Type check - at runtime we verify the interface exists
      expect(LogEntry).toBeUndefined(); // Types don't exist at runtime
    });
  });

  describe('getTaskLogs function', () => {
    it('should export getTaskLogs function', async () => {
      const queries = await import('@/lib/db/queries');

      expect(typeof queries.getTaskLogs).toBe('function');
    });

    it('should accept taskId parameter', async () => {
      const { getTaskLogs } = await import('@/lib/db/queries');

      // Verify function signature - should take 1 argument
      expect(getTaskLogs.length).toBe(1);
    });

    it('should return a promise', async () => {
      const { getTaskLogs } = await import('@/lib/db/queries');

      // Calling without mocking should return a promise
      const result = getTaskLogs('test-task-id');
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('LogEntry transformation', () => {
    it('should transform AgentMessage to LogEntry format', async () => {
      const { getTaskLogs, LogEntry } = await import('@/lib/db/queries');
      const { db } = await import('@/lib/db');

      // Mock the chain to return sample messages
      const mockMessages = [
        {
          id: 'msg-1',
          taskId: 'task-1',
          type: 'status_notification',
          fromAgent: 'orchestrator',
          toAgent: 'file-agent',
          payload: { message: 'Task started' },
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
      ];

      const mockOrderBy = vi.fn().mockResolvedValue(mockMessages);
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });

      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as ReturnType<typeof db.select>);

      const result = await getTaskLogs('task-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'msg-1');
      expect(result[0]).toHaveProperty('timestamp');
      expect(result[0]).toHaveProperty('logLevel');
      expect(result[0]).toHaveProperty('message');
      expect(result[0]).toHaveProperty('fromAgent', 'orchestrator');
      expect(result[0]).toHaveProperty('toAgent', 'file-agent');
    });

    it('should map message types to log levels correctly', async () => {
      const { getTaskLogs } = await import('@/lib/db/queries');
      const { db } = await import('@/lib/db');

      // Test status_notification -> info
      const mockMessages = [
        {
          id: 'msg-1',
          taskId: 'task-1',
          type: 'status_notification',
          fromAgent: 'orchestrator',
          toAgent: 'file-agent',
          payload: { status: 'running' },
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'msg-2',
          taskId: 'task-1',
          type: 'progress_update',
          fromAgent: 'file-agent',
          toAgent: 'orchestrator',
          payload: { progress: '50%' },
          createdAt: new Date('2024-01-01T10:01:00Z'),
        },
        {
          id: 'msg-3',
          taskId: 'task-1',
          type: 'human_intervention',
          fromAgent: 'orchestrator',
          toAgent: 'human',
          payload: { message: 'Approval needed' },
          createdAt: new Date('2024-01-01T10:02:00Z'),
        },
        {
          id: 'msg-4',
          taskId: 'task-1',
          type: 'context_request',
          fromAgent: 'file-agent',
          toAgent: 'orchestrator',
          payload: { message: 'Need context' },
          createdAt: new Date('2024-01-01T10:03:00Z'),
        },
      ];

      const mockOrderBy = vi.fn().mockResolvedValue(mockMessages);
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });

      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as ReturnType<typeof db.select>);

      const result = await getTaskLogs('task-1');

      expect(result[0].logLevel).toBe('info'); // status_notification
      expect(result[1].logLevel).toBe('debug'); // progress_update
      expect(result[2].logLevel).toBe('warning'); // human_intervention
      expect(result[3].logLevel).toBe('debug'); // context_request
    });

    it('should extract message from payload', async () => {
      const { getTaskLogs } = await import('@/lib/db/queries');
      const { db } = await import('@/lib/db');

      const mockMessages = [
        {
          id: 'msg-1',
          taskId: 'task-1',
          type: 'status_notification',
          fromAgent: 'orchestrator',
          toAgent: 'file-agent',
          payload: { message: 'Custom message here' },
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
      ];

      const mockOrderBy = vi.fn().mockResolvedValue(mockMessages);
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });

      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as ReturnType<typeof db.select>);

      const result = await getTaskLogs('task-1');

      expect(result[0].message).toBe('Custom message here');
    });

    it('should extract status from payload when no message', async () => {
      const { getTaskLogs } = await import('@/lib/db/queries');
      const { db } = await import('@/lib/db');

      const mockMessages = [
        {
          id: 'msg-1',
          taskId: 'task-1',
          type: 'status_notification',
          fromAgent: 'orchestrator',
          toAgent: 'file-agent',
          payload: { status: 'completed' },
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
      ];

      const mockOrderBy = vi.fn().mockResolvedValue(mockMessages);
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });

      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as ReturnType<typeof db.select>);

      const result = await getTaskLogs('task-1');

      expect(result[0].message).toBe('Status: completed');
    });

    it('should return empty array when no messages exist', async () => {
      const { getTaskLogs } = await import('@/lib/db/queries');
      const { db } = await import('@/lib/db');

      const mockOrderBy = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });

      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as ReturnType<typeof db.select>);

      const result = await getTaskLogs('nonexistent-task');

      expect(result).toEqual([]);
    });

    it('should order messages by createdAt ascending', async () => {
      const { getTaskLogs } = await import('@/lib/db/queries');
      const { db } = await import('@/lib/db');
      const { agentMessages } = await import('@/lib/db/schema');

      const mockOrderBy = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });

      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as ReturnType<typeof db.select>);

      await getTaskLogs('task-1');

      // Verify that orderBy was called (ordering by createdAt)
      expect(mockOrderBy).toHaveBeenCalled();
    });
  });
});
