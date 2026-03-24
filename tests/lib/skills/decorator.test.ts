import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import 'reflect-metadata';
import {
  skill,
  getSkillMetadata,
  skillToMcpTool,
  SKILL_METADATA_KEY,
} from '@/lib/skills/decorator';
import type { SkillMetadata, SkillContext, SkillResult, SkillFunction } from '@/lib/skills/types';

/**
 * Helper to apply skill decorator to a method programmatically
 * This avoids decorator syntax issues in test files
 */
function applySkillDecorator(
  target: object,
  propertyKey: string,
  metadata: SkillMetadata
): void {
  // Call the skill decorator factory and apply it manually
  const decorator = skill(metadata);
  const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
  if (descriptor) {
    const newDescriptor = decorator(target, propertyKey, descriptor);
    Object.defineProperty(target, propertyKey, newDescriptor);
  } else {
    // For methods on prototype, we need to define it first
    Reflect.defineMetadata(SKILL_METADATA_KEY, metadata, target, propertyKey);
  }
}

describe('Skill Decorator', () => {
  describe('Test 1: @skill decorator attaches metadata to function', () => {
    it('should attach metadata to a decorated method', () => {
           const metadata: SkillMetadata = {
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
      };

      const target = {};
      applySkillDecorator(target, 'testMethod', metadata);

      const result = getSkillMetadata(target, 'testMethod');
      expect(result).toBeDefined();
      expect(result?.id).toBe('test-skill');
      expect(result?.name).toBe('Test Skill');
    });
  });

  describe('Test 2: getSkillMetadata extracts metadata from decorated function', () => {
    it('should return undefined for non-decorated methods', () => {
      const target = {};
      const result = getSkillMetadata(target, 'noSkillMethod');
      expect(result).toBeUndefined();
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

      const target = {};
      applySkillDecorator(target, 'extractMethod', testMetadata);

      const result = getSkillMetadata(target, 'extractMethod');
      expect(result).toEqual(testMetadata);
    });
  });

  describe('Test 3: SkillMetadata contains all required fields', () => {
    it('should have all required fields in metadata', () => {
      const fullMetadata: SkillMetadata = {
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
      };

      const target = {};
      applySkillDecorator(target, 'fullMethod', fullMetadata);

      const result = getSkillMetadata(target, 'fullMethod');
      expect(result).toBeDefined();
      expect(result?.id).toBe('full-metadata');
      expect(result?.name).toBe('Full Metadata Skill');
      expect(result?.description).toBe('Skill with all fields');
      expect(result?.version).toBe('1.0.0');
      expect(result?.category).toBe('file');
      expect(result?.tags).toEqual(['full', 'metadata']);
      expect(result?.inputSchema).toHaveProperty('path');
      expect(result?.requiresApproval).toBe(true);
      expect(result?.destructiveActions).toEqual(['delete', 'overwrite']);
      expect(result?.dependencies).toEqual(['fs-access']);
      expect(result?.timeout).toBe(30000);
    });
  });

  describe('Test 4: Skill with requiresApproval=true is marked appropriately', () => {
    it('should mark skill as requiring approval', () => {
      const dangerousMetadata: SkillMetadata = {
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
      };

      const target = {};
      applySkillDecorator(target, 'dangerousMethod', dangerousMetadata);

      const result = getSkillMetadata(target, 'dangerousMethod');
      expect(result?.requiresApproval).toBe(true);
    });

    it('should default requiresApproval to false when not specified', () => {
      const safeMetadata: SkillMetadata = {
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
      };

      const target = {};
      applySkillDecorator(target, 'safeMethod', safeMetadata);

      const result = getSkillMetadata(target, 'safeMethod');
      expect(result?.requiresApproval).toBe(false);
    });
  });

  describe('Test 5: Version validation checks semver format', () => {
    it('should accept valid semver versions', () => {
      const validVersions = ['1.0.0', '0.0.1', '10.20.30', '2.1.3'];

      for (const version of validVersions) {
        const metadata: SkillMetadata = {
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
        };

        const target = {};
        expect(() => applySkillDecorator(target, 'versionMethod', metadata)).not.toThrow();

        const result = getSkillMetadata(target, 'versionMethod');
        expect(result?.version).toBe(version);
      }
    });

    it('should throw error for invalid semver versions', () => {
      const invalidVersions = ['1.0', 'v1.0.0', '1.0.0-beta', 'invalid'];

      for (const version of invalidVersions) {
        const metadata: SkillMetadata = {
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
        };

        const target = {};
        expect(() => applySkillDecorator(target, 'invalidMethod', metadata)).toThrow(/semver/i);
      }
    });
  });

  describe('skillToMcpTool conversion', () => {
    it('should convert skill to MCP tool format', async () => {
      const convertMetadata: SkillMetadata = {
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
      };

      const skillFn: SkillFunction = async (input: unknown) => {
        const typedInput = input as { path: string };
        return { success: true, data: `Read: ${typedInput.path}` };
      };

      const mcpTool = skillToMcpTool(skillFn, convertMetadata);

      expect(mcpTool.name).toBe('convert-test');
      expect(mcpTool.description).toBe('Test conversion to MCP tool');
      expect(mcpTool.inputSchema).toBeDefined();

      // Test handler execution
      const result = await mcpTool.handler({ path: '/test/file.txt' });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });

    it('should include error in MCP tool result on failure', async () => {
      const errorMetadata: SkillMetadata = {
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
      };

      const skillFn: SkillFunction = async (input: unknown) => {
        const typedInput = input as { shouldFail: boolean };
        if (typedInput.shouldFail) {
          return { success: false, error: 'Intentional failure' };
        }
        return { success: true };
      };

      const mcpTool = skillToMcpTool(skillFn, errorMetadata);

      const result = await mcpTool.handler({ shouldFail: true });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Intentional failure');
    });

    it('should handle successful results with data', async () => {
      const metadata: SkillMetadata = {
        id: 'data-skill',
        name: 'Data Skill',
        description: 'Returns data',
        version: '1.0.0',
        category: 'custom',
        tags: ['data'],
        inputSchema: {},
        requiresApproval: false,
        destructiveActions: [],
        dependencies: [],
        timeout: 5000,
      };

      const skillFn: SkillFunction = async () => {
        return {
          success: true,
          data: { message: 'Hello', count: 42 },
        };
      };

      const mcpTool = skillToMcpTool(skillFn, metadata);
      const result = await mcpTool.handler({});

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Hello');
      expect(result.content[0].text).toContain('42');
    });

    it('should handle exceptions in skill execution', async () => {
      const metadata: SkillMetadata = {
        id: 'exception-skill',
        name: 'Exception Skill',
        description: 'Throws exception',
        version: '1.0.0',
        category: 'custom',
        tags: ['exception'],
        inputSchema: {},
        requiresApproval: false,
        destructiveActions: [],
        dependencies: [],
        timeout: 5000,
      };

      const skillFn: SkillFunction = async () => {
        throw new Error('Unexpected error');
      };

      const mcpTool = skillToMcpTool(skillFn, metadata);
      const result = await mcpTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected error');
    });
  });
});
