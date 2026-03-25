import { describe, it, expect } from 'vitest';
import {
  agents,
  tasks,
  workflows,
  AgentTypeEnum,
  TaskStatusEnum,
  WorkflowStatusEnum,
} from '@/lib/db/schema';

describe('A2A Infrastructure Tables', () => {
  describe('agents table', () => {
    it('should have id, type, card, createdAt, updatedAt columns', () => {
      const columns = Object.keys(agents);
      expect(columns).toContain('id');
      expect(columns).toContain('type');
      expect(columns).toContain('card');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });

    it('should be defined as pgTable', () => {
      expect(agents).toBeDefined();
      expect(typeof agents).toBe('object');
    });
  });

  describe('tasks table', () => {
    it('should have all required columns including foreign keys', () => {
      const columns = Object.keys(tasks);
      expect(columns).toContain('id');
      expect(columns).toContain('workflowId');
      expect(columns).toContain('agentType');
      expect(columns).toContain('skillId');
      expect(columns).toContain('input');
      expect(columns).toContain('output');
      expect(columns).toContain('status');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('completedAt');
    });

    it('should be defined as pgTable', () => {
      expect(tasks).toBeDefined();
      expect(typeof tasks).toBe('object');
    });
  });

  describe('workflows table', () => {
    it('should have conversationId foreign key', () => {
      const columns = Object.keys(workflows);
      expect(columns).toContain('conversationId');
      expect(columns).toContain('id');
      expect(columns).toContain('status');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });

    it('should be defined as pgTable', () => {
      expect(workflows).toBeDefined();
      expect(typeof workflows).toBe('object');
    });
  });

  describe('Enum values', () => {
    it('should have correct AgentTypeEnum values', () => {
      expect(AgentTypeEnum).toEqual(['file', 'search', 'code', 'custom']);
    });

    it('should have correct TaskStatusEnum values', () => {
      expect(TaskStatusEnum).toEqual(['pending', 'running', 'completed', 'failed']);
    });

    it('should have correct WorkflowStatusEnum values', () => {
      expect(WorkflowStatusEnum).toEqual(['pending', 'running', 'completed', 'failed']);
    });
  });
});
