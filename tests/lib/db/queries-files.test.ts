import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val, type: 'eq' })),
  and: vi.fn((...conds) => conds),
  asc: (col: unknown) => ({ col, dir: 'asc' }),
  desc: (col: unknown) => ({ col, dir: 'desc' }),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values })),
}));

// Mock schema -- includes db because queries.ts imports { db } from './schema'
// db is a drizzle instance with .select() method
const mockDb = {
  select: vi.fn(),
};

vi.mock('@/lib/db/schema', () => ({
  db: mockDb,
  files: {
    id: 'id',
    userId: 'userId',
    filename: 'filename',
    mimeType: 'mimeType',
    size: 'size',
    fileType: 'fileType',
    storagePath: 'storagePath',
    status: 'status',
    extractedContent: 'extractedContent',
    extractedMarkdown: 'extractedMarkdown',
    classification: 'classification',
    errorMessage: 'errorMessage',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  FileTypeEnum: ['document', 'code', 'data'],
  FileStatusEnum: ['uploaded', 'processing', 'ready', 'failed'],
}));

describe('getFilesByUserPaginated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export getFilesByUserPaginated function', async () => {
    const { getFilesByUserPaginated } = await import('@/lib/db/queries');
    expect(typeof getFilesByUserPaginated).toBe('function');
  });

  it('should return paginated results with default options', async () => {
    // Set up the chain mock for count query
    const countChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 5 }]),
    };

    // Set up the chain mock for data query
    const dataChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([
        { id: 'f1', filename: 'test.pdf', userId: 'user-1' },
        { id: 'f2', filename: 'test2.pdf', userId: 'user-1' },
      ]),
    };

    // db.select() is called twice -- once for count, once for data
    // Use mockReturnValueOnce to return different chains
    mockDb.select
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(dataChain);

    const { getFilesByUserPaginated } = await import('@/lib/db/queries');
    const result = await getFilesByUserPaginated('user-1');

    expect(result).toHaveProperty('files');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page', 1);
    expect(result).toHaveProperty('totalPages');
    expect(result.files).toHaveLength(2);
    expect(result.total).toBe(5);
  });

  it('should add fileType filter when not "all"', async () => {
    const countChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 3 }]),
    };

    const dataChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([]),
    };

    mockDb.select
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(dataChain);

    const { getFilesByUserPaginated } = await import('@/lib/db/queries');
    const result = await getFilesByUserPaginated('user-1', { fileType: 'document' });

    // Verify where was called (the where clause should include fileType filter)
    expect(countChain.where).toHaveBeenCalled();
    expect(result.total).toBe(3);
  });

  it('should exclude extractedContent and extractedMarkdown from SELECT', async () => {
    const dataChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([
        { id: 'f1', filename: 'test.pdf', userId: 'user-1' },
      ]),
    };

    const countChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 1 }]),
    };

    mockDb.select
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(dataChain);

    const { getFilesByUserPaginated } = await import('@/lib/db/queries');
    const result = await getFilesByUserPaginated('user-1');

    // Verify select was called with a metadata-only object (no extractedContent/extractedMarkdown)
    // mockDb.select is called twice: first for count, second for data
    // The data select is the second call
    const selectCall = mockDb.select.mock.calls[1][0];
    expect(selectCall).not.toHaveProperty('extractedContent');
    expect(selectCall).not.toHaveProperty('extractedMarkdown');
    expect(selectCall).toHaveProperty('id');
    expect(selectCall).toHaveProperty('filename');
    expect(selectCall).toHaveProperty('size');
  });

  it('should support sortBy size ascending', async () => {
    const countChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 1 }]),
    };

    const dataChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([]),
    };

    mockDb.select
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(dataChain);

    const { getFilesByUserPaginated } = await import('@/lib/db/queries');
    await getFilesByUserPaginated('user-1', { sortBy: 'size', sortOrder: 'asc' });

    expect(dataChain.orderBy).toHaveBeenCalled();
  });
});
