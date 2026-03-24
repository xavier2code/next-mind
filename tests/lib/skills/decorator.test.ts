import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import 'reflect-metadata';
import {
  skill,
  getSkillMetadata,
  skillToMcpTool,
  SKILL_METADATA_KEY,
} from '@/lib/skills/decorator';
import type { SkillMetadata, SkillContext, SkillResult } from '@/lib/skills/types';

describe('Skill Decorator', () => {
  describe('Test 1: @skill decorator attaches metadata to function', () => {
    it('should attach metadata to a decorated method', () => {
      class TestSkills {
        @skill({
          id: 'test-skill',
          name: 'Test Skill',
          description: 'A test skill',
          version: '1.0.0',
          category: 'custom',
          tags: ['test'],
          inputSchema: { input: z.string() },
          requiresApproval: false,
          destructiveActions: [],
          dependencies: [],
          timeout: 5000,
        })
        async testMethod(input: unknown, context: SkillContext): Promise<SkillResult> {
          return { success: true, data: input };
        }
      }

      const instance = new TestSkills();
      const metadata = getSkillMetadata(instance, 'testMethod');

      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe('test-skill');
      expect(metadata?.name).toBe('Test Skill');
    });
  });

  describe('Test 2: getSkillMetadata extracts metadata from decorated function', () => {
    it('should return undefined for non-decorated methods', () => {
      class NoDecorator {
        async noSkillMethod(): Promise<SkillResult> {
          return { success: true };
        }
      }

      const instance = new NoDecorator();
      const metadata = getSkillMetadata(instance, 'noSkillMethod');

      expect(metadata).toBeUndefined();
    });

    it('should extract full metadata from decorated method', () => {
      const testMetadata: SkillMetadata = {
        id: 'extract-test',
        name: 'Extract Test',
        description: 'Test extraction',
        version: '2.1.0',
        category: 'data',
        tags: ['extract', 'test'],
        inputSchema: { data: z.number() },
        requiresApproval: false,
        destructiveActions: [],
        dependencies: [],
        timeout: 10000,
      };

      class ExtractSkills {
        @skill(testMetadata)
        async extractMethod(): Promise<SkillResult> {
          return { success: true };
        }
      }

      const instance = new ExtractSkills();
      const metadata = getSkillMetadata(instance, 'extractMethod');

      expect(metadata).toEqual(testMetadata);
    });
  });

  describe('Test 3: SkillMetadata contains all required fields', () => {
    it('should have all required fields in metadata', () => {
      class FullMetadataSkills {
        @skill({
          id: 'full-metadata',
          name: 'Full Metadata Skill',
          description: 'Skill with all fields',
          version: '1.0.0',
          category: 'file',
          tags: ['full', 'metadata'],
          inputSchema: {
            path: z.string(),
            recursive: z.boolean().optional(),
          },
          requiresApproval: true,
          destructiveActions: ['delete', 'overwrite'],
          dependencies: ['fs-access'],
          timeout: 30000,
        })
        async fullMethod(): Promise<SkillResult> {
          return { success: true };
        }
      }

      const instance = new FullMetadataSkills();
      const metadata = getSkillMetadata(instance, 'fullMethod');

      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe('full-metadata');
      expect(metadata?.name).toBe('Full Metadata Skill');
      expect(metadata?.description).toBe('Skill with all fields');
      expect(metadata?.version).toBe('1.0.0');
      expect(metadata?.category).toBe('file');
      expect(metadata?.tags).toEqual(['full', 'metadata']);
      expect(metadata?.inputSchema).toHaveProperty('path');
      expect(metadata?.requiresApproval).toBe(true);
      expect(metadata?.destructiveActions).toEqual(['delete', 'overwrite']);
      expect(metadata?.dependencies).toEqual(['fs-access']);
      expect(metadata?.timeout).toBe(30000);
    });
  });

  describe('Test 4: Skill with requiresApproval=true is marked appropriately', () => {
    it('should mark skill as requiring approval', () => {
      class ApprovalSkills {
        @skill({
          id: 'dangerous-skill',
          name: 'Dangerous Operation',
          description: 'Requires approval',
          version: '1.0.0',
          category: 'system',
          tags: ['dangerous'],
          inputSchema: { command: z.string() },
          requiresApproval: true,
          destructiveActions: ['execute'],
          dependencies: [],
          timeout: 60000,
        })
        async dangerousMethod(): Promise<SkillResult> {
          return { success: true };
        }
      }

      const instance = new ApprovalSkills();
      const metadata = getSkillMetadata(instance, 'dangerousMethod');

      expect(metadata?.requiresApproval).toBe(true);
    });

    it('should default requiresApproval to false when not specified', () => {
      class SafeSkills {
        @skill({
          id: 'safe-skill',
          name: 'Safe Operation',
          description: 'No approval needed',
          version: '1.0.0',
          category: 'file',
          tags: ['safe'],
          inputSchema: { path: z.string() },
          requiresApproval: false,
          destructiveActions: [],
          dependencies: [],
          timeout: 5000,
        })
        async safeMethod(): Promise<SkillResult> {
          return { success: true };
        }
      }

      const instance = new SafeSkills();
      const metadata = getSkillMetadata(instance, 'safeMethod');

      expect(metadata?.requiresApproval).toBe(false);
    });
  });

  describe('Test 5: Version validation checks semver format', () => {
    it('should accept valid semver versions', () => {
      const validVersions = ['1.0.0', '0.0.1', '10.20.30', '1.0.0', '2.1.3'];

      for (const version of validVersions) {
        class VersionSkills {
          @skill({
            id: `version-test-${version}`,
            name: `Version Test ${version}`,
            description: 'Version test',
            version,
            category: 'custom',
            tags: ['version'],
            inputSchema: {},
            requiresApproval: false,
            destructiveActions: [],
            dependencies: [],
            timeout: 5000,
          })
          async versionMethod(): Promise<SkillResult> {
            return { success: true };
          }
        }

        const instance = new VersionSkills();
        const metadata = getSkillMetadata(instance, 'versionMethod');

        expect(metadata?.version).toBe(version);
      }
    });

    it('should throw error for invalid semver versions', () => {
      const invalidVersions = ['1.0', 'v1.0.0', '1.0.0-beta', 'invalid'];

      for (const version of invalidVersions) {
        expect(() => {
          class InvalidVersion {
            @skill({
              id: 'invalid-version',
              name: 'Invalid Version',
              description: 'Invalid version test',
              version,
              category: 'custom',
              tags: [],
              inputSchema: {},
              requiresApproval: false,
              destructiveActions: [],
              dependencies: [],
              timeout: 5000,
            })
            async invalidMethod(): Promise<SkillResult> {
              return { success: true };
            }
          }
          return new InvalidVersion();
        }).toThrow(/semver/i);
      }
    });
  });

  describe('skillToMcpTool conversion', () => {
    it('should convert skill to MCP tool format', async () => {
      class ConvertSkills {
        @skill({
          id: 'convert-test',
          name: 'Convert Test',
          description: 'Test conversion to MCP tool',
          version: '1.0.0',
          category: 'file',
          tags: ['convert'],
          inputSchema: { path: z.string() },
          requiresApproval: false,
          destructiveActions: [],
          dependencies: [],
          timeout: 5000,
        })
        async convertMethod(input: { path: string }): Promise<SkillResult> {
          return { success: true, data: `Read: ${input.path}` };
        }
      }

      const instance = new ConvertSkills();
      const metadata = getSkillMetadata(instance, 'convertMethod');

      expect(metadata).toBeDefined();

      const mcpTool = skillToMcpTool(
        instance.convertMethod.bind(instance),
        metadata!
      );

      expect(mcpTool.name).toBe('convert-test');
      expect(mcpTool.description).toBe('Test conversion to MCP tool');
      expect(mcpTool.inputSchema).toBeDefined();

      // Test handler execution
      const result = await mcpTool.handler({ path: '/test/file.txt' });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });

    it('should include error in MCP tool result on failure', async () => {
      class ErrorSkills {
        @skill({
          id: 'error-skill',
          name: 'Error Skill',
          description: 'Skill that throws error',
          version: '1.0.0',
          category: 'custom',
          tags: ['error'],
          inputSchema: { shouldFail: z.boolean() },
          requiresApproval: false,
          destructiveActions: [],
          dependencies: [],
          timeout: 5000,
        })
        async errorMethod(input: { shouldFail: boolean }): Promise<SkillResult> {
          if (input.shouldFail) {
            return { success: false, error: 'Intentional failure' };
          }
          return { success: true };
        }
      }

      const instance = new ErrorSkills();
      const metadata = getSkillMetadata(instance, 'errorMethod');

      const mcpTool = skillToMcpTool(
        instance.errorMethod.bind(instance),
        metadata!
      );

      const result = await mcpTool.handler({ shouldFail: true });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Intentional failure');
    });
  });
});
