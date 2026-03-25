import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import 'reflect-metadata';
import {
  discoverSkills,
  getSkillById,
  getSkillsByCategory,
  clearCache,
  clearRegistry,
  registerSkill,
  registerSkills,
  discoverSkillsFromModules,
  type DiscoveredSkill,
} from '@/lib/skills/discovery';
import { initializeSkillRegistry, getAllSkills, getSkill, resetInitialized } from '@/lib/skills/registry';
import type { SkillMetadata, SkillContext, SkillResult, SkillFunction } from '@/lib/skills/types';

// Import skill modules for testing
import { fileSkills } from '@/skills/file-processing';
import { dataSkills } from '@/skills/data-analysis';
import { webSkills } from '@/skills/web-search';

describe('Skill Discovery', () => {
  beforeEach(() => {
    // Clear cache, registry, and reset initialization flag before each test
    clearRegistry();
    resetInitialized();
  });

  afterEach(() => {
    clearRegistry();
    resetInitialized();
  });

  // Helper to create a test skill
  function createTestSkill(overrides: Partial<SkillMetadata> = {}): DiscoveredSkill {
    const metadata: SkillMetadata = {
      id: 'test-skill',
      name: 'Test Skill',
      description: 'A test skill',
      version: '1.0.0',
      category: 'custom',
      tags: ['test'],
      inputSchema: { value: z.string() },
      requiresApproval: false,
      destructiveActions: [],
      dependencies: [],
      timeout: 5000,
      ...overrides,
    };

    const execute: SkillFunction = async (input: unknown) => {
      const typedInput = input as { value: string };
      return { success: true, data: `Processed: ${typedInput.value}` };
    };

    return {
      metadata,
      execute,
      sourceFile: 'test-skill.ts',
    };
  }

  describe('Test 1: discoverSkills returns all skills from src/skills/ directory', () => {
    it('should return an array of discovered skills after registration', () => {
      // Initialize registry with skill modules
      const skills = initializeSkillRegistry();

      expect(Array.isArray(skills)).toBe(true);
      expect(skills.length).toBeGreaterThan(0);
    });

    it('should include skills from file-processing.ts', () => {
      initializeSkillRegistry();
      const skills = getAllSkills();
      const fileReadSkill = skills.find((s) => s.metadata.id === 'file-read');

      expect(fileReadSkill).toBeDefined();
      expect(fileReadSkill?.metadata.name).toBe('Read File');
    });

    it('should include skills from data-analysis.ts', () => {
      initializeSkillRegistry();
      const skills = getAllSkills();
      const dataSkills = skills.filter((s) => s.metadata.category === 'data');

      expect(dataSkills.length).toBeGreaterThan(0);
    });

    it('should return DiscoveredSkill objects with metadata and execute function', () => {
      initializeSkillRegistry();
      const skills = getAllSkills();
      const skill = skills[0];

      expect(skill).toHaveProperty('metadata');
      expect(skill).toHaveProperty('execute');
      expect(skill).toHaveProperty('sourceFile');
      expect(typeof skill.execute).toBe('function');
    });
  });

  describe('Test 2: getSkillById returns correct skill metadata', () => {
    it('should return skill by id when it exists', () => {
      initializeSkillRegistry();
      const skill = getSkillById('file-read');

      expect(skill).toBeDefined();
      expect(skill?.metadata.id).toBe('file-read');
      expect(skill?.metadata.name).toBe('Read File');
    });

    it('should return undefined for unknown skill id', () => {
      initializeSkillRegistry();
      const skill = getSkillById('non-existent-skill');

      expect(skill).toBeUndefined();
    });

    it('should return skill with correct metadata fields', () => {
      initializeSkillRegistry();
      const skill = getSkillById('file-list');

      expect(skill?.metadata).toMatchObject({
        id: 'file-list',
        name: 'List Files',
        description: expect.any(String),
        version: expect.stringMatching(/^\d+\.\d+\.\d+$/),
        category: 'file',
        tags: expect.any(Array),
        requiresApproval: expect.any(Boolean),
        destructiveActions: expect.any(Array),
        timeout: expect.any(Number),
      });
    });
  });

  describe('Test 3: getSkillsByCategory filters by category', () => {
    it('should return only skills in the specified category', () => {
      initializeSkillRegistry();
      const fileSkills = getSkillsByCategory('file');

      expect(fileSkills.length).toBeGreaterThan(0);
      fileSkills.forEach((skill) => {
        expect(skill.metadata.category).toBe('file');
      });
    });

    it('should return empty array for category with no skills', () => {
      initializeSkillRegistry();
      const customSkills = getSkillsByCategory('custom');

      // There may not be any custom skills in the test setup
      expect(Array.isArray(customSkills)).toBe(true);
    });

    it('should return all categories when they exist', () => {
      initializeSkillRegistry();
      const categories = ['file', 'data', 'web', 'system', 'custom'] as const;

      for (const category of categories) {
        const skills = getSkillsByCategory(category);
        expect(Array.isArray(skills)).toBe(true);
      }
    });
  });

  describe('Discovery caching', () => {
    it('should cache discovery results', () => {
      // Register a skill first so cache has content
      const testSkill = createTestSkill();
      registerSkill(testSkill);

      // First call populates cache
      const skills1 = discoverSkills();

      // Second call should return cached results
      const skills2 = discoverSkills();

      expect(skills1).toBe(skills2); // Same reference = cached
    });

    it('should clear cache when clearCache is called', () => {
      // Register a skill first
      const testSkill = createTestSkill();
      registerSkill(testSkill);

      const skills1 = discoverSkills();
      clearCache();
      const skills2 = discoverSkills();

      // After clearing, should be different arrays (new scan)
      expect(skills1).not.toBe(skills2);
    });
  });

  describe('Skill registration', () => {
    it('should register a single skill', () => {
      const testSkill = createTestSkill();
      registerSkill(testSkill);

      const skill = getSkillById('test-skill');
      expect(skill).toBeDefined();
      expect(skill?.metadata.name).toBe('Test Skill');
    });

    it('should register multiple skills', () => {
      const skills = [
        createTestSkill({ id: 'skill-1', name: 'Skill 1' }),
        createTestSkill({ id: 'skill-2', name: 'Skill 2' }),
      ];

      registerSkills(skills);

      expect(getSkillById('skill-1')).toBeDefined();
      expect(getSkillById('skill-2')).toBeDefined();
    });

    it('should clear registry', () => {
      const testSkill = createTestSkill();
      registerSkill(testSkill);

      expect(getSkillById('test-skill')).toBeDefined();

      clearRegistry();

      expect(getSkillById('test-skill')).toBeUndefined();
    });
  });

  describe('discoverSkillsFromModules', () => {
    it('should discover skills from imported modules', () => {
      const skills = discoverSkillsFromModules({
        'file-processing.ts': { fileSkills },
        'data-analysis.ts': { dataSkills },
        'web-search.ts': { webSkills },
      });

      expect(skills.length).toBeGreaterThan(0);

      // Check for specific skills
      const fileReadSkill = skills.find((s) => s.metadata.id === 'file-read');
      expect(fileReadSkill).toBeDefined();

      const dataAnalyzeSkill = skills.find((s) => s.metadata.id === 'data-analyze');
      expect(dataAnalyzeSkill).toBeDefined();

      const webSearchSkill = skills.find((s) => s.metadata.id === 'web-search');
      expect(webSearchSkill).toBeDefined();
    });
  });

  describe('Registry convenience functions', () => {
    it('should initialize and return skills via getAllSkills', () => {
      clearRegistry();
      const skills = getAllSkills();

      expect(skills.length).toBeGreaterThan(0);
    });

    it('should get skill via getSkill convenience function', () => {
      clearRegistry();
      const skill = getSkill('file-read');

      expect(skill).toBeDefined();
      expect(skill?.metadata.id).toBe('file-read');
    });
  });
});
