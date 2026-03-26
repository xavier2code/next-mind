/**
 * Tests for Dependency-Aware Task Decomposition
 *
 * Tests cover:
 * - SubtaskWithDeps type includes id and dependencies fields
 * - DecompositionResultWithDeps includes dependencies map
 * - SubtaskWithDepsSchema validates correctly
 * - DecompositionResultWithDepsSchema validates dependencies map
 * - DECOMPOSITION_SYSTEM_PROMPT_WITH_DEPS includes dependency instructions
 * - parseDecompositionResponseWithDeps extracts dependencies
 * - Validation rejects missing task ID references
 * - Validation rejects circular dependencies
 * - decomposeTaskWithDeps returns DecompositionResultWithDeps
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  SubtaskWithDeps,
  DecompositionResultWithDeps,
} from '@/lib/agents/types';
import {
  decomposeTaskWithDeps,
  buildSkillCatalog,
  DECOMPOSITION_SYSTEM_PROMPT_WITH_DEPS,
  type DecomposePrompt,
} from '@/lib/agents/decomposition';
import { discoverSkills, clearRegistry, registerSkills } from '@/lib/skills/discovery';
import { logAudit } from '@/lib/audit';
import { streamChat } from '@/lib/llm';
import type { DiscoveredSkill } from '@/lib/skills/discovery';

// Mocks
vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
}));

vi.mock('@/lib/llm', () => ({
  streamChat: vi.fn(),
}));

// Helper to create mock skill
function createMockSkill(overrides: Partial<DiscoveredSkill> = {}): DiscoveredSkill {
  return {
    metadata: {
      id: 'test-skill',
      name: 'Test Skill',
      description: 'A test skill',
      version: '1.0.0',
      category: 'file',
      tags: [],
      inputSchema: {},
      requiresApproval: false,
      destructiveActions: [],
      dependencies: [],
      timeout: 30000,
    },
    execute: vi.fn(),
    sourceFile: 'test.ts',
    ...overrides,
  };
}

describe('Dependency-Aware Task Decomposition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRegistry();
  });

  afterEach(() => {
    vi.clearAllMocks();
    clearRegistry();
  });

  describe('SubtaskWithDeps Type', () => {
    it('should include id and dependencies fields', () => {
      // Test 1: SubtaskWithDeps type includes id and dependencies
      const subtask: SubtaskWithDeps = {
        id: 'task-1',
        agentType: 'file',
        skillId: 'file-read',
        input: { path: '/test/file.txt' },
        description: 'Read the test file',
        dependencies: [],
      };

      expect(subtask.id).toBe('task-1');
      expect(subtask.dependencies).toEqual([]);
      expect(subtask.agentType).toBe('file');
      expect(subtask.skillId).toBe('file-read');
    });

    it('should allow dependencies array with task IDs', () => {
      // Test 2: SubtaskWithDeps can have multiple dependencies
      const subtask: SubtaskWithDeps = {
        id: 'task-3',
        agentType: 'code',
        skillId: 'code-generate',
        input: { task: 'combine results' },
        dependencies: ['task-1', 'task-2'],
      };

      expect(subtask.dependencies).toEqual(['task-1', 'task-2']);
    });

    it('should extend Subtask type', () => {
      // Test 3: SubtaskWithDeps has all Subtask fields plus id and dependencies
      const subtask: SubtaskWithDeps = {
        id: 'task-1',
        agentType: 'search',
        skillId: 'web-search',
        input: { query: 'test' },
        description: 'Search for information',
        dependencies: [],
      };

      // Subtask fields
      expect(subtask.agentType).toBe('search');
      expect(subtask.skillId).toBe('web-search');
      expect(subtask.input).toEqual({ query: 'test' });
      expect(subtask.description).toBe('Search for information');

      // New fields
      expect(subtask.id).toBe('task-1');
      expect(subtask.dependencies).toEqual([]);
    });
  });

  describe('DecompositionResultWithDeps Type', () => {
    it('should include dependencies map', () => {
      // Test 2: DecompositionResultWithDeps includes dependencies map
      const result: DecompositionResultWithDeps = {
        tasks: [
          {
            id: 'task-1',
            agentType: 'file',
            skillId: 'file-read',
            input: { path: '/test' },
            dependencies: [],
          },
          {
            id: 'task-2',
            agentType: 'search',
            skillId: 'web-search',
            input: { query: 'test' },
            dependencies: ['task-1'],
          },
        ],
        dependencies: {
          'task-1': [],
          'task-2': ['task-1'],
        },
        reasoning: 'File read must complete before search',
      };

      expect(result.dependencies).toEqual({
        'task-1': [],
        'task-2': ['task-1'],
      });
    });

    it('should extend DecompositionResult type', () => {
      // Test 3: DecompositionResultWithDeps has all DecompositionResult fields
      const result: DecompositionResultWithDeps = {
        tasks: [
          {
            id: 'task-1',
            agentType: 'file',
            skillId: 'file-read',
            input: {},
            dependencies: [],
          },
        ],
        dependencies: { 'task-1': [] },
        reasoning: 'Test reasoning',
        estimatedComplexity: 'medium',
      };

      // DecompositionResult fields
      expect(result.tasks).toHaveLength(1);
      expect(result.reasoning).toBe('Test reasoning');
      expect(result.estimatedComplexity).toBe('medium');

      // New field
      expect(result.dependencies).toEqual({ 'task-1': [] });
    });
  });

  describe('DECOMPOSITION_SYSTEM_PROMPT_WITH_DEPS', () => {
    it('should include dependency instructions', () => {
      // Test 1: System prompt includes dependency instructions
      expect(DECOMPOSITION_SYSTEM_PROMPT_WITH_DEPS).toContain('dependencies');
      expect(DECOMPOSITION_SYSTEM_PROMPT_WITH_DEPS).toContain('id');
    });

    it('should include task ID format instructions', () => {
      // Test 2: System prompt explains task ID format
      expect(DECOMPOSITION_SYSTEM_PROMPT_WITH_DEPS).toContain('task-1');
      expect(DECOMPOSITION_SYSTEM_PROMPT_WITH_DEPS).toContain('unique "id"');
    });

    it('should include dependency rules', () => {
      // Test 3: System prompt has rules for dependencies
      expect(DECOMPOSITION_SYSTEM_PROMPT_WITH_DEPS).toContain('circular');
      expect(DECOMPOSITION_SYSTEM_PROMPT_WITH_DEPS).toContain('parallel');
    });

    it('should include output format with dependencies map', () => {
      // Test 4: System prompt shows dependencies map in output format
      expect(DECOMPOSITION_SYSTEM_PROMPT_WITH_DEPS).toContain('"dependencies"');
    });
  });

  describe('decomposeTaskWithDeps', () => {
    const defaultPrompt: DecomposePrompt = {
      userRequest: 'Read a file and search for related information',
      userId: 'test-user',
      sessionId: 'test-session',
    };

    it('should throw error when no skills are available', async () => {
      // No skills registered
      await expect(decomposeTaskWithDeps(defaultPrompt)).rejects.toThrow(
        'No skills available for task decomposition'
      );
    });

    it('should return DecompositionResultWithDeps with dependencies', async () => {
      // Test 7: decomposeTaskWithDeps returns DecompositionResultWithDeps
      const skill = createMockSkill({
        metadata: {
          ...createMockSkill().metadata,
          id: 'file-read',
          name: 'File Read',
          description: 'Read files',
          category: 'file',
        },
      });
      registerSkills([skill]);

      const mockStream = (async function* () {
        yield {
          type: 'text',
          text: JSON.stringify({
            tasks: [
              {
                id: 'task-1',
                agentType: 'file',
                skillId: 'file-read',
                input: { path: '/test' },
                dependencies: [],
              },
            ],
            dependencies: { 'task-1': [] },
            reasoning: 'Single task',
          }),
        };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      const result = await decomposeTaskWithDeps(defaultPrompt);

      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('dependencies');
      expect(result.tasks[0].id).toBe('task-1');
      expect(result.tasks[0].dependencies).toEqual([]);
    });

    it('should validate and reject missing task ID references', async () => {
      // Test 5: Validation rejects missing task ID references
      const skill = createMockSkill({
        metadata: {
          ...createMockSkill().metadata,
          id: 'file-read',
          name: 'File Read',
          description: 'Read files',
          category: 'file',
        },
      });
      registerSkills([skill]);

      // LLM returns dependency on non-existent task
      const mockStream = (async function* () {
        yield {
          type: 'text',
          text: JSON.stringify({
            tasks: [
              {
                id: 'task-2',
                agentType: 'file',
                skillId: 'file-read',
                input: {},
                dependencies: ['task-1'], // task-1 doesn't exist
              },
            ],
            dependencies: { 'task-2': ['task-1'] },
          }),
        };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      await expect(decomposeTaskWithDeps(defaultPrompt)).rejects.toThrow(
        /depends on non-existent task/
      );
    });

    it('should validate and reject circular dependencies', async () => {
      // Test 6: Validation rejects circular dependencies
      const skill = createMockSkill({
        metadata: {
          ...createMockSkill().metadata,
          id: 'file-read',
          name: 'File Read',
          description: 'Read files',
          category: 'file',
        },
      });
      registerSkills([skill]);

      // LLM returns circular dependency: A -> B -> A
      const mockStream = (async function* () {
        yield {
          type: 'text',
          text: JSON.stringify({
            tasks: [
              {
                id: 'task-1',
                agentType: 'file',
                skillId: 'file-read',
                input: {},
                dependencies: ['task-2'],
              },
              {
                id: 'task-2',
                agentType: 'file',
                skillId: 'file-read',
                input: {},
                dependencies: ['task-1'],
              },
            ],
            dependencies: { 'task-1': ['task-2'], 'task-2': ['task-1'] },
          }),
        };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      await expect(decomposeTaskWithDeps(defaultPrompt)).rejects.toThrow(
        /Circular dependency/
      );
    });

    it('should parse complex dependency graph correctly', async () => {
      // Test 4: parseDecompositionResponseWithDeps extracts dependencies
      const skill = createMockSkill({
        metadata: {
          ...createMockSkill().metadata,
          id: 'file-read',
          name: 'File Read',
          description: 'Read files',
          category: 'file',
        },
      });
      registerSkills([skill]);

      // Diamond dependency: task-1 -> task-2, task-1 -> task-3, task-2/task-3 -> task-4
      const mockStream = (async function* () {
        yield {
          type: 'text',
          text: JSON.stringify({
            tasks: [
              {
                id: 'task-1',
                agentType: 'file',
                skillId: 'file-read',
                input: {},
                dependencies: [],
              },
              {
                id: 'task-2',
                agentType: 'file',
                skillId: 'file-read',
                input: {},
                dependencies: ['task-1'],
              },
              {
                id: 'task-3',
                agentType: 'file',
                skillId: 'file-read',
                input: {},
                dependencies: ['task-1'],
              },
              {
                id: 'task-4',
                agentType: 'file',
                skillId: 'file-read',
                input: {},
                dependencies: ['task-2', 'task-3'],
              },
            ],
            dependencies: {
              'task-1': [],
              'task-2': ['task-1'],
              'task-3': ['task-1'],
              'task-4': ['task-2', 'task-3'],
            },
            reasoning: 'Diamond dependency pattern',
          }),
        };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      const result = await decomposeTaskWithDeps(defaultPrompt);

      expect(result.tasks).toHaveLength(4);
      expect(result.dependencies['task-1']).toEqual([]);
      expect(result.dependencies['task-2']).toEqual(['task-1']);
      expect(result.dependencies['task-3']).toEqual(['task-1']);
      expect(result.dependencies['task-4']).toEqual(['task-2', 'task-3']);
    });

    it('should log successful decomposition with deps to audit', async () => {
      const skill = createMockSkill({
        metadata: {
          ...createMockSkill().metadata,
          id: 'file-read',
          name: 'File Read',
          description: 'Read files',
          category: 'file',
        },
      });
      registerSkills([skill]);

      const mockStream = (async function* () {
        yield {
          type: 'text',
          text: JSON.stringify({
            tasks: [
              {
                id: 'task-1',
                agentType: 'file',
                skillId: 'file-read',
                input: {},
                dependencies: [],
              },
              {
                id: 'task-2',
                agentType: 'file',
                skillId: 'file-read',
                input: {},
                dependencies: ['task-1'],
              },
            ],
            dependencies: { 'task-1': [], 'task-2': ['task-1'] },
            reasoning: 'Sequential tasks',
          }),
        };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      await decomposeTaskWithDeps(defaultPrompt);

      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user',
          action: 'task_decomposition_with_deps',
          resource: 'decomposition',
          metadata: expect.objectContaining({
            sessionId: 'test-session',
            taskCount: 2,
            hasDependencies: true,
          }),
        })
      );
    });

    it('should log dependency validation failure to audit', async () => {
      const skill = createMockSkill({
        metadata: {
          ...createMockSkill().metadata,
          id: 'file-read',
          name: 'File Read',
          description: 'Read files',
          category: 'file',
        },
      });
      registerSkills([skill]);

      const mockStream = (async function* () {
        yield {
          type: 'text',
          text: JSON.stringify({
            tasks: [
              {
                id: 'task-1',
                agentType: 'file',
                skillId: 'file-read',
                input: {},
                dependencies: ['non-existent'],
              },
            ],
            dependencies: { 'task-1': ['non-existent'] },
          }),
        };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      await expect(decomposeTaskWithDeps(defaultPrompt)).rejects.toThrow();

      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'task_decomposition_deps_failed',
        })
      );
    });

    it('should handle markdown code blocks in response', async () => {
      const skill = createMockSkill({
        metadata: {
          ...createMockSkill().metadata,
          id: 'file-read',
          name: 'File Read',
          description: 'Read files',
          category: 'file',
        },
      });
      registerSkills([skill]);

      const mockStream = (async function* () {
        yield {
          type: 'text',
          text:
            '```json\n' +
            JSON.stringify({
              tasks: [
                {
                  id: 'task-1',
                  agentType: 'file',
                  skillId: 'file-read',
                  input: {},
                  dependencies: [],
                },
              ],
              dependencies: { 'task-1': [] },
            }) +
            '\n```',
        };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      const result = await decomposeTaskWithDeps(defaultPrompt);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].id).toBe('task-1');
    });

    it('should validate skillIds in dependency-aware decomposition', async () => {
      const skill = createMockSkill({
        metadata: {
          ...createMockSkill().metadata,
          id: 'file-read',
          name: 'File Read',
          description: 'Read files',
          category: 'file',
        },
      });
      registerSkills([skill]);

      // LLM returns invalid skillId
      const mockStream = (async function* () {
        yield {
          type: 'text',
          text: JSON.stringify({
            tasks: [
              {
                id: 'task-1',
                agentType: 'file',
                skillId: 'non-existent-skill',
                input: {},
                dependencies: [],
              },
            ],
            dependencies: { 'task-1': [] },
          }),
        };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      await expect(decomposeTaskWithDeps(defaultPrompt)).rejects.toThrow(
        /Invalid skillId/
      );
    });

    it('should include estimatedComplexity when provided', async () => {
      const skill = createMockSkill({
        metadata: {
          ...createMockSkill().metadata,
          id: 'file-read',
          name: 'File Read',
          description: 'Read files',
          category: 'file',
        },
      });
      registerSkills([skill]);

      const mockStream = (async function* () {
        yield {
          type: 'text',
          text: JSON.stringify({
            tasks: [
              {
                id: 'task-1',
                agentType: 'file',
                skillId: 'file-read',
                input: {},
                dependencies: [],
              },
            ],
            dependencies: { 'task-1': [] },
            estimatedComplexity: 'high',
          }),
        };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      const result = await decomposeTaskWithDeps(defaultPrompt);

      expect(result.estimatedComplexity).toBe('high');
    });

    it('should handle empty dependencies array as default', async () => {
      const skill = createMockSkill({
        metadata: {
          ...createMockSkill().metadata,
          id: 'file-read',
          name: 'File Read',
          description: 'Read files',
          category: 'file',
        },
      });
      registerSkills([skill]);

      // LLM omits dependencies field in task
      const mockStream = (async function* () {
        yield {
          type: 'text',
          text: JSON.stringify({
            tasks: [
              {
                id: 'task-1',
                agentType: 'file',
                skillId: 'file-read',
                input: {},
                // dependencies omitted
              },
            ],
            dependencies: { 'task-1': [] },
          }),
        };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      const result = await decomposeTaskWithDeps(defaultPrompt);

      expect(result.tasks[0].dependencies).toEqual([]);
    });
  });
});
