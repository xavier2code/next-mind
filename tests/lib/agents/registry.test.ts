/**
 * Tests for Agent Registry
 *
 * Tests verify the AgentRegistry class functionality:
 * - register() validates skillIds exist in SkillRegistry
 * - register() throws error for unknown skillId
 * - get() returns registered agent by id
 * - getByType() returns agents filtered by type
 * - getAll() returns all registered agents
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentRegistry, agentRegistry } from '@/lib/agents/registry';
import type { AgentCard, AgentType } from '@/lib/agents/types';
import { z } from 'zod';
import {
  registerSkill,
  clearRegistry,
  type DiscoveredSkill,
} from '@/lib/skills/discovery';

// Helper to create mock skills for testing
function createMockSkill(id: string): DiscoveredSkill {
  return {
    metadata: {
      id,
      name: `Mock Skill ${id}`,
      description: `Mock skill for testing`,
      version: '1.0.0',
      category: 'file',
      tags: ['test', 'mock'],
      inputSchema: {},
      requiresApproval: false,
      destructiveActions: [],
      dependencies: [],
      timeout: 5000,
    },
    execute: async () => ({ success: true, data: `result from ${id}` }),
    sourceFile: 'mock.ts',
  };
}

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    // Create a fresh registry for each test
    registry = new AgentRegistry();
    // Clear skill registry for clean tests
    clearRegistry();
  });

  afterEach(() => {
    clearRegistry();
  });

  describe('register', () => {
    it('should validate skillIds exist in SkillRegistry', () => {
      // Register mock skills first
      const fileReadSkill = createMockSkill('file-read');
      const fileListSkill = createMockSkill('file-list');
      registerSkill(fileReadSkill);
      registerSkill(fileListSkill);

      const card: AgentCard = {
        id: 'file-agent',
        name: 'File Agent',
        description: 'File processing agent',
        skillIds: ['file-read', 'file-list'],
        inputSchema: { task: z.string() },
        outputSchema: { result: z.unknown() },
      };

      // Should not throw when all skillIds exist
      expect(() => registry.register(card, 'file')).not.toThrow();
    });

    it('should throw error for unknown skillId', () => {
      // Register only one skill
      const fileReadSkill = createMockSkill('file-read');
      registerSkill(fileReadSkill);

      const card: AgentCard = {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'Test agent',
        skillIds: ['file-read', 'unknown-skill'],
        inputSchema: {},
        outputSchema: {},
      };

      // Should throw because 'unknown-skill' is not registered
      expect(() => registry.register(card, 'file')).toThrow(
        'Agent "test-agent" references unknown skill: unknown-skill'
      );
    });

    it('should store resolved skills in RegisteredAgent', () => {
      const fileReadSkill = createMockSkill('file-read');
      registerSkill(fileReadSkill);

      const card: AgentCard = {
        id: 'simple-agent',
        name: 'Simple Agent',
        description: 'Simple agent with one skill',
        skillIds: ['file-read'],
        inputSchema: {},
        outputSchema: {},
      };

      registry.register(card, 'file');
      const registered = registry.get('simple-agent');

      expect(registered).toBeDefined();
      expect(registered?.skills).toHaveLength(1);
      expect(registered?.skills[0].metadata.id).toBe('file-read');
    });
  });

  describe('get', () => {
    it('should return registered agent by id', () => {
      const skill = createMockSkill('test-skill');
      registerSkill(skill);

      const card: AgentCard = {
        id: 'my-agent',
        name: 'My Agent',
        description: 'Test agent',
        skillIds: ['test-skill'],
        inputSchema: {},
        outputSchema: {},
      };

      registry.register(card, 'search');
      const agent = registry.get('my-agent');

      expect(agent).toBeDefined();
      expect(agent?.card.id).toBe('my-agent');
      expect(agent?.card.name).toBe('My Agent');
      expect(agent?.type).toBe('search');
    });

    it('should return undefined for unknown agent id', () => {
      const agent = registry.get('non-existent');
      expect(agent).toBeUndefined();
    });
  });

  describe('getByType', () => {
    it('should return agents filtered by type', () => {
      const skill = createMockSkill('shared-skill');
      registerSkill(skill);

      const fileCard: AgentCard = {
        id: 'file-agent-1',
        name: 'File Agent 1',
        description: 'First file agent',
        skillIds: ['shared-skill'],
        inputSchema: {},
        outputSchema: {},
      };

      const searchCard: AgentCard = {
        id: 'search-agent-1',
        name: 'Search Agent 1',
        description: 'First search agent',
        skillIds: ['shared-skill'],
        inputSchema: {},
        outputSchema: {},
      };

      const codeCard: AgentCard = {
        id: 'code-agent-1',
        name: 'Code Agent 1',
        description: 'First code agent',
        skillIds: ['shared-skill'],
        inputSchema: {},
        outputSchema: {},
      };

      registry.register(fileCard, 'file');
      registry.register(searchCard, 'search');
      registry.register(codeCard, 'code');

      const fileAgents = registry.getByType('file');
      const searchAgents = registry.getByType('search');

      expect(fileAgents).toHaveLength(1);
      expect(fileAgents[0].card.id).toBe('file-agent-1');

      expect(searchAgents).toHaveLength(1);
      expect(searchAgents[0].card.id).toBe('search-agent-1');
    });

    it('should return empty array for type with no agents', () => {
      const agents = registry.getByType('custom');
      expect(agents).toEqual([]);
    });
  });

  describe('getAll', () => {
    it('should return all registered agents', () => {
      const skill = createMockSkill('multi-skill');
      registerSkill(skill);

      const card1: AgentCard = {
        id: 'agent-1',
        name: 'Agent 1',
        description: 'First agent',
        skillIds: ['multi-skill'],
        inputSchema: {},
        outputSchema: {},
      };

      const card2: AgentCard = {
        id: 'agent-2',
        name: 'Agent 2',
        description: 'Second agent',
        skillIds: ['multi-skill'],
        inputSchema: {},
        outputSchema: {},
      };

      registry.register(card1, 'file');
      registry.register(card2, 'search');

      const allAgents = registry.getAll();

      expect(allAgents).toHaveLength(2);
      expect(allAgents.map((a) => a.card.id)).toContain('agent-1');
      expect(allAgents.map((a) => a.card.id)).toContain('agent-2');
    });

    it('should return empty array when no agents registered', () => {
      const agents = registry.getAll();
      expect(agents).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear all registered agents', () => {
      const skill = createMockSkill('clear-skill');
      registerSkill(skill);

      const card: AgentCard = {
        id: 'clear-agent',
        name: 'Clear Agent',
        description: 'Agent to clear',
        skillIds: ['clear-skill'],
        inputSchema: {},
        outputSchema: {},
      };

      registry.register(card, 'file');
      expect(registry.getAll()).toHaveLength(1);

      registry.clear();
      expect(registry.getAll()).toHaveLength(0);
    });
  });
});

describe('agentRegistry singleton', () => {
  it('should be exported and usable', () => {
    expect(agentRegistry).toBeInstanceOf(AgentRegistry);
  });
});
