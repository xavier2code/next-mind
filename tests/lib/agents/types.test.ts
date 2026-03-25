/**
 * Tests for Agent type definitions
 *
 * Tests verify the type structure and exports for:
 * - AgentType
 * - AgentCard interface
 * - RegisteredAgent interface
 * - Subtask and DecompositionResult types
 */
import { describe, it, expect } from 'vitest';
import type {
  AgentType,
  AgentCard,
  RegisteredAgent,
  Subtask,
  DecompositionResult,
} from '@/lib/agents/types';
import { z } from 'zod';
import type { DiscoveredSkill } from '@/lib/skills/discovery';

describe('Agent Types', () => {
  describe('AgentType', () => {
    it('should allow valid agent types', () => {
      // Test 1: AgentType contains 'file', 'search', 'code', 'custom' values
      const fileAgent: AgentType = 'file';
      const searchAgent: AgentType = 'search';
      const codeAgent: AgentType = 'code';
      const customAgent: AgentType = 'custom';

      expect(fileAgent).toBe('file');
      expect(searchAgent).toBe('search');
      expect(codeAgent).toBe('code');
      expect(customAgent).toBe('custom');
    });
  });

  describe('AgentCard', () => {
    it('should have required fields with correct types', () => {
      // Test 2: AgentCard interface has id, name, description, skillIds, inputSchema, outputSchema, systemPrompt fields
      const card: AgentCard = {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'A test agent for verification',
        skillIds: ['skill-1', 'skill-2'],
        inputSchema: {
          task: z.string(),
        },
        outputSchema: {
          result: z.unknown(),
        },
        systemPrompt: 'You are a test agent.',
      };

      expect(card.id).toBe('test-agent');
      expect(card.name).toBe('Test Agent');
      expect(card.description).toBe('A test agent for verification');
      expect(card.skillIds).toEqual(['skill-1', 'skill-2']);
      expect(card.inputSchema).toHaveProperty('task');
      expect(card.outputSchema).toHaveProperty('result');
      expect(card.systemPrompt).toBe('You are a test agent.');
    });

    it('should allow optional systemPrompt', () => {
      const card: AgentCard = {
        id: 'minimal-agent',
        name: 'Minimal Agent',
        description: 'Minimal agent without systemPrompt',
        skillIds: [],
        inputSchema: {},
        outputSchema: {},
      };

      expect(card.systemPrompt).toBeUndefined();
    });
  });

  describe('RegisteredAgent', () => {
    it('should include card, type, and resolved skills array', () => {
      // Test 3: RegisteredAgent interface includes card, type, and resolved skills array
      const mockSkill: DiscoveredSkill = {
        metadata: {
          id: 'skill-1',
          name: 'Test Skill',
          description: 'A test skill',
          version: '1.0.0',
          category: 'file',
          tags: ['test'],
          inputSchema: {},
          requiresApproval: false,
          destructiveActions: [],
          dependencies: [],
          timeout: 5000,
        },
        execute: async () => ({ success: true }),
        sourceFile: 'test.ts',
      };

      const card: AgentCard = {
        id: 'registered-agent',
        name: 'Registered Agent',
        description: 'An agent with resolved skills',
        skillIds: ['skill-1'],
        inputSchema: {},
        outputSchema: {},
      };

      const registeredAgent: RegisteredAgent = {
        card,
        type: 'file',
        skills: [mockSkill],
      };

      expect(registeredAgent.card).toBe(card);
      expect(registeredAgent.type).toBe('file');
      expect(registeredAgent.skills).toHaveLength(1);
      expect(registeredAgent.skills[0]).toBe(mockSkill);
    });
  });

  describe('Subtask', () => {
    it('should have required fields for decomposition output', () => {
      const subtask: Subtask = {
        agentType: 'file',
        skillId: 'file-read',
        input: { path: '/test/file.txt' },
        description: 'Read the test file',
      };

      expect(subtask.agentType).toBe('file');
      expect(subtask.skillId).toBe('file-read');
      expect(subtask.input).toEqual({ path: '/test/file.txt' });
      expect(subtask.description).toBe('Read the test file');
    });

    it('should allow optional description', () => {
      const subtask: Subtask = {
        agentType: 'search',
        skillId: 'web-search',
        input: { query: 'test query' },
      };

      expect(subtask.description).toBeUndefined();
    });
  });

  describe('DecompositionResult', () => {
    it('should have tasks array with optional reasoning and complexity', () => {
      const result: DecompositionResult = {
        tasks: [
          { agentType: 'file', skillId: 'file-read', input: { path: '/test' } },
          { agentType: 'search', skillId: 'web-search', input: { query: 'test' } },
        ],
        reasoning: 'Task requires file reading and web search',
        estimatedComplexity: 'medium',
      };

      expect(result.tasks).toHaveLength(2);
      expect(result.reasoning).toBe('Task requires file reading and web search');
      expect(result.estimatedComplexity).toBe('medium');
    });

    it('should allow minimal decomposition result with only tasks', () => {
      const result: DecompositionResult = {
        tasks: [{ agentType: 'code', skillId: 'code-generate', input: { task: 'test' } }],
      };

      expect(result.tasks).toHaveLength(1);
      expect(result.reasoning).toBeUndefined();
      expect(result.estimatedComplexity).toBeUndefined();
    });
  });
});
