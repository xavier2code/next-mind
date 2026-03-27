import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import 'reflect-metadata';
import { skill, getSkillMetadata } from '@/lib/skills/decorator';
import type { SkillMetadata, SkillContext, SkillResult } from '@/lib/skills/types';
import { fileSkills } from '@/skills/file-processing';
import { dataSkills } from '@/skills/data-analysis';
import { webSkills } from '@/skills/web-search';

// Mock database queries for file skills
vi.mock('@/lib/db/queries', () => ({
  getFileById: vi.fn(),
  getFilesByUser: vi.fn(),
}));

import { getFileById, getFilesByUser } from '@/lib/db/queries';
const mockedGetFileById = vi.mocked(getFileById);
const mockedGetFilesByUser = vi.mocked(getFilesByUser);

/**
 * Helper to apply skill decorator to a method programmatically
 */
function applySkillDecorator(
  target: object,
  propertyKey: string,
  metadata: SkillMetadata
): void {
  const decorator = skill(metadata);
  const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
  if (descriptor) {
    const newDescriptor = decorator(target, propertyKey, descriptor);
    Object.defineProperty(target, propertyKey, newDescriptor);
  } else {
    Reflect.defineMetadata(Symbol('skill:metadata'), metadata, target, propertyKey);
  }
}

describe('Predefined Skills', () => {
  describe('File Processing Skills', () => {
    const mockContext: SkillContext = {
      userId: 'test-user',
      sessionId: 'test-session',
      previousResults: new Map(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should have fileSkills instance with read method', () => {
      expect(fileSkills).toBeDefined();
      expect(typeof fileSkills.readFile).toBe('function');
    });

    it('should have fileSkills instance with listFiles method', () => {
      expect(typeof fileSkills.listFiles).toBe('function');
    });

    it('should have valid metadata for readFile', () => {
      const metadata = getSkillMetadata(fileSkills, 'readFile');
      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe('file-read');
      expect(metadata?.name).toBe('Read File');
      expect(metadata?.version).toBe('1.0.0');
      expect(metadata?.category).toBe('file');
      expect(metadata?.tags).toContain('file');
      expect(metadata?.tags).toContain('read');
      expect(metadata?.requiresApproval).toBe(false);
      expect(metadata?.timeout).toBe(10000);
    });

    it('should have valid metadata for listFiles', () => {
      const metadata = getSkillMetadata(fileSkills, 'listFiles');
      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe('file-list');
      expect(metadata?.name).toBe('List Files');
      expect(metadata?.version).toBe('1.0.0');
    });

    it('should execute readFile and return success result', async () => {
      mockedGetFileById.mockResolvedValue({
        id: 'test-id',
        userId: 'test-user',
        filename: 'test.txt',
        mimeType: 'text/plain',
        size: 100,
        fileType: 'document',
        storagePath: '/uploads/test.txt',
        status: 'ready',
        extractedContent: 'file content',
        extractedMarkdown: '# File Content',
        classification: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await fileSkills.readFile({ fileId: 'test-id' }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should execute listFiles and return success result', async () => {
      mockedGetFilesByUser.mockResolvedValue([]);

      const result = await fileSkills.listFiles({}, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Data Analysis Skills', () => {
    it('should have dataSkills instance with analyzeData method', () => {
      expect(dataSkills).toBeDefined();
      expect(typeof dataSkills.analyzeData).toBe('function');
    });

    it('should have dataSkills instance with transformData method', () => {
      expect(typeof dataSkills.transformData).toBe('function');
    });

    it('should have valid metadata for analyzeData', () => {
      const metadata = getSkillMetadata(dataSkills, 'analyzeData');
      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe('data-analyze');
      expect(metadata?.name).toBe('Analyze Data');
      expect(metadata?.version).toBe('1.0.0');
      expect(metadata?.category).toBe('data');
      expect(metadata?.tags).toContain('data');
      expect(metadata?.tags).toContain('analysis');
    });

    it('should have valid metadata for transformData', () => {
      const metadata = getSkillMetadata(dataSkills, 'transformData');
      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe('data-transform');
      expect(metadata?.name).toBe('Transform Data');
      expect(metadata?.version).toBe('1.0.0');
    });

    it('should execute analyzeData and return success result', async () => {
      const result = await dataSkills.analyzeData(
        { data: [1, 2, 3, 4, 5], operations: ['count', 'sum', 'avg'] },
        {
          userId: 'test-user',
          sessionId: 'test-session',
          previousResults: new Map(),
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect((result.data as Record<string, unknown>).count).toBe(5);
      expect((result.data as Record<string, unknown>).sum).toBe(15);
      expect((result.data as Record<string, unknown>).avg).toBe(3);
    });

    it('should execute transformData for JSON to CSV', async () => {
      const result = await dataSkills.transformData(
        { data: [{ name: 'Alice' }, { name: 'Bob' }], fromFormat: 'json', toFormat: 'csv' },
        {
          userId: 'test-user',
          sessionId: 'test-session',
          previousResults: new Map(),
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('name');
    });
  });

  describe('Web Search Skills', () => {
    it('should have webSkills instance with searchWeb method', () => {
      expect(webSkills).toBeDefined();
      expect(typeof webSkills.searchWeb).toBe('function');
    });

    it('should have valid metadata for searchWeb', () => {
      const metadata = getSkillMetadata(webSkills, 'searchWeb');
      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe('web-search');
      expect(metadata?.name).toBe('Web Search');
      expect(metadata?.version).toBe('1.0.0');
      expect(metadata?.category).toBe('web');
      expect(metadata?.tags).toContain('web');
      expect(metadata?.tags).toContain('search');
      expect(metadata?.requiresApproval).toBe(false);
      expect(metadata?.timeout).toBe(15000);
    });

    it('should execute searchWeb and return mock results', async () => {
      const result = await webSkills.searchWeb(
        { query: 'test query', maxResults: 3 },
        {
          userId: 'test-user',
          sessionId: 'test-session',
          previousResults: new Map(),
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(3);
    });
  });

  describe('All skills have valid metadata with version', () => {
    it('should have semver versions for all skills', () => {
      const semverRegex = /^\d+\.\d+\.\d+$/;

      const fileReadMeta = getSkillMetadata(fileSkills, 'readFile');
      const fileListMeta = getSkillMetadata(fileSkills, 'listFiles');
      const dataAnalyzeMeta = getSkillMetadata(dataSkills, 'analyzeData');
      const dataTransformMeta = getSkillMetadata(dataSkills, 'transformData');
      const webSearchMeta = getSkillMetadata(webSkills, 'searchWeb');

      expect(semverRegex.test(fileReadMeta?.version || '')).toBe(true);
      expect(semverRegex.test(fileListMeta?.version || '')).toBe(true);
      expect(semverRegex.test(dataAnalyzeMeta?.version || '')).toBe(true);
      expect(semverRegex.test(dataTransformMeta?.version || '')).toBe(true);
      expect(semverRegex.test(webSearchMeta?.version || '')).toBe(true);
    });
  });
});
