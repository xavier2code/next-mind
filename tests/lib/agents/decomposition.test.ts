/**
 * Tests for Task Decomposition Engine
 *
 * Tests cover:
 * - decomposeTask returns structured JSON with tasks array
 * - decomposeTask returns reasoning string
 * - decomposeTask validates all skillIds exist
 * - decomposeTask throws error for invalid skillId
 * - decomposeTask logs decomposition to audit
 * - buildSkillCatalog creates proper catalog string
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  decomposeTask,
  buildSkillCatalog,
  DECOMPOSITION_SYSTEM_PROMPT,
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

describe('Task Decomposition Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRegistry();
  });

  afterEach(() => {
    vi.clearAllMocks();
    clearRegistry();
  });

  describe('DECOMPOSITION_SYSTEM_PROMPT', () => {
    it('should contain agent types', () => {
      expect(DECOMPOSITION_SYSTEM_PROMPT).toContain('file:');
      expect(DECOMPOSITION_SYSTEM_PROMPT).toContain('search:');
      expect(DECOMPOSITION_SYSTEM_PROMPT).toContain('code:');
      expect(DECOMPOSITION_SYSTEM_PROMPT).toContain('custom:');
    });

    it('should contain output format instructions', () => {
      expect(DECOMPOSITION_SYSTEM_PROMPT).toContain('agentType');
      expect(DECOMPOSITION_SYSTEM_PROMPT).toContain('skillId');
      expect(DECOMPOSITION_SYSTEM_PROMPT).toContain('input');
      expect(DECOMPOSITION_SYSTEM_PROMPT).toContain('description');
    });

    it('should contain rules', () => {
      expect(DECOMPOSITION_SYSTEM_PROMPT).toContain('Each task must map to exactly one existing skill');
      expect(DECOMPOSITION_SYSTEM_PROMPT).toContain('ordered by dependency');
    });
  });

  describe('buildSkillCatalog', () => {
    it('should return "No skills available" for empty array', () => {
      const catalog = buildSkillCatalog([]);
      expect(catalog).toBe('No skills available.');
    });

    it('should format single skill correctly', () => {
      const skill = createMockSkill({
        metadata: {
          ...createMockSkill().metadata,
          id: 'file-read',
          name: 'File Read',
          description: 'Read file contents',
          category: 'file',
        },
      });

      const catalog = buildSkillCatalog([skill]);
      expect(catalog).toContain('file-read');
      expect(catalog).toContain('File Read');
      expect(catalog).toContain('Read file contents');
      expect(catalog).toContain('(file)');
    });

    it('should format multiple skills correctly', () => {
      const skills = [
        createMockSkill({
          metadata: {
            ...createMockSkill().metadata,
            id: 'file-read',
            name: 'File Read',
            description: 'Read files',
            category: 'file',
          },
        }),
        createMockSkill({
          metadata: {
            ...createMockSkill().metadata,
            id: 'web-search',
            name: 'Web Search',
            description: 'Search the web',
            category: 'web',
          },
        }),
      ];

      const catalog = buildSkillCatalog(skills);
      expect(catalog).toContain('file-read');
      expect(catalog).toContain('web-search');
    });
  });

  describe('decomposeTask', () => {
    const defaultPrompt: DecomposePrompt = {
      userRequest: 'Read a file and search for information',
      userId: 'test-user',
      sessionId: 'test-session',
    };

    it('should throw error when no skills are available', async () => {
      // No skills registered
      await expect(decomposeTask(defaultPrompt)).rejects.toThrow(
        'No skills available for task decomposition'
      );
    });

    it('should return structured JSON with tasks array', async () => {
      // Register a skill
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

      // Mock LLM response
      const mockStream = (async function* () {
        yield { type: 'text', text: '{"tasks":[{"agentType":"file","skillId":"file-read","input":{"path":"/test"},"description":"Read the file"}],"reasoning":"Test reasoning"}' };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      const result = await decomposeTask(defaultPrompt);

      expect(result).toHaveProperty('tasks');
      expect(Array.isArray(result.tasks)).toBe(true);
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toHaveProperty('agentType', 'file');
      expect(result.tasks[0]).toHaveProperty('skillId', 'file-read');
      expect(result.tasks[0]).toHaveProperty('input');
      expect(result.tasks[0]).toHaveProperty('description');
    });

    it('should return reasoning string', async () => {
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
        yield { type: 'text', text: '{"tasks":[{"agentType":"file","skillId":"file-read","input":{}}],"reasoning":"This task requires reading a file first"}' };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      const result = await decomposeTask(defaultPrompt);

      expect(result.reasoning).toBe('This task requires reading a file first');
    });

    it('should validate all skillIds exist', async () => {
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

      // LLM returns a valid skillId
      const mockStream = (async function* () {
        yield { type: 'text', text: '{"tasks":[{"agentType":"file","skillId":"file-read","input":{}}]}' };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      const result = await decomposeTask(defaultPrompt);

      expect(result.tasks[0].skillId).toBe('file-read');
    });

    it('should throw error for invalid skillId', async () => {
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

      // LLM returns an invalid skillId
      const mockStream = (async function* () {
        yield { type: 'text', text: '{"tasks":[{"agentType":"file","skillId":"non-existent-skill","input":{}}]}' };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      await expect(decomposeTask(defaultPrompt)).rejects.toThrow(
        /Invalid skillId "non-existent-skill"/
      );
    });

    it('should log decomposition to audit on success', async () => {
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
        yield { type: 'text', text: '{"tasks":[{"agentType":"file","skillId":"file-read","input":{}}],"reasoning":"Test"}' };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      await decomposeTask(defaultPrompt);

      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user',
          action: 'task_decomposition',
          resource: 'decomposition',
          metadata: expect.objectContaining({
            sessionId: 'test-session',
            taskCount: 1,
            reasoning: 'Test',
          }),
        })
      );
    });

    it('should log decomposition failure to audit', async () => {
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
        yield { type: 'text', text: '{"tasks":[{"agentType":"file","skillId":"invalid","input":{}}]}' };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      await expect(decomposeTask(defaultPrompt)).rejects.toThrow();

      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'task_decomposition_validation_failed',
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
        yield { type: 'text', text: '```json\n{"tasks":[{"agentType":"file","skillId":"file-read","input":{}}]}\n```' };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      const result = await decomposeTask(defaultPrompt);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].skillId).toBe('file-read');
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
        yield { type: 'text', text: '{"tasks":[{"agentType":"file","skillId":"file-read","input":{}}],"estimatedComplexity":"medium"}' };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      const result = await decomposeTask(defaultPrompt);

      expect(result.estimatedComplexity).toBe('medium');
    });

    it('should use custom modelId when provided', async () => {
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
        yield { type: 'text', text: '{"tasks":[{"agentType":"file","skillId":"file-read","input":{}}]}' };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      await decomposeTask({ ...defaultPrompt, modelId: 'glm-4' });

      expect(streamChat).toHaveBeenCalledWith(
        expect.objectContaining({
          modelId: 'glm-4',
        })
      );
    });

    it('should include skill catalog in system prompt', async () => {
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
        yield { type: 'text', text: '{"tasks":[]}' };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      await decomposeTask(defaultPrompt);

      const call = vi.mocked(streamChat).mock.calls[0][0];
      expect(call.systemPrompt).toContain('file-read');
      expect(call.systemPrompt).toContain('File Read');
    });

    it('should handle LLM call failure', async () => {
      const skill = createMockSkill();
      registerSkills([skill]);

      vi.mocked(streamChat).mockRejectedValue(new Error('API error'));

      await expect(decomposeTask(defaultPrompt)).rejects.toThrow('LLM call failed');

      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'task_decomposition_failed',
        })
      );
    });

    it('should handle malformed JSON response', async () => {
      const skill = createMockSkill();
      registerSkills([skill]);

      const mockStream = (async function* () {
        yield { type: 'text', text: 'not valid json' };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      await expect(decomposeTask(defaultPrompt)).rejects.toThrow(
        'Failed to parse decomposition response'
      );

      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'task_decomposition_parse_failed',
        })
      );
    });

    it('should handle empty tasks array', async () => {
      const skill = createMockSkill();
      registerSkills([skill]);

      const mockStream = (async function* () {
        yield { type: 'text', text: '{"tasks":[],"reasoning":"No suitable skills found"}' };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      const result = await decomposeTask(defaultPrompt);

      expect(result.tasks).toHaveLength(0);
      expect(result.reasoning).toBe('No suitable skills found');
    });

    it('should validate agentType enum values', async () => {
      const skill = createMockSkill();
      registerSkills([skill]);

      const mockStream = (async function* () {
        yield { type: 'text', text: '{"tasks":[{"agentType":"invalid-type","skillId":"test-skill","input":{}}]}' };
      })();

      vi.mocked(streamChat).mockResolvedValue(mockStream);

      await expect(decomposeTask(defaultPrompt)).rejects.toThrow();
    });
  });
});
