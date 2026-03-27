import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'reflect-metadata';
import { getSkillMetadata } from '@/lib/skills/decorator';
import type { SkillContext, SkillResult } from '@/lib/skills/types';

// Mock database queries
vi.mock('@/lib/db/queries', () => ({
  getFileById: vi.fn(),
  getFilesByUser: vi.fn(),
}));

// Mock extraction classifier
vi.mock('@/lib/extraction/classifier', () => ({
  classifyByContent: vi.fn(),
}));

import { getFileById, getFilesByUser } from '@/lib/db/queries';
import { classifyByContent } from '@/lib/extraction/classifier';
import { fileSkills } from '@/skills/file-processing';

const mockedGetFileById = vi.mocked(getFileById);
const mockedGetFilesByUser = vi.mocked(getFilesByUser);
const mockedClassifyByContent = vi.mocked(classifyByContent);

// --- Test fixtures ---

const mockContext: SkillContext = {
  userId: 'user-123',
  sessionId: 'session-abc',
  previousResults: new Map(),
};

const otherUserContext: SkillContext = {
  userId: 'user-456',
  sessionId: 'session-xyz',
  previousResults: new Map(),
};

const mockReadyFile = {
  id: '11111111-1111-1111-1111-111111111111',
  userId: 'user-123',
  filename: 'report.pdf',
  mimeType: 'application/pdf',
  size: 102400,
  fileType: 'document',
  storagePath: '/uploads/report.pdf',
  status: 'ready' as const,
  extractedContent: 'Plain text content of the report',
  extractedMarkdown: '# Report\n\nThis is the report content in markdown.',
  classification: null,
  errorMessage: null,
  createdAt: new Date('2026-03-27T00:00:00Z'),
  updatedAt: new Date('2026-03-27T00:00:00Z'),
};

const mockProcessingFile = {
  ...mockReadyFile,
  id: '22222222-2222-2222-2222-222222222222',
  status: 'processing' as const,
  extractedContent: null,
  extractedMarkdown: null,
};

const mockJsonFile = {
  ...mockReadyFile,
  id: '33333333-3333-3333-3333-333333333333',
  filename: 'data.json',
  fileType: 'code',
  extractedContent: '[{"name": "Alice"}, {"name": "Bob"}]',
  extractedMarkdown: null,
};

const mockFileList = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    userId: 'user-123',
    filename: 'report.pdf',
    mimeType: 'application/pdf',
    size: 102400,
    fileType: 'document',
    storagePath: '/uploads/report.pdf',
    status: 'ready' as const,
    extractedContent: null,
    extractedMarkdown: null,
    classification: null,
    errorMessage: null,
    createdAt: new Date('2026-03-27T00:00:00Z'),
    updatedAt: new Date('2026-03-27T00:00:00Z'),
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    userId: 'user-123',
    filename: 'data.json',
    mimeType: 'application/json',
    size: 512,
    fileType: 'code',
    storagePath: '/uploads/data.json',
    status: 'ready' as const,
    extractedContent: null,
    extractedMarkdown: null,
    classification: null,
    errorMessage: null,
    createdAt: new Date('2026-03-27T01:00:00Z'),
    updatedAt: new Date('2026-03-27T01:00:00Z'),
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

// --- file-extract (SKIL-01) ---

describe('file-extract skill', () => {
  it('should have correct metadata', () => {
    const metadata = getSkillMetadata(fileSkills, 'extractFileContent');
    expect(metadata).toBeDefined();
    expect(metadata!.id).toBe('file-extract');
    expect(metadata!.name).toBe('Extract File Content');
    expect(metadata!.version).toBe('1.0.0');
    expect(metadata!.category).toBe('file');
    expect(metadata!.tags).toContain('file');
    expect(metadata!.tags).toContain('extract');
    expect(metadata!.timeout).toBe(35000);
  });

  it('should return extracted content for a valid ready file', async () => {
    mockedGetFileById.mockResolvedValue(mockReadyFile);

    const result = await fileSkills.extractFileContent(
      { fileId: mockReadyFile.id },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      fileId: mockReadyFile.id,
      filename: mockReadyFile.filename,
      fileType: mockReadyFile.fileType,
      extractedContent: mockReadyFile.extractedContent,
      extractedMarkdown: mockReadyFile.extractedMarkdown,
    });
  });

  it('should return error for non-existent file', async () => {
    mockedGetFileById.mockResolvedValue(undefined);

    const result = await fileSkills.extractFileContent(
      { fileId: '99999999-9999-9999-9999-999999999999' },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('File not found');
  });

  it('should return Access denied for another user\'s file', async () => {
    mockedGetFileById.mockResolvedValue(mockReadyFile);

    const result = await fileSkills.extractFileContent(
      { fileId: mockReadyFile.id },
      otherUserContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Access denied');
  });

  it('should return error when file status is not ready', async () => {
    mockedGetFileById.mockResolvedValue(mockProcessingFile);

    const result = await fileSkills.extractFileContent(
      { fileId: mockProcessingFile.id },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('not ready');
  });
});

// --- file-convert (SKIL-02) ---

describe('file-convert skill', () => {
  it('should have correct metadata', () => {
    const metadata = getSkillMetadata(fileSkills, 'convertFileFormat');
    expect(metadata).toBeDefined();
    expect(metadata!.id).toBe('file-convert');
    expect(metadata!.name).toBe('Convert File Format');
    expect(metadata!.version).toBe('1.0.0');
    expect(metadata!.category).toBe('file');
    expect(metadata!.tags).toContain('file');
    expect(metadata!.tags).toContain('convert');
    expect(metadata!.timeout).toBe(35000);
  });

  it('should return markdown format when targetFormat is markdown', async () => {
    mockedGetFileById.mockResolvedValue(mockReadyFile);

    const result = await fileSkills.convertFileFormat(
      { fileId: mockReadyFile.id, targetFormat: 'markdown' },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      format: 'markdown',
      content: mockReadyFile.extractedMarkdown,
    });
  });

  it('should return text format when targetFormat is text', async () => {
    mockedGetFileById.mockResolvedValue(mockReadyFile);

    const result = await fileSkills.convertFileFormat(
      { fileId: mockReadyFile.id, targetFormat: 'text' },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      format: 'text',
      content: mockReadyFile.extractedContent,
    });
  });

  it('should return json format (same as text content) when targetFormat is json', async () => {
    mockedGetFileById.mockResolvedValue(mockReadyFile);

    const result = await fileSkills.convertFileFormat(
      { fileId: mockReadyFile.id, targetFormat: 'json' },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      format: 'json',
      content: mockReadyFile.extractedContent,
    });
  });

  it('should return error for non-existent file', async () => {
    mockedGetFileById.mockResolvedValue(undefined);

    const result = await fileSkills.convertFileFormat(
      { fileId: '99999999-9999-9999-9999-999999999999', targetFormat: 'markdown' },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('File not found');
  });

  it('should return Access denied for another user\'s file', async () => {
    mockedGetFileById.mockResolvedValue(mockReadyFile);

    const result = await fileSkills.convertFileFormat(
      { fileId: mockReadyFile.id, targetFormat: 'markdown' },
      otherUserContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Access denied');
  });
});

// --- file-classify (SKIL-03) ---

describe('file-classify skill', () => {
  it('should have correct metadata', () => {
    const metadata = getSkillMetadata(fileSkills, 'classifyFile');
    expect(metadata).toBeDefined();
    expect(metadata!.id).toBe('file-classify');
    expect(metadata!.name).toBe('Classify File');
    expect(metadata!.version).toBe('1.0.0');
    expect(metadata!.category).toBe('file');
    expect(metadata!.tags).toContain('file');
    expect(metadata!.tags).toContain('classify');
    expect(metadata!.timeout).toBe(15000);
  });

  it('should return classification result from classifyByContent', async () => {
    mockedGetFileById.mockResolvedValue(mockJsonFile);
    mockedClassifyByContent.mockResolvedValue({
      correctedType: 'data',
      classification: 'auto:json_array_data',
    });

    const result = await fileSkills.classifyFile(
      { fileId: mockJsonFile.id },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      fileId: mockJsonFile.id,
      filename: mockJsonFile.filename,
      currentType: mockJsonFile.fileType,
      correctedType: 'data',
      classification: 'auto:json_array_data',
    });
    expect(mockedClassifyByContent).toHaveBeenCalledWith(
      mockJsonFile.filename,
      mockJsonFile.extractedContent,
      mockJsonFile.extractedMarkdown
    );
  });

  it('should return error for non-existent file', async () => {
    mockedGetFileById.mockResolvedValue(undefined);

    const result = await fileSkills.classifyFile(
      { fileId: '99999999-9999-9999-9999-999999999999' },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('File not found');
  });

  it('should return Access denied for another user\'s file', async () => {
    mockedGetFileById.mockResolvedValue(mockJsonFile);

    const result = await fileSkills.classifyFile(
      { fileId: mockJsonFile.id },
      otherUserContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Access denied');
  });
});

// --- file-read (SKIL-04 updated) ---

describe('file-read skill (updated)', () => {
  it('should have correct metadata', () => {
    const metadata = getSkillMetadata(fileSkills, 'readFile');
    expect(metadata).toBeDefined();
    expect(metadata!.id).toBe('file-read');
    expect(metadata!.name).toBe('Read File');
    expect(metadata!.version).toBe('1.0.0');
    expect(metadata!.category).toBe('file');
    expect(metadata!.timeout).toBe(10000);
  });

  it('should return file content (prefer extractedMarkdown over extractedContent)', async () => {
    mockedGetFileById.mockResolvedValue(mockReadyFile);

    const result = await fileSkills.readFile(
      { fileId: mockReadyFile.id },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      fileId: mockReadyFile.id,
      filename: mockReadyFile.filename,
      content: mockReadyFile.extractedMarkdown,
    });
  });

  it('should fall back to extractedContent when extractedMarkdown is null', async () => {
    mockedGetFileById.mockResolvedValue(mockJsonFile);

    const result = await fileSkills.readFile(
      { fileId: mockJsonFile.id },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      fileId: mockJsonFile.id,
      filename: mockJsonFile.filename,
      content: mockJsonFile.extractedContent,
    });
  });

  it('should return error for non-existent file', async () => {
    mockedGetFileById.mockResolvedValue(undefined);

    const result = await fileSkills.readFile(
      { fileId: '99999999-9999-9999-9999-999999999999' },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('File not found');
  });

  it('should return Access denied for another user\'s file', async () => {
    mockedGetFileById.mockResolvedValue(mockReadyFile);

    const result = await fileSkills.readFile(
      { fileId: mockReadyFile.id },
      otherUserContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Access denied');
  });
});

// --- file-list (SKIL-04 updated) ---

describe('file-list skill (updated)', () => {
  it('should have correct metadata', () => {
    const metadata = getSkillMetadata(fileSkills, 'listFiles');
    expect(metadata).toBeDefined();
    expect(metadata!.id).toBe('file-list');
    expect(metadata!.name).toBe('List Files');
    expect(metadata!.version).toBe('1.0.0');
    expect(metadata!.category).toBe('file');
    expect(metadata!.timeout).toBe(10000);
  });

  it('should return all user files when no fileType filter', async () => {
    mockedGetFilesByUser.mockResolvedValue(mockFileList);

    const result = await fileSkills.listFiles({}, mockContext);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(mockedGetFilesByUser).toHaveBeenCalledWith('user-123');
  });

  it('should filter by fileType when provided', async () => {
    mockedGetFilesByUser.mockResolvedValue(mockFileList);

    const result = await fileSkills.listFiles({ fileType: 'document' }, mockContext);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect((result.data as Array<{ id: string }>).map(f => f.id)).toEqual([
      '11111111-1111-1111-1111-111111111111',
    ]);
  });

  it('should return file metadata objects with expected fields', async () => {
    mockedGetFilesByUser.mockResolvedValue(mockFileList);

    const result = await fileSkills.listFiles({}, mockContext);

    expect(result.success).toBe(true);
    const files = result.data as Array<Record<string, unknown>>;
    const file = files[0];
    expect(file).toHaveProperty('id');
    expect(file).toHaveProperty('filename');
    expect(file).toHaveProperty('fileType');
    expect(file).toHaveProperty('size');
    expect(file).toHaveProperty('status');
    expect(file).toHaveProperty('createdAt');
  });
});

// --- All skills metadata validation ---

describe('All file skills have valid metadata', () => {
  const skillMethods = [
    { key: 'extractFileContent', expectedId: 'file-extract' },
    { key: 'convertFileFormat', expectedId: 'file-convert' },
    { key: 'classifyFile', expectedId: 'file-classify' },
    { key: 'readFile', expectedId: 'file-read' },
    { key: 'listFiles', expectedId: 'file-list' },
  ];

  it('should have exactly 5 skills registered', () => {
    const semverRegex = /^\d+\.\d+\.\d+$/;
    let count = 0;
    for (const { key } of skillMethods) {
      const metadata = getSkillMetadata(fileSkills, key);
      if (metadata) count++;
    }
    expect(count).toBe(5);
  });

  skillMethods.forEach(({ key, expectedId }) => {
    it(`should have valid metadata for ${key} (id: ${expectedId})`, () => {
      const metadata = getSkillMetadata(fileSkills, key);
      expect(metadata).toBeDefined();
      expect(metadata!.id).toBe(expectedId);
      expect(metadata!.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(metadata!.category).toBe('file');
      expect(metadata!.requiresApproval).toBe(false);
    });
  });
});
